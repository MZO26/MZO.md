import {
  initFocusMode,
  openMetadataContainer,
  renderLinks,
  renderTags,
  setEditorWidth,
  toggleToolbar,
} from "@/components/toolbar/toolbar-features";
import { promptImageUpload } from "@/extensions/image/image";
import { openMathDialog } from "@/extensions/overrides/mathematics";
import { getAppItem } from "@/utils/registry";
import type { ActionMap } from "@shared/types";

const TOP_TOOLBAR_ACTIONS: ActionMap = {
  editorWidth: {
    type: "action",
    run: () => {
      const appContainer = getAppItem("appContainer");
      setEditorWidth(appContainer);
    },
    icon: "ruler-dimension-line",
    shortcut: "MOD+W",
  },
  focus: {
    type: "action",
    run: () => initFocusMode(),
    icon: "focus",
    shortcut: "F11",
  },
  toggleToolbar: {
    type: "action",
    run: () => toggleToolbar(),
    icon: "arrow-down-from-line",
    shortcut: "MOD+.",
  },
};

//-------------------------------------------------------------

// editor toolbar

const TOOLBAR_ACTIONS: ActionMap = {
  toggleSidebar: {
    run: () => document.dispatchEvent(new CustomEvent("app:toggle-sidebar")),
    icon: "arrow-left-from-line",
    shortcut: "MOD+O",
  },
  undo: {
    run: (editor) => editor?.chain().focus().undo().run(),
    isDisabled: (editor) => !editor.can().undo(),
    icon: "undo2",
    shortcut: "MOD+Z",
  },
  redo: {
    run: (editor) => editor?.chain().focus().redo().run(),
    isDisabled: (editor) => !editor.can().redo(),
    icon: "redo2",
    shortcut: "MOD+Shift+Z | MOD+Y",
  },
  tags: {
    run: () => {
      const container = openMetadataContainer();
      renderTags(container);
    },
    icon: "tag",
    shortcut: "#tag + Space",
  },
  wikilinks: {
    run: () => {
      const container = openMetadataContainer();
      renderLinks(container);
    },
    icon: "git-compare-arrows",
    shortcut: "[[Title]]",
  },
  divider1: { type: "divider" },
  bold: {
    run: (editor) => editor?.chain().focus().toggleBold().run(),
    isActive: (editor) => editor?.isActive("bold"),
    icon: "bold",
    shortcut: "Mod+B | **text**",
  },
  italic: {
    run: (editor) => editor?.chain().focus().toggleItalic().run(),
    isActive: (editor) => editor?.isActive("italic"),
    icon: "italic",
    shortcut: "MOD+I | *text*",
  },
  strike: {
    run: (editor) => editor?.chain().focus().toggleStrike().run(),
    isActive: (editor) => editor?.isActive("strike"),
    icon: "strikethrough",
    shortcut: "MOD+S | ~~text~~",
  },
  underline: {
    run: (editor) => editor?.chain().focus().toggleUnderline().run(),
    isActive: (editor) => editor?.isActive("underline"),
    icon: "underline",
    shortcut: "MOD+U | ++text++",
  },
  highlight: {
    run: (editor) => editor?.chain().focus().toggleHighlight().run(),
    isActive: (editor) => editor?.isActive("highlight"),
    icon: "highlighter",
    shortcut: "MOD+H | ==text==",
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
    icon: "sigma",
    shortcut: "MOD+Shift+E | $math$",
  },
  divider2: { type: "divider" },
  heading1: {
    run: (editor) => editor?.chain().focus().toggleHeading({ level: 1 }).run(),
    isActive: (editor) => editor?.isActive("heading", { level: 1 }),
    icon: "heading-1",
    shortcut: "MOD+Shift+1 | # + Space",
  },
  heading2: {
    run: (editor) => editor?.chain().focus().toggleHeading({ level: 2 }).run(),
    isActive: (editor) => editor?.isActive("heading", { level: 2 }),
    icon: "heading-2",
    shortcut: "MOD+Shift+2 | ## + Space",
  },
  heading3: {
    run: (editor) => editor?.chain().focus().toggleHeading({ level: 3 }).run(),
    isActive: (editor) => editor?.isActive("heading", { level: 3 }),
    icon: "heading-3",
    shortcut: "MOD+Shift+3 | ### + Space",
  },
  divider3: { type: "divider" },
  bulletList: {
    run: (editor) => editor?.chain().focus().toggleBulletList().run(),
    isActive: (editor) => editor?.isActive("bulletList"),
    icon: "list",
    shortcut: "MOD+Shift+L | - + Space",
  },
  orderedList: {
    run: (editor) => editor?.chain().focus().toggleOrderedList().run(),
    isActive: (editor) => editor?.isActive("orderedList"),
    icon: "list-ordered",
    shortcut: "MOD+Shift+O | 1. + Space",
  },
  taskList: {
    run: (editor) => editor?.chain().focus().toggleTaskList().run(),
    isActive: (editor) => editor?.isActive("taskList"),
    icon: "list-todo",
    shortcut: "MOD+Shift+T | [] + Space",
  },
  blockQuote: {
    run: (editor) => editor?.chain().focus().toggleBlockquote().run(),
    isActive: (editor) => editor?.isActive("blockquote"),
    icon: "text-quote",
    shortcut: "MOD+Shift+B | > + Space",
  },
  divider4: { type: "divider" },
  inlineCode: {
    run: (editor) => editor?.chain().focus().toggleCode().run(),
    isActive: (editor) => editor?.isActive("code"),
    icon: "code",
    shortcut: "MOD+E | `code`",
  },
  codeBlock: {
    run: (editor) => editor?.chain().focus().toggleCodeBlock().run(),
    isActive: (editor) => editor?.isActive("codeBlock"),
    icon: "code-xml",
    shortcut: "MOD+Shift+C | ``` + Space",
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
    icon: "square-sigma",
    shortcut: "MOD+Shift+M || $$math$$",
  },
  horizontalRule: {
    run: (editor) => editor?.chain().focus().setHorizontalRule().run(),
    isActive: (editor) => editor?.isActive("hr"),
    icon: "separator-horizontal",
    shortcut: "MOD+Shift+R | ---",
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
    icon: "link",
    shortcut: "MOD+K / Open: MOD+Alt+Enter",
  },
  image: {
    run: (editor) => editor && promptImageUpload(editor),
    isActive: (editor) => editor?.isActive("image"),
    icon: "image",
    shortcut: "MOD+Alt+I",
  },
  table: {
    run: (editor) =>
      editor
        ?.chain()
        .focus()
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run(),
    isActive: (editor) => editor?.isActive("table"),
    icon: "grid-2x2",
    shortcut: "MOD+Alt+T",
  },
};

export { TOOLBAR_ACTIONS, TOP_TOOLBAR_ACTIONS };
