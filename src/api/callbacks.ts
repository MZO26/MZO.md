import {
  bookmark,
  exportNote,
  getNoteById,
  pin,
  showNotification,
} from "@/api/api";
import { getExportContent } from "@/notes/export-actions";
import { debouncedSaveNote, handleDeleteNote } from "@/notes/note-actions";
import { handleConflict, isMirrorEnabled } from "@/notes/note-conflict";
import { handleDuplicateNote } from "@/notes/note-duplicate";
import { noteStore, settingsStore, stateStore } from "@/settings/app-state";
import { initDeleteDialog } from "@/settings/dialog-init";
import { findElement } from "@/utils/dom";
import { getAppItem } from "@/utils/registry";
import { ERROR_MESSAGES } from "@shared/errors";
import type { NoteMenuPayload } from "@shared/types";

const { deleteDialog } = initDeleteDialog();

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
    if (payload.bookmarked !== undefined) {
      noteElement.dataset["bookmarked"] = String(payload.bookmarked);
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

  window.noteAPI.onTriggerDelete(async (id: string) => {
    const confirmationEnabled =
      settingsStore.get("delete-confirmation") === true;
    const executeDelete = async () => {
      const noteElement = findElement<HTMLDivElement>(
        `.note-item[data-id="${id}"]`,
        getAppItem("sidebar"),
      );
      if (!noteElement) return;
      await handleDeleteNote(id);
    };
    if (!confirmationEnabled) {
      await executeDelete();
      return;
    }
    const handleClose = async () => {
      if (deleteDialog.returnValue !== "confirm") return;
      await executeDelete();
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
      console.error("[idTrigger]: Failed to copy text: ", error);
    }
  });

  window.noteAPI.onTriggerPin(async (id: string) => {
    const result = await pin(id);
    if (!result.success) {
      console.error("[pinTrigger]: Failed to toggle pin:", result.error);
      return;
    }
    noteStore.setState((state) => ({
      notes: state.notes.map((note) =>
        note.id === id ? { ...note, pinned: result.data } : note,
      ),
      sidebarChange: { type: "reload" },
    }));
  });

  window.noteAPI.onTriggerBookmark(async (id: string) => {
    const result = await bookmark(id);
    if (!result.success) {
      console.error(
        "[bookmarkTrigger]: Failed to toggle bookmark:",
        result.error,
      );
      return;
    }
    noteStore.setState((state) => ({
      notes: state.notes.map((note) =>
        note.id === id ? { ...note, bookmarked: result.data } : note,
      ),
      sidebarChange: { type: "reload" },
    }));
  });

  window.noteAPI.onTriggerDuplicate(async (id: string) => {
    const result = await getNoteById(id);
    if (!result.success) {
      console.error(
        "[duplicateTrigger]: Failed to fetch note for duplication:",
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

  window.electronAPI.onFocus(async () => {
    const activeId = stateStore.get("activeId");
    const note = noteStore.get("activeNote");
    if (!activeId || !note) return;
    const editor = getAppItem("editor");
    stateStore.setState({ lastSyncedAt: 0 });
    if (isMirrorEnabled() && activeId && note) {
      console.log("[System-Resume-Event]: Forcing JIT Sync...");
      const markdown = editor.getMarkdown();
      handleConflict(note, markdown).catch((error: Error) => {
        console.error("[Focus-Event]: Sync failed", error);
      });
    }
  });

  window.electronAPI.onSystemResume(async () => {
    const activeId = stateStore.get("activeId");
    const note = noteStore.get("activeNote");
    if (!activeId || !note) return;
    const editor = getAppItem("editor");
    stateStore.setState({ lastSyncedAt: 0 });
    if (isMirrorEnabled() && activeId && note) {
      console.log("[System-Resume-Event]: Forcing JIT Sync...");
      const markdown = editor.getMarkdown();
      handleConflict(note, markdown).catch((error: Error) => {
        console.error("[System-Resume-Event]: Sync failed", error);
      });
    }
  });
}

export { initListeners };
