import { Extension } from "@tiptap/core";
import { ResolvedPos } from "@tiptap/pm/model";
import { TextSelection } from "@tiptap/pm/state";

function getTableDepthIfLastRow($pos: ResolvedPos) {
  for (let d = $pos.depth; d > 0; d--) {
    const node = $pos.node(d);
    if (node.type.name === "tableCell" || node.type.name === "tableHeader") {
      const tableDepth = d - 2;
      const tableNode = $pos.node(tableDepth);
      const rowIndex = $pos.index(tableDepth);
      const rowspan = node.attrs["rowspan"] || 1;
      if (rowIndex + rowspan === tableNode.childCount) {
        return tableDepth;
      }
      return null;
    }
  }
  return null;
}

export const TableHandler = Extension.create({
  name: "tableHandler",

  addKeyboardShortcuts() {
    return {
      Enter: () => {
        const { state, view } = this.editor;
        const { selection, schema } = state;
        const { $from, empty } = selection;
        if (!empty) return false;
        const tableDepth = getTableDepthIfLastRow($from);
        if (tableDepth === null) return false;
        const cellDepth = tableDepth + 2;
        if (
          $from.depth !== cellDepth + 1 ||
          $from.parent.type.name !== "paragraph" ||
          $from.parent.content.size > 0
        ) {
          return false;
        }
        const insertPos = $from.after(tableDepth);
        const paragraphType = schema.nodes["paragraph"];
        if (!paragraphType) return false;
        const newParagraph = paragraphType.createAndFill();
        if (!newParagraph) return false;
        const tr = state.tr;
        const cellNode = $from.node(cellDepth);
        if (cellNode.childCount > 1) {
          tr.delete($from.before(), $from.after());
        }
        const mappedInsertPos = tr.mapping.map(insertPos);
        tr.insert(mappedInsertPos, newParagraph);
        tr.setSelection(
          TextSelection.near(tr.doc.resolve(mappedInsertPos + 1)),
        ).scrollIntoView();
        view.dispatch(tr);
        return true;
      },
    };
  },
});
