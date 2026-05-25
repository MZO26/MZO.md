import {
  bookmark,
  exportNote,
  getNoteById,
  pin,
  showNotification,
} from "@/api/api";
import { editor } from "@/components/editor/editor-init";
import { reloadNoteList } from "@/components/sidebar/sidebar-actions";
import { getExportContent } from "@/features/export-actions";
import { handleDeleteNote } from "@/features/note-actions";
import { handleDuplicateNote } from "@/features/note-duplicate";
import { handleMergeNotes } from "@/features/note-merge";
import { noteStore, settingsStore } from "@/settings/app-state";
import { initDeleteDialog, initMergeDialog } from "@/settings/dialogs";
import { createAsyncHandler } from "@/utils/async";
import { findElement } from "@/utils/dom";
import { getAppItem } from "@/utils/registry";
import { CLEANUP, ERROR_MESSAGES } from "@shared/constants";

const { mergeDialog, mergeInput } = initMergeDialog();
const { deleteDialog, confirmBtn } = initDeleteDialog();

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

  window.electronAPI.onTriggerNoteAction((payload) => {
    const noteElement = findElement<HTMLDivElement>(
      `.note-item[data-id="${payload.id}"]`,
    );
    if (!noteElement) return;
    switch (payload.action) {
      case "pin":
        noteElement.dataset["pinned"] = "true";
        break;
      case "unpin":
        noteElement.dataset["pinned"] = "false";
        break;
      case "bookmark":
        noteElement.dataset["bookmarked"] = "true";
        break;
      case "unbookmark":
        noteElement.dataset["bookmarked"] = "false";
        break;
    }
  });

  window.fileAPI.onTriggerExport(async (id: string, extension: string) => {
    const result = getExportContent(id, extension);
    if (!result.success) {
      console.error(
        "[exportTrigger]: Failed to fetch note data:",
        result.error,
      );
      await showNotification("Export Failed", ERROR_MESSAGES["INVALID_DATA"]);
      return;
    }
    const exported = await exportNote(result.data);
    if (!exported.success) {
      console.error("[exportTrigger]: Failed to write file:", exported.error);
      return;
    }
    await showNotification(
      "Export Successful",
      `Successfully exported as .${extension.toUpperCase()}`,
    );
  });

  window.noteAPI.onTriggerDelete(async (id: string) => {
    if (!deleteDialog || !confirmBtn) return;
    const handleClose = async () => {
      if (deleteDialog.returnValue !== "confirm") return;
      const noteElement = findElement<HTMLDivElement>(
        `.note-item[data-id="${id}"]`,
      );
      if (!noteElement) return;
      await handleDeleteNote(id, noteElement);
      deleteDialog.close();
    };
    deleteDialog.addEventListener("close", handleClose, { once: true });
    deleteDialog.returnValue = "";
    deleteDialog.showModal();
  });

  window.noteAPI.onTriggerId(async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      await showNotification("ID copied to clipboard!", "");
    } catch (error) {
      await showNotification("Failed to copy ID.", "");
      console.error("[idTrigger]: Failed to copy text: ", error);
    }
  });

  window.noteAPI.onTriggerMerge((idA: string) => {
    if (!mergeDialog || !mergeInput) return;
    const handleClose = createAsyncHandler(async () => {
      if (mergeDialog.returnValue !== "confirm") return;
      const idB = mergeInput.value.trim();
      await handleMergeNotes(idA, idB);
    });
    mergeDialog.addEventListener("close", handleClose, { once: true });
    mergeDialog.returnValue = "";
    mergeInput.value = "";
    mergeDialog.showModal();
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
    }));
    await reloadNoteList();
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
    }));
    await reloadNoteList();
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
    await handleDuplicateNote(result.data);
  });

  window.electronAPI.onThemeChanged(async (resolvedTheme) => {
    document.documentElement.dataset["theme"] = resolvedTheme;
  });

  window.electronAPI.onRequestFlush(async () => {
    if (editor) {
      const controller = CLEANUP.get(editor);
      if (controller) {
        await controller.flush();
      }
    }
    window.electronAPI.confirmFlush();
  });
}

export { initListeners };
