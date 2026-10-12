import { useCore, useDialog } from "@/utils/registry";
import type { MathOptions } from "@/utils/types";
import type { Editor } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";

function openMathDialog(editor: Editor, options: MathOptions) {
  const { mathDialog, mathInput } = useDialog("mathDialog", "mathInput");
  mathInput.value = options.initialValue ?? "";
  mathDialog.showModal();
  mathDialog.addEventListener(
    "close",
    () => {
      if (mathDialog.returnValue !== "confirm") return;
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
    },
    { once: true },
  );
}

function handleMathClick(node: ProseMirrorNode, pos: number) {
  const { editor } = useCore("editor");
  openMathDialog(editor, {
    mode: "update",
    type: node.type.name === "inlineMath" ? "inline" : "block",
    pos,
    initialValue: node.attrs["latex"] ?? "",
  });
}

export { handleMathClick, openMathDialog };
