import { NoteTag } from "@/extensions/tag/tag";
import { noteStore } from "@/state/state";
import { UNTAGGED } from "@/utils/constants";
import { getTags } from "@/utils/generators";
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
          if (!tr.docChanged && !tr.selectionSet) {
            return pluginState;
          }
          const { selection } = newEditorState;
          if (!selection.empty) return null;
          const $head = selection.$head;
          const lookbackStart = Math.max(0, $head.parentOffset - 100);
          const textBefore = $head.parent.textContent.slice(
            lookbackStart,
            $head.parentOffset,
          );
          const match = textBefore.match(/(?:^|\s)#([\p{L}\p{N}_-]+)$/u);
          if (!match) return null;
          const rawQuery = match[1];
          if (!rawQuery) return null;
          const normalizedQuery =
            typeof rawQuery === "string" ? rawQuery.trim().toLowerCase() : "";
          if (!normalizedQuery) return null;
          let bestMatch: string | null = null;
          let exactMatchFound = false;
          const notes = noteStore.get("notes");
          for (const note of notes) {
            for (const tag of note.tags) {
              if (tag === normalizedQuery) {
                bestMatch = tag;
                exactMatchFound = true;
                break;
              }
              if (
                tag.startsWith(normalizedQuery) &&
                (bestMatch === null || tag.length < bestMatch.length)
              ) {
                bestMatch = tag;
              }
            }
            if (exactMatchFound) break;
          }
          if (!bestMatch) return null;
          return {
            from: $head.pos - rawQuery.length - 1,
            to: $head.pos,
            autocompleteText: bestMatch.slice(rawQuery.length),
            tagId: bestMatch,
          };
        },
      },
      props: {
        decorations(state) {
          const pluginState = tagAutocompleteKey.getState(state);
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
    });
    return [clickPlugin, autoCompletePlugin];
  },
});

function findTagParagraphIdx(content: JSONContent[]): number {
  return content.findIndex(
    (node) =>
      node.type === "paragraph" &&
      Array.isArray(node.content) &&
      node.content.some((child) => child.type === "noteTag"),
  );
}

function hasNoteTag(doc: JSONContent, tag: string): boolean {
  const normalized = tag.trim().toLowerCase();
  if (!normalized) return false;
  return getTags(doc).some((t) => t === normalized);
}

function addActiveTagToDoc(
  doc: JSONContent,
  activeTag: string | null,
): JSONContent {
  if (activeTag === null || activeTag === UNTAGGED) return doc;
  const normalizedTag = activeTag.trim();
  if (!normalizedTag) return doc;
  if (hasNoteTag(doc, normalizedTag)) return doc;
  const content = Array.isArray(doc.content) ? [...doc.content] : [];
  const tagNode = {
    type: "noteTag",
    attrs: { id: normalizedTag, label: normalizedTag },
  };
  const spaceNode = { type: "text", text: " " };
  const tagPIdx = findTagParagraphIdx(content);
  if (tagPIdx !== -1) {
    const existingPara = content[tagPIdx];
    const updatedPara = {
      ...existingPara,
      content: [...(existingPara?.content ?? []), tagNode, spaceNode],
    };
    const newContent = [...content];
    newContent[tagPIdx] = updatedPara;
    return { ...doc, content: newContent };
  }
  const tagParagraph = { type: "paragraph", content: [tagNode, spaceNode] };
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
      tagParagraph,
      spacerParagraph,
      ...restWithoutDuplicateHeading,
    ],
  };
}

export { addActiveTagToDoc, NoteTagHandler };
