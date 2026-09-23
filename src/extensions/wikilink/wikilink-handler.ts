import { rendererLogger } from "@/app";
import { WikiLink } from "@/extensions/wikilink/wikilinks";
import { noteStore, stateStore } from "@/state/state";
import { WIKILINK_REGEX } from "@/utils/constants";
import { getLinks } from "@/utils/generators";
import { getAppItem } from "@/utils/registry";
import type { Id, Note, NoteListItem } from "@shared/schemas/note-schema";
import type { JSONContent } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

type AutocompleteState = {
  from: number;
  to: number;
  autocompleteText: string;
  noteId: Id;
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
          })
          .run();
      },
    };
  },
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: wikilinkClickHandlerKey,
        props: {
          handleClickOn: (_view, _pos, node, _nodePos, event) => {
            if (node.type.name !== this.name || !node.attrs["id"]) return false;
            event.preventDefault();
            event.stopPropagation();
            void this.options.onClick?.(node.attrs["id"]);
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
            if (!tr.docChanged && !tr.selectionSet) {
              return pluginState;
            }
            const { selection } = newEditorState;
            if (!selection.empty) return null;
            const $head = selection.$head;
            const lookbackStart = Math.max(0, $head.parentOffset - 60);
            const textBefore = $head.parent.textContent.slice(
              lookbackStart,
              $head.parentOffset,
            );
            const match = textBefore.match(/\[\[([^\]]*)$/);
            if (!match) return null;
            const rawQuery = match[1];
            if (!rawQuery) return null;
            const normalizedQuery =
              typeof rawQuery === "string" ? rawQuery.trim().toLowerCase() : "";
            if (!normalizedQuery) return null;
            const notes = noteStore.get("notes");
            const currentId = stateStore.get("activeId");
            let bestMatch: NoteListItem | null = null;
            for (const note of notes) {
              if (note.id === currentId) continue;
              const normalizedTitle = note.title.toLowerCase();
              if (normalizedTitle === normalizedQuery) {
                bestMatch = note;
                break;
              }
              if (
                normalizedTitle.startsWith(normalizedQuery) &&
                (bestMatch === null ||
                  note.title.length < bestMatch.title.length)
              ) {
                bestMatch = note;
              }
            }
            if (!bestMatch) return null;
            return {
              from: $head.pos - rawQuery.length - 2,
              to: $head.pos,
              autocompleteText: bestMatch.title.slice(rawQuery.length) + "]]",
              noteId: bestMatch.id,
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

function hasDocLink(doc: JSONContent, linkId: Id): boolean {
  return getLinks(doc).some((id) => id === linkId);
}

function resolveDocLinks(note: Readonly<Note>) {
  const editor = getAppItem("editor");
  const matchPos: { match: string; from: number; to: number; targetId: Id }[] =
    [];
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
  // sort in descending order to not shift indexes from
  // top to bottom
  matchPos.sort((a, b) => b.from - a.from);
  for (const pos of matchPos) {
    rendererLogger.devLog(`Replacing ${pos.targetId} with title: ${pos.match}`);
    editor
      .chain()
      .insertWikiLink({ from: pos.from, to: pos.to, id: pos.targetId })
      .run();
  }
}

function addActiveLinkToDoc(
  doc: JSONContent,
  activeLink: Id | null,
): JSONContent {
  if (!activeLink) return doc;
  if (hasDocLink(doc, activeLink)) return doc;
  rendererLogger.devLog("Not found");
  const content = Array.isArray(doc.content) ? [...doc.content] : [];
  const linkNode = {
    type: "wikilink",
    attrs: { id: activeLink },
  };
  const firstIdx = findFirstParagraphIdx(content);
  rendererLogger.devLog(firstIdx);
  if (firstIdx !== -1) {
    const para = content[firstIdx];
    const newParaContent = para?.content
      ? [...para.content, linkNode, { type: "text", text: " " }]
      : [linkNode, { type: "text", text: " " }];
    const newContent = [...content];
    newContent[firstIdx] = { ...para, content: newParaContent };
    return { ...doc, content: newContent };
  }
  const linkParagraph = {
    type: "paragraph",
    content: [linkNode, { type: "text", text: " " }],
  };
  const headingBlock = { type: "heading", attrs: { level: 1 } };
  const hrBlock = { type: "horizontalRule" };
  const spacerParagraph = { type: "paragraph" };
  const firstNode = content[0];
  const hasLeadingHeading = firstNode?.type === "heading";
  const rest = hasLeadingHeading ? content.slice(1) : content;
  const restWithoutDuplicateHeading =
    rest[0]?.type === "heading" ? rest.slice(1) : rest;
  return {
    ...doc,
    content: [
      hasLeadingHeading ? firstNode : headingBlock,
      hrBlock,
      linkParagraph,
      spacerParagraph,
      ...restWithoutDuplicateHeading,
    ],
  };
}

function findFirstParagraphIdx(content: JSONContent[]): number {
  for (let i = 0; i < content.length; i++) {
    const n = content[i];
    if (n?.type === "paragraph") return i;
  }
  return -1;
}

export { addActiveLinkToDoc, hasDocLink, resolveDocLinks, WikilinkHandler };
