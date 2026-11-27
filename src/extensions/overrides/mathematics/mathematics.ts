import { InputRule, nodePasteRule, PasteRule } from "@tiptap/core";
import { BlockMath, InlineMath } from "@tiptap/extension-mathematics";

const INLINE_MATH_INPUT_REGEX = /(?<!\$)\$(?!\s)([^$\n]+)(?<!\s)\$$/;
const INLINE_MATH_PASTE_REGEX = /(?<!\$)\$(?!\s)([^$\n]+)(?<!\s)\$(?!\$)/g;
const BLOCK_MATH_INPUT_REGEX = /(?<!\$)\$\$(.+?)\$\$$/s;
const BLOCK_MATH_PASTE_REGEX = /(?<!\$)\$\$(.+?)\$\$(?!\$)/gs;
const INLINE_MATH_REGEX = /^\$(?!\s)([^$\n]+)(?<!\s)\$(?!\$)/;
const BLOCK_MATH_REGEX = /^\$\$\n?(.+?)\n?\$\$(?:\n|$)/s;

const CustomInlineMath = InlineMath.extend({
  addInputRules() {
    return [
      new InputRule({
        find: INLINE_MATH_INPUT_REGEX,
        handler: ({ range, match, commands }) => {
          const latex = typeof match[1] === "string" ? match[1].trim() : "";
          if (!latex) return null;
          commands.insertContentAt(range, {
            type: this.type.name,
            attrs: { latex },
          });
          return;
        },
      }),
    ];
  },

  addPasteRules() {
    return [
      new PasteRule({
        find: INLINE_MATH_PASTE_REGEX,
        handler: ({ range, match, commands }) => {
          const latex = typeof match[1] === "string" ? match[1].trim() : "";
          if (!latex) return null;
          commands.insertContentAt(range, {
            type: this.type.name,
            attrs: { latex },
          });
          return;
        },
      }),
    ];
  },

  markdownTokenizer: {
    name: "inlineMath",
    level: "inline",
    start: (src: string) => src.indexOf("$"),
    tokenize: (src: string) => {
      const match = INLINE_MATH_REGEX.exec(src);
      if (!match) return undefined;
      const latex = typeof match[1] === "string" ? match[1].trim() : "";
      if (!latex) return undefined;
      return {
        type: "inlineMath",
        raw: match[0],
        latex,
      };
    },
  },
  parseMarkdown: (token, helpers) => {
    return helpers.createNode("inlineMath", {
      latex: token["latex"],
    });
  },
  renderMarkdown: (node) => {
    return `$${node.attrs?.["latex"] ?? ""}$`;
  },
});

const CustomBlockMath = BlockMath.extend({
  addInputRules() {
    return [
      new InputRule({
        find: BLOCK_MATH_INPUT_REGEX,
        handler: ({ range, match, commands }) => {
          const latex = typeof match[1] === "string" ? match[1].trim() : "";
          if (!latex) return null;
          commands.insertContentAt(range, {
            type: this.type.name,
            attrs: { latex },
          });
          return;
        },
      }),
    ];
  },

  addPasteRules() {
    return [
      nodePasteRule({
        find: BLOCK_MATH_PASTE_REGEX,
        type: this.type,
        getAttributes: (match) => {
          const latex = typeof match[1] === "string" ? match[1].trim() : "";
          return latex ? { latex } : false;
        },
      }),
    ];
  },

  markdownTokenizer: {
    name: "blockMath",
    level: "block",
    start: (src) => src.indexOf("$$"),
    tokenize: (src) => {
      const match = BLOCK_MATH_REGEX.exec(src);
      if (!match) return undefined;
      const latex = typeof match[1] === "string" ? match[1].trim() : "";
      if (!latex) return undefined;
      return {
        type: "blockMath",
        raw: match[0],
        latex,
      };
    },
  },
  parseMarkdown: (token, helpers) => {
    return helpers.createNode("blockMath", { latex: token["latex"] });
  },
});

export { CustomBlockMath, CustomInlineMath };
