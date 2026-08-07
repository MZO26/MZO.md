import { promptImageUpload } from "@/extensions/image/image";
import { openMathDialog } from "@/extensions/mathematics/mathematics-dialog";
import type { ActionMap } from "@/utils/types";

const TOP_TOOLBAR_ACTIONS: ActionMap = {
  editorWidth: {
    type: "action",
    run: () => document.dispatchEvent(new CustomEvent("app:set-editor-width")),
    icon: "RulerDimensionLine",
  },
  focus: {
    type: "action",
    run: () => document.dispatchEvent(new CustomEvent("app:toggle-focus-mode")),
    icon: "Focus",
  },
  toggleToolbar: {
    type: "action",
    run: () => document.dispatchEvent(new CustomEvent("app:toggle-toolbar")),
    icon: "ArrowDownFromLine",
  },
};

// editor toolbar

const TOOLBAR_ACTIONS: ActionMap = {
  toggleSidebar: {
    run: () => document.dispatchEvent(new CustomEvent("app:toggle-sidebar")),
    icon: "ArrowLeftFromLine",
  },
  undo: {
    run: (editor) => editor?.chain().focus().undo().run(),
    isDisabled: (editor) => !editor.can().undo(),
    icon: "Undo2",
  },
  redo: {
    run: (editor) => editor?.chain().focus().redo().run(),
    isDisabled: (editor) => !editor.can().redo(),
    icon: "Redo2",
  },
  search: {
    run: () =>
      document.dispatchEvent(new CustomEvent("app:toggle-editor-search")),
    icon: "Search",
  },
  quickSwitch: {
    run: () =>
      document.dispatchEvent(new CustomEvent("app:toggle-quick-switch")),
    icon: "FileClock",
  },
  divider1: { type: "divider" },
  bold: {
    run: (editor) => editor?.chain().focus().toggleBold().run(),
    isActive: (editor) => editor?.isActive("bold"),
    icon: "Bold",
  },
  italic: {
    run: (editor) => editor?.chain().focus().toggleItalic().run(),
    isActive: (editor) => editor?.isActive("italic"),
    icon: "Italic",
  },
  strike: {
    run: (editor) => editor?.chain().focus().toggleStrike().run(),
    isActive: (editor) => editor?.isActive("strike"),
    icon: "Strikethrough",
  },
  underline: {
    run: (editor) => editor?.chain().focus().toggleUnderline().run(),
    isActive: (editor) => editor?.isActive("underline"),
    icon: "Underline",
  },
  highlight: {
    run: (editor) => editor?.chain().focus().toggleHighlight().run(),
    isActive: (editor) => editor?.isActive("highlight"),
    icon: "Highlighter",
  },
  mathInline: {
    run: (editor) => {
      if (!editor) return;
      const { from, to, empty } = editor.state.selection;
      const selectedText = empty
        ? ""
        : editor.state.doc.textBetween(from, to, "");
      openMathDialog(editor, {
        mode: "insert",
        type: "inline",
        initialValue: selectedText,
      });
    },
    isActive: (editor) => editor?.isActive("inlineMath"),
    icon: "Sigma",
  },
  divider2: { type: "divider" },
  heading1: {
    run: (editor) => editor?.chain().focus().toggleHeading({ level: 1 }).run(),
    isActive: (editor) => editor?.isActive("heading", { level: 1 }),
    icon: "Heading1",
  },
  heading2: {
    run: (editor) => editor?.chain().focus().toggleHeading({ level: 2 }).run(),
    isActive: (editor) => editor?.isActive("heading", { level: 2 }),
    icon: "Heading2",
  },
  heading3: {
    run: (editor) => editor?.chain().focus().toggleHeading({ level: 3 }).run(),
    isActive: (editor) => editor?.isActive("heading", { level: 3 }),
    icon: "Heading3",
  },
  divider3: { type: "divider" },
  bulletList: {
    run: (editor) => editor?.chain().focus().toggleBulletList().run(),
    isActive: (editor) => editor?.isActive("bulletList"),
    icon: "List",
  },
  orderedList: {
    run: (editor) => editor?.chain().focus().toggleOrderedList().run(),
    isActive: (editor) => editor?.isActive("orderedList"),
    icon: "ListOrdered",
  },
  taskList: {
    run: (editor) => editor?.chain().focus().toggleTaskList().run(),
    isActive: (editor) => editor?.isActive("taskList"),
    icon: "ListTodo",
  },
  blockQuote: {
    run: (editor) => editor?.chain().focus().toggleBlockquote().run(),
    isActive: (editor) => editor?.isActive("blockquote"),
    icon: "TextQuote",
  },
  divider4: { type: "divider" },
  inlineCode: {
    run: (editor) => editor?.chain().focus().toggleCode().run(),
    isActive: (editor) => editor?.isActive("code"),
    icon: "Code",
  },
  codeBlock: {
    run: (editor) => editor?.chain().focus().toggleCodeBlock().run(),
    isActive: (editor) => editor?.isActive("codeBlock"),
    icon: "CodeXml",
  },
  mathBlock: {
    run: (editor) => {
      if (!editor) return;
      openMathDialog(editor, {
        mode: "insert",
        type: "block",
        initialValue: "",
      });
    },
    isActive: (editor) => editor?.isActive("blockMath"),
    icon: "SquareSigma",
  },
  horizontalRule: {
    run: (editor) => editor?.chain().focus().setHorizontalRule().run(),
    isActive: (editor) => editor?.isActive("hr"),
    icon: "SeparatorHorizontal",
  },
  divider5: { type: "divider" },
  link: {
    run: (editor) => {
      if (!editor) return false;
      if (editor.isActive("link")) {
        return editor.chain().focus().extendMarkRange("link").unsetLink().run();
      }
      return editor.chain().focus().setLink({ href: "" }).run();
    },
    isActive: (editor) => editor?.isActive("link"),
    icon: "Link",
  },
  image: {
    run: (editor) => editor && promptImageUpload(editor),
    isActive: (editor) => editor?.isActive("image"),
    icon: "Image",
  },
  table: {
    run: (editor) =>
      editor
        ?.chain()
        .focus()
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run(),
    isActive: (editor) => editor?.isActive("table"),
    icon: "Grid2x2",
  },
};

export { TOOLBAR_ACTIONS, TOP_TOOLBAR_ACTIONS };
