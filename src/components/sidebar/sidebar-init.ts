import {
  allTagsMenu,
  applyTagView,
  debouncedSearch,
  renderAllTags,
  resizeSidebar,
  setupSidebarFileDrop,
} from "@/components/sidebar/sidebar-features";
import {
  copyRichTextSelection,
  deleteSelection,
  exportSelection,
  pinSelection,
  setSelectionMode,
  updateSelectionUI,
} from "@/components/sidebar/sidebar-selection";
import { selectAllVisibleNotes } from "@/components/sidebar/sidebar-selection-ui";
import { setSidebarState } from "@/components/sidebar/sidebar-ui";
import {
  handleCreateNote,
  handleImportNote,
  handleSelectNote,
} from "@/notes/note-actions";
import {
  clearActiveTagView,
  noteStore,
  settingsStore,
  stateStore,
} from "@/settings/app-state";
import { createAsyncHandler } from "@/utils/async";
import { findElement } from "@/utils/dom";
import { getAppItems, getUIItems, registerAppEvents } from "@/utils/registry";
import { initTippyDelegate } from "@/utils/ui";
import type { FilePathRequest } from "@shared/schemas/request-schema";

// sidebar

function initNotesSidebar() {
  const activeTag = settingsStore.get("active-tag");
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
  if (
    activeTag &&
    noteStore.get("notes").some((note) => note.tags.includes(activeTag))
  ) {
    applyTagView(activeTag);
  }
  initTippyDelegate(sidebarContainer);
  applySidebarListeners(sidebar, sidebarHeader, searchInput, selectionFooter);
  setupSidebarFileDrop(sidebar);
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
        renderAllTags(tagBtn, tags);
        allTagsMenu?.tippy.show();
        return;
      }
      const importBtn = target.closest<HTMLButtonElement>(".import-btn");
      if (importBtn) {
        const request: FilePathRequest = { source: "dialog" };
        await handleImportNote(request);
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
        case "copy-rich-text":
          await copyRichTextSelection([...selectedIds]);
          break;
        case "delete":
          await deleteSelection();
          break;
      }
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
      const actionBtn = target.closest<HTMLButtonElement>(".menu-btn");
      if (actionBtn) {
        e.preventDefault();
        e.stopPropagation();
        const noteElement = target.closest<HTMLDivElement>(".note-item");
        const id = noteElement?.getAttribute("data-id");
        if (!id) return;
        const isPinned = noteElement?.getAttribute("data-pinned") === "true";
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
