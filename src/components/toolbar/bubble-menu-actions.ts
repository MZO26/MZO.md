import {
  copyBlock,
  duplicateCodeBlock,
  handleTableDelete,
  promoteToCodeBlock,
} from "@/components/toolbar/custom-actions";
import type { ActionMap } from "@shared/types";

const BubbleMenuActions: ActionMap = {
  // text actions
  bold: {
    run: (editor) => editor.chain().focus().toggleBold().run(),
    isActive: (editor) => editor.isActive("bold"),
    icon: "bold",
    group: "text",
  },
  italic: {
    run: (editor) => editor.chain().focus().toggleItalic().run(),
    isActive: (editor) => editor.isActive("italic"),
    icon: "italic",
    group: "text",
  },
  strike: {
    run: (editor) => editor.chain().focus().toggleStrike().run(),
    isActive: (editor) => editor.isActive("strike"),
    icon: "strikethrough",
    group: "text",
  },
  highlight: {
    run: (editor) => editor.chain().focus().toggleHighlight().run(),
    isActive: (editor) => editor.isActive("highlight"),
    icon: "highlighter",
    group: "text",
  },
  divider1: { type: "divider" },
  h1: {
    run: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
    isActive: (editor) => editor.isActive("heading", { level: 1 }),
    icon: "heading-1",
    group: "text",
  },
  h2: {
    run: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    isActive: (editor) => editor.isActive("heading", { level: 2 }),
    icon: "heading-2",
    group: "text",
  },
  h3: {
    run: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
    isActive: (editor) => editor.isActive("heading", { level: 3 }),
    icon: "heading-3",
    group: "text",
  },
  divider2: { type: "divider" },
  link: {
    run: (editor) => editor.chain().focus().toggleLink().run(),
    icon: "link",
    group: "text",
  },
  // table actions
  addRowAfter: {
    run: (editor) => editor.chain().focus().addRowAfter().run(),
    icon: "between-vertical-end",
    group: "table",
  },
  addColumnAfter: {
    run: (editor) => editor.chain().focus().addColumnAfter().run(),
    icon: "between-horizontal-end",
    group: "table",
  },
  addRowBefore: {
    run: (editor) => editor.chain().focus().addRowBefore().run(),
    icon: "between-vertical-start",
    group: "table",
  },
  addColumnBefore: {
    run: (editor) => editor.chain().focus().addColumnBefore().run(),
    icon: "between-horizontal-start",
    group: "table",
  },
  divider3: { type: "divider" },
  deleteTable: {
    run: (editor) => handleTableDelete(editor),
    icon: "trash-2",
    group: "table",
  },
  // code block actions
  copyBlock: {
    run: (editor) => copyBlock(editor),
    icon: "copy",
    group: "codeBlock",
  },
  duplicate: {
    run: (editor) => duplicateCodeBlock(editor),
    icon: "repeat",
    group: "codeBlock",
  },
  // inline code actions
  inlineCode: {
    run: (editor) => editor.chain().focus().toggleCode().run(),
    isActive: (editor) => editor.isActive("code"),
    icon: "code",
    group: "inlineCode",
  },
  removeFormat: {
    run: (editor) => editor.chain().focus().toggleMark("code").run(),
    icon: "code",
    group: "inlineCode",
  },
  promote: {
    run: (editor) => promoteToCodeBlock(editor),
    icon: "code-xml",
    group: "inlineCode",
  },
};

export { BubbleMenuActions };
