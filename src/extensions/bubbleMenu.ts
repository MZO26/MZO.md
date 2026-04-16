import { Editor } from "@tiptap/core";
import { CellSelection } from "@tiptap/pm/tables";
import { showToast } from "../utils/toast";

class BubbleMenuManager {
  element: HTMLElement;
  constructor(element: HTMLElement) {
    this.element = element;
  }
  attach(editor: Editor) {
    const actions = {
      copy: () => this.copySelectedText(editor),
      alignStart: () => editor.chain().focus().setTextAlign("start").run(),
      alignCenter: () => editor.chain().focus().setTextAlign("center").run(),
      alignEnd: () => editor.chain().focus().setTextAlign("end").run(),
      alignJustify: () => editor.chain().focus().setTextAlign("justify").run(),
      addRowAfter: () => editor.chain().focus().addRowAfter().run(),
      addColumnAfter: () => editor.chain().focus().addColumnAfter().run(),
      deleteTable: () => this.handleTableDelete(editor),
    };
    Object.entries(actions).forEach(([actionName, command]) => {
      this.element
        .querySelector(`[data-action="${actionName}"]`)
        ?.addEventListener("click", command);
    });
    const formatTools = this.element.querySelector(
      "#format-tools",
    ) as HTMLElement;
    const tableTools = this.element.querySelector(
      "#table-tools",
    ) as HTMLElement;
    editor.on("selectionUpdate", () => {
      const isTable = editor.isActive("table");
      if (isTable) {
        formatTools.style.display = "none";
        tableTools.style.display = "flex";
      } else {
        formatTools.style.display = "flex";
        tableTools.style.display = "none";
      }
      Object.keys(actions).forEach((actionName) => {
        this.element
          .querySelector(`[data-action="${actionName}"]`)
          ?.classList.toggle("is-active", editor.isActive(actionName));
      });
    });
  }
  async copySelectedText(editor: Editor) {
    const { from, to, empty } = editor.state.selection;

    if (empty) return;

    const text = editor.state.doc.textBetween(from, to, "\n");

    try {
      await navigator.clipboard.writeText(text);
      showToast("Copied to clipboard");
    } catch (error) {
      showToast("Copy failed");
      console.error(error);
    }
  }

  handleTableDelete(editor: Editor) {
    const { selection } = editor.state;
    if (selection instanceof CellSelection) {
      if (selection.isRowSelection?.()) {
        return editor.chain().focus().deleteRow().run();
      }
      if (selection.isColSelection?.()) {
        return editor.chain().focus().deleteColumn().run();
      } else {
        return editor.chain().focus().deleteTable().run();
      }
    } else return;
  }
}

export default BubbleMenuManager;
