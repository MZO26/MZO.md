import {
  exportNote,
  getAutoExportPath,
  getNoteById,
  openAutoExportFolder,
  pin,
  showNotification,
} from "@/api/api";
import { getExportContent } from "@/notes/export-actions";
import {
  debouncedSaveNote,
  handleDeleteNote,
  handleSaveNote,
} from "@/notes/note-actions";
import { handleDuplicateNote } from "@/notes/note-duplicate";
import { noteStore, settingsStore, stateStore } from "@/settings/app-state";
import { initDeleteDialog } from "@/settings/dialog-init";
import { findElement, requireElement } from "@/utils/dom";
import { getAppItem } from "@/utils/registry";
import { ERROR_MESSAGES } from "@shared/errors";
import type { NoteMenuPayload } from "@shared/types";

//-------------------------------------------------------

// helper functions for callbacks

export const { deleteDialog } = initDeleteDialog();

async function ensureNoteSaved(id: string) {
  const note = noteStore.get("notes").find((n) => n.id === id);
  const activeId = stateStore.get("activeId");
  if (!note || activeId !== note.id) return;
  const editor = getAppItem("editor");
  const autoExportPayload = {
    id: note.id,
    fileName: note.title,
    extension: "md" as const,
    updated_at: note.updated_at,
  };
  debouncedSaveNote.cancel();
  await handleSaveNote(note.id, editor.getJSON(), editor.getMarkdown());
  return autoExportPayload;
}

//----------------------------------------------------------

// electron callbacks that only get registered once at startup. Thus no need for assignment of cleanups
function initListeners() {
  window.storeAPI.onSettingsChanged((settings) => {
    settingsStore.setState(settings);
  });

  window.electronAPI.onTriggerTableAction((action) => {
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
  });

  window.electronAPI.onTriggerNoteAction((payload: NoteMenuPayload) => {
    const noteElement = findElement<HTMLDivElement>(
      `.note-item[data-id="${payload.id}"]`,
      getAppItem("sidebar"),
    );
    if (!noteElement) return;
    if (payload.pinned !== undefined) {
      noteElement.dataset["pinned"] = String(payload.pinned);
    }
  });

  window.noteAPI.onTriggerExport(async (id: string, extension: string) => {
    const result = await getExportContent(id, extension);
    if (!result.success) {
      console.error(
        "[exportTrigger]: Failed to fetch note data:",
        result.error,
      );
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
  });

  window.noteAPI.onTriggerPath(async (id: string) => {
    const autoExportPayload = await ensureNoteSaved(id);
    if (!autoExportPayload) return;
    const result = await openAutoExportFolder(autoExportPayload);
    if (!result.success || result.data === false) {
      await showNotification("Could not open note path.", "");
      return;
    }
  });

  window.noteAPI.onTriggerCopyPath(async (id: string) => {
    const syncPayload = await ensureNoteSaved(id);
    if (!syncPayload) return;
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
  });

  window.noteAPI.onTriggerCopyMarkdown(async (id: string) => {
    const result = await getExportContent(id, "md");
    if (!result.success) {
      console.error(
        "[onTriggerCopyMarkdown]: Failed to fetch note data:",
        result.error,
      );
      await showNotification("Failed to get Markdown.", "");
      return;
    }
    const markdown = result.data.content;
    try {
      await navigator.clipboard.writeText(markdown);
      await showNotification("Copied to clipboard.", "");
    } catch (error) {
      await showNotification("Failed to copy to clipboard.", "");
      console.error("[onTriggerCopyMarkdown]: Failed to copy markdown:", error);
    }
  });

  window.noteAPI.onTriggerDelete(async (id: string) => {
    const confirmationEnabled =
      settingsStore.get("delete-confirmation") === true;
    if (!confirmationEnabled) {
      await handleDeleteNote(id);
      return;
    }
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
  });

  window.noteAPI.onTriggerId(async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      await showNotification("Copied to clipboard.", "");
    } catch (error) {
      await showNotification("Failed to copy to clipboard.", "");
      console.error("[onTriggerId]: Failed to copy text: ", error);
    }
  });

  window.noteAPI.onTriggerPin(async (id: string) => {
    const result = await pin(id);
    if (!result.success) {
      console.error("[onTriggerPin]: Failed to toggle pin:", result.error);
      return;
    }
    console.log("need reload");
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
  });

  window.noteAPI.onTriggerDuplicate(async (id: string) => {
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
  });

  window.electronAPI.onThemeChanged(async (resolvedTheme) => {
    document.documentElement.dataset["theme"] = resolvedTheme;
  });

  window.electronAPI.onRequestFlush(async () => {
    debouncedSaveNote.flush();
    window.electronAPI.confirmFlush();
  });
}

export { initListeners };
