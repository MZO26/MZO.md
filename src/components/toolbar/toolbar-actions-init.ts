import {
  renderLinksToolbar,
  setEditorWidth,
  toggleMetadataContainer,
} from "@/components/toolbar/toolbar-features";
import { promptImageUpload } from "@/extensions/image/image";
import { openMathDialog } from "@/extensions/mathematics/mathematics-dialog";
import { flushSave } from "@/notes/note-actions";
import { noteStore, stateStore } from "@/state/state";
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
  },
  focus: {
    type: "action",
    run: () => document.dispatchEvent(new CustomEvent("app:toggle-focus-mode")),
    icon: "focus",
  },
  toggleToolbar: {
    type: "action",
    run: () => document.dispatchEvent(new CustomEvent("app:toggle-toolbar")),
    icon: "arrow-down-from-line",
  },
};

// editor toolbar

const TOOLBAR_ACTIONS: ActionMap = {
  toggleSidebar: {
    run: () => document.dispatchEvent(new CustomEvent("app:toggle-sidebar")),
    icon: "arrow-left-from-line",
  },
  undo: {
    run: (editor) => editor?.chain().focus().undo().run(),
    isDisabled: (editor) => !editor.can().undo(),
    icon: "undo2",
  },
  redo: {
    run: (editor) => editor?.chain().focus().redo().run(),
    isDisabled: (editor) => !editor.can().redo(),
    icon: "redo2",
  },
  wikilinks: {
    run: async () => {
      const activeId = stateStore.get("activeId");
      if (!activeId) return;
      const noteIndex = noteStore.get("noteIndex");
      const activeNote = noteIndex.get(activeId);
      if (!activeNote) return;
      const container = toggleMetadataContainer();
      await flushSave(activeId);
      renderLinksToolbar(activeNote, noteIndex, container);
    },
    icon: "arrow-left-right",
  },
  search: {
    run: () =>
      document.dispatchEvent(new CustomEvent("app:toggle-editor-search")),
    icon: "search",
  },
  quickSwitch: {
    run: () =>
      document.dispatchEvent(new CustomEvent("app:toggle-quick-switch")),
    icon: "file-clock",
  },
  divider1: { type: "divider" },
  bold: {
    run: (editor) => editor?.chain().focus().toggleBold().run(),
    isActive: (editor) => editor?.isActive("bold"),
    icon: "bold",
  },
  italic: {
    run: (editor) => editor?.chain().focus().toggleItalic().run(),
    isActive: (editor) => editor?.isActive("italic"),
    icon: "italic",
  },
  strike: {
    run: (editor) => editor?.chain().focus().toggleStrike().run(),
    isActive: (editor) => editor?.isActive("strike"),
    icon: "strikethrough",
  },
  underline: {
    run: (editor) => editor?.chain().focus().toggleUnderline().run(),
    isActive: (editor) => editor?.isActive("underline"),
    icon: "underline",
  },
  highlight: {
    run: (editor) => editor?.chain().focus().toggleHighlight().run(),
    isActive: (editor) => editor?.isActive("highlight"),
    icon: "highlighter",
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
  },
  divider2: { type: "divider" },
  heading1: {
    run: (editor) => editor?.chain().focus().toggleHeading({ level: 1 }).run(),
    isActive: (editor) => editor?.isActive("heading", { level: 1 }),
    icon: "heading-1",
  },
  heading2: {
    run: (editor) => editor?.chain().focus().toggleHeading({ level: 2 }).run(),
    isActive: (editor) => editor?.isActive("heading", { level: 2 }),
    icon: "heading-2",
  },
  heading3: {
    run: (editor) => editor?.chain().focus().toggleHeading({ level: 3 }).run(),
    isActive: (editor) => editor?.isActive("heading", { level: 3 }),
    icon: "heading-3",
  },
  divider3: { type: "divider" },
  bulletList: {
    run: (editor) => editor?.chain().focus().toggleBulletList().run(),
    isActive: (editor) => editor?.isActive("bulletList"),
    icon: "list",
  },
  orderedList: {
    run: (editor) => editor?.chain().focus().toggleOrderedList().run(),
    isActive: (editor) => editor?.isActive("orderedList"),
    icon: "list-ordered",
  },
  taskList: {
    run: (editor) => editor?.chain().focus().toggleTaskList().run(),
    isActive: (editor) => editor?.isActive("taskList"),
    icon: "list-todo",
  },
  blockQuote: {
    run: (editor) => editor?.chain().focus().toggleBlockquote().run(),
    isActive: (editor) => editor?.isActive("blockquote"),
    icon: "text-quote",
  },
  divider4: { type: "divider" },
  inlineCode: {
    run: (editor) => editor?.chain().focus().toggleCode().run(),
    isActive: (editor) => editor?.isActive("code"),
    icon: "code",
  },
  codeBlock: {
    run: (editor) => editor?.chain().focus().toggleCodeBlock().run(),
    isActive: (editor) => editor?.isActive("codeBlock"),
    icon: "code-xml",
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
  },
  horizontalRule: {
    run: (editor) => editor?.chain().focus().setHorizontalRule().run(),
    isActive: (editor) => editor?.isActive("hr"),
    icon: "separator-horizontal",
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
  },
  image: {
    run: (editor) => editor && promptImageUpload(editor),
    isActive: (editor) => editor?.isActive("image"),
    icon: "image",
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
  },
};

export { TOOLBAR_ACTIONS, TOP_TOOLBAR_ACTIONS };
