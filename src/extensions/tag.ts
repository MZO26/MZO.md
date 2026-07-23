import { noteStore } from "@/settings/app-state";
import { InputRule, mergeAttributes, Node } from "@tiptap/core";
import { Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export interface NoteTagOptions {
  onClick: (id: string) => void | Promise<void>;
}

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

const normalizeTagId = (value: unknown) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    noteTag: {
      insertNoteTag: (options: {
        from: number;
        to: number;
        id: string;
      }) => ReturnType;
    };
  }
}

const NoteTag = Node.create<NoteTagOptions>({
  name: "noteTag",
  group: "inline",
  inline: true,
  atom: true,
  selectable: false,

  addAttributes: () => ({
    id: {
      default: null,
      parseHTML: (el) => normalizeTagId(el.getAttribute("data-id")),
      renderHTML: (attrs) => ({
        "data-id": normalizeTagId(attrs["id"]),
      }),
    },
  }),

  parseHTML: () => [{ tag: 'span[data-type="noteTag"]' }],

  renderHTML({ node, HTMLAttributes }) {
    const id = normalizeTagId(node.attrs?.["id"] ?? "");
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-type": "noteTag",
        class: "tag-node",
        contenteditable: false,
      }),
      `#${id}`,
    ];
  },

  renderText({ node }) {
    const id = normalizeTagId(node.attrs?.["id"] ?? "");
    // zero width character to not trigger heading regex
    return id ? `\u200B#${id}` : "";
  },

  markdownTokenName: "noteTag",
  markdownTokenizer: {
    name: "noteTag",
    level: "inline",
    start(src: string) {
      return src.indexOf("#");
    },
    tokenize(src: string) {
      if (/^#{1,6}(?:\s|\t)/.test(src)) return;
      const match = src.match(
        /^#([\p{L}](?:[\p{L}\p{N}_-]*[\p{L}\p{N}])?)(?![\p{L}\p{N}_-])/u,
      );
      if (!match) return undefined;
      const text = typeof match[1] === "string" ? match[1].trim() : "";
      if (/^([a-fA-F0-9]{3}|[a-fA-F0-9]{6})$/.test(text)) return;
      if (!text) {
        return undefined;
      }
      return { type: "noteTag", raw: match[0], text };
    },
  },
  parseMarkdown(token, _helpers) {
    const id = normalizeTagId(token.text ?? "").trim();
    if (!id) {
      return { type: "text", text: token.raw ?? "" };
    }
    return { type: "noteTag", attrs: { id } };
  },
  renderMarkdown(node) {
    const id = normalizeTagId(node.attrs?.["id"] ?? "");
    return id ? `#${id}` : "";
  },

  addCommands() {
    return {
      insertNoteTag:
        ({ from, to, id }) =>
        ({ tr, dispatch }) => {
          const normalizedId = normalizeTagId(id);
          if (!normalizedId) return false;
          const node = this.type.create({ id: normalizedId });
          const maxPos = tr.doc.content.size;
          const safeFrom = Math.max(0, Math.min(from, maxPos));
          const safeTo = Math.max(safeFrom, Math.min(to, maxPos));
          tr.replaceWith(safeFrom, safeTo, node);
          tr.insertText(" ", safeFrom + node.nodeSize);
          const rawCursorPos = safeFrom + node.nodeSize + 1;
          const safeCursorPos = Math.max(
            0,
            Math.min(rawCursorPos, tr.doc.content.size),
          );
          tr.setSelection(TextSelection.near(tr.doc.resolve(safeCursorPos)));
          if (dispatch) {
            dispatch(tr);
          }
          return true;
        },
    };
  },

  addInputRules() {
    return [
      new InputRule({
        find: /(?:^|\s)#([\p{L}\p{N}_-]+)\s$/u,
        handler: ({ range, match, commands }) => {
          const matchString = typeof match[0] === "string" ? match[0] : "";
          const rawTagText = typeof match[1] === "string" ? match[1] : "";
          const tagText = normalizeTagId(rawTagText);
          if (!matchString || !tagText) return null;
          const hashIndex = matchString.lastIndexOf("#");
          if (hashIndex === -1) return null;
          const from = range.from + hashIndex;
          const to = range.to;
          if (from < 0 || to < from) return null;
          commands.insertNoteTag({
            from,
            to,
            id: tagText,
          });
          return;
        },
      }),
    ];
  },

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

export { NoteTag };
