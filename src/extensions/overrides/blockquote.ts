import Blockquote from "@tiptap/extension-blockquote";
import { TextSelection } from "@tiptap/pm/state";

const CustomBlockquote = Blockquote.extend({
  content: "(paragraph | bulletList | orderedList | taskList)+",

  addKeyboardShortcuts() {
    return {
      ...this.parent?.(),
      Backspace: ({ editor }) => {
        const { state } = editor;
        const { $from, empty } = state.selection;
        if (!empty || $from.parent.type.name !== "paragraph" || $from.parent.content.size > 0) {
          return false;
        }
        const bqDepth = $from.depth - 1;
        if (bqDepth < 1 || $from.node(bqDepth).type.name !== this.name) return false;
        if ($from.index(bqDepth) !== 0) return false;
        const bqPos = $from.before(bqDepth);
        if (bqPos === 0) return false;
        return editor.commands.command(({ tr, dispatch }) => {
          if (!dispatch) return true;
          const bqNode = $from.node(bqDepth);
          if (bqNode.childCount === 1) {
            tr.delete(bqPos, $from.after(bqDepth));
          } else {
            tr.delete($from.before($from.depth), $from.after($from.depth));
          }
          tr.setSelection(TextSelection.near(tr.doc.resolve(bqPos), -1));
          tr.scrollIntoView();
          return true;
        });
      },
    };
  },
});

export { CustomBlockquote };
