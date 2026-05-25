import {
  createViews,
  debouncedSearch,
  handleViews,
  toggleSidebar,
} from "@/components/sidebar/sidebar-actions";
import {
  handleCreateNote,
  handleImportNote,
  handleSelectNote,
} from "@/features/note-actions";
import { createAsyncHandler } from "@/utils/async";
import { requireElement } from "@/utils/dom";
import { getAppItem, registerAppEvents } from "@/utils/registry";
import { initTippyDelegate } from "@/utils/ui";
import { VIEWS } from "@shared/constants";
import type { View } from "@shared/types";

async function initNotesSidebar() {
  const appContainer = getAppItem("appContainer");
  const sidebar = getAppItem("sidebar");
  const sidebarContainer = requireElement<HTMLDivElement>(".sidebar-container");
  const sidebarHeader = requireElement<HTMLDivElement>(".sidebar-header");
  const searchInput = requireElement<HTMLInputElement>(".search-input");
  initTippyDelegate(sidebarContainer);
  const viewSelect = createViews(VIEWS);
  applySidebarListeners(sidebar, sidebarHeader, searchInput, viewSelect);
  registerAppEvents(document, {
    "app:toggle-sidebar": () => toggleSidebar(appContainer),
    "app:create-new-note": () => handleCreateNote(),
  });
}

function applySidebarListeners(
  sidebar: HTMLDivElement,
  sidebarHeader: HTMLDivElement,
  searchInput: HTMLInputElement,
  viewSelect: HTMLSelectElement,
) {
  sidebarHeader.addEventListener(
    "click",
    createAsyncHandler(async (e) => {
      const target = e.target as HTMLElement;
      if (target === sidebarHeader) return;
      const addNoteBtn = target.closest<HTMLButtonElement>(".add-note-btn");
      if (addNoteBtn) {
        await handleCreateNote();
        return;
      }
      const importBtn = target.closest<HTMLButtonElement>(".import-btn");
      if (importBtn) {
        await handleImportNote();
        return;
      }
    }),
  );
  searchInput.addEventListener("input", debouncedSearch);
  viewSelect.addEventListener(
    "change",
    createAsyncHandler(async (e) => {
      const target = e.target as HTMLSelectElement;
      const view = target.value as View;
      handleViews(view);
    }),
  );
  sidebar.addEventListener(
    "click",
    createAsyncHandler(async (e) => {
      const target = e.target as HTMLElement;
      if (target === sidebar) return;
      const actionBtn = target.closest<HTMLButtonElement>("button");
      if (actionBtn) {
        e.preventDefault();
        e.stopPropagation();
        const item = target.closest<HTMLElement>(".note-item");
        const id = item?.getAttribute("data-id");
        const isPinned = item?.getAttribute("data-pinned") === "true";
        const isBookmarked = item?.getAttribute("data-bookmarked") === "true";
        window.electronAPI.showContextMenu("note", {
          id: id,
          pinned: isPinned,
          bookmarked: isBookmarked,
        });
        return;
      }
      const noteItem = target.closest<HTMLDivElement>(".note-item");
      if (noteItem) {
        await handleSelectNote(noteItem);
      }
      return;
    }),
  );
}

export { initNotesSidebar };
