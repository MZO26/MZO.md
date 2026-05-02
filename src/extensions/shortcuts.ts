import { Extension } from "@tiptap/core";
import { promptImageUpload } from "./image/image";

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
    };
  },
});
