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
      "Mod-Shift-x": () => this.editor.commands.toggleStrike(),
      "Mod-Shift-h": () => this.editor.commands.toggleHighlight(),
      "Mod-Shift-a": () => this.editor.commands.toggleAnnotation(),
      "Mod-e": () => this.editor.commands.toggleCode(),
      "Mod-Alt-1": () => this.editor.commands.toggleHeading({ level: 1 }),
      "Mod-Alt-2": () => this.editor.commands.toggleHeading({ level: 2 }),
      "Mod-Alt-3": () => this.editor.commands.toggleHeading({ level: 3 }),
      "Mod-Shift-8": () => this.editor.commands.toggleBulletList(),
      "Mod-Shift-7": () => this.editor.commands.toggleOrderedList(),
      "Mod-Shift-9": () => this.editor.commands.toggleTaskList(),
      "Mod-Shift-b": () => this.editor.commands.toggleBlockquote(),
      "Mod-Alt-c": () => this.editor.commands.toggleCodeBlock(),
      "Mod-Shift--": () => this.editor.commands.setHorizontalRule(),
      "Mod-Shift-f": () => this.editor.commands.setFootnote(),
      "Mod-Alt-t": () =>
        this.editor.commands.insertTable({
          rows: 3,
          cols: 3,
          withHeaderRow: true,
        }),
      "Mod-Alt-i": () => {
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
      "Mod-Alt-d": () => {
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
