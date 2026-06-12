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
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-type": "noteTag",
        class: "tag-node",
      }),
      `#${node.attrs["id"]}`,
    ];
  },

  renderText({ node }) {
    return `#${node.attrs["id"]}`;
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
