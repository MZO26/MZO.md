import { setupSidebarFileDrop } from "@/components/sidebar/sidebar-file-drop";
import { navigateSidebar } from "@/components/sidebar/sidebar-navigation";
import { debouncedSearch } from "@/components/sidebar/sidebar-search";
import {
  addToSelection,
  deleteSelection,
  selectAllVisibleNotes,
  setSelectionMode,
} from "@/components/sidebar/sidebar-selection";
import { resizeSidebar } from "@/components/sidebar/sidebar-ui";
import { applyView } from "@/components/sidebar/sidebar-views";
import {
  handleCreateNote,
  handleImportNote,
  handleSelectNote,
} from "@/notes/note-actions";
import { localStore, noteStore, stateStore } from "@/state/state";
import { NAV_KEYS } from "@/utils/constants";
import { createAsyncHandler, rendererLogger } from "@/utils/helpers";
import { useUI } from "@/utils/registry";
import {
  isEditorFocused,
  isFocusActive,
  isSelectionActive,
} from "@/utils/shortcuts";
import { createGlobalSpinner } from "@/utils/ui";
import { appEvents } from "@shared/event-emitter";
import { isNoteID, type Id } from "@shared/schemas/note-schema";
import type { FilePathRequest } from "@shared/schemas/request-schema";
import { APP_EVENTS } from "@shared/shared-constants";

function initNotesSidebar(sidebar: HTMLDivElement) {
  const { searchInput, sidebarHeader } = useUI("searchInput", "sidebarHeader");
  const unsubListeners = setupSidebarListeners(
    sidebar,
    sidebarHeader,
    searchInput,
  );
  const unsubFileDrop = setupSidebarFileDrop(sidebar);
  const unsubAppEvents = appEvents.onMany({
    [APP_EVENTS.TOGGLE_SIDEBAR]: () => {
      localStore.setState((state) => ({
        ...state,
        sidebarCollapsed: !state.sidebarCollapsed,
      }));
    },
    [APP_EVENTS.CREATE_NEW_NOTE]: async () =>
      await handleCreateNote({ shouldNavigate: true }),
    [APP_EVENTS.FOCUS_GLOBAL_SEARCH]: () => searchInput.focus(),
    [APP_EVENTS.SET_SELECTION_MODE]: () =>
      setSelectionMode(!isSelectionActive()),
    [APP_EVENTS.EXIT_SELECTION_MODE]: () => setSelectionMode(false),
    [APP_EVENTS.DELETE_SELECTED]: async () => {
      const { selectionMode, selectedIds } = stateStore.getState();
      if (selectionMode === true && selectedIds.size > 0)
        await deleteSelection([...selectedIds]);
    },
    [APP_EVENTS.SELECT_ALL_VISIBLE]: selectAllVisibleNotes,
  });
  return function unsubscribe() {
    unsubListeners();
    unsubFileDrop();
    unsubAppEvents();
  };
}

