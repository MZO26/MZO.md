import { noteStore, stateStore } from "@/settings/app-state";
import type { NoteListItem } from "@shared/schemas/note-schema";
import { InputRule, mergeAttributes, Node, nodePasteRule } from "@tiptap/core";
import { Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

const UUID_PATTERN = "([a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12})";
const INPUT_REGEX = /(?<!!)\[\[([^\]]+)\]\]$/;
const PASTE_REGEX = /\[\[([^\]]+)\]\]/g;
const EXACT_UUID_REGEX = new RegExp(`^${UUID_PATTERN}$`, "i");

export interface WikiLinkOptions {
  onClick: (id: string) => void | Promise<void>;
}

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

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    wikilink: {
      insertWikiLink: (options: {
        from: number;
        to: number;
        id: string;
      }) => ReturnType;
    };
  }
}

const WikiLink = Node.create<WikiLinkOptions>({
  name: "wikilink",
  group: "inline",
  inline: true,
  atom: true,
  selectable: false,

  addAttributes: () => ({
    id: {
      default: null,
      parseHTML: (el) =>
        el
          .getAttribute("data-id")
          ?.replace(/[\[\]]/g, "")
          .trim() || "",
    },
  }),

  parseHTML: () => [
    {
      tag: "span[data-wikilink]",
      getAttrs: (el) => {
        const id =
          el
            .getAttribute("data-id")
            ?.replace(/[\[\]]/g, "")
            .trim() || "";
        return EXACT_UUID_REGEX.test(id) ? null : false;
      },
    },
  ],

  renderHTML({ node }) {
    const id = String(node.attrs?.["id"] ?? "").trim();
    const title = noteStore.get("noteIndex").get(id)?.title;
    const display = title || id;
    return [
      "span",
      mergeAttributes({
        "data-wikilink": "",
        "data-id": id,
        class: "wikilink",
      }),
      display ? `[[${display}]]` : "",
    ];
  },

  markdownTokenizer: {
    name: "wikilink",
    level: "inline",
    start(src: string) {
      return src.indexOf("[[");
    },
    tokenize(src: string) {
      const match = src.match(/^\[\[([^\]]+)\]\]/);
      if (!match) return undefined;
      const text = typeof match[1] === "string" ? match[1].trim() : "";
      if (!text) {
        return undefined;
      }
      return {
        type: "wikilink",
        raw: match[0],
        text: text,
      };
    },
  },

  parseMarkdown(token, _helpers) {
    const text = String(token.text ?? "").trim();
    if (!text) {
      return { type: "text", text: token.raw || "" };
    }
    if (EXACT_UUID_REGEX.test(text)) {
      return { type: "wikilink", attrs: { id: text } };
    }
    const normalizedText = text.toLowerCase();
    const foundNote = noteStore
      .get("notes")
      .find((n) => n.title.toLowerCase().trim() === normalizedText);
    if (foundNote) {
      return { type: "wikilink", attrs: { id: foundNote.id } };
    }
    return { type: "text", text: token.raw || "" };
  },
  renderText({ node }) {
    const id = String(node.attrs?.["id"] ?? "").trim();
    if (!id) return "";
    const title = noteStore.get("noteIndex").get(id)?.title;
    return title ? `[[${title}]]` : `[[${id}]]`;
  },
  renderMarkdown(node) {
    const id = String(node.attrs?.["id"] ?? "").trim();
    if (!id) return "";
    const title = noteStore.get("noteIndex").get(id)?.title;
    return title ? `[[${title}]]` : `[[${id}]]`;
  },

  addCommands() {
    return {
      insertWikiLink:
        ({ from, to, id }) =>
        ({ tr, dispatch }) => {
          const node = this.type.create({ id });
          tr.replaceWith(from, to, node);
          tr.insertText(" ", from + node.nodeSize);
          const cursorPos = from + node.nodeSize + 1;
          tr.setSelection(TextSelection.create(tr.doc, cursorPos));
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
        find: INPUT_REGEX,
        handler: ({ range, match, commands }) => {
          const rawTitle = typeof match[1] === "string" ? match[1].trim() : "";
          if (!rawTitle) return null;
          const targetNote = noteStore
            .get("notes")
            .find((n) => n.title.toLowerCase() === rawTitle.toLowerCase());
          if (!targetNote) return null;
          if (range.from < 0 || range.to < range.from) return null;
          commands.insertWikiLink({
            from: range.from,
            to: range.to,
            id: targetNote.id,
          });
          return;
        },
      }),
    ];
  },

  addPasteRules() {
    return [
      nodePasteRule({
        find: PASTE_REGEX,
        type: this.type,
        getAttributes: (match) => {
          const rawTitle = typeof match[1] === "string" ? match[1].trim() : "";
          if (!rawTitle) return false;
          const targetNote = noteStore
            .get("notes")
            .find((n) => n.title.toLowerCase() === rawTitle.toLowerCase());
          if (!targetNote) return false;
          return {
            id: targetNote.id,
          };
        },
      }),
    ];
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
            if (!pluginState) return DecorationSet.empty;
            const span = document.createElement("span");
            span.className = "autocomplete";
            span.textContent = pluginState.autocompleteText;
            return DecorationSet.create(state.doc, [
              Decoration.widget(pluginState.to, span, { side: 1 }),
            ]);
          },
        },
      }),
    ];
  },

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
});

export { WikiLink };
