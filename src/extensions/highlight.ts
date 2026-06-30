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
    level: "inline" as const,
    start: (src: string) => src.indexOf("=="),

    tokenize(src: string) {
      const match = src.match(/^==([^=\n][^=\n]*?)==/);
      const text = match?.[1] ?? "";
      if (!match || !text) return undefined;
      return {
        type: "highlight",
        raw: match[0],
        text,
      };
    },
  },

  parseMarkdown(token, helpers) {
    const text = String(token.text ?? "");
    if (!text) return helpers.createTextNode(token.raw ?? "");
    return helpers.applyMark("highlight", [helpers.createTextNode(text)]);
  },

  renderMarkdown(node, helpers) {
    const content = helpers.renderChildren(node);
    return content ? `==${content}==` : "";
  },
});
