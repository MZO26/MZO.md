import { NoteTag } from "@/extensions/tag/tag";
import { noteStore } from "@/state/state";
import { UNTAGGED } from "@/utils/constants";
import { getTags } from "@/utils/generators";
import { memoize } from "@/utils/helpers";
import type { NoteListItem } from "@shared/schemas/note-schema";
import type { JSONContent } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

interface TagAutocompleteState {
  from: number;
  to: number;
  autocompleteText: string;
  tagId: string;
}

const tagAutocompleteKey = new PluginKey<TagAutocompleteState>(
  "tagAutocomplete",
);
const tagClickHandlerKey = new PluginKey<null>("tagClickHandler");

const NoteTagHandler = NoteTag.extend({
  addKeyboardShortcuts() {
    return {
      Tab: ({ editor }) => {
        const state = tagAutocompleteKey.getState(editor.state);
        if (!state) return false;
        return editor
          .chain()
          .focus()
          .insertNoteTag({
            from: state.from,
            to: state.to,
            id: state.tagId,
          })
          .run();
      },
    };
  },

  addProseMirrorPlugins() {
    const clickPlugin = new Plugin({
      key: tagClickHandlerKey,
      props: {
        handleClickOn: (_view, _pos, node, _nodePos, event) => {
          if (node.type.name !== this.name || !node.attrs["id"]) return false;
          event.preventDefault();
          event.stopPropagation();
          void this.options.onClick?.(node.attrs["id"]);
          return true;
        },
      },
    });

    const autoCompletePlugin = new Plugin({
      key: tagAutocompleteKey,
      state: {
        init: () => null,
        apply: (
          tr,
          pluginState,
          _oldEditorState,
          newEditorState,
        ): TagAutocompleteState | null => {
          if (!tr.docChanged && !tr.selectionSet) return pluginState;
          const { selection } = newEditorState;
          if (!selection.empty) return null;
          const $head = selection.$head;
          const lookbackStart = Math.max(0, $head.parentOffset - 100);
          const textBefore = $head.parent.textContent.slice(
            lookbackStart,
            $head.parentOffset,
          );
          if (textBefore.lastIndexOf("#") === -1) return null;
          const match = textBefore.match(/(?:^|\s)#([\p{L}\p{N}_-]+)$/u);
          if (!match) return null;
          const rawQuery = match[1];
          if (!rawQuery) return null;
          const normalizedQuery = rawQuery.trim().toLowerCase();
          if (!normalizedQuery) return null;
          const notes = noteStore.get("notes");
          let tagMatch: string | null = null;
          const preFiltered = getSortedTags(notes);
          for (const tag of preFiltered) {
            if (tag.toLowerCase().startsWith(normalizedQuery)) {
              tagMatch = tag;
              break;
            }
          }
          if (!tagMatch) return null;
          return {
            from: $head.pos - rawQuery.length - 1,
            to: $head.pos,
            autocompleteText: tagMatch.slice(rawQuery.length),
            tagId: tagMatch,
          };
        },
      },
      props: {
        decorations(state) {
          const pluginState = tagAutocompleteKey.getState(state);
          if (!pluginState || !pluginState.autocompleteText)
            return DecorationSet.empty;
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
    });
    return [clickPlugin, autoCompletePlugin];
  },
});

const getSortedTags = memoize((notes: readonly NoteListItem[]) => {
  const tagSet = new Set<string>();
  for (const note of notes) {
    if (note.tags) {
      for (const tag of note.tags) {
        tagSet.add(tag);
      }
    }
  }
  return Array.from(tagSet).sort((a, b) => a.length - b.length);
});

function addActiveTagToDoc(
  doc: JSONContent,
  activeTag: string | null,
): JSONContent {
  if (!activeTag || activeTag === UNTAGGED) return doc;
  const normalizedTag = activeTag.trim().toLowerCase();
  if (!normalizedTag || getTags(doc).some((t) => t === normalizedTag))
    return doc;
  const tagNode = {
    type: "noteTag",
    attrs: { id: normalizedTag, label: normalizedTag },
  };
  const spaceNode = { type: "text", text: " " };
  const content = [...(doc.content ?? [])];
  const tagPIdx = content.findIndex(
    (node) =>
      node.type === "paragraph" &&
      Array.isArray(node.content) &&
      node.content.some((child) => child.type === "noteTag"),
  );
  if (tagPIdx !== -1) {
    content[tagPIdx] = {
      ...content[tagPIdx],
      content: [...(content[tagPIdx]?.content || []), tagNode, spaceNode],
    };
  } else {
    const tagParagraph = { type: "paragraph", content: [tagNode, spaceNode] };
    if (content[0]?.type === "heading") {
      content.splice(1, 0, tagParagraph);
    } else {
      content.unshift(tagParagraph);
    }
  }
  return { ...doc, content };
}

export { addActiveTagToDoc, NoteTagHandler };
