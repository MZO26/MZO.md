import { MOVEABLE_BLOCKS, MOVEABLE_CONTAINERS } from "@/utils/constants";
import { Extension } from "@tiptap/core";
import type { ResolvedPos } from "@tiptap/pm/model";
import { NodeSelection, TextSelection } from "@tiptap/pm/state";

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

const KbSelectionCommands = Extension.create({
  name: "kbSelectionCommands",
  addKeyboardShortcuts() {
    function getMovableDepth($pos: ResolvedPos): number {
      for (let d = $pos.depth; d > 0; d--) {
        const nodeType = $pos.node(d).type.name;
        if (MOVEABLE_CONTAINERS.has(nodeType)) {
          return d;
        }
      }
      return 1;
    }
    const moveBlock = (direction: "up" | "down") => {
      return this.editor
        .chain()
        .focus()
        .command(({ tr, state }) => {
          const { selection } = this.editor.state;
          const { $from } = selection;
          const depth = getMovableDepth($from);
          const blockStart = $from.before(depth);
          const blockEnd = $from.after(depth);
          const node = state.doc.nodeAt(blockStart);
          if (!node || !MOVEABLE_BLOCKS.has(node.type.name)) return false;
          const $posBefore = state.doc.resolve(blockStart);
          const $posAfter = state.doc.resolve(blockEnd);
          const neighborNode =
            direction === "up" ? $posBefore.nodeBefore : $posAfter.nodeAfter;
          if (!neighborNode) return false;
          const insertPos =
            direction === "up"
              ? blockStart - neighborNode.nodeSize
              : blockStart + neighborNode.nodeSize;
          const cursorOffset = selection.from - blockStart;
          // get relative offset to set cursor into block
          const newCursorPos = insertPos + cursorOffset;
          tr.delete(blockStart, blockEnd).insert(insertPos, node);
          if (selection instanceof NodeSelection) {
            tr.setSelection(NodeSelection.create(tr.doc, newCursorPos));
          } else {
            tr.setSelection(TextSelection.create(tr.doc, newCursorPos));
          }
          return true;
        })
        .run();
    };
    const duplicateContent = (direction: "up" | "down") => {
      return this.editor
        .chain()
        .focus()
        .command(({ tr, state }) => {
          const { selection } = state;
          const { empty, $from, from, to } = selection;
          if (empty) {
            const depth = $from.depth;
            const blockStart = $from.before(depth);
            const blockEnd = $from.after(depth);
            const node = state.doc.nodeAt(blockStart);
            if (!node) return false;
            const insertPos = direction === "up" ? blockStart : blockEnd;
            const slice = node.slice(0, node.content.size);
            tr.replace(insertPos, insertPos, slice);
          } else {
            const slice = selection.content();
            const insertPos = direction === "up" ? from : to;
            tr.replace(insertPos, insertPos, slice);
          }
          return true;
        })
        .run();
    };
    return {
      "Shift-Alt-ArrowUp": () => duplicateContent("up"),
      "Shift-Alt-ArrowDown": () => duplicateContent("down"),
      "Alt-ArrowUp": () => moveBlock("up"),
      "Alt-ArrowDown": () => moveBlock("down"),
    };
  },
});

export {
  CodeSelectionWrapper,
  HighlightSelectionWrapper,
  ItalicAndBoldSelectionWrapper,
  KbSelectionCommands,
  StrikeThroughSelectionWrapper,
  UnderlineSelectionWrapper,
};
