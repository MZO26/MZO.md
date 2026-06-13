import { pinWindow, setTheme, showNotification } from "@/api/api";
import { promptImageUpload } from "@/extensions/image/image";
import { handleConflict, isMirrorEnabled } from "@/notes/note-conflict";
import { noteStore, stateStore } from "@/settings/app-state";
import { createAsyncHandler } from "@/utils/async";
import { requireElement } from "@/utils/dom";
import { getAppItem, registerAppEvents } from "@/utils/registry";
import type { Theme } from "@shared/schemas/store-schema";
import type { ActionMap } from "@shared/types";

// top-toolbar for quick actions

function initTopToolbar() {
  const appContainer = getAppItem("appContainer");
  const editor = getAppItem("editor");
  const appPinBtn = requireElement<HTMLButtonElement>(".app-pin-btn");
  appPinBtn.addEventListener(
    "click",
    createAsyncHandler(async () => setWindowTop(appPinBtn)),
  );
  registerAppEvents(document, {
    "app:set-editor-width": () => setEditorWidth(appContainer),
    "app:toggle-read-only": () => editor?.setEditable(!editor.isEditable),
    "app:toggle-focus-mode": () => initFocusMode(),
    "app:check-sync-state": async () => {
      await syncCheck();
    },
    "app:escape": () => {
      if (appContainer.classList.contains("focus")) {
        initFocusMode();
      }
    },
    "app:toggle-toolbar": () => toggleToolbar(),
  });
}

function setEditorWidth(container: HTMLDivElement) {
  const widths = ["comfortable", "normal", "wide"];
  const current = container.getAttribute("data-width") || "normal";
  const index = widths.indexOf(current as (typeof widths)[number]);
  const next = widths[(index + 1) % widths.length];
  if (!next) return;
  container.setAttribute("data-width", next);
}

async function setWindowTop(toggleBtn: HTMLButtonElement) {
  const result = await pinWindow();
  if (!result.success) {
    console.error("[setWindowTop]: Failed to pin window:", result.error);
    return;
  }
  toggleBtn.classList.toggle("window-pinned", result.data);
}

function initFocusMode() {
  const appContainer = getAppItem("appContainer");
  const newState = !appContainer.classList.contains("focus");
  requestAnimationFrame(() => {
    appContainer.classList.toggle("focus", newState);
    setTheme(
      document.documentElement.getAttribute("data-theme") as Exclude<
        Theme,
        "system"
      >,
      newState,
    ).catch((err) => {
      console.error(
        "[initFocusMode -> setTheme]: Failed to sync theme with main process.",
        err,
      );
    });
  });
}

function toggleToolbar() {
  const appContainer = getAppItem("appContainer");
  const newState = !appContainer.classList.contains("toolbar-collapsed");
  requestAnimationFrame(() => {
    appContainer.classList.toggle("toolbar-collapsed", newState);
  });
}

async function syncCheck() {
  if (!isMirrorEnabled()) {
    await showNotification(
      "Unable to sync.",
      "Enable Mirror Mode to sync notes.",
    );
  }
  const activeId = stateStore.get("activeId");
  const activeNote = noteStore.get("activeNote");
  if (!activeId || !activeNote) {
    await showNotification(
      "No note selected.",
      "Select a note to check its sync state.",
    );
    return;
  }
  const editor = getAppItem("editor");
  const markdown = editor.getMarkdown();
  const result = await handleConflict(activeNote, markdown).catch((error) =>
    console.error("[handleConflict]: Error while trying to sync note", error),
  );
  if (!result) return;
  await showNotification(
    "Synced Note.",
    `${result === "IN_SYNC" ? "No change found." : result === "MISSING_RESOLVED" ? "File is missing." : "Change found."}`,
  );
}

const TOP_TOOLBAR_ACTIONS: ActionMap = {
  readOnly: {
    type: "action",
    run: (editor) => editor?.setEditable(!editor.isEditable),
    icon: "glasses",
    shortcut: "MOD+Shift+R",
  },
  editorWidth: {
    type: "action",
    run: () => {
      const appContainer = getAppItem("appContainer");
      setEditorWidth(appContainer);
    },
    icon: "ruler-dimension-line",
    shortcut: "MOD+Shift+W",
  },
  focus: {
    type: "action",
    run: () => initFocusMode(),
    icon: "focus",
    shortcut: "F11",
  },
  checkSyncState: {
    type: "action",
    run: async () => {
      await syncCheck();
    },
    icon: "file-check",
    shortcut: "MOD+Alt+S",
  },
  toggleToolbar: {
    type: "action",
    run: () => toggleToolbar(),
    icon: "arrow-down-from-line",
    shortcut: "MOD+Shift+T",
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
    shortcut: "MOD+Shift+Z",
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
    shortcut: "MOD+Shift+X | ~~text~~",
  },
  highlight: {
    run: (editor) => editor?.chain().focus().toggleHighlight().run(),
    isActive: (editor) => editor?.isActive("highlight"),
    icon: "highlighter",
    shortcut: "MOD+Shift+H | ==text==",
  },
  divider2: { type: "divider" },
  heading1: {
    run: (editor) => editor?.chain().focus().toggleHeading({ level: 1 }).run(),
    isActive: (editor) => editor?.isActive("heading", { level: 1 }),
    icon: "heading-1",
    shortcut: "MOD+Alt+1 | # ",
  },
  heading2: {
    run: (editor) => editor?.chain().focus().toggleHeading({ level: 2 }).run(),
    isActive: (editor) => editor?.isActive("heading", { level: 2 }),
    icon: "heading-2",
    shortcut: "MOD+Alt+2 | ## ",
  },
  heading3: {
    run: (editor) => editor?.chain().focus().toggleHeading({ level: 3 }).run(),
    isActive: (editor) => editor?.isActive("heading", { level: 3 }),
    icon: "heading-3",
    shortcut: "MOD+Alt+3 | ### ",
  },
  divider3: { type: "divider" },
  bulletList: {
    run: (editor) => editor?.chain().focus().toggleBulletList().run(),
    isActive: (editor) => editor?.isActive("bulletList"),
    icon: "list",
    shortcut: "MOD+Shift+8 | - ",
  },
  orderedList: {
    run: (editor) => editor?.chain().focus().toggleOrderedList().run(),
    isActive: (editor) => editor?.isActive("orderedList"),
    icon: "list-ordered",
    shortcut: "MOD+Shift+7 | 1. ",
  },
  taskList: {
    run: (editor) => editor?.chain().focus().toggleTaskList().run(),
    isActive: (editor) => editor?.isActive("taskList"),
    icon: "list-todo",
    shortcut: "MOD+Shift+9 | [] ",
  },
  blockQuote: {
    run: (editor) => editor?.chain().focus().toggleBlockquote().run(),
    isActive: (editor) => editor?.isActive("blockquote"),
    icon: "text-quote",
    shortcut: "MOD+Shift+B | > ",
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
    shortcut: "MOD+Alt+C | ```",
  },
  horizontalRule: {
    run: (editor) => editor?.chain().focus().setHorizontalRule().run(),
    isActive: (editor) => editor?.isActive("hr"),
    icon: "separator-horizontal",
    shortcut: "MOD-Shift-- | ---",
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
    shortcut: "MOD-K",
  },
  image: {
    run: (editor) => editor && promptImageUpload(editor),
    isActive: (editor) => editor?.isActive("image"),
    icon: "image",
    shortcut: "MOD-Alt-I",
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
    shortcut: "MOD-Alt-T",
  },
};

export { initTopToolbar, TOOLBAR_ACTIONS, TOP_TOOLBAR_ACTIONS };
