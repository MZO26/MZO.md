import { InputRule, mergeAttributes, Node } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";

export interface NoteTagOptions {
  onClick: (id: string) => void | Promise<void>;
}

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

  addOptions() {
    return {
      onClick: () => {},
    };
  },

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
});

export { NoteTag };
