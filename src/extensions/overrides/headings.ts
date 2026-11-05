import { Extension, type JSONContent } from "@tiptap/core";
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
            const hasContent = !!node.textContent.trim();
            if (node.type === headingType && hasContent && !node.attrs["id"]) {
              if (!headingType.validContent(node.content)) return false;
              const id = crypto.randomUUID();
              tr.setNodeAttribute(pos, "id", id);
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
            const canConvert =
              firstNode.isTextblock &&
              headingType.validContent(firstNode.content);
            if (canConvert) {
              tr.setBlockType(0, firstNode.nodeSize - 2, headingType, {
                level: 1,
              });
            } else {
              const emptyHeading = headingType.create({ level: 1 });
              tr.insert(0, emptyHeading);
            }
            return tr;
          }
          return null;
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

export { addHeadingToDoc, CustomHeading, TitleEnforcer };