function setupSidebarListeners(
  sidebar: HTMLDivElement,
  sidebarHeader: HTMLDivElement,
  searchInput: HTMLInputElement,
) {
  const unsubSidebarResize = resizeSidebar();
  const headerClickHandler = createAsyncHandler(async (e: MouseEvent) => {
    if (!(e.target instanceof Element)) return;
    const addNoteBtn = e.target.closest<HTMLButtonElement>(".add-note-btn");
    if (addNoteBtn) {
      await handleCreateNote({ shouldNavigate: true });
      return;
    }
    const importBtn = e.target.closest<HTMLButtonElement>(".import-btn");
    if (importBtn) {
      const request: FilePathRequest = { source: "dialog", checked: false };
      const loading = createGlobalSpinner(0);
      await loading.wrap(() => handleImportNote(request));
      return;
    }
  });
  const inputKeydownHandler = createAsyncHandler(async (e: KeyboardEvent) => {
    if (e.key !== "Enter") return;
    if (!(e.target instanceof HTMLInputElement)) return;
    e.preventDefault();
    const visibleIds = noteStore.get("visibleIds");
    if (!visibleIds || visibleIds.length === 0) return;
    const topResult = visibleIds[0];
    if (topResult) {
      const loading = createGlobalSpinner();
      await loading.wrap(() => handleSelectNote(topResult));
    }
  });
  const contextMenuHandler = (e: MouseEvent) => {
    if (!(e.target instanceof Element)) return;
    const isEmptySidebar = noteStore.get("visibleIds").length === 0;
    if (e.target === sidebar || isEmptySidebar) return;
    e.preventDefault();
    const noteElement = e.target.closest<HTMLDivElement>(".note-item");
    const id = noteElement?.getAttribute("data-id");
    const { selectionMode, selectedIds } = stateStore.getState();
    if (!isNoteID(id) || !noteElement) return;
    const isPinned = noteElement.getAttribute("data-pinned") === "true";
    window.electronAPI.showContextMenu("note", {
      selectedIds:
        selectionMode && selectedIds.size > 0 ? Array.from(selectedIds) : [id],
      selectionMode,
      pinned: !selectionMode ? isPinned : undefined,
    });
    return;
  };
  const noteListClickHandler = createAsyncHandler(async (e: MouseEvent) => {
    if (!(e.target instanceof Element)) return;
    const actionBtn = e.target.closest<HTMLButtonElement>(".menu-btn");
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
    if (isSelectionActive() && !noteItem && !actionBtn) {
      setSelectionMode(false);
      return;
    }
    const id = noteItem?.getAttribute("data-id");
    if (!isNoteID(id)) return;
    if (actionBtn) {
      e.preventDefault();
      e.stopPropagation();
      const isPinned = noteItem?.getAttribute("data-pinned") === "true";
      const { selectionMode, selectedIds } = stateStore.getState();
      window.electronAPI.showContextMenu("note", {
        selectedIds:
          selectionMode && selectedIds.size > 0
            ? Array.from(selectedIds)
            : [id],
        selectionMode,
        pinned: !selectionMode ? isPinned : undefined,
      });
      return;
    }
    if ((e.ctrlKey || e.metaKey) && !isSelectionActive()) {
      setSelectionMode(true);
      addToSelection(id);
      return;
    }
    if (isSelectionActive()) {
      addToSelection(id);
      return;
    }
    const loading = createGlobalSpinner();
    await loading.wrap(() => handleSelectNote(id));
  });
  const focusOutHandler = (e: FocusEvent) => {
    const relatedTarget = e.relatedTarget as Node | null;
    if (!relatedTarget) return;
    if (isSelectionActive() && !sidebar.contains(relatedTarget))
      setSelectionMode(false);
  };
  const mouseUpHandler = createAsyncHandler(async (e: MouseEvent) => {
    if (e.button !== 3 && e.button !== 4) return;
    e.preventDefault();
    const activeId = stateStore.get("activeId") as Id | null;
    if (!activeId) return;
    const recentNotes = noteStore.get("recentNotes");
    const currentIndex = recentNotes.indexOf(activeId);
    if (currentIndex === -1) return;
    if (e.button === 3) {
      const id = recentNotes[currentIndex + 1];
      if (id) await handleSelectNote(id, { skipRecent: true });
    } else if (e.button === 4) {
      const id = currentIndex > 0 ? recentNotes[currentIndex - 1] : undefined;
      if (id) await handleSelectNote(id, { skipRecent: true });
    }
  });
  const documentKeydownHandler = (e: KeyboardEvent) => {
    if (!NAV_KEYS.has(e.key)) return;
    if (!(e.target instanceof Element)) return;
    if (
      isEditorFocused(e.target) ||
      isSelectionActive() ||
      isFocusActive() ||
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement ||
      document.querySelector<HTMLDialogElement>("dialog[open]") !== null
    )
      return;
    void navigateSidebar(e).catch(rendererLogger.appError);
  };
  sidebarHeader.addEventListener("click", headerClickHandler);
  searchInput.addEventListener("input", debouncedSearch);
  searchInput.addEventListener("keydown", inputKeydownHandler);
  sidebar.addEventListener("contextmenu", contextMenuHandler);
  sidebar.addEventListener("click", noteListClickHandler);
  sidebar.addEventListener("focusout", focusOutHandler);
  document.addEventListener("mouseup", mouseUpHandler);
  document.addEventListener("keydown", documentKeydownHandler);
  return function unsubscribe() {
    unsubSidebarResize();
    sidebarHeader.removeEventListener("click", headerClickHandler);
    searchInput.removeEventListener("input", debouncedSearch);
    searchInput.removeEventListener("keydown", inputKeydownHandler);
    sidebar.removeEventListener("contextmenu", contextMenuHandler);
    sidebar.removeEventListener("click", noteListClickHandler);
    sidebar.removeEventListener("focusout", focusOutHandler);
    document.removeEventListener("mouseup", mouseUpHandler);
    document.removeEventListener("keydown", documentKeydownHandler);
  };
}

export { initNotesSidebar };
