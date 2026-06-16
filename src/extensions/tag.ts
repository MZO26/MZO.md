import { InputRule, mergeAttributes, Node } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

export interface NoteTagOptions {
  onClick: (id: string) => void | Promise<void>;
}

const NoteTag = Node.create<NoteTagOptions>({
  name: "noteTag",
  group: "inline",
  inline: true,
  atom: true,
  selectable: false,

  addOptions: () => ({
    onClick: () => {},
  }),

  addAttributes: () => ({
    id: {
      default: null,
    },
  }),
  parseHTML: () => [{ tag: 'span[data-type="noteTag"]' }],
  renderHTML({ node, HTMLAttributes }) {
    const id = node.attrs?.["id"] || "";
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-type": "noteTag",
        class: "tag-node",
      }),
      `#${id}`,
    ];
  },
  renderText({ node }) {
    const id = String(node.attrs?.["id"] ?? "").trim();
    return id ? `#${id}` : "";
  },

  markdownTokenName: "noteTag",

  markdownTokenizer: {
    name: "noteTag",
    level: "inline" as const,
    start: "#",
    tokenize(src: string) {
      const match = src.match(/^#([\p{L}\p{N}_-]+)/u);
      const text = match?.[1]?.trim();
      if (!match || !text) {
        return undefined;
      }
      return {
        type: "noteTag",
        raw: match[0],
        text,
      };
    },
  },

  parseMarkdown(token, helpers) {
    const id = String(token.text ?? "").trim();
    if (!id) {
      return helpers.createTextNode(token.raw || "");
    }
    return helpers.createNode("noteTag", { id });
  },

  renderMarkdown(node) {
    const id = String(node.attrs?.["id"] ?? "").trim();
    return id ? `#${id}` : "";
  },

  addInputRules() {
    return [
      new InputRule({
        find: /(?:^|\s)#([\p{L}\p{N}_-]+)\s$/u,
        handler: ({ state, range, match }) => {
          const { tr } = state;
          const start = range.from;
          const end = range.to;
          // match[0] is the full text
          // match[1] is the text without the #
          const matchString = match[0];
          const tagText = match[1];
          const prefixSpace = matchString.match(/^\s/) ? 1 : 0;
          const node = this.type.create({ id: tagText });
          tr.replaceWith(start + prefixSpace, end, node).insertText(" ");
        },
      }),
    ];
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("tagClickHandler"),
        props: {
          handleClickOn: (_view, _pos, node, _nodePos, event) => {
            if (node.type.name !== this.name || !node.attrs["id"]) return false;
            event.preventDefault();
            event.stopPropagation();
            void this.options.onClick(node.attrs["id"]);
            return true;
          },
        },
      }),
    ];
  },
});

export { NoteTag };
