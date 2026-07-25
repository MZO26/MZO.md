import { noteStore } from "@/state/state";
import { InputRule, mergeAttributes, Node, nodePasteRule } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";

const UUID_PATTERN = "([a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12})";
const INPUT_REGEX = /(?<!!)\[\[([^\]]+)\]\]$/;
const PASTE_REGEX = /\[\[([^\]]+)\]\]/g;
const EXACT_UUID_REGEX = new RegExp(`^${UUID_PATTERN}$`, "i");

export interface WikiLinkOptions {
  onClick: (id: string) => void | Promise<void>;
}

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

  addOptions() {
    return {
      onClick: () => {},
    };
  },

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
    const noteId = noteStore.get("noteIndex").get(normalizedText)?.id;
    if (noteId) {
      return { type: "wikilink", attrs: { id: noteId } };
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
});

export { WikiLink };
