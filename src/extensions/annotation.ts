import {
  Mark,
  markInputRule,
  markPasteRule,
  mergeAttributes,
} from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    annotation: {
      setAnnotation: () => ReturnType;
      toggleAnnotation: () => ReturnType;
      unsetAnnotation: () => ReturnType;
    };
  }
}

export const Annotation = Mark.create({
  name: "annotation",

  parseHTML() {
    return [{ tag: "span.annotation" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes({ class: "annotation" }, HTMLAttributes),
      0,
    ];
  },

  addCommands() {
    return {
      setAnnotation:
        () =>
        ({ commands }) =>
          commands.setMark(this.name),

      toggleAnnotation:
        () =>
        ({ commands }) =>
          commands.toggleMark(this.name),

      unsetAnnotation:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name),
    };
  },

  addInputRules() {
    return [
      markInputRule({
        find: /(?:\/\/)([^/\n][^/\n]*?)(?:\/\/)$/,
        type: this.type,
      }),
    ];
  },

  addPasteRules() {
    return [
      markPasteRule({
        find: /(?:\/\/)([^/\n][^/\n]*?)(?:\/\/)/g,
        type: this.type,
      }),
    ];
  },

  markdownTokenName: "annotation",

  markdownTokenizer: {
    name: "annotation",
    level: "inline",
    start: (src: string) => src.indexOf("//"),
    tokenize(src: string, _tokens, lexer) {
      const match = src.match(/^\/\/([\s\S]*?)\/\//);
      if (!match) return undefined;
      const rawText = typeof match[1] === "string" ? match[1].trim() : "";
      if (!rawText) return undefined;
      return {
        type: "annotation",
        raw: match[0],
        rawText,
        tokens: lexer.inlineTokens(rawText),
      };
    },
  },

  parseMarkdown(token, helpers) {
    const content = helpers.parseInline(token.tokens || []);
    return helpers.applyMark("annotation", content);
  },

  renderMarkdown(node, helpers) {
    const content = helpers.renderChildren(node);
    return content ? `//${content}//` : "";
  },
});
