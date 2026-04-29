import { InputRule, Mark, markPasteRule, mergeAttributes } from "@tiptap/core";
import type { Note } from "../../shared/schemas/noteSchema";
import { debounce, getElement } from "../utils/helpers";

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

function updateNoteTags(tags: Note["tags"]) {
  const container = getElement(".tag-container");
  container.innerHTML = "";
  if (!tags || tags.length === 0) return;
  tags.forEach((tag) => {
    const span = document.createElement("span");
    span.classList.add("tag");
    span.textContent = `#${tag}`;
    container.append(span);
  });
}

const debouncedTagUpdate = debounce(updateNoteTags, 1000);

export { debouncedTagUpdate, NoteTag };
