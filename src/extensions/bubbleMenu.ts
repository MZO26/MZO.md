import { Editor, getMarkRange } from "@tiptap/core";
import { CellSelection } from "@tiptap/pm/tables";
import type { BubbleMenuCommands } from "../../shared/types";
import { showToast } from "../utils/toast";
import { detectCodeBlockLanguage } from "./languages";

class BubbleMenuManager {
  element: HTMLElement;
  constructor(element: HTMLElement) {
    this.element = element;
  }
  attach(editor: Editor) {
    const actions: Record<string, BubbleMenuCommands> = {
      // text actions
      copy: () => this.copySelectedText(editor),
      delete: () => this.smartDelete(editor),
      selectFontSize: (value: string | undefined) => {
        if (!value) return;
        if (editor.isActive("codeBlock")) {
          if (value === "unset") {
            editor
              .chain()
              .focus()
              .updateAttributes("codeBlock", { fontSize: null })
              .run();
          } else {
            editor
              .chain()
              .focus()
              .updateAttributes("codeBlock", { fontSize: value })
              .run();
          }
          return;
        }
        if (editor.isActive("code")) {
          if (value === "unset") {
            editor
              .chain()
              .focus()
              .updateAttributes("code", { fontSize: null })
              .run();
          } else {
            editor
              .chain()
              .focus()
              .updateAttributes("code", { fontSize: value })
              .run();
          }
          return;
        }
        if (value === "unset") {
          editor.chain().focus().unsetFontSize().run();
          return;
        }
        editor.chain().focus().setFontSize(value).run();
      },
      selectLineHeight: (value: string | undefined) => {
        if (!value) return;
        if (editor.isActive("codeBlock")) {
          editor
            .chain()
            .focus()
            .updateAttributes("codeBlock", {
              lineHeight: value === "unset" ? null : value,
            })
            .run();
          return;
        }
        if (editor.isActive("code")) {
          editor
            .chain()
            .focus()
            .updateAttributes("code", {
              lineHeight: value === "unset" ? null : value,
            })
            .run();
          return;
        }
        if (value === "unset") {
          editor.chain().focus().unsetLineHeight().run();
          return;
        }
        editor.chain().focus().setLineHeight(value).run();
      },
      alignStart: () => editor.chain().focus().setTextAlign("start").run(),
      alignCenter: () => editor.chain().focus().setTextAlign("center").run(),
      alignEnd: () => editor.chain().focus().setTextAlign("end").run(),
      alignJustify: () => editor.chain().focus().setTextAlign("justify").run(),
      // table actions
      addRowAfter: () => editor.chain().focus().addRowAfter().run(),
      addColumnAfter: () => editor.chain().focus().addColumnAfter().run(),
      addRowBefore: () => editor.chain().focus().addRowBefore().run(),
      addColumnBefore: () => editor.chain().focus().addColumnBefore().run(),
      deleteTable: () => this.handleTableDelete(editor),
      // code block actions
      copyBlock: () => this.copyBlock(editor),
      duplicate: () => this.duplicateCodeBlock(editor),
      toggleLanguage: () => this.toggleLanguage(editor),
      // inline code actions
      removeFormat: () => editor.chain().focus().toggleMark("code").run(),
      promote: () => this.promoteToCodeBlock(editor),
    };
    Object.entries(actions).forEach(([actionName, command]) => {
      const elements = this.element.querySelectorAll(
        `[data-action="${actionName}"]`,
      );
      if (!elements) return;
      elements.forEach((el) => {
        if (el.tagName === "SELECT") {
          const selectEl = el as HTMLSelectElement;
          const isFontSize = selectEl.id === "font-size";
          const isLineHeight = selectEl.id === "line-height";
          selectEl.addEventListener("change", () => {
            const value = selectEl.value;
            if (isFontSize) {
              if (value === "unset")
                editor.chain().focus().unsetFontSize().run();
              else command(value);
            }
            if (isLineHeight) {
              if (value === "unset")
                editor.chain().focus().unsetLineHeight().run();
              else command(value);
            }
          });
          editor.on("selectionUpdate", ({ editor }) => {
            if (isFontSize) {
              const attributes = editor.getAttributes("textStyle");
              selectEl.value = attributes["fontSize"] || "unset";
            }
            if (isLineHeight) {
              const pAttrs = editor.getAttributes("paragraph");
              const hAttrs = editor.getAttributes("heading");
              const cAttrs = editor.getAttributes("codeBlock");
              selectEl.value =
                pAttrs["lineHeight"] ||
                hAttrs["lineHeight"] ||
                cAttrs["lineHeight"] ||
                "unset";
            }
          });
        } else {
          el.addEventListener("click", (e) => {
            e.preventDefault();
            command();
          });
        }
      });
    });
    editor.on("selectionUpdate", () => {
      const menuState = editor.isActive("table")
        ? "table"
        : editor.isActive("codeBlock")
          ? "codeBlock"
          : editor.isActive("code")
            ? "inlineCode"
            : "text";

      this.element.dataset["activeMenu"] = menuState;

      Object.keys(actions).forEach((actionName) => {
        const buttons = this.element.querySelectorAll(
          `[data-action="${actionName}"]`,
        );
        buttons.forEach((button) => {
          button.classList.toggle("is-active", editor.isActive(actionName));
        });
      });
    });
  }

