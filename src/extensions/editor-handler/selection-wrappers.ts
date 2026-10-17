import { toggleSingleCodeBlock } from "@/extensions/overrides/codeblock/codeblock-handler";
import { noteStore } from "@/state/state";
import { MOVEABLE_BLOCKS, MOVEABLE_CONTAINERS } from "@/utils/constants";
import { Extension } from "@tiptap/core";
import type { ResolvedPos } from "@tiptap/pm/model";
import { NodeSelection, TextSelection } from "@tiptap/pm/state";

const SelectionWrapper = Extension.create({
  name: "SelectionWrapper",

  addKeyboardShortcuts() {
    const handleItalicBoldWrapper = () => {
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
      "#": () => {
        const { from, to, empty } = this.editor.state.selection;
        if (empty) return false;
        const { doc } = this.editor.state;
        const selectedText = doc.textBetween(from, to, "\n");
        const trimmed = selectedText.trim();
        const charBefore = doc.textBetween(Math.max(0, from - 1), from);
        const replaced = trimmed.replace(/^#/, "");
        const isValidTag =
          replaced.length > 0 &&
          replaced.length <= 100 &&
          /^[\p{L}](?:[\p{L}\p{N}_-]*[\p{L}\p{N}])?$/u.test(replaced);
        if (!isValidTag) return false;
        const hasHashBefore = charBefore === "#";
        const replaceFrom = hasHashBefore ? from - 1 : from;
        return this.editor
          .chain()
          .insertNoteTag({
            from: replaceFrom,
            to: to,
            id: replaced.toLowerCase(),
          })
          .run();
      },
      "[": () => {
        const { from, to, empty } = this.editor.state.selection;
        if (!empty) {
          const { doc } = this.editor.state;
          const selectedText = doc.textBetween(from, to, "\n");
          const trimmed = selectedText.trim();
          const normalized = trimmed.toLowerCase();
          const charBefore = doc.textBetween(Math.max(0, from - 1), from);
          const charAfter = doc.textBetween(
            to,
            Math.min(doc.content.size, to + 1),
          );
          const isValidTitle =
            normalized.length > 0 &&
            normalized.length <= 50 &&
            !selectedText.includes("\n");
          if (charBefore === "[" && charAfter === "]" && isValidTitle) {
            const notes = noteStore.get("notes");
            const existingNote = notes.find(
              (n) => n.title.trim().toLowerCase() === normalized,
            );
            return this.editor
              .chain()
              .insertWikiLink({
                from: from - 1,
                to: to + 1,
                id: existingNote?.id || null,
                title: existingNote?.title || trimmed,
              })
              .run();
          }
          return this.editor
            .chain()
            .insertContentAt(to, "]")
            .insertContentAt(from, "[")
            .setTextSelection({ from: from + 1, to: to + 1 })
            .run();
        }
        return false;
      },
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
        if (isMultiBlock) {
          toggleSingleCodeBlock(this.editor);
          return true;
        }
        return this.editor.commands.toggleCode();
      },
      "~": () => {
        const { empty } = this.editor.state.selection;
        if (empty) return false;
        return this.editor.commands.toggleStrike();
      },
      "+": () => {
        const { empty } = this.editor.state.selection;
        if (empty) return false;
        return this.editor.commands.toggleUnderline();
      },
      "=": () => {
        const { empty } = this.editor.state.selection;
        if (empty) return false;
        return this.editor.commands.toggleHighlight();
      },
      "*": handleItalicBoldWrapper,
      _: handleItalicBoldWrapper,
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
        .command(({ tr, state, dispatch }) => {
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
          if (dispatch) {
            tr.delete(blockStart, blockEnd).insert(insertPos, node);
            if (selection instanceof NodeSelection) {
              tr.setSelection(NodeSelection.create(tr.doc, newCursorPos));
            } else {
              tr.setSelection(TextSelection.create(tr.doc, newCursorPos));
            }
          }
          return true;
        })
        .run();
    };
    const duplicateContent = (direction: "up" | "down") => {
      return this.editor
        .chain()
        .focus()
        .command(({ tr, state, dispatch }) => {
          const { selection } = state;
          const { empty, $from, from, to } = selection;
          if (empty) {
            const depth = $from.depth;
            const blockStart = $from.before(depth);
            const blockEnd = $from.after(depth);
            const node = state.doc.nodeAt(blockStart);
            if (!node) return false;
            if (dispatch) {
              const insertPos = direction === "up" ? blockStart : blockEnd;
              tr.insert(insertPos, node);
            }
          } else {
            if (dispatch) {
              const fragment = selection.content().content;
              const insertPos = direction === "up" ? from : to;
              tr.insert(insertPos, fragment);
            }
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

export { KbSelectionCommands, SelectionWrapper };
