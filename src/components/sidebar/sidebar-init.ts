import { deleteDialog } from "@/api/callbacks";
import {
  debouncedSearch,
  handleViews,
  resizeSidebar,
} from "@/components/sidebar/sidebar-features";
import { createViews, setSidebarState } from "@/components/sidebar/sidebar-ui";
import {
  handleCreateNote,
  handleDeleteManyNotes,
  handleImportNote,
  handleSelectNote,
} from "@/notes/note-actions";
import { createAsyncHandler } from "@/utils/async";
import { findElement, requireElement } from "@/utils/dom";
import {
  getAppItem,
  getAppItems,
  getUIItems,
  registerAppEvents,
} from "@/utils/registry";
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
  const sidebarHeader = requireElement<HTMLDivElement>(
    ".sidebar-header",
    sidebarContainer,
  );
  const { searchInput, deleteBtn, selectionBtn } = getUIItems([
    "searchInput",
    "deleteBtn",
    "selectionBtn",
  ]);
  deleteBtn.disabled = selectedIds.size === 0;
  const viewSelect = createViews(VIEWS);
  initTippyDelegate(sidebarContainer);
  applySidebarListeners(
    sidebar,
    sidebarHeader,
    searchInput,
    viewSelect,
    deleteBtn,
    selectionBtn,
  );
  registerAppEvents(document, {
    "app:toggle-sidebar": () => {
      const collapsed = appContainer.classList.contains("collapsed");
      setSidebarState(appContainer, !collapsed);
    },
    "app:create-new-note": () => handleCreateNote(),
    "app:open-global-search": () => searchInput.focus(),
  });
}

let isSelectionMode = false;
const selectedIds = new Set<string>();

function setSelectionMode(enabled: boolean) {
  const sidebar = getAppItem("sidebar");
  isSelectionMode = enabled;
  sidebar.classList.toggle("selection-mode", enabled);
  if (!enabled) {
    selectedIds.clear();
  }
  updateSelectionUI();
}

function updateSelectionUI() {
  const sidebar = getAppItem("sidebar");
  const noteItems = sidebar.querySelectorAll<HTMLDivElement>(".note-item");
  const deleteBtn = requireElement<HTMLButtonElement>(".delete-btn");
  for (const item of noteItems) {
    const id = item.getAttribute("data-id");
    const isSelected = !!id && selectedIds.has(id);
    item.classList.toggle("selected", isSelected);
    const checkbox = findElement<HTMLInputElement>(".select-checkbox", item);
    if (checkbox) {
      checkbox.checked = isSelected;
    }
  }
  deleteBtn.disabled = selectedIds.size === 0;
}

function applySidebarListeners(
  sidebar: HTMLDivElement,
  sidebarHeader: HTMLDivElement,
  searchInput: HTMLInputElement,
  viewSelect: HTMLSelectElement,
  deleteBtn: HTMLButtonElement,
  selectionBtn: HTMLButtonElement,
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
  deleteBtn.addEventListener(
    "click",
    createAsyncHandler(async () => {
      const ids = [...selectedIds];
      if (ids.length === 0) return;
      const deleteDialogTitle = requireElement<HTMLSpanElement>(
        ".delete-dialog-title",
        deleteDialog,
      );
      deleteDialogTitle.textContent =
        ids.length === 1 ? `Delete this note?` : `Delete ${ids.length} notes?`;
      const handleClose = async () => {
        if (deleteDialog.returnValue !== "confirm") {
          deleteDialogTitle.textContent = "";
          return;
        }
        await handleDeleteManyNotes(ids);
        setSelectionMode(false);
        deleteDialogTitle.textContent = "";
      };
      deleteDialog.addEventListener("close", handleClose, { once: true });
      deleteDialog.returnValue = "";
      deleteDialog.showModal();
    }),
  );
  selectionBtn.addEventListener("click", () => {
    setSelectionMode(!isSelectionMode);
  });
  viewSelect.addEventListener(
    "change",
    createAsyncHandler(async (e) => {
      const target = e.target as HTMLSelectElement | null;
      const view = target?.value as ViewId;
      await handleViews(view);
    }),
  );
  sidebar.addEventListener("contextmenu", (e) => {
    if (isSelectionMode) return;
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
      if (target === sidebar) return;
      const actionBtn = target?.closest<HTMLButtonElement>(".menu-btn");
      if (actionBtn) {
        e.preventDefault();
        e.stopPropagation();
        const noteElement = target?.closest<HTMLElement>(".note-item");
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
      if (isSelectionMode) {
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
