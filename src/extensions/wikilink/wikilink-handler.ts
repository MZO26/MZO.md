import { rendererLogger } from "@/app";
import { WikiLink } from "@/extensions/wikilink/wikilinks";
import { handleCreateNote } from "@/notes/note-actions";
import { noteStore, stateStore } from "@/state/state";
import { WIKILINK_REGEX } from "@/utils/constants";
import { getLinks, truncateTitle } from "@/utils/generators";
import { memoize } from "@/utils/helpers";
import { useCore } from "@/utils/registry";
import {
  type Id,
  type Note,
  type NoteListItem,
} from "@shared/schemas/note-schema";
import { UNTITLED } from "@shared/shared-constants";
import type { JSONContent } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

type AutocompleteState = {
  from: number;
  to: number;
  autocompleteText: string;
  noteId: Id;
  title: string;
};

const autocompleteKey = new PluginKey<AutocompleteState>(
  "wikilinkAutocomplete",
);
const wikilinkClickHandlerKey = new PluginKey("wikilinkClickHandler");

const WikilinkHandler = WikiLink.extend({
  addKeyboardShortcuts() {
    return {
      Tab: ({ editor }) => {
        const state = autocompleteKey.getState(editor.state);
        if (!state) return false;
        return editor
          .chain()
          .focus()
          .insertWikiLink({
            from: state.from,
            to: state.to,
            id: state.noteId,
            title: state.title,
          })
          .run();
      },
      Backspace: () => {
        const { $from, empty } = this.editor.state.selection;
        if (!empty) return false;
        const nodeBefore = $from.nodeBefore;
        if (nodeBefore?.type.name === "wikilink") {
          const title = nodeBefore.attrs["title"] || "";
          const from = $from.pos - nodeBefore.nodeSize;
          return this.editor
            .chain()
            .insertContentAt({ from, to: $from.pos }, `[[${title}]`)
            .run();
        }
        return false;
      },
    };
  },
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: wikilinkClickHandlerKey,
        props: {
          handleClickOn: (_view, _pos, node, _nodePos, event) => {
            if (node.type.name !== this.name) return false;
            event.preventDefault();
            event.stopPropagation();
            const id = node.attrs["id"] || null;
            const title = node.attrs["title"] || "";
            void this.options.onClick?.(id, title);
            return true;
          },
        },
      }),

      new Plugin({
        key: autocompleteKey,
        state: {
          init: () => null,
          apply: (
            tr,
            pluginState,
            _oldEditorState,
            newEditorState,
          ): AutocompleteState | null => {
            if (!tr.docChanged && !tr.selectionSet) return pluginState;
            const { selection } = newEditorState;
            if (!selection.empty) return null;
            const $head = selection.$head;
            const lookbackStart = Math.max(0, $head.parentOffset - 60);
            const textBefore = $head.parent.textContent.slice(
              lookbackStart,
              $head.parentOffset,
            );
            const openBracketIdx = textBefore.lastIndexOf("[[");
            if (openBracketIdx === -1) return null;
            const rawQuery = textBefore.slice(openBracketIdx + 2);
            if (rawQuery.includes("]")) return null;
            const normalizedQuery = rawQuery.trim().toLowerCase();
            if (!normalizedQuery) return null;
            const notes = noteStore.get("notes");
            const currentId = stateStore.get("activeId");
            const preFiltered = getSortedNotes(notes);
            let bestMatch: NoteListItem | null = null;
            for (const note of preFiltered) {
              if (note.id === currentId) continue;
              const normalizedTitle = note.title.toLowerCase();
              if (normalizedTitle.startsWith(normalizedQuery)) {
                bestMatch = note;
                break;
              }
            }
            if (!bestMatch) return null;
            return {
              from: $head.pos - rawQuery.length - 2,
              to: $head.pos,
              autocompleteText: bestMatch.title.slice(rawQuery.length) + "]]",
              noteId: bestMatch.id,
              title: bestMatch.title,
            };
          },
        },
        props: {
          decorations(state) {
            const pluginState = autocompleteKey.getState(state);
            if (!pluginState || !pluginState.autocompleteText) {
              return DecorationSet.empty;
            }
            return DecorationSet.create(state.doc, [
              Decoration.widget(
                pluginState.to,
                () => {
                  const span = document.createElement("span");
                  span.className = "autocomplete";
                  span.textContent = pluginState.autocompleteText;
                  return span;
                },
                { side: 1 },
              ),
            ]);
          },
        },
      }),
    ];
  },
});

const getSortedNotes = memoize((notes: readonly NoteListItem[]) => {
  return notes.toSorted((a, b) => a.title.length - b.title.length);
});

