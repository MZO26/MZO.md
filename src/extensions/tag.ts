import { InputRule, Mark, markPasteRule, mergeAttributes } from "@tiptap/core";

const NoteTag = Mark.create({
  name: "noteTag",
  inclusive: true,
  parseHTML() {
    return [{ tag: "span.tag" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { class: "tag" }), 0];
  },
  addInputRules() {
    return [
      new InputRule({
        find: /(?:^|\s)(#[\p{L}\p{N}_]+)\s$/gu,
        handler: ({ state, range, match }) => {
          const { tr } = state;
          const fullMatch = match[0];
          const tagText = match[1];
          if (!tagText) return;
          const startIndex = fullMatch.indexOf(tagText);
          const start = range.from + startIndex;
          const end = start + tagText.length;

          tr.addMark(start, end, this.type.create());
          tr.removeStoredMark(this.type);
        },
      }),
    ];
  },
  addPasteRules() {
    return [
      markPasteRule({
        find: /#[\p{L}\p{N}_]+/gu,
        type: this.type,
      }),
    ];
  },
  addKeyboardShortcuts() {
    return {
      Space: ({ editor }) => {
        if (editor.isActive(this.name)) {
          editor.chain().unsetMark(this.name).insertContent(" ").run();
          return true;
        }
        return false;
      },
    };
  },
});

export { NoteTag };
