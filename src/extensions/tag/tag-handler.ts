import { NoteTag } from "@/extensions/tag/tag";
import { noteStore } from "@/state/state";
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

export { NoteTagHandler };
