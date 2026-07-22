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
import { getExportContent } from "@/notes/export-actions";
import { handleDeleteNote } from "@/notes/note-actions";
import { handleDuplicateNote } from "@/notes/note-duplicate";
import { noteStore, settingsStore, stateStore } from "@/settings/app-state";
import {
  confirmWithDialog,
  deleteDialog,
  syncDialog,
} from "@/settings/dialog-init";
import { sleep } from "@/utils/async";
import { findElement, requireElement } from "@/utils/dom";
import { getAppItem } from "@/utils/registry";
import { CHAR_BASELINE, YIELD_MS } from "@shared/constants";
import { ERROR_MESSAGES } from "@shared/errors";
import type { NoteMenuPayload } from "@shared/schemas/note-schema";
import type { OpenAutoExportPathRequest } from "@shared/schemas/request-schema";
import { generateHTML, generateText } from "@tiptap/core";
import { getCachedEditorExtensions } from "../editor/editor-features";

function triggerTableMenu(action: string) {
  const editor = getAppItem("editor");
  const chain = editor.chain().focus();
  switch (action) {
    case "addRowBefore":
      chain.addRowBefore().run();
      break;
    case "addRowAfter":
      chain.addRowAfter().run();
      break;
    case "addColumnBefore":
      chain.addColumnBefore().run();
      break;
    case "addColumnAfter":
      chain.addColumnAfter().run();
      break;
    case "deleteRow":
      chain.deleteRow().run();
      break;
    case "deleteColumn":
      chain.deleteColumn().run();
      break;
    case "deleteTable":
      chain.deleteTable().run();
      break;
  }
}

function triggerNoteItemMenu(payload: NoteMenuPayload) {
  const noteElement = findElement<HTMLDivElement>(
    `.note-item[data-id="${payload.id}"]`,
    getAppItem("sidebar"),
  );
  if (!noteElement) return;
  if (payload.pinned !== undefined) {
    noteElement.dataset["pinned"] = String(payload.pinned);
  }
}

async function triggerSingleExport(id: string, extension: string) {
  const result = await getExportContent(id, extension);
  if (!result.success) {
    console.error("[exportTrigger]: Failed to fetch note data:", result.error);
    await showNotification("Export Failed", ERROR_MESSAGES.EXPORT_ERROR);
    return;
  }
  const exported = await exportNote(result.data);
  if (!exported.success) {
    console.error("[exportTrigger]: Failed to write file:", exported.error);
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
    console.error(
      "[onTriggerCopyPath]: Failed to retrieve file path:",
      result.error,
    );
    await showNotification("Failed to retrieve file path", "");
    return;
  }
  if (!result.data) {
    console.warn("[onTriggerCopyPath]: File path was empty.");
    await showNotification("No file path to copy", "");
    return;
  }
  try {
    await navigator.clipboard.writeText(result.data);
    await showNotification("Copied to clipboard", "");
  } catch (error) {
    await showNotification("Failed to copy to clipboard", "");
    console.error("[onTriggerCopyPath]: Failed to copy file path:", error);
  }
}

async function triggerCopyRichText(id: string) {
  const result = await getNoteById(id);
  if (!result.success) {
    console.error(
      "[onTriggerCopyRichText]: Failed to fetch note data:",
      result.error,
    );
    await showNotification("Failed to get html", "");
    return;
  }
  const note = noteStore.get("notes").find((n) => n.id === id);
  if (!note) return;
  const html = generateHTML(result.data.content, getCachedEditorExtensions());
  const plain = generateText(result.data.content, getCachedEditorExtensions(), {
    blockSeparator: "\n",
  });
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
    console.error("[onTriggerCopyMarkdown]: Failed to copy markdown:", error);
  }
}

async function triggerSingleDelete(id: string) {
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

async function triggerPin(id: string) {
  const result = await pin(id);
  if (!result.success) {
    console.error("[onTriggerPin]: Failed to toggle pin:", result.error);
    return;
  }
  noteStore.setState((state) => {
    const existingNote = state.notes.find((n) => n.id === id);
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

async function triggerDuplicate(id: string) {
  const result = await getNoteById(id);
  if (!result.success) {
    console.error(
      "[onTriggerDuplicate]: Failed to fetch note for duplication:",
      result.error,
    );
    return;
  }
  await handleDuplicateNote(result.data).catch((error: Error) =>
    console.error(
      "[onTriggerDuplicate -> handleDuplicateNote]: Error duplicating Note",
      error,
    ),
  );
}

const syncVersions = new Map<string, number>();

function beginSyncVersion(id: string) {
  if (stateStore.get("activeId") !== id) return null;
  const next = (syncVersions.get(id) ?? 0) + 1;
  syncVersions.set(id, next);
  return next;
}

function isSyncVersionCurrent(id: string, version: number) {
  return stateStore.get("activeId") === id && syncVersions.get(id) === version;
}

function endSyncVersion(id: string, version: number) {
  if (syncVersions.get(id) === version) {
    syncVersions.delete(id);
  }
}

async function triggerSyncCheck(id: string) {
  const version = beginSyncVersion(id);
  if (version == null) return;
  try {
    if (!isSyncVersionCurrent(id, version)) return;
    const result = await getNoteById(id);
    if (!result.success) {
      console.error("[triggerSyncCheck]: Failed to fetch note:", result.error);
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
      console.error(
        "[triggerSyncCheck]: Failed to perform sync check:",
        syncResult.error,
      );
      return;
    }
    switch (syncResult.data.status) {
      case "UNCHANGED":
        await showNotification("Sync Check", "Note is in sync");
        return;
      case "MISSING":
        await showNotification(
          "Sync Check",
          "Note not found in target directory",
        );
        return;
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
      }
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
