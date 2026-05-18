import { InputRule, Node, mergeAttributes } from "@tiptap/core";

const NoteTag = Node.create({
  name: "noteTag",
  group: "inline",
  inline: true,
  atom: true,
  addAttributes() {
    return {
      id: {
        default: null,
      },
    };
  },
  parseHTML() {
    return [
      {
        tag: 'span[data-type="noteTag"]',
      },
    ];
  },
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
});

export { NoteTag };
