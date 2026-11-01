import type { JSONContent } from "@tiptap/core";
import { Extension } from "@tiptap/core";
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
          const headingType = newState.schema.nodes["heading"];
          newState.doc.descendants((node, pos) => {
            if (node.type.spec.code) return false;
            const hasContent = !!node.textContent.trim();
            if (node.type === headingType && hasContent && !node.attrs["id"]) {
              const id = crypto.randomUUID();
              tr.setNodeMarkup(pos, undefined, { ...node.attrs, id });
              modified = true;
              return false;
            }
            if (node.isTextblock) return false;
            return true;
          });
          return modified ? tr : undefined;
        },
      }),
    ];
  },
});

function addHeadingToDoc(doc: JSONContent, titleText: string): JSONContent {
  if (!titleText) return doc;
  const content = [...(doc.content || [])];
  const headingNode = {
    type: "heading",
    attrs: { level: 1 },
    content: [{ type: "text", text: titleText }],
  };
  if (content[0]?.type === "heading") {
    content[0] = headingNode;
  } else {
    content.unshift(headingNode);
  }
  return { ...doc, content };
}

const TitleEnforcer = Extension.create({
  name: "titleEnforcer",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        appendTransaction(_, oldState, newState) {
          if (oldState.doc === newState.doc) return null;
          const firstNode = newState.doc.firstChild;
          const headingType = newState.schema.nodes["heading"];
          if (!firstNode || !headingType) return null;
          if (firstNode.type !== headingType) {
            const tr = newState.tr;
            tr.setNodeMarkup(0, headingType, { level: 1 });
            return tr;
          }
          return null;
        },
      }),
    ];
  },
});

export { addHeadingToDoc, CustomHeading, TitleEnforcer };
