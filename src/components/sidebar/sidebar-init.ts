import { setupSidebarFileDrop } from "@/components/sidebar/sidebar-file-drop";
import { debouncedSearch } from "@/components/sidebar/sidebar-search";
import {
  addToSelection,
  deleteSelection,
  getSelectionAction,
  selectAllVisibleNotes,
  setSelectionMode,
} from "@/components/sidebar/sidebar-selection";
import {
  resizeSidebar,
  showAllTagsMenu,
  toggleSidebar,
} from "@/components/sidebar/sidebar-ui";
import {
  applyTagView,
  clearActiveTagView,
} from "@/components/sidebar/sidebar-views";
import {
  handleCreateNote,
  handleImportNote,
  handleSelectNote,
} from "@/notes/note-actions";
import { noteStore, settingsStore, stateStore } from "@/state/state";
import { createAsyncHandler } from "@/utils/async";
import { getAppItem, getUIItems, registerAppEvents } from "@/utils/registry";
import { isSelectionActive } from "@/utils/shortcuts";
import { createGlobalSpinner } from "@/utils/ui";
import { SELECTION_ACTIONS } from "@shared/constants";
import type { FilePathRequest } from "@shared/schemas/request-schema";
import type { SelectionAction } from "@shared/types";

function initNotesSidebar() {
  const activeTag = settingsStore.get("active_tag");
  const sidebar = getAppItem("sidebar");
  const { searchInput, selectionFooter, sidebarHeader } = getUIItems([
    "searchInput",
    "selectionFooter",
    "sidebarHeader",
  ]);
  const deleteBtn =
    selectionFooter.querySelector<HTMLButtonElement>(".delete-btn");
  if (deleteBtn) deleteBtn.disabled = stateStore.get("selectedIds").size === 0;
  if (
    activeTag &&
    noteStore.get("notes").some((note) => note.tags.includes(activeTag))
  ) {
    applyTagView(activeTag);
  }
  applySidebarListeners(sidebar, sidebarHeader, searchInput, selectionFooter);
  setupSidebarFileDrop(sidebar);
  registerAppEvents(document, {
    "app:toggle-sidebar": () => toggleSidebar(),
    "app:create-new-note": () => handleCreateNote(),
    "app:open-global-search": () => searchInput.focus(),
    "app:set-selection-mode": () => setSelectionMode(!isSelectionActive()),
    "app:exit-selection-mode": () => setSelectionMode(false),
    "app:delete-selected": () => deleteSelection(),
    "app:select-all-visible": () => selectAllVisibleNotes(),
  });
}

function isValidAction(action: string | null): action is SelectionAction {
  return action !== null && action in SELECTION_ACTIONS;
}

function applySidebarListeners(
  sidebar: HTMLDivElement,
  sidebarHeader: HTMLDivElement,
  searchInput: HTMLInputElement,
  selectionFooter: HTMLDivElement,
) {
  resizeSidebar(".resizer-sidebar", ".sidebar-container");
  sidebarHeader.addEventListener(
    "click",
    createAsyncHandler(async (e) => {
      const target = e.target as HTMLElement | null;
      if (target === sidebarHeader || !target) return;
      const addNoteBtn = target.closest<HTMLButtonElement>(".add-note-btn");
      if (addNoteBtn) {
        await handleCreateNote();
        return;
      }
      const tagBtn = target.closest<HTMLButtonElement>(".all-tags-btn");
      if (tagBtn) {
        const tags = noteStore.get("notes").flatMap((n) => n.tags);
        showAllTagsMenu(tagBtn, tags);
        return;
      }
      const importBtn = target.closest<HTMLButtonElement>(".import-btn");
      if (importBtn) {
        const request: FilePathRequest = { source: "dialog" };
        const loading = createGlobalSpinner(0);
        await loading.wrap(async () => {
          await handleImportNote(request);
        });
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
      if (!isValidAction(action)) return;
      if (action !== "cancel" && selectedIds.size === 0) return;
      await getSelectionAction(action, selectedIds);
    }),
  );
  sidebar.addEventListener("contextmenu", (e) => {
    if (stateStore.get("selectionMode") === true) return;
    const target = e.target as HTMLElement | null;
    if (!target) return;
    const isEmptySidebar =
      sidebar.childElementCount === 1 &&
      sidebar.firstElementChild?.classList.contains("sidebar-empty-state");
    if (target === sidebar || isEmptySidebar) {
      e.preventDefault();
      return;
    }
    e.preventDefault();
    const noteElement = target.closest<HTMLDivElement>(".note-item");
    const id = noteElement?.getAttribute("data-id");
    if (!id || !noteElement) return;
    const isPinned = noteElement.getAttribute("data-pinned") === "true";
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
      const actionBtn = target.closest<HTMLButtonElement>(".menu-btn");
      if (actionBtn) {
        e.preventDefault();
        e.stopPropagation();
        const noteElement = target.closest<HTMLDivElement>(".note-item");
        const id = noteElement?.getAttribute("data-id");
        if (!id || !noteElement) return;
        const isPinned = noteElement.getAttribute("data-pinned") === "true";
        window.electronAPI.showContextMenu("note", {
          id,
          pinned: isPinned,
        });
        return;
      }
      const clearBtn = target.closest<HTMLButtonElement>(
        ".active-tag-clear-btn",
      );
      if (clearBtn) {
        const action = clearBtn.getAttribute("data-action");
        if (action === "clear-active-tag") {
          clearActiveTagView();
          return;
        }
      }
      const noteItem = target.closest<HTMLDivElement>(".note-item");
      const id = noteItem?.getAttribute("data-id");
      if (!id) return;
      if (stateStore.get("selectionMode") === true) {
        addToSelection(id);
        return;
      }
      const loading = createGlobalSpinner();
      await loading.wrap(async () => {
        await handleSelectNote(id);
      });
    }),
  );
}

export { initNotesSidebar };
