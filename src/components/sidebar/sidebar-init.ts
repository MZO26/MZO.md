import { rendererLogger } from "@/app";
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
  showTagPopover,
  toggleSidebar,
} from "@/components/sidebar/sidebar-ui";
import { applyView } from "@/components/sidebar/sidebar-views";
import {
  handleCreateNote,
  handleImportNote,
  handleSelectNote,
} from "@/notes/note-actions";
import { noteStore, stateStore } from "@/state/state";
import { createAsyncHandler } from "@/utils/async";
import { SELECTION_ACTIONS } from "@/utils/constants";
import { getAppItem, getUIItems, registerAppEvents } from "@/utils/registry";
import { isSelectionActive } from "@/utils/shortcuts";
import type { SelectionAction } from "@/utils/types";
import { createGlobalSpinner } from "@/utils/ui";
import { isNoteID } from "@shared/schemas/note-schema";
import type { FilePathRequest } from "@shared/schemas/request-schema";
import { APP_EVENTS } from "@shared/shared-constants";

function initNotesSidebar() {
  const sidebar = getAppItem("sidebar");
  const { searchInput, selectionFooter, sidebarHeader } = getUIItems([
    "searchInput",
    "selectionFooter",
    "sidebarHeader",
  ]);
  applySidebarListeners(sidebar, sidebarHeader, searchInput, selectionFooter);
  setupSidebarFileDrop(sidebar);
  registerAppEvents(document, {
    [APP_EVENTS.TOGGLE_SIDEBAR]: toggleSidebar,
    [APP_EVENTS.CREATE_NEW_NOTE]: handleCreateNote,
    [APP_EVENTS.FOCUS_GLOBAL_SEARCH]: () => searchInput.focus(),
    [APP_EVENTS.SET_SELECTION_MODE]: () =>
      setSelectionMode(!isSelectionActive()),
    [APP_EVENTS.EXIT_SELECTION_MODE]: () => setSelectionMode(false),
    [APP_EVENTS.DELETE_SELECTED]: deleteSelection,
    [APP_EVENTS.SELECT_ALL_VISIBLE]: selectAllVisibleNotes,
  });
}

function isValidAction(action: string): action is SelectionAction {
  return SELECTION_ACTIONS.some((a) => a.id === action);
}

function applySidebarListeners(
  sidebar: HTMLDivElement,
  sidebarHeader: HTMLDivElement,
  searchInput: HTMLInputElement,
  selectionFooter: HTMLDivElement,
) {
  resizeSidebar();
  sidebarHeader.addEventListener(
    "click",
    createAsyncHandler(async (e) => {
      if (!(e.target instanceof Element)) return;
      const addNoteBtn = e.target.closest<HTMLButtonElement>(".add-note-btn");
      if (addNoteBtn) {
        await handleCreateNote();
        return;
      }
      const tagBtn = e.target.closest<HTMLButtonElement>(".all-tags-btn");
      if (tagBtn) {
        const tags = noteStore.get("notes").flatMap((n) => n.tags);
        showTagPopover(tagBtn, tags);
        return;
      }
      const importBtn = e.target.closest<HTMLButtonElement>(".import-btn");
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
      if (!(e.target instanceof Element)) return;
      const button = e.target.closest<HTMLButtonElement>("button[data-action]");
      if (!button) return;
      const selectedIds = stateStore.get("selectedIds");
      const action = button.getAttribute("data-action");
      if (!action) return;
      if (!isValidAction(action)) {
        rendererLogger.devLog(`${action} is not a valid action`);
        return;
      }
      if (action !== "cancel" && selectedIds.size === 0) return;
      await getSelectionAction(action, selectedIds);
    }),
  );
  sidebar.addEventListener("contextmenu", (e) => {
    if (!(e.target instanceof Element)) return;
    if (stateStore.get("selectionMode") === true) return;
    const isEmptySidebar = noteStore.get("visibleIds").length === 0;
    if (e.target === sidebar || isEmptySidebar) {
      e.preventDefault();
      return;
    }
    e.preventDefault();
    const noteElement = e.target.closest<HTMLDivElement>(".note-item");
    const id = noteElement?.getAttribute("data-id");
    if (!isNoteID(id) || !noteElement) return;
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
      if (!(e.target instanceof Element)) return;
      const actionBtn = e.target.closest<HTMLButtonElement>(".menu-btn");
      if (actionBtn) {
        e.preventDefault();
        e.stopPropagation();
        const noteItem = e.target.closest<HTMLDivElement>(".note-item");
        const id = noteItem?.getAttribute("data-id");
        if (!isNoteID(id) || !noteItem) return;
        const isPinned = noteItem.getAttribute("data-pinned") === "true";
        window.electronAPI.showContextMenu("note", {
          id,
          pinned: isPinned,
        });
        return;
      }
      const clearBtn = e.target.closest<HTMLButtonElement>(
        ".active-tag-clear-btn",
      );
      if (clearBtn) {
        const action = clearBtn.getAttribute("data-action");
        if (action === "clear-active-tag") {
          await applyView(null);
          return;
        }
      }
      const noteItem = e.target.closest<HTMLDivElement>(".note-item");
      const id = noteItem?.getAttribute("data-id");
      if (!isNoteID(id)) return;
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
