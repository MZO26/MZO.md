import { showDialog } from "@/utils/helpers";
import { useCore, useDialog } from "@/utils/registry";
import type { MathOptions } from "@/utils/types";
import type { Editor } from "@tiptap/core";
import { Node as PMNode } from "@tiptap/pm/model";

async function openMathDialog(editor: Editor, options: MathOptions) {
  const { mathDialog, mathInput } = useDialog("mathDialog", "mathInput");
  mathInput.value = options.initialValue ?? "";
  const result = await showDialog(mathDialog);
  if (result !== "confirm") return;
  editor.chain().focus();
  if (options.mode === "insert") {
    if (options.type === "inline") {
      editor.commands.insertInlineMath({ latex: mathInput.value });
    } else {
      editor.commands.insertBlockMath({ latex: mathInput.value });
    }
    return;
  }
  if (options.type === "inline") {
    editor.commands.updateInlineMath({
      latex: mathInput.value,
      pos: options.pos,
    });
  } else {
    editor.commands.updateBlockMath({
      latex: mathInput.value,
      pos: options.pos,
    });
  }
}

async function handleMathClick(node: PMNode, pos: number) {
  const { editor } = useCore("editor");
  await openMathDialog(editor, {
    mode: "update",
    type: node.type.name === "inlineMath" ? "inline" : "block",
    pos,
    initialValue: node.attrs["latex"] ?? "",
  });
}

export { handleMathClick, openMathDialog };
