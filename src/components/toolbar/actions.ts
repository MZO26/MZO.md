import {
  copyBlock,
  duplicateCodeBlock,
  handleTableDelete,
  promoteToCodeBlock,
} from "@/components/toolbar/customActions";
import { promptImageUpload } from "@/extensions/image/image";
import type { Editor } from "@tiptap/core";

export type BubbleMenuGroup = "text" | "inlineCode" | "codeBlock" | "table";

type Action = {
  type?: "action";
  run: (editor: Editor) => void;
  isActive?: (editor: Editor) => boolean;
  isDisabled?: (editor: Editor) => boolean;
  icon: string;
  shortcut?: string;
  group?: BubbleMenuGroup;
};

type Divider = {
  type: "divider";
};

type ToolbarItem = Action | Divider;
type ActionMap = Record<string, ToolbarItem>;

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

export { BubbleMenuActions, ToolbarActions, type Action, type ActionMap };
