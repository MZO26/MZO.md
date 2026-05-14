import { exportNote } from "@/api/fileAPI";
import { bookmark, createNote, getNoteById, pin } from "@/api/noteAPI";
import { editor } from "@/components/editor/editor-init";
import {
  addOneNoteToList,
  reloadNoteList,
} from "@/components/sidebar/sidebar-actions";
import { handleDeleteNote } from "@/features/note-actions";
import { cleanup } from "@/features/note-ui";
import { settingsStore } from "@/settings/app-state";
import { applyAppTheme } from "@/settings/theme-actions";
import { findElement } from "@/utils/dom";
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
    const { id: originalId, created_at, updated_at, ...rest } = response.data;
    const data: CreateNotePayload = {
      ...rest,
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
