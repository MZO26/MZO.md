import { promptImageUpload } from "@/extensions/image/image";
import type { ActionMap } from "@shared/types";

const ToolbarActions: ActionMap = {
  undo: {
    run: (editor) => editor.chain().focus().undo().run(),
    isDisabled: (editor) => !editor.can().undo(),
    icon: "undo2",
    shortcut: "MOD+Z",
  },
  redo: {
    run: (editor) => editor.chain().focus().redo().run(),
    isDisabled: (editor) => !editor.can().redo(),
    icon: "redo2",
    shortcut: "MOD+Shift+Z",
  },
  divider1: { type: "divider" },
  bold: {
    run: (editor) => editor.chain().focus().toggleBold().run(),
    isActive: (editor) => editor.isActive("bold"),
    icon: "bold",
    shortcut: "Mod+B",
  },
  italic: {
    run: (editor) => editor.chain().focus().toggleItalic().run(),
    isActive: (editor) => editor.isActive("italic"),
    icon: "italic",
    shortcut: "MOD+I",
  },
  strike: {
    run: (editor) => editor.chain().focus().toggleStrike().run(),
    isActive: (editor) => editor.isActive("strike"),
    icon: "strikethrough",
    shortcut: "MOD+Shift+X",
  },
  highlight: {
    run: (editor) => editor.chain().focus().toggleHighlight().run(),
    isActive: (editor) => editor.isActive("highlight"),
    icon: "highlighter",
    shortcut: "MOD+Shift+H",
  },
  divider2: { type: "divider" },
  h1: {
    run: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
    isActive: (editor) => editor.isActive("heading", { level: 1 }),
    icon: "heading-1",
    shortcut: "MOD+Alt+1",
  },
  h2: {
    run: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    isActive: (editor) => editor.isActive("heading", { level: 2 }),
    icon: "heading-2",
    shortcut: "MOD+Alt+2",
  },
  h3: {
    run: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
    isActive: (editor) => editor.isActive("heading", { level: 3 }),
    icon: "heading-3",
    shortcut: "MOD+Alt+3",
  },
  divider3: { type: "divider" },
  bulletList: {
    run: (editor) => editor.chain().focus().toggleBulletList().run(),
    isActive: (editor) => editor.isActive("bulletList"),
    icon: "list",
    shortcut: "MOD+Shift+8",
  },
  orderedList: {
    run: (editor) => editor.chain().focus().toggleOrderedList().run(),
    isActive: (editor) => editor.isActive("orderedList"),
    icon: "list-ordered",
    shortcut: "MOD+Shift+7",
  },
  taskList: {
    run: (editor) => editor.chain().focus().toggleTaskList().run(),
    isActive: (editor) => editor.isActive("taskList"),
    icon: "list-todo",
    shortcut: "MOD+Shift+9",
  },
  blockQuote: {
    run: (editor) => editor.chain().focus().toggleBlockquote().run(),
    isActive: (editor) => editor.isActive("blockquote"),
    icon: "text-quote",
    shortcut: "MOD+Shift+B",
  },
  divider4: { type: "divider" },
  inlineCode: {
    run: (editor) => editor.chain().focus().toggleCode().run(),
    isActive: (editor) => editor.isActive("code"),
    icon: "code",
    shortcut: "MOD+E",
  },
  codeBlock: {
    run: (editor) => editor.chain().focus().toggleCodeBlock().run(),
    isActive: (editor) => editor.isActive("codeBlock"),
    icon: "code-xml",
    shortcut: "MOD+Alt+C",
  },
  hr: {
    run: (editor) => editor.chain().focus().setHorizontalRule().run(),
    icon: "separator-horizontal",
    shortcut: "MOD-Shift--",
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
    shortcut: "MOD-Alt-T",
  },
  image: {
    run: (editor) => promptImageUpload(editor),
    icon: "image",
    shortcut: "MOD-Alt-I",
  },
};

export { ToolbarActions };
