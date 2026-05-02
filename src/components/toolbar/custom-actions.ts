import { showToast } from "@/utils/toast";
import { Editor, getMarkRange } from "@tiptap/core";
import { CellSelection } from "@tiptap/pm/tables";

async function copySelectedText(editor: Editor) {
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

async function copyBlock(editor: Editor) {
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

function handleTableDelete(editor: Editor) {
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

function duplicateCodeBlock(editor: Editor) {
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

function promoteToCodeBlock(editor: Editor) {
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

function smartDelete(editor: Editor) {
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

export {
  copyBlock,
  copySelectedText,
  duplicateCodeBlock,
  handleTableDelete,
  promoteToCodeBlock,
  smartDelete,
};
