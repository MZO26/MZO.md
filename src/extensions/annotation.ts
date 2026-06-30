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
    level: "inline" as const,
    start: (src: string) => src.indexOf("//"),
    tokenize(src: string) {
      const match = src.match(/^\/\/([^/\n][^/\n]*?)\/\//);
      const text = match?.[1]?.trim();
      if (!match || !text) return undefined;
      return {
        type: "annotation",
        raw: match[0],
        text,
      };
    },
  },

  parseMarkdown(token, helpers) {
    const text = String(token.text ?? "");
    if (!text) {
      return helpers.createTextNode(token.raw ?? "");
    }
    return helpers.applyMark("annotation", [helpers.createTextNode(text)]);
  },

  renderMarkdown(node, helpers) {
    const content = helpers.renderChildren(node);
    return content ? `//${content}//` : "";
  },
});