async function resolveGhostLink(title: Note["title"]) {
  const truncated = truncateTitle(title);
  if (!truncated) return;
  const normalizedOriginal = title.trim().toLowerCase();
  const normalizedTruncated = truncated.toLowerCase();
  const notes = noteStore.get("notes");
  const existingNote = notes.find(
    (n) => n.title.trim().toLowerCase() === normalizedTruncated,
  );
  const noteId =
    existingNote?.id ??
    (await handleCreateNote({
      activeTitle: truncated,
      shouldNavigate: false,
    }));
  if (!noteId) return;
  const resolvedTitle = existingNote?.title ?? truncated;
  const { editor } = useCore("editor");
  editor.commands.command(({ tr, state, dispatch }) => {
    let modified = false;
    state.doc.descendants((node, currentPos) => {
      if (node.type.name === "wikilink") {
        const nodeId = node.attrs?.["id"];
        const nodeTitle = node.attrs?.["title"];
        if (!nodeId && typeof nodeTitle === "string") {
          const normNodeTitle = nodeTitle.trim().toLowerCase();
          const normNodeTruncated = truncateTitle(
            nodeTitle.trim(),
          ).toLowerCase();
          if (
            normNodeTitle === normalizedOriginal ||
            normNodeTruncated === normalizedTruncated
          ) {
            modified = true;
            if (dispatch) {
              tr.setNodeMarkup(currentPos, undefined, {
                ...node.attrs,
                id: noteId,
                title: resolvedTitle,
              });
            }
          }
        }
      }
    });
    if (modified && dispatch) {
      tr.setMeta("addToHistory", false);
    }
    return modified;
  });
  return noteId;
}

function resolveDocLinks(note: Readonly<Note>) {
  const { editor } = useCore("editor");
  const matchPos: {
    match: string;
    from: number;
    to: number;
    targetId: Id;
  }[] = [];
  const currentLinks = new Set(getLinks(note.content));
  const notes = noteStore.get("notes");
  const titleMap = new Map(notes.map((n) => [n.title, n.id]));
  editor.state.doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return true;
    for (const match of node.text.matchAll(WIKILINK_REGEX)) {
      const title = typeof match[1] === "string" ? match[1].trim() : "";
      if (!title) continue;
      const targetId = titleMap.get(title);
      if (targetId && !currentLinks.has(targetId)) {
        matchPos.push({
          match: title,
          from: pos + match.index,
          to: pos + match.index + match[0].length,
          targetId: targetId,
        });
      }
    }
    return true;
  });
  if (matchPos.length === 0) return;
  matchPos.sort((a, b) => b.from - a.from);
  for (const pos of matchPos) {
    rendererLogger.devLog(`Replacing ${pos.targetId} with title: ${pos.match}`);
    editor
      .chain()
      .insertWikiLink({
        from: pos.from,
        to: pos.to,
        id: pos.targetId,
        title: pos.match,
      })
      .run();
  }
}

function downgradeDocLinks(noteIndex: Map<Id, NoteListItem>) {
  const { editor } = useCore("editor");
  editor.commands.command(({ tr, state, dispatch }) => {
    let modified = false;
    state.doc.descendants((node, pos) => {
      if (node.type.name === "wikilink") {
        const nodeId = node.attrs?.["id"];
        if (nodeId && !noteIndex.has(nodeId)) {
          modified = true;
          if (dispatch) {
            tr.setNodeMarkup(pos, undefined, { ...node.attrs, id: null });
          }
        }
      }
    });
    if (modified && dispatch) tr.setMeta("addToHistory", false);
    return modified;
  });
}

function addActiveLinkToDoc(
  doc: JSONContent,
  activeLink: Id | null,
): JSONContent {
  if (!activeLink || getLinks(doc).some((id) => id === activeLink)) return doc;
  const title = noteStore.get("noteIndex").get(activeLink)?.title ?? UNTITLED;
  const linkNode = { type: "wikilink", attrs: { id: activeLink, title } };
  const spaceNode = { type: "text", text: " " };
  const content = [...(doc.content ?? [])];
  const pIdx = content.findIndex((n) => n.type === "paragraph");
  if (pIdx !== -1) {
    content[pIdx] = {
      ...content[pIdx],
      content: [...(content[pIdx]?.content ?? []), linkNode, spaceNode],
    };
  } else {
    content.push({ type: "paragraph", content: [linkNode, spaceNode] });
  }
  return { ...doc, content };
}

export {
  addActiveLinkToDoc,
  downgradeDocLinks,
  resolveDocLinks,
  resolveGhostLink,
  WikilinkHandler,
};
