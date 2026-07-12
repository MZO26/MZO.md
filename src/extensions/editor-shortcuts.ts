import { openExternal } from "@/api/api";
import { promptImageUpload } from "@/extensions/image/image";
import { Extension } from "@tiptap/core";
import { CellSelection } from "@tiptap/pm/tables";

export const MasterShortcuts = Extension.create({
  name: "masterShortcuts",

  addKeyboardShortcuts() {
    return {
      "Mod-z": () => this.editor.commands.undo(),
      "Mod-y": () => this.editor.commands.redo(),
      "Mod-Shift-z": () => this.editor.commands.redo(),
      "Mod-b": () => this.editor.commands.toggleBold(),
      "Mod-i": () => this.editor.commands.toggleItalic(),
      "Mod-s": () => this.editor.commands.toggleStrike(),
      "Mod-h": () => this.editor.commands.toggleHighlight(),
      "Mod-e": () => this.editor.commands.toggleCode(),
      "Mod-Shift-1": () => this.editor.commands.toggleHeading({ level: 1 }),
      "Mod-Shift-2": () => this.editor.commands.toggleHeading({ level: 2 }),
      "Mod-Shift-3": () => this.editor.commands.toggleHeading({ level: 3 }),
      "Mod-Shift-4": () => this.editor.commands.toggleHeading({ level: 4 }),
      "Mod-Shift-5": () => this.editor.commands.toggleHeading({ level: 5 }),
      "Mod-Shift-6": () => this.editor.commands.toggleHeading({ level: 6 }),
      "Mod-Shift-l": () => this.editor.commands.toggleBulletList(),
      "Mod-Shift-o": () => this.editor.commands.toggleOrderedList(),
      "Mod-Shift-t": () => this.editor.commands.toggleTaskList(),
      "Mod-Shift-b": () => this.editor.commands.toggleBlockquote(),
      "Mod-Shift-c": () => this.editor.commands.toggleCodeBlock(),
      "Mod-Shift-r": () => this.editor.commands.setHorizontalRule(),
      "Mod-Shift-d": () => this.editor.commands.toggleDetailsBlock(),
      "Mod-Alt-t": () =>
        this.editor.commands.insertTable({
          rows: 3,
          cols: 3,
          withHeaderRow: true,
        }),
      "Mod-Shift-m": () => {
        promptImageUpload(this.editor);
        return true;
      },
      "Mod-Alt-ArrowDown": () => this.editor.commands.addRowAfter(),
      "Mod-Alt-ArrowUp": () => this.editor.commands.addRowBefore(),
      "Mod-Alt-ArrowRight": () => this.editor.commands.addColumnAfter(),
      "Mod-Alt-ArrowLeft": () => this.editor.commands.addColumnBefore(),
      "Mod-Alt-Backspace": () => {
        const { selection } = this.editor.state;
        if (!(selection instanceof CellSelection)) {
          return false;
        }
        const isRow = selection.isRowSelection();
        const isCol = selection.isColSelection();
        const isWholeTableSelected = isRow && isCol;
        if (isWholeTableSelected) {
          return this.editor.chain().focus().deleteTable().run();
        }
        if (isRow) {
          return this.editor.chain().focus().deleteRow().run();
        }
        if (isCol) {
          return this.editor.chain().focus().deleteColumn().run();
        }
        return false;
      },
      "Mod-d": () => {
        this.editor.view.dom.classList.toggle("focus-mode-active");
        return true;
      },
      "Mod-Alt-Enter": () => {
        if (!this.editor.isActive("link")) return false;
        const href = this.editor.getAttributes("link")["href"];
        if (!href) return false;
        void openExternal(href);
        return true;
      },
      "Mod-k": () => {
        if (!this.editor) return false;
        if (this.editor.isActive("link")) {
          return this.editor
            .chain()
            .focus()
            .extendMarkRange("link")
            .unsetLink()
            .run();
        }
        return this.editor.chain().focus().setLink({ href: "" }).run();
      },
      Escape: () => this.editor.commands.blur(),
    };
  },
});
