import { WikiLink } from "@/extensions/wikilink/wikilinks";
import { noteStore, stateStore } from "@/state/state";
import type { NoteListItem } from "@shared/schemas/note-schema";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

type AutocompleteState = {
  from: number;
  to: number;
  autocompleteText: string;
  noteId: string;
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

export { WikilinkHandler };
