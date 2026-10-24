import { setupSidebarFileDrop } from "@/components/sidebar/sidebar-file-drop";
import { navigateSidebar } from "@/components/sidebar/sidebar-navigation";
import { debouncedSearch } from "@/components/sidebar/sidebar-search";
import {
  addToSelection,
  deleteSelection,
  selectAllVisibleNotes,
  setSelectionMode,
} from "@/components/sidebar/sidebar-selection";
import { resizeSidebar, showTagPopover } from "@/components/sidebar/sidebar-ui";
import { applyView } from "@/components/sidebar/sidebar-views";
import {
  handleCreateNote,
  handleImportNote,
  handleSelectNote,
  waitForFlush,
} from "@/notes/note-actions";
import { localStore, noteStore, stateStore } from "@/state/state";
import { NAV_KEYS } from "@/utils/constants";
import { createAsyncHandler } from "@/utils/helpers";
import { registerAppEvents, useUI } from "@/utils/registry";
import {
  isEditorFocused,
  isFocusActive,
  isSelectionActive,
} from "@/utils/shortcuts";
import { createGlobalSpinner } from "@/utils/ui";
import { isNoteID, type Id } from "@shared/schemas/note-schema";
import type { FilePathRequest } from "@shared/schemas/request-schema";
import { APP_EVENTS } from "@shared/shared-constants";

function initNotesSidebar(sidebar: HTMLDivElement) {
  const { searchInput, sidebarHeader } = useUI("searchInput", "sidebarHeader");
  applySidebarListeners(sidebar, sidebarHeader, searchInput);
  setupSidebarFileDrop(sidebar);
  registerAppEvents(document, {
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
}

function applySidebarListeners(
  sidebar: HTMLDivElement,
  sidebarHeader: HTMLDivElement,
  searchInput: HTMLInputElement,
) {
  resizeSidebar();
  sidebarHeader.addEventListener(
    "click",
    createAsyncHandler(async (e) => {
      if (!(e.target instanceof Element)) return;
      const addNoteBtn = e.target.closest<HTMLButtonElement>(".add-note-btn");
      if (addNoteBtn) {
        await handleCreateNote({ shouldNavigate: true });
        return;
      }
      const tagBtn = e.target.closest<HTMLButtonElement>(".all-tags-btn");
      if (tagBtn) {
        const { activeId, isDirty } = stateStore.getState();
        if (activeId && isDirty) await waitForFlush(activeId);
        const tags = noteStore.get("notes").flatMap((n) => n.tags ?? []);
        showTagPopover(tagBtn, tags);
        return;
      }
      const importBtn = e.target.closest<HTMLButtonElement>(".import-btn");
      if (importBtn) {
        const request: FilePathRequest = { source: "dialog", checked: false };
        const loading = createGlobalSpinner(0);
        await loading.wrap(() => handleImportNote(request));
        return;
      }
    }),
  );
  searchInput.addEventListener("input", debouncedSearch);
  sidebar.addEventListener("contextmenu", (e) => {
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
  });
  sidebar.addEventListener(
    "click",
    createAsyncHandler(async (e) => {
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
    }),
  );
  sidebar.addEventListener("focusout", (e) => {
    const relatedTarget = e.relatedTarget as Node | null;
    if (!relatedTarget) return;
    if (isSelectionActive() && !sidebar.contains(relatedTarget))
      setSelectionMode(false);
  });
  document.addEventListener(
    "mouseup",
    createAsyncHandler(async (e: MouseEvent) => {
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
    }),
  );
  document.addEventListener("keydown", (e: KeyboardEvent) => {
    if (!NAV_KEYS.has(e.key)) return;
    if (!(e.target instanceof Element)) return;
    if (
      isEditorFocused(e.target) ||
      isSelectionActive() ||
      isFocusActive() ||
      e.target.tagName === "INPUT" ||
      e.target.tagName === "TEXTAREA" ||
      document.querySelector<HTMLDialogElement>("dialog[open]") !== null
    )
      return;
    void navigateSidebar(e);
  });
}

export { initNotesSidebar };
