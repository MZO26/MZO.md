import Heading from "@tiptap/extension-heading";
import { Plugin, PluginKey } from "@tiptap/pm/state";

const CustomHeading = Heading.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute("id"),
        renderHTML: (attributes) => {
          if (!attributes["id"]) return {};
          return { id: attributes["id"] };
        },
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("heading-id"),
        appendTransaction: (transactions, _oldState, newState) => {
          if (!transactions.some((tr) => tr.docChanged)) {
            return undefined;
          }
          const tr = newState.tr;
          let modified = false;
          newState.doc.descendants((node, pos) => {
            if (node.type.name === "heading" && !node.attrs["id"]) {
              const id = crypto.randomUUID();
              tr.setNodeMarkup(pos, undefined, { ...node.attrs, id });
              modified = true;
            }
          });
          return modified ? tr : undefined;
        },
      }),
    ];
  },
});

export { CustomHeading };
