import {
  bookmark,
  createNote,
  exportNote,
  getNoteById,
  mergeNotes,
  pin,
} from "@/api/api";
import { editor } from "@/components/editor/editor-init";
import { debouncedUpdateStats } from "@/components/sidebar/info-sidebar-actions";
import {
  addOneNoteToList,
  reloadNoteList,
} from "@/components/sidebar/sidebar-actions";
import {
  cleanup,
  cleanupDeletedNoteUI,
  handleDeleteNote,
  pendingDeletions,
  viewNote,
} from "@/features/note-actions";
import { stopAutoSave } from "@/features/note-auto-save";
import { noteStore, settingsStore, stateStore } from "@/settings/app-state";
import { applyAppTheme } from "@/settings/theme-actions";
import { findElement, setActiveItem } from "@/utils/dom";
import { getAppItem } from "@/utils/registry";
import { sanitize, validateUUID } from "@/utils/sanitize";
import { showToast } from "@/utils/toast";
import { initTippyDelegate, useDelayedSpinner } from "@/utils/ui";
import { titleGenerator } from "@shared/generators/generators";
import type { ExportRequest } from "@shared/schemas/export-schema";
import type { CreateNotePayload } from "@shared/schemas/note-schema";

function initListeners() {
  window.storeAPI.onSettingsChanged((settings) => {
    settingsStore.setState(settings);
  });

  window.electronAPI.onTriggerTableAction((action) => {
    const editor = getAppItem("editor");
    if (!editor) return;
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
    const noteElement = document.querySelector(
      `.note-item[data-id="${payload.id}"]`,
    ) as HTMLElement;
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

  window.fileAPI.onTriggerExport(async (id: string, extension) => {
    const editor = getAppItem("editor");
    const fileName = titleGenerator(editor.getText());
    try {
      let payload: ExportRequest;
      switch (extension) {
        case "json":
          payload = {
            id,
            extension: "json",
            content: JSON.stringify(editor.getJSON()),
            fileName,
          };
          break;
        case "html":
          payload = {
            id,
            extension: "html",
            content: sanitize(editor.getHTML()),
            fileName,
          };
          break;
        case "md":
          payload = {
            id,
            extension: "md",
            content: editor.getMarkdown(),
            fileName,
          };
          break;
        case "txt":
          payload = {
            id,
            extension: "txt",
            content: editor.getText(),
            fileName,
          };
          break;
        case "pdf":
          payload = {
            id,
            extension: "pdf",
            content: editor.getHTML(),
            fileName,
          };
          break;
        default:
          showToast(`Unsupported export format: ${extension}`);
          return;
      }
      const response = await exportNote(payload);
      if (!response.success) {
        showToast(response.message || "Failed to export note.");
        return response;
      }
      showToast(`Successfully exported ${extension.toUpperCase()} file`);
      return response;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      showToast(`Export process failed: ${errorMessage}`);
      return { success: false, message: errorMessage };
    }
  });

  const deleteDialog = findElement("#delete-dialog") as HTMLDialogElement;
  const confirmBtn = findElement("#confirm-delete-btn") as HTMLButtonElement;
  if (deleteDialog) {
    initTippyDelegate(deleteDialog, deleteDialog);
  }

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
      showToast("ID copied to clipboard!");
    } catch (err) {
      showToast("Failed to copy ID.");
      console.error("Failed to copy text: ", err);
    }
  });

  const mergeDialog = findElement<HTMLDialogElement>(".merge-modal");
  const mergeInput = findElement<HTMLInputElement>("#noteId");
  if (mergeDialog) {
    initTippyDelegate(mergeDialog, mergeDialog);
  }

  window.noteAPI.onTriggerMerge((id: string) => {
    if (!mergeDialog || !mergeInput) return;
    mergeInput.value = "";
    mergeDialog.returnValue = "";
    const handleClose = async () => {
      if (mergeDialog.returnValue !== "confirm") return;
      const value = mergeInput.value.trim();
      const validatedId = validateUUID(value);
      if (!validatedId) {
        showToast("Invalid Note ID format.");
        return;
      }
      if (id === validatedId) {
        showToast("You cannot merge a note with itself.");
        return;
      }
      stopAutoSave(getAppItem("editor"), "cancel");
      pendingDeletions.add(id);
      pendingDeletions.add(validatedId);
      const stopSpinner = useDelayedSpinner(100);
      try {
        const result = await mergeNotes(id, validatedId);
        if (!result.success) {
          showToast(result.message);
          return;
        }
        const noteBItem = findElement<HTMLDivElement>(
          `div[data-id="${validatedId}"]`,
        );
        if (noteBItem) cleanupDeletedNoteUI(validatedId, noteBItem);
        stateStore.setState({ activeId: result.data.id });
        viewNote(result.data);
        debouncedUpdateStats(result.data);
        const noteItem = findElement<HTMLDivElement>(
          `.note-item[data-id="${result.data.id}"]`,
        );
        if (noteItem) setActiveItem(noteItem, getAppItem("sidebar"));
        showToast("Notes merged successfully.");
      } catch (error: any) {
        console.error("Merge failed:", error);
        showToast("Failed to merge notes.");
      } finally {
        pendingDeletions.delete(id);
        setTimeout(() => pendingDeletions.delete(validatedId), 1000);
        if (stopSpinner) stopSpinner();
      }
    };
    mergeDialog.addEventListener("close", handleClose, { once: true });
    mergeDialog.returnValue = "";
    mergeDialog.showModal();
  });

  window.noteAPI.onTriggerPin(async (id: string) => {
    const response = await pin(id);
    if (!response.success) {
      showToast(response.message);
      return;
    }
    noteStore.setState((state) => ({
      notes: state.notes.map((note) =>
        note.id === id ? { ...note, pinned: response.data } : note,
      ),
    }));
    await reloadNoteList();
  });

  window.noteAPI.onTriggerBookmark(async (id: string) => {
    const response = await bookmark(id);
    if (!response.success) {
      showToast(response.message);
      return;
    }
    noteStore.setState((state) => ({
      notes: state.notes.map((note) =>
        note.id === id ? { ...note, bookmarked: response.data } : note,
      ),
    }));
    await reloadNoteList();
  });

  window.noteAPI.onTriggerDuplicate(async (id: string) => {
    const response = await getNoteById(id);
    if (!response.success) {
      showToast(response.message);
      return;
    }
    const {
      id: originalId,
      links: originalLinks,
      created_at,
      updated_at,
      ...rest
    } = response.data;

    // does not duplicate incoming links because other notes would be forced to point to this new duplicate
    const outgoingLinkIds: string[] = [];
    for (const link of originalLinks) {
      if (link.dir === "out") {
        outgoingLinkIds.push(link.id);
      }
    }
    const data: CreateNotePayload = {
      ...rest,
      links: outgoingLinkIds,
      pinned: false,
      bookmarked: false,
    };
    const result = await createNote(data);
    if (!result.success) {
      showToast(result.message);
      return;
    }
    addOneNoteToList(result.data);
  });

  window.electronAPI.onThemeChanged(async (newTheme) => {
    await applyAppTheme(newTheme, true);
  });

  window.electronAPI.onRequestFlush(async () => {
    if (editor) {
      const controller = cleanup.get(editor);
      if (controller) {
        await controller.flush();
      }
    }
    window.electronAPI.confirmFlush();
  });
}

export { initListeners };
