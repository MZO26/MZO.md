import { openExternal } from "@/api/api";
import { promptImageUpload } from "@/extensions/image/image";
import { openMathDialog } from "@/extensions/overrides/mathematics";
import type { LinkAttributes } from "@shared/types";
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
      "Mod-Shift-e": () => {
        openMathDialog(this.editor, {
          mode: "insert",
          type: "inline",
          initialValue: "",
        });
        return true;
      },
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
      "Mod-Shift-m": () => {
        openMathDialog(this.editor, {
          mode: "insert",
          type: "block",
          initialValue: "",
        });
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
        const { selection } = this.editor.state;
        const $from = selection.$from;
        let extractedUrl: string | undefined;
        const nodeAttrs = this.editor.getAttributes("link") as LinkAttributes;
        extractedUrl = nodeAttrs.href || nodeAttrs.url;
        if (!extractedUrl) {
          const linkMark = $from.marks().find((m) => m.type.name === "link");
          if (linkMark?.attrs) {
            const attrs = linkMark.attrs as LinkAttributes;
            extractedUrl = attrs.href || attrs.url;
          }
        }
        if (!extractedUrl) {
          const textContent = $from.parent.textContent?.trim();
          if (textContent) {
            extractedUrl = /^https?:\/\//i.test(textContent)
              ? textContent
              : `https://${textContent}`;
          }
        }
        if (extractedUrl) {
          void openExternal(extractedUrl);
          return true;
        }
        console.error(
          "[addKeyboardShortcuts -> link-open]: Could not extract a valid URL from the selection.",
        );
        return false;
      },
      "Mod-Shift-Enter": () => {
        const { $from } = this.editor.state.selection;
        // $from.after(1) always points to the position after the root container
        const endPos = $from.after(1);
        return this.editor
          .chain()
          .focus()
          .insertContentAt(endPos, { type: "paragraph" })
          .setTextSelection(endPos + 1)
          .run();
      },
      "Mod-k": () => {
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