  async copySelectedText(editor: Editor) {
    const { empty, from, to } = editor.state.selection;
    let textToCopy = "";
    if (empty) return;
    else {
      textToCopy = editor.state.doc.textBetween(from, to, "\n");
    }
    if (!textToCopy) return;
    try {
      await navigator.clipboard.writeText(textToCopy);
      showToast("Copied selected text");
    } catch (error) {
      showToast("Copy failed");
      console.error("Clipboard error: ", error);
    }
  }

  async copyBlock(editor: Editor) {
    const { $from } = editor.state.selection;
    const node = $from.parent;
    try {
      await navigator.clipboard.writeText(node.textContent);
      showToast("Copied block");
    } catch (error) {
      showToast("Copy failed");
      console.error("Clipboard error: ", error);
    }
  }

  handleTableDelete(editor: Editor) {
    const { selection } = editor.state;
    if (selection instanceof CellSelection) {
      const isWholeTableSelected =
        selection.isRowSelection?.() && selection.isColSelection?.();
      if (!isWholeTableSelected) {
        if (selection.isRowSelection?.()) {
          return editor.chain().focus().deleteRow().run();
        }
        if (selection.isColSelection?.()) {
          return editor.chain().focus().deleteColumn().run();
        }
      }
    }
    if (editor.isActive("table")) {
      return editor.chain().focus().deleteTable().run();
    } else return;
  }

  duplicateCodeBlock(editor: Editor) {
    const { state, view } = editor;
    const { $from } = state.selection;
    for (let depth = $from.depth; depth > 0; depth--) {
      const node = $from.node(depth);
      if (node.type.name === "codeBlock") {
        const insertPos = $from.after(depth);
        const clonedNode = node.copy(node.content);
        const tr = state.tr.insert(insertPos, clonedNode);
        view.dispatch(tr);
        return true;
      }
    }
    return false;
  }

  promoteToCodeBlock(editor: Editor) {
    if (!editor.isActive("code")) return false;
    const { state } = editor;
    const { $from } = state.selection;
    const codeMarkType = state.schema.marks["code"];
    if (!codeMarkType) return false;
    const range = getMarkRange($from, codeMarkType);
    if (!range) return false;
    const codeText = state.doc.textBetween(range.from, range.to);
    editor
      .chain()
      .focus()
      .deleteRange({ from: range.from, to: range.to })
      .insertContent({
        type: "codeBlock",
        content: [{ type: "text", text: codeText }],
      })
      .run();
    return true;
  }

  toggleLanguage(editor: Editor) {
    const isEnabled = editor.getAttributes("codeBlock")["showLanguage"]; // set if badge is already visible

    if (isEnabled) {
      editor
        .chain()
        .focus()
        .updateAttributes("codeBlock", { showLanguage: false })
        .run();
      return true;
    } // turn badge off if already enabled

    const detectedLanguage = detectCodeBlockLanguage(editor);
    //if lowlight finds a language, shows language and updates it
    if (detectedLanguage) {
      editor.commands.updateAttributes("codeBlock", {
        showLanguage: true,
        language: detectedLanguage,
      });
    }
    return true;
  }

  smartDelete(editor: Editor) {
    const { empty } = editor.state.selection;
    if (!empty) {
      editor.chain().focus().deleteSelection().run();
      showToast("Deleted selection");
      return;
    }
    if (editor.isActive("codeBlock")) {
      editor.chain().focus().deleteNode("codeBlock").run();
    } else {
      console.log("No specific block to delete");
    }
  }
}

export default BubbleMenuManager;
