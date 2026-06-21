import {
  debouncedSearch,
  handleViews,
  resizeSidebar,
} from "@/components/sidebar/sidebar-features";
import {
  copyLinkSelection,
  copyRichTextSelection,
  deleteSelection,
  exportSelection,
  pinSelection,
  selectAllVisibleNotes,
  setSelectionMode,
  updateSelectionUI,
} from "@/components/sidebar/sidebar-selection";
import { createViews, setSidebarState } from "@/components/sidebar/sidebar-ui";
import {
  handleCreateNote,
  handleImportNote,
  handleSelectNote,
} from "@/notes/note-actions";
import { stateStore } from "@/settings/app-state";
import { createAsyncHandler } from "@/utils/async";
import { findElement } from "@/utils/dom";
import { getAppItems, getUIItems, registerAppEvents } from "@/utils/registry";
import { initTippyDelegate } from "@/utils/ui";
import { VIEWS } from "@shared/constants";
import type { ViewId } from "@shared/types";

// sidebar

function initNotesSidebar() {
  const { appContainer, sidebar, sidebarContainer } = getAppItems([
    "appContainer",
    "sidebar",
    "sidebarContainer",
  ]);
  const { searchInput, selectionFooter, sidebarHeader } = getUIItems([
    "searchInput",
    "selectionFooter",
    "sidebarHeader",
  ]);
  const deleteBtn = findElement<HTMLButtonElement>(
    ".delete-btn",
    selectionFooter,
  );
  if (deleteBtn) deleteBtn.disabled = stateStore.get("selectedIds").size === 0;
  const viewSelect = createViews(VIEWS);
  initTippyDelegate(sidebarContainer);
  applySidebarListeners(
    sidebar,
    sidebarHeader,
    searchInput,
    viewSelect,
    selectionFooter,
  );
  registerAppEvents(document, {
    "app:toggle-sidebar": () => {
      const collapsed = appContainer.classList.contains("collapsed");
      setSidebarState(appContainer, !collapsed);
    },
    "app:create-new-note": () => handleCreateNote(),
    "app:open-global-search": () => searchInput.focus(),
    "app:exit-selection-mode": () => setSelectionMode(false),
    "app:delete-selected": () => deleteSelection(),
    "app:select-all-visible": () => selectAllVisibleNotes(),
  });
}

function applySidebarListeners(
  sidebar: HTMLDivElement,
  sidebarHeader: HTMLDivElement,
  searchInput: HTMLInputElement,
  viewSelect: HTMLSelectElement,
  selectionFooter: HTMLDivElement,
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
  selectionFooter.addEventListener(
    "click",
    createAsyncHandler(async (e) => {
      const target = e.target as HTMLButtonElement | null;
      if (!target) return;
      const button = target.closest<HTMLButtonElement>("button[data-action]");
      if (!button) return;
      const selectedIds = stateStore.get("selectedIds");
      const action = button.getAttribute("data-action");
      if (action !== "cancel" && selectedIds.size === 0) return;
      switch (action) {
        case "cancel":
          setSelectionMode(false);
          break;
        case "pin":
          await pinSelection([...selectedIds]);
          break;
        case "export":
          await exportSelection([...selectedIds]);
          break;
        case "copy-links":
          await copyLinkSelection([...selectedIds]);
          break;
        case "copy-rich-text":
          await copyRichTextSelection([...selectedIds]);
          break;
        case "delete":
          await deleteSelection();
          break;
      }
    }),
  );
  viewSelect.addEventListener(
    "change",
    createAsyncHandler(async (e) => {
      const target = e.target as HTMLSelectElement | null;
      if (!target) return;
      const view = target.value as ViewId;
      await handleViews(view);
    }),
  );
  sidebar.addEventListener("contextmenu", (e) => {
    if (stateStore.get("selectionMode") === true) return;
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
    if (!id) return;
    const isPinned = noteElement?.getAttribute("data-pinned") === "true";
    window.electronAPI.showContextMenu("note", {
      id,
      pinned: isPinned,
    });
    return;
  });
  sidebar.addEventListener(
    "click",
    createAsyncHandler(async (e) => {
      const target = e.target as HTMLElement | null;
      if (target === sidebar || !target) return;
      const actionBtn = target?.closest<HTMLButtonElement>(".menu-btn");
      if (actionBtn) {
        e.preventDefault();
        e.stopPropagation();
        const noteElement = target.closest<HTMLElement>(".note-item");
        const id = noteElement?.getAttribute("data-id");
        if (!id) return;
        const isPinned = noteElement?.getAttribute("data-pinned") === "true";
        window.electronAPI.showContextMenu("note", {
          id,
          pinned: isPinned,
        });
        return;
      }
      const noteItem = target?.closest<HTMLDivElement>(".note-item");
      const id = noteItem?.getAttribute("data-id");
      if (!id) return;
      if (stateStore.get("selectionMode") === true) {
        const selectedIds = stateStore.get("selectedIds");
        if (selectedIds.has(id)) {
          selectedIds.delete(id);
        } else {
          selectedIds.add(id);
        }
        updateSelectionUI();
        return;
      }
      await handleSelectNote(id);
    }),
  );
}

export { initNotesSidebar };
