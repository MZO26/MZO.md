import {
  Mark,
  markInputRule,
  markPasteRule,
  mergeAttributes,
} from "@tiptap/core";

const HIGHLIGHT_REGEX = /^==([^=\n][^=\n]*?)==/;
const HIGHLIGHT_PASTE_REGEX = /(?:==)([^=\n][^=\n]*?)(?:==)/g;
const HIGHLIGHT_INPUT_REGEX = /(?:==)([^=\n][^=\n]*?)(?:==)$/;

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    highlight: {
      setHighlight: () => ReturnType;
      toggleHighlight: () => ReturnType;
      unsetHighlight: () => ReturnType;
    };
  }
}

export const Highlight = Mark.create({
  name: "highlight",

  parseHTML() {
    return [{ tag: "mark" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["mark", mergeAttributes(HTMLAttributes), 0];
  },

  addCommands() {
    return {
      setHighlight:
        () =>
        ({ commands }) =>
          commands.setMark(this.name),

      toggleHighlight:
        () =>
        ({ commands }) =>
          commands.toggleMark(this.name),

      unsetHighlight:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name),
    };
  },

  addInputRules() {
    return [
      markInputRule({
        find: HIGHLIGHT_INPUT_REGEX,
        type: this.type,
      }),
    ];
  },

  addPasteRules() {
    return [
      markPasteRule({
        find: HIGHLIGHT_PASTE_REGEX,
        type: this.type,
      }),
    ];
  },

  markdownTokenName: "highlight",

  markdownTokenizer: {
    name: "highlight",
    level: "inline",
    start: (src) => src.indexOf("=="),
    tokenize(src) {
      const match = HIGHLIGHT_REGEX.exec(src);
      if (!match) return undefined;
      const rawText = typeof match[1] === "string" ? match[1].trim() : "";
      if (!rawText) return undefined;
      return {
        type: "highlight",
        raw: match[0],
        rawText,
      };
    },
  },

  parseMarkdown(token, helpers) {
    const content = helpers.parseInline(token.tokens || []);
    return helpers.applyMark("highlight", content);
  },

  renderMarkdown(node, helpers) {
    const content = helpers.renderChildren(node.content || []);
    return content ? `==${content}==` : "";
  },
});
