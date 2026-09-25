import {
  exportNote,
  getAutoExportPath,
  getNoteById,
  openAutoExportFolder,
  openInDefaultEditor,
  pin,
  showNotification,
} from "@/api/api";
import { rendererLogger } from "@/app";
import { getCachedEditorExtensions } from "@/components/editor/editor-actions";
import {
  getHTMLContentBetween,
  getMarkdownContentBetween,
} from "@/components/editor/editor-content";
import { getExportContent } from "@/notes/export-actions";
import { handleDeleteNote, handleDuplicateNote } from "@/notes/note-actions";
import {
  confirmWithDialog,
  deleteDialog,
  withDialogLock,
} from "@/settings/dialog-init";
import { noteStore } from "@/state/state";
import { requireElement } from "@/utils/dom";
import { getAppItem } from "@/utils/registry";
import { ERROR_MESSAGES } from "@shared/errors";
import type { Id, NoteMenuPayload } from "@shared/schemas/note-schema";
import type {
  ExportContent,
  OpenAutoExportPathRequest,
} from "@shared/schemas/request-schema";
import { TABLE_ACTIONS } from "@shared/shared-constants";
import type { TableAction } from "@shared/shared-types";
import { generateHTML } from "@tiptap/core";

function triggerTableMenu(action: TableAction) {
  const editor = getAppItem("editor");
  const chain = editor.chain().focus();
  switch (action) {
    case TABLE_ACTIONS.ADD_ROW_BEFORE:
      chain.addRowBefore().run();
      break;
    case TABLE_ACTIONS.ADD_ROW_AFTER:
      chain.addRowAfter().run();
      break;
    case TABLE_ACTIONS.ADD_COLUMN_BEFORE:
      chain.addColumnBefore().run();
      break;
    case TABLE_ACTIONS.ADD_COLUMN_AFTER:
      chain.addColumnAfter().run();
      break;
    case TABLE_ACTIONS.DELETE_ROW:
      chain.deleteRow().run();
      break;
    case TABLE_ACTIONS.DELETE_COLUMN:
      chain.deleteColumn().run();
      break;
    case TABLE_ACTIONS.DELETE_TABLE:
      chain.deleteTable().run();
      break;
    default:
      action satisfies never;
      break;
  }
}

function triggerNoteItemMenu(payload: NoteMenuPayload) {
  const sidebar = getAppItem("sidebar");
  const noteElement = sidebar.querySelector<HTMLDivElement>(
    `.note-item[data-id="${CSS.escape(payload.id)}"]`,
  );
  if (!noteElement) return;
  if (payload.pinned !== undefined) {
    noteElement.dataset["pinned"] = String(!!payload.pinned);
  }
}

async function triggerSingleExport(
  id: Id,
  extension: ExportContent["extension"],
) {
  const result = await getExportContent(id, extension);
  if (!result.success) {
    rendererLogger.appError(
      "[exportTrigger]: Failed to fetch note data:",
      result.error,
    );
    await showNotification("Export Failed", ERROR_MESSAGES.EXPORT_ERROR);
    return;
  }
  const exported = await exportNote(result.data);
  if (!exported.success) {
    rendererLogger.appError(
      "[exportTrigger]: Failed to write file:",
      exported.error,
    );
    if (exported.error === "CANCELLED_OPERATION") return;
    await showNotification("Export Failed", "");
    return;
  }
  await showNotification(
    "Export Complete",
    `Exported files as .${extension.toUpperCase()}`,
  );
}

async function triggerOpenAutoExportFolder(
  autoExportPayload: OpenAutoExportPathRequest,
) {
  const result = await openAutoExportFolder(autoExportPayload);
  if (!result.success || result.data === false) {
    await showNotification("Could not open note path", "");
    return;
  }
}

async function triggerOpenInDefaultEditor(
  autoExportPayload: OpenAutoExportPathRequest,
) {
  const result = await openInDefaultEditor(autoExportPayload);
  if (!result.success || result.data === false) {
    await showNotification("Could not open note in default Editor", "");
    return;
  }
}

async function triggerCopyFilePath(syncPayload: OpenAutoExportPathRequest) {
  const result = await getAutoExportPath(syncPayload);
  if (!result.success) {
    rendererLogger.appError(
      "[onTriggerCopyPath]: Failed to retrieve file path:",
      result.error,
    );
    await showNotification("Failed to retrieve file path", "");
    return;
  }
  if (!result.data) {
    rendererLogger.devLog("[onTriggerCopyPath]: File path was empty.");
    await showNotification("No file path to copy", "");
    return;
  }
  try {
    await navigator.clipboard.writeText(result.data);
    await showNotification("Copied to clipboard", "");
  } catch (error) {
    await showNotification("Failed to copy to clipboard", "");
    rendererLogger.appError(
      "[onTriggerCopyPath]: Failed to copy file path:",
      error,
    );
  }
}

