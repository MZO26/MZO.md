import { Extension } from "@tiptap/core";
import {
  EditorState,
  NodeSelection,
  Plugin,
  PluginKey,
} from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

const key = new PluginKey("selectionHighlight");

function getCursorDecoration(state: EditorState): DecorationSet {
  const { selection, doc } = state;
  if (!selection.empty) return DecorationSet.empty;
  if (selection instanceof NodeSelection) {
    return DecorationSet.create(doc, [
      Decoration.node(selection.from, selection.to, {
        class: "selection-highlight",
      }),
    ]);
  }
  const { $head } = selection;
  if ($head.depth === 0) return DecorationSet.empty;
  const nodeStart = $head.before($head.depth);
  return DecorationSet.create(doc, [
    Decoration.node(nodeStart, nodeStart + $head.parent.nodeSize, {
      class: "selection-highlight",
    }),
  ]);
}

const SelectionHighlight = Extension.create({
  name: "selectionHighlight",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key,
        state: {
          init: (_, state) => getCursorDecoration(state),
          apply: (tr, oldSet, _oldState, newState) => {
            if (!tr.docChanged && !tr.selectionSet) {
              return oldSet;
            }
            return getCursorDecoration(newState);
          },
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
        },
      }),
    ];
  },
});

export { SelectionHighlight };
