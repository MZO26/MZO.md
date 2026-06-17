import {
  debouncedSearch,
  handleViews,
  resizeSidebar,
} from "@/components/sidebar/sidebar-features";
import { createViews, setSidebarState } from "@/components/sidebar/sidebar-ui";
import {
  handleCreateNote,
  handleImportNote,
  handleSelectNote,
} from "@/notes/note-actions";
import { stateStore } from "@/settings/app-state";
import { createAsyncHandler } from "@/utils/async";
import { requireElement } from "@/utils/dom";
import { getAppItem, registerAppEvents } from "@/utils/registry";
import { initTippyDelegate } from "@/utils/ui";
import { VIEWS } from "@shared/constants";
import type { ViewId } from "@shared/types";
// sidebar

function initNotesSidebar() {
  const appContainer = getAppItem("appContainer");
  const sidebar = getAppItem("sidebar");
  const sidebarContainer = requireElement<HTMLDivElement>(
    ".sidebar-container",
    appContainer,
  );
  const sidebarHeader = requireElement<HTMLDivElement>(
    ".sidebar-header",
    sidebarContainer,
  );
  const searchInput = requireElement<HTMLInputElement>(
    ".search-input",
    sidebarContainer,
  );
  const viewSelect = createViews(VIEWS);
  initTippyDelegate(sidebarContainer);
  applySidebarListeners(sidebar, sidebarHeader, searchInput, viewSelect);
  registerAppEvents(document, {
    "app:toggle-sidebar": () => {
      const collapsed = appContainer.classList.contains("collapsed");
      setSidebarState(appContainer, !collapsed);
    },
    "app:create-new-note": () => handleCreateNote(),
    "app:open-global-search": () => searchInput.focus(),
  });
}

function applySidebarListeners(
  sidebar: HTMLDivElement,
  sidebarHeader: HTMLDivElement,
  searchInput: HTMLInputElement,
  viewSelect: HTMLSelectElement,
) {
  resizeSidebar(".resizer-sidebar", ".sidebar-container");
  sidebarHeader.addEventListener(
    "click",
    createAsyncHandler(async (e) => {
      const target = e.target as HTMLElement | null;
      if (target === sidebarHeader) return;
      const addNoteBtn = target?.closest<HTMLButtonElement>(".add-note-btn");
      if (addNoteBtn) {
        await handleCreateNote();
        return;
      }
      const importBtn = target?.closest<HTMLButtonElement>(".import-btn");
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
      const target = e.target as HTMLSelectElement | null;
      const view = target?.value as ViewId;
      const activeId = stateStore.getState().activeId;
      if (view === "links" && !activeId) {
        if (target) target.value = "all";
        return;
      }
      await handleViews(view);
    }),
  );
  sidebar.addEventListener("contextmenu", (e) => {
    const target = e.target as HTMLElement | null;
    const isEmptySidebar =
      sidebar.childElementCount === 1 &&
      sidebar.firstElementChild?.classList.contains("sidebar-empty-state");
    if (target === sidebar || isEmptySidebar) {
      e.preventDefault();
      return;
    }
    e.preventDefault();
    const noteElement = target?.closest<HTMLDivElement>(".note-item");
    const id = noteElement?.getAttribute("data-id");
    const isPinned = noteElement?.getAttribute("data-pinned") === "true";
    const isBookmarked =
      noteElement?.getAttribute("data-bookmarked") === "true";
    window.electronAPI.showContextMenu("note", {
      id: id,
      pinned: isPinned,
      bookmarked: isBookmarked,
    });
    return;
  });
  sidebar.addEventListener(
    "click",
    createAsyncHandler(async (e) => {
      const target = e.target as HTMLElement | null;
      if (target === sidebar) return;
      const actionBtn = target?.closest<HTMLButtonElement>(".menu-btn");
      if (actionBtn) {
        e.preventDefault();
        e.stopPropagation();
        const noteElement = target?.closest<HTMLElement>(".note-item");
        const id = noteElement?.getAttribute("data-id");
        const isPinned = noteElement?.getAttribute("data-pinned") === "true";
        const isBookmarked =
          noteElement?.getAttribute("data-bookmarked") === "true";
        window.electronAPI.showContextMenu("note", {
          id: id,
          pinned: isPinned,
          bookmarked: isBookmarked,
        });
        return;
      }
      const noteItem = target?.closest<HTMLDivElement>(".note-item");
      const id = noteItem?.getAttribute("data-id");
      if (id) {
        await handleSelectNote(id);
      }
      return;
    }),
  );
}

export { initNotesSidebar };