async function triggerCopyRichText(id: Id) {
  const result = await getNoteById(id);
  if (!result.success) {
    rendererLogger.appError(
      "[onTriggerCopyRichText]: Failed to fetch note data:",
      result.error,
    );
    await showNotification("Failed to get html", "");
    return;
  }
  const html = generateHTML(result.data.content, getCachedEditorExtensions());
  const plain = result.data.plain_text;
  if (!html || !plain) return;
  try {
    await navigator.clipboard.write([
      new ClipboardItem({
        "text/html": new Blob([html], { type: "text/html" }),
        "text/plain": new Blob([plain], { type: "text/plain" }),
      }),
    ]);
    await showNotification("Copied to clipboard", "");
  } catch (error) {
    await showNotification("Failed to copy to clipboard", "");
    rendererLogger.appError(
      "[onTriggerCopyMarkdown]: Failed to copy markdown:",
      error,
    );
  }
}

async function triggerCopySelectionHtml() {
  const editor = getAppItem("editor");
  if (!editor) return;
  const { state } = editor;
  const { from, to } = state.selection;
  if (from === to) return;
  const html = getHTMLContentBetween(editor, from, to);
  if (!html) return;
  try {
    await navigator.clipboard.writeText(html);
  } catch (error) {
    rendererLogger.appError(
      "[triggerCopySelectionHtml]: Failed to copy selection as HTML:",
      error,
    );
  }
}

async function triggerCopySelectionMarkdown() {
  const editor = getAppItem("editor");
  if (!editor) return;
  const { from, to } = editor.state.selection;
  if (from === to) return;
  const markdown = getMarkdownContentBetween(editor, from, to);
  if (!markdown) return;
  try {
    await navigator.clipboard.writeText(markdown);
  } catch (error) {
    rendererLogger.appError(
      "[triggerCopySelectionMarkdown]: Failed to copy selection as markdown:",
      error,
    );
  }
}

async function triggerCopySelectionRichText() {
  const editor = getAppItem("editor");
  if (!editor) return;
  const { state } = editor;
  const { from, to } = state.selection;
  if (from === to) return;
  const html = getHTMLContentBetween(editor, from, to);
  const plain = state.doc.textBetween(
    Math.min(from, to),
    Math.max(from, to),
    "\n",
  );
  if (!html && !plain) return;
  try {
    await navigator.clipboard.write([
      new ClipboardItem({
        "text/html": new Blob([html], { type: "text/html" }),
        "text/plain": new Blob([plain], { type: "text/plain" }),
      }),
    ]);
  } catch (error) {
    rendererLogger.appError(
      "[triggerCopySelectionRichText]: Failed to copy selection as rich text:",
      error,
    );
  }
}

async function triggerSingleDelete(id: Id) {
  const titleEl = requireElement<HTMLSpanElement>(
    ".delete-dialog-title",
    deleteDialog,
  );
  const confirmed = await withDialogLock(() =>
    confirmWithDialog(deleteDialog, titleEl, "Delete this note?"),
  );
  if (!confirmed) return;
  await handleDeleteNote(id);
}

async function triggerPin(id: Id) {
  const result = await pin(id);
  if (!result.success) {
    rendererLogger.appError(
      "[onTriggerPin]: Failed to toggle pin:",
      result.error,
    );
    return;
  }
  noteStore.setState((state) => {
    const existingNote = state.noteIndex.get(id);
    if (!existingNote) return state;
    const updatedNote = { ...existingNote, pinned: result.data };
    const nextNoteIndex = new Map(state.noteIndex);
    nextNoteIndex.set(updatedNote.id, updatedNote);
    return {
      notes: state.notes.map((n) => (n.id === id ? updatedNote : n)),
      noteIndex: nextNoteIndex,
    };
  });
}

async function triggerDuplicate(id: Id) {
  const result = await getNoteById(id);
  if (!result.success) {
    rendererLogger.appError(
      "[onTriggerDuplicate]: Failed to fetch note for duplication:",
      result.error,
    );
    return;
  }
  await handleDuplicateNote(result.data).catch((error: Error) =>
    rendererLogger.appError(
      "[onTriggerDuplicate -> handleDuplicateNote]: Error duplicating Note",
      error,
    ),
  );
}

export {
  triggerCopyFilePath,
  triggerCopyRichText,
  triggerCopySelectionHtml,
  triggerCopySelectionMarkdown,
  triggerCopySelectionRichText,
  triggerDuplicate,
  triggerNoteItemMenu,
  triggerOpenAutoExportFolder,
  triggerOpenInDefaultEditor,
  triggerPin,
  triggerSingleDelete,
  triggerSingleExport,
  triggerTableMenu,
};
