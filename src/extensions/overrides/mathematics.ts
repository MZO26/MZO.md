import { mathDialog } from "@/settings/dialog-init";
import { requireElement } from "@/utils/dom";
import { getAppItem } from "@/utils/registry";
import type { MathOptions } from "@shared/types";
import type { Editor } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";

const input = requireElement<HTMLTextAreaElement>("#math-input");
function openMathDialog(editor: Editor, options: MathOptions) {
  input.value = options.initialValue ?? "";
  mathDialog.showModal();
  mathDialog.addEventListener(
    "close",
    () => {
      if (mathDialog.returnValue !== "confirm") return;
      editor.chain().focus();
      if (options.mode === "insert") {
        if (options.type === "inline") {
          editor.commands.insertInlineMath({ latex: input.value });
        } else {
          editor.commands.insertBlockMath({ latex: input.value });
        }
        return;
      }
      if (options.type === "inline") {
        editor.commands.updateInlineMath({
          latex: input.value,
          pos: options.pos,
        });
      } else {
        editor.commands.updateBlockMath({
          latex: input.value,
          pos: options.pos,
        });
      }
    },
    { once: true },
  );
}

function handleMathClick(node: ProseMirrorNode, pos: number) {
  const editor = getAppItem("editor");
  openMathDialog(editor, {
    mode: "update",
    type: node.type.name === "inlineMath" ? "inline" : "block",
    pos,
    initialValue: node.attrs["latex"] ?? "",
  });
}

export { handleMathClick, openMathDialog };
