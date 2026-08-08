import {
  exportNote,
  getAutoExportPath,
  getNoteById,
  openAutoExportFolder,
  openInDefaultEditor,
  pin,
  showNotification,
  syncRequest,
} from "@/api/api";
import { rendererLogger } from "@/app";
import { getCachedEditorExtensions } from "@/components/editor/editor-actions";
import { getExportContent } from "@/notes/export-actions";
import { handleDeleteNote, handleDuplicateNote } from "@/notes/note-actions";
import {
  confirmWithDialog,
  deleteDialog,
  syncDialog,
} from "@/settings/dialog-init";
import { noteStore, settingsStore, stateStore } from "@/state/state";
import { sleep } from "@/utils/async";
import { CHAR_BASELINE, YIELD_MS } from "@/utils/constants";
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

async function triggerSingleDelete(id: Id) {
  const titleEl = requireElement<HTMLSpanElement>(
    ".delete-dialog-title",
    deleteDialog,
  );
  const confirmed = await confirmWithDialog(
    deleteDialog,
    titleEl,
    "Delete this note?",
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

const syncVersions = new Map<Id, number>();

function beginSyncVersion(id: Id) {
  if (stateStore.get("activeId") !== id) return null;
  const next = (syncVersions.get(id) ?? 0) + 1;
  syncVersions.set(id, next);
  return next;
}

function isSyncVersionCurrent(id: Id, version: number) {
  return stateStore.get("activeId") === id && syncVersions.get(id) === version;
}

function endSyncVersion(id: Id, version: number) {
  if (syncVersions.get(id) === version) {
    syncVersions.delete(id);
  }
}

async function triggerSyncCheck(id: Id) {
  const version = beginSyncVersion(id);
  if (version == null) return;
  try {
    if (!isSyncVersionCurrent(id, version)) return;
    const result = await getNoteById(id);
    if (!result.success) {
      rendererLogger.appError(
        "[triggerSyncCheck]: Failed to fetch note:",
        result.error,
      );
      return;
    }
    const targetDir = settingsStore.get("auto_export_path");
    if (!targetDir) return;
    const editor = getAppItem("editor");
    const markdown = editor.getMarkdown();
    const syncResult = await syncRequest({
      created_at: result.data.created_at,
      updated_at: result.data.updated_at,
      fileName: result.data.title,
      markdown,
      targetDir,
    });
    if (!isSyncVersionCurrent(id, version)) return;
    if (!syncResult.success) {
      rendererLogger.appError(
        "[triggerSyncCheck]: Failed to perform sync check:",
        syncResult.error,
      );
      return;
    }
    const status = syncResult.data.status;
    switch (status) {
      case "UNCHANGED":
        await showNotification("Sync Check", "Note is in sync");
        break;
      case "MISSING":
        await showNotification(
          "Sync Check",
          "Note not found in target directory",
        );
        break;
      case "MODIFIED": {
        await showNotification("Sync Check", "Note is out of sync");
        const titleEl = requireElement<HTMLSpanElement>(
          ".sync-dialog-title",
          syncDialog,
        );
        const confirmed = await confirmWithDialog(
          syncDialog,
          titleEl,
          "Load external changes?",
        );
        if (!confirmed) return;
        if (!isSyncVersionCurrent(id, version)) return;
        if (syncResult.data.markdown.length > CHAR_BASELINE) {
          await sleep(YIELD_MS);
        }
        editor.commands.setContent(syncResult.data.markdown, {
          emitUpdate: true,
          contentType: "markdown",
        });
        break;
      }
      default:
        status satisfies never;
        break;
    }
  } finally {
    endSyncVersion(id, version);
  }
}

export {
  triggerCopyFilePath,
  triggerCopyRichText,
  triggerDuplicate,
  triggerNoteItemMenu,
  triggerOpenAutoExportFolder,
  triggerOpenInDefaultEditor,
  triggerPin,
  triggerSingleDelete,
  triggerSingleExport,
  triggerSyncCheck,
  triggerTableMenu,
};
