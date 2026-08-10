import { showNotification } from "@/api/api";
import { handleImportNote } from "@/notes/note-actions";
import { MAX_FILE_DROPS } from "@/utils/constants";
import { getExtension } from "@/utils/note";
import { createGlobalSpinner } from "@/utils/ui";
import type { FilePathRequest } from "@shared/schemas/request-schema";
import { ALLOWED_IMPORT_EXTENSIONS } from "@shared/shared-constants";
import type { ImportExtension } from "@shared/shared-types";

function isValidExtension(extension: unknown): extension is ImportExtension {
  return ALLOWED_IMPORT_EXTENSIONS.some((e) => e === extension);
}

function setupSidebarFileDrop(sidebar: HTMLDivElement) {
  function setActive(active: boolean) {
    sidebar.classList.toggle("is-drop-target", active);
  }

  function hasFiles(event: DragEvent) {
    return event.dataTransfer?.types.includes("Files") ?? false;
  }

  function handleDragOver(event: DragEvent) {
    if (!hasFiles(event)) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "copy";
    }
    setActive(true);
  }

  function handleDragLeave(event: DragEvent) {
    if (!hasFiles(event)) return;
    event.preventDefault();
    event.stopPropagation();
    const relatedTarget = event.relatedTarget;
    if (!(relatedTarget instanceof Node) || !sidebar.contains(relatedTarget)) {
      setActive(false);
    }
  }

  async function handleDrop(event: DragEvent) {
    if (!hasFiles(event)) return;
    event.preventDefault();
    event.stopPropagation();
    setActive(false);
    const files = Array.from(event.dataTransfer?.files ?? []);
    if (files.length > MAX_FILE_DROPS) {
      await showNotification(
        "File Drop Limit Exceeded",
        `You can only drop up to ${MAX_FILE_DROPS} files at once.`,
      );
      return;
    }
    const validFilePaths = new Set<string>();
    for (const file of files) {
      if (!isValidExtension(getExtension(file.name))) continue;
      const filePath = window.electronAPI.getPathForFile?.(file);
      if (filePath) validFilePaths.add(filePath);
    }
    if (validFilePaths.size === 0) return;
    const request: FilePathRequest = {
      source: "external",
      filePaths: Array.from(validFilePaths),
    };
    const loading = createGlobalSpinner(0);
    await loading.wrap(async () => {
      await handleImportNote(request);
    });
  }

  sidebar.addEventListener("dragover", handleDragOver);
  sidebar.addEventListener("drop", handleDrop);
  sidebar.addEventListener("dragleave", handleDragLeave);
}

export { isValidExtension, setupSidebarFileDrop };
