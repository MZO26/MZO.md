import type { Editor } from "@tiptap/core";
import { promptImageUpload } from "../../../extensions/image/image";

type Action = {
  type?: "action";
  run: (editor: Editor) => void;
  isActive?: (editor: Editor) => boolean;
  isDisabled?: (editor: Editor) => boolean;
  icon: string;
};

type Divider = {
  type: "divider";
};

type ToolbarItem = Action | Divider;
type ToolbarMap = Record<string, ToolbarItem>;

const actions: ToolbarMap = {
  // Marks
  undo: {
    run: (editor) => editor.chain().focus().undo().run(),
    isDisabled: (editor) => !editor.can().undo(),
    icon: "undo2",
  },
  redo: {
    run: (editor) => editor.chain().focus().redo().run(),
    isDisabled: (editor) => !editor.can().redo(),
    icon: "redo2",
  },
  divider1: { type: "divider" },
  bold: {
    run: (editor) => editor.chain().focus().toggleBold().run(),
    isActive: (editor) => editor.isActive("bold"),
    icon: "bold",
  },
  italic: {
    run: (editor) => editor.chain().focus().toggleItalic().run(),
    isActive: (editor) => editor.isActive("italic"),
    icon: "italic",
  },
  strike: {
    run: (editor) => editor.chain().focus().toggleStrike().run(),
    isActive: (editor) => editor.isActive("strike"),
    icon: "strikethrough",
  },
  highlight: {
    run: (editor) => editor.chain().focus().toggleHighlight().run(),
    isActive: (editor) => editor.isActive("highlight"),
    icon: "highlighter",
  },
  divider2: { type: "divider" },
  h1: {
    run: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
    isActive: (editor) => editor.isActive("heading", { level: 1 }),
    icon: "heading-1",
  },
  h2: {
    run: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    isActive: (editor) => editor.isActive("heading", { level: 2 }),
    icon: "heading-2",
  },
  h3: {
    run: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
    isActive: (editor) => editor.isActive("heading", { level: 3 }),
    icon: "heading-3",
  },
  divider3: { type: "divider" },
  bulletList: {
    run: (editor) => editor.chain().focus().toggleBulletList().run(),
    isActive: (editor) => editor.isActive("bulletList"),
    icon: "list",
  },
  orderedList: {
    run: (editor) => editor.chain().focus().toggleOrderedList().run(),
    isActive: (editor) => editor.isActive("orderedList"),
    icon: "list-ordered",
  },
  taskList: {
    run: (editor) => editor.chain().focus().toggleTaskList().run(),
    isActive: (editor) => editor.isActive("taskList"),
    icon: "list-todo",
  },
  divider4: { type: "divider" },
  blockQuote: {
    run: (editor) => editor.chain().focus().toggleBlockquote().run(),
    isActive: (editor) => editor.isActive("blockquote"),
    icon: "text-quote",
  },
  inlineCode: {
    run: (editor) => editor.chain().focus().toggleCode().run(),
    isActive: (editor) => editor.isActive("code"),
    icon: "code",
  },
  codeBlock: {
    run: (editor) => editor.chain().focus().toggleCodeBlock().run(),
    isActive: (editor) => editor.isActive("codeBlock"),
    icon: "code-xml",
  },
  hr: {
    run: (editor) => editor.chain().focus().setHorizontalRule().run(),
    icon: "separator-horizontal",
  },
  divider5: { type: "divider" },
  table: {
    run: (editor) =>
      editor
        .chain()
        .focus()
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run(),
    icon: "grid-2x2",
  },
  image: {
    run: (editor) => promptImageUpload(editor),
    icon: "image",
  },
};

export { actions, type Action, type ToolbarMap };
