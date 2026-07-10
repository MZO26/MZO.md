import {
  Mark,
  markInputRule,
  markPasteRule,
  mergeAttributes,
} from "@tiptap/core";

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
        find: /(?:==)([^=\n][^=\n]*?)(?:==)$/,
        type: this.type,
      }),
    ];
  },

  addPasteRules() {
    return [
      markPasteRule({
        find: /(?:==)([^=\n][^=\n]*?)(?:==)/g,
        type: this.type,
      }),
    ];
  },

  markdownTokenName: "highlight",

  markdownTokenizer: {
    name: "highlight",
    level: "inline",
    start: (src) => src.indexOf("=="),

    tokenize(src, _tokens, lexer) {
      const match = src.match(/^==([^=\n][^=\n]*?)==/);
      if (!match) return undefined;
      const rawText = typeof match[1] === "string" ? match[1].trim() : "";
      if (!rawText) return undefined;
      return {
        type: "highlight",
        raw: match[0],
        rawText,
        tokens: lexer.inlineTokens(rawText),
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
