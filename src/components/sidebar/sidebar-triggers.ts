import {
  exportNote,
  getAutoExportPath,
  getNoteById,
  openAutoExportFolder,
  pin,
  showNotification,
} from "@/api/api";
import { deleteDialog } from "@/api/callbacks";
import { getExportContent } from "@/notes/export-actions";
import { handleDeleteNote } from "@/notes/note-actions";
import { handleDuplicateNote } from "@/notes/note-duplicate";
import { noteStore } from "@/settings/app-state";
import { findElement, requireElement } from "@/utils/dom";
import { getAppItem } from "@/utils/registry";
import { ERROR_MESSAGES } from "@shared/errors";
import type { OpenAutoExportPathRequest } from "@shared/schemas/export-schema";
import type { NoteMenuPayload } from "@shared/types";

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
    await showNotification("Export Failed.", ERROR_MESSAGES.EXPORT_ERROR);
    return;
  }
  const exported = await exportNote(result.data);
  if (!exported.success) {
    console.error("[exportTrigger]: Failed to write file:", exported.error);
    await showNotification(
      exported.error === "CANCELLED_OPERATION"
        ? "Cancelled Export"
        : "Export Failed.",
      "",
    );
    return;
  }
  await showNotification(
    "Export Successful.",
    `Successfully exported as .${extension.toUpperCase()}`,
  );
}

async function triggerOpenAutoExportFolder(
  autoExportPayload: OpenAutoExportPathRequest,
) {
  const result = await openAutoExportFolder(autoExportPayload);
  if (!result.success || result.data === false) {
    await showNotification("Could not open note path.", "");
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
    await showNotification("Failed to retrieve file path.", "");
    return;
  }
  if (!result.data) {
    console.warn("[onTriggerCopyPath]: File path was empty.");
    await showNotification("No file path to copy.", "");
    return;
  }
  try {
    await navigator.clipboard.writeText(result.data);
    await showNotification("Copied to clipboard.", "");
  } catch (error) {
    await showNotification("Failed to copy to clipboard.", "");
    console.error("[onTriggerCopyPath]: Failed to copy file path:", error);
  }
}

async function triggerCopyRichText(id: string) {
  const result = await getExportContent(id, "html");
  if (!result.success) {
    console.error(
      "[onTriggerCopyRichText]: Failed to fetch note data:",
      result.error,
    );
    await showNotification("Failed to get html.", "");
    return;
  }
  const note = noteStore.get("notes").find((n) => n.id === id);
  if (!note) return;
  const html = result.data.content.trim();
  const plain = note?.plainText.trim() || "";
  try {
    await navigator.clipboard.write([
      new ClipboardItem({
        "text/html": new Blob([html], { type: "text/html" }),
        "text/plain": new Blob([plain], { type: "text/plain" }),
      }),
    ]);
    await showNotification("Copied to clipboard.", "");
  } catch (error) {
    await showNotification("Failed to copy to clipboard.", "");
    console.error("[onTriggerCopyMarkdown]: Failed to copy markdown:", error);
  }
}

async function triggerSingleDelete(id: string) {
  const deleteDialogTitle = requireElement<HTMLSpanElement>(
    ".delete-dialog-title",
    deleteDialog,
  );
  deleteDialogTitle.textContent = "Delete this note?";
  const handleClose = async () => {
    if (deleteDialog.returnValue !== "confirm") {
      deleteDialogTitle.textContent = "";
      return;
    }
    await handleDeleteNote(id);
    deleteDialogTitle.textContent = "";
  };
  deleteDialog.addEventListener("close", handleClose, { once: true });
  deleteDialog.returnValue = "";
  deleteDialog.showModal();
}

async function triggerCopyWikilink(id: string) {
  try {
    await navigator.clipboard.writeText(id);
    await showNotification("Copied to clipboard.", "");
  } catch (error) {
    await showNotification("Failed to copy to clipboard.", "");
    console.error("[onTriggerId]: Failed to copy text: ", error);
  }
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
      sidebarChange: { type: "reload" },
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

export {
  triggerCopyFilePath,
  triggerCopyRichText,
  triggerCopyWikilink,
  triggerDuplicate,
  triggerNoteItemMenu,
  triggerOpenAutoExportFolder,
  triggerPin,
  triggerSingleDelete,
  triggerSingleExport,
  triggerTableMenu,
};
