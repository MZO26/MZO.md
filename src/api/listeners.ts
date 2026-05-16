import { exportNote } from "@/api/fileAPI";
import {
  bookmark,
  createNote,
  getNoteById,
  mergeNotes,
  pin,
} from "@/api/noteAPI";
import { editor } from "@/components/editor/editor-init";
import {
  updateNoteTags,
  updateStats,
} from "@/components/sidebar/info-sidebar-actions";
import {
  addOneNoteToList,
  reloadNoteList,
} from "@/components/sidebar/sidebar-actions";
import { handleDeleteNote } from "@/features/note-actions";
import { cleanup, viewNote } from "@/features/note-ui";
import { settingsStore, stateStore } from "@/settings/app-state";
import { applyAppTheme } from "@/settings/theme-actions";
import { debounce } from "@/utils/async";
import { findElement, setActiveItem } from "@/utils/dom";
import { getAppItem } from "@/utils/registry";
import { sanitize } from "@/utils/sanitize";
import { showToast } from "@/utils/toast";
import { titleGenerator } from "@shared/generators/generators";
import type { ExportRequest } from "@shared/schemas/export-schema";
import type { CreateNotePayload } from "@shared/schemas/note-schema";

function initListeners() {
  let lastAppliedTheme: string | null = null;

  window.storeAPI.onSettingsChanged((settings) => {
    settingsStore.setState(settings);
  });

  window.fileAPI.onTriggerExport(async (extension) => {
    const editor = getAppItem("editor");
    const fileName = titleGenerator(editor.getText());

    try {
      let payload: ExportRequest;
      switch (extension) {
        case "json":
          payload = {
            extension: "json",
            content: JSON.stringify(editor.getJSON()),
            fileName,
          };
          break;
        case "html":
          payload = {
            extension: "html",
            content: sanitize(editor.getHTML()),
            fileName,
          };
          break;
        case "md":
          payload = {
            extension: "md",
            content: editor.getMarkdown(),
            fileName,
          };
          break;
        case "txt":
          payload = { extension: "txt", content: editor.getText(), fileName };
          break;
        case "pdf":
          payload = { extension: "pdf", content: editor.getHTML(), fileName };
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

  window.noteAPI.onTriggerDelete(async (id: string) => {
    const noteElement = findElement<HTMLDivElement>(
      `.noteItem[data-id="${id}"]`,
    );
    if (!noteElement) return;
    await handleDeleteNote(id, noteElement);
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

  function setModalState(show: boolean): void {
    const appContainer = getAppItem("appContainer");
    const modal = findElement<HTMLDivElement>(".confirmation");
    modal?.classList.toggle("show", show);
    appContainer.inert = show;
  }

  window.noteAPI.onTriggerMerge((id: string) => {
    setModalState(true);
    const UUID_REGEX =
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    const input = findElement<HTMLInputElement>("#noteId");
    const spinner = findElement<HTMLDivElement>("#loadingSpinner");
    const overlay = findElement<HTMLDivElement>(".overlay");
    if (!input || !spinner || !overlay) return;
    const handleUUIDInput = debounce(async (event) => {
      const value = event.target.value.trim();
      if (value.length !== 36) {
        return;
      }
      if (!UUID_REGEX.test(value)) {
        showToast("No valid UUID format.");
        return;
      }
      let spinnerTimeout;
      try {
        spinnerTimeout = setTimeout(() => {
          overlay?.classList.toggle("show", true);
          spinner.style.display = "block";
        }, 300);
        const mergeResult = await mergeNotes(id, value);
        if (!mergeResult.success) {
          showToast("Failed to save merged note.");
          return;
        }
        const noteBItem = findElement<HTMLDivElement>(
          `div[data-id="${value}"]`,
        );
        if (!noteBItem) return;
        await handleDeleteNote(value, noteBItem);
        stateStore.setState({ activeId: mergeResult.data.id });
        const noteItem = findElement<HTMLDivElement>(
          `div[data-id="${mergeResult.data.id}"]`,
        );
        if (!noteItem) return;
        viewNote(mergeResult.data);
        updateNoteTags(mergeResult.data.tags);
        updateStats();
        setActiveItem(noteItem, getAppItem("sidebar"));
        showToast("Notes merged successfully!");
        input.value = "";
        setModalState(false);
      } catch (error) {
        console.error("Record not found", error);
      } finally {
        clearTimeout(spinnerTimeout);
        spinner.style.display = "none";
        overlay?.classList.toggle("show", false);
      }
    }, 1000);
    input.addEventListener("input", handleUUIDInput);
  });

  window.noteAPI.onTriggerPin(async (id: string) => {
    const response = await pin(id);
    if (!response.success) {
      showToast(response.message);
      return;
    }
    response.data === true
      ? showToast("Pinned note")
      : showToast("Unpinned note");
    await reloadNoteList();
  });

  window.noteAPI.onTriggerBookmark(async (id: string) => {
    const response = await bookmark(id);
    if (!response.success) {
      showToast(response.message);
      return;
    }
    response.data === true
      ? showToast("Bookmarked note")
      : showToast("Removed bookmark");
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
    const outgoingLinkIds = originalLinks
      .filter((link) => link.dir === "out")
      .map((link) => link.id);
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
    if (lastAppliedTheme === newTheme) return;
    lastAppliedTheme = newTheme;
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
