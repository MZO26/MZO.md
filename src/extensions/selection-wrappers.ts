import { Extension } from "@tiptap/core";

const CodeSelectionWrapper = Extension.create({
  name: "codeSelectionWrapper",

  addKeyboardShortcuts() {
    return {
      "`": () => {
        const { empty, $from, $to } = this.editor.state.selection;
        if (empty) return false;
        let isMultiBlock = !$from.sameParent($to);
        if (!isMultiBlock) {
          this.editor.state.doc.nodesBetween($from.pos, $to.pos, (node) => {
            if (node.type.name === "hardBreak") {
              isMultiBlock = true;
              return false;
            }
            return true;
          });
        }
        if (isMultiBlock) return this.editor.commands.toggleCodeBlock();
        return this.editor.commands.toggleCode();
      },
    };
  },
});

const StrikeThroughSelectionWrapper = Extension.create({
  name: "strikeThroughSelectionWrapper",

  addKeyboardShortcuts() {
    return {
      "~": () => {
        const { empty } = this.editor.state.selection;
        if (empty) return false;
        return this.editor.commands.toggleStrike();
      },
    };
  },
});

const UnderlineSelectionWrapper = Extension.create({
  name: "underlineSelectionWrapper",

  addKeyboardShortcuts() {
    return {
      "+": () => {
        const { empty } = this.editor.state.selection;
        if (empty) return false;
        return this.editor.commands.toggleUnderline();
      },
    };
  },
});

const HighlightSelectionWrapper = Extension.create({
  name: "highlightSelectionWrapper",

  addKeyboardShortcuts() {
    return {
      "=": () => {
        const { empty } = this.editor.state.selection;
        if (empty) return false;
        return this.editor.commands.toggleHighlight();
      },
    };
  },
});

const ItalicAndBoldSelectionWrapper = Extension.create({
  name: "italicAndBoldSelectionWrapper",

  addKeyboardShortcuts() {
    const handleFormatKey = () => {
      if (this.editor.state.selection.empty) {
        return false;
      }
      if (this.editor.isActive("bold")) {
        return this.editor.commands.unsetBold();
      }
      if (this.editor.isActive("italic")) {
        return this.editor.chain().unsetItalic().setBold().run();
      }
      return this.editor.commands.setItalic();
    };
    return {
      "*": handleFormatKey,
      _: handleFormatKey,
    };
  },
});

export {
  CodeSelectionWrapper,
  HighlightSelectionWrapper,
  ItalicAndBoldSelectionWrapper,
  StrikeThroughSelectionWrapper,
  UnderlineSelectionWrapper,
};
