import { markInputRule, markPasteRule } from "@tiptap/core";
import Underline from "@tiptap/extension-underline";

const UNDERLINE_INPUT_REGEX = /(?:\+\+)((?:[^+\n]+))(?:\+\+)$/;
const UNDERLINE_PASTE_REGEX = /(?:\+\+)((?:[^+\n]+))(?:\+\+)/g;

const CustomUnderline = Underline.extend({
  addInputRules() {
    return [
      markInputRule({
        find: UNDERLINE_INPUT_REGEX,
        type: this.type,
      }),
    ];
  },
  addPasteRules() {
    return [
      markPasteRule({
        find: UNDERLINE_PASTE_REGEX,
        type: this.type,
      }),
    ];
  },
});

export { CustomUnderline };
