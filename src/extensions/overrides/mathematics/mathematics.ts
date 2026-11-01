import { InputRule, PasteRule } from "@tiptap/core";
import { BlockMath, InlineMath } from "@tiptap/extension-mathematics";

const INLINE_MATH_INPUT_REGEX = /(?<!\$)\$([^$\n]+?)\$(?!\$)$/;
const INLINE_MATH_PASTE_REGEX = /(?<!\$)\$([^$\n]+?)\$(?!\$)/g;
const INLINE_MATH_TOKENIZER_REGEX =
  /^\$(?!\$)(?!\s)([^$\r\n]+?)(?<!\s)\$(?!\$)/;
const INLINE_MATH_START_REGEX = /\$(?!\$)/;

const BLOCK_MATH_INPUT_REGEX = /(?<!\$)\$\$([\s\S]+?)\$\$$/;
const BLOCK_MATH_TOKENIZER_REGEX = /^\$\$\r?\n?([\s\S]+?)\r?\n?\$\$(?:\r?\n|$)/;

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
    start: (src: string) => {
      return src.search(INLINE_MATH_START_REGEX);
    },
    tokenize: (src: string) => {
      const match = INLINE_MATH_TOKENIZER_REGEX.exec(src);
      if (!match) return undefined;
      const [raw, latex = ""] = match;
      const trimmedLatex = latex.trim();
      if (!trimmedLatex) return undefined;
      return {
        type: "inlineMath",
        raw,
        latex: trimmedLatex,
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
    return [];
  },

  markdownTokenizer: {
    name: "blockMath",
    level: "block",
    start: (src) => src.indexOf("$$"),
    tokenize: (src) => {
      const match = BLOCK_MATH_TOKENIZER_REGEX.exec(src);
      if (!match) return undefined;
      const [raw, latex = ""] = match;
      if (!latex.trim()) return undefined;
      return {
        type: "blockMath",
        raw,
        latex: latex.trim(),
      };
    },
  },
  parseMarkdown: (token, helpers) => {
    return helpers.createNode("blockMath", { latex: token["latex"] });
  },
});

export { CustomBlockMath, CustomInlineMath };
