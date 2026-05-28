import {
  debouncedSearch,
  handleViews,
} from "@/components/sidebar/sidebar-features";
import { createViews, setSidebarState } from "@/components/sidebar/sidebar-ui";
import {
  handleCreateNote,
  handleImportNote,
  handleSelectNote,
} from "@/notes/note-actions";
import { createAsyncHandler } from "@/utils/async";
import { requireElement } from "@/utils/dom";
import {
  getAppItem,
  getInfobarItems,
  initializeInfobarRegistry,
  registerAppEvents,
} from "@/utils/registry";
import { initTippyDelegate } from "@/utils/ui";
import { VIEWS } from "@shared/constants";
import type { View } from "@shared/types";

// resizing logic

interface ResizeOptions {
  minWidth?: number;
  maxWidth?: number;
  cssVariable?: string;
  side?: "left" | "right";
}

function resizeSidebar(
  resizerSelector: string,
  sidebarSelector: string,
  options: ResizeOptions = {},
) {
  const {
    minWidth = 200,
    maxWidth = 600,
    cssVariable = "--sidebar-width",
    side = "left",
  } = options;
  const resizer = requireElement<HTMLDivElement>(resizerSelector);
  const sidebar = requireElement<HTMLDivElement>(sidebarSelector);
  let isResizing = false;
  let isUpdatePending = false;
  let startX = 0;
  let startWidth = 0;
  resizer.addEventListener("pointerdown", (e: PointerEvent) => {
    isResizing = true;
    startX = e.clientX;
    startWidth = sidebar.getBoundingClientRect().width;
    resizer.setPointerCapture(e.pointerId);
    document.body.classList.add("is-dragging");
    document.body.style.userSelect = "none";
  });

  document.addEventListener("pointermove", (e: PointerEvent) => {
    if (!isResizing || isUpdatePending) return;
    isUpdatePending = true;
    requestAnimationFrame(() => {
      // how far has mouse moved since start
      const deltaX = e.clientX - startX;
      const adjustedWidth =
        side === "right" ? startWidth - deltaX : startWidth + deltaX;
      const newWidth = Math.max(minWidth, Math.min(adjustedWidth, maxWidth));
      document.documentElement.style.setProperty(cssVariable, `${newWidth}px`);
      isUpdatePending = false;
    });
  });

  document.addEventListener("pointerup", (e: PointerEvent) => {
    if (isResizing) {
      isResizing = false;
      resizer.releasePointerCapture(e.pointerId);
      document.body.classList.remove("is-dragging");
      document.body.style.userSelect = "";
    }
  });
}

//------------------------------------------------------------

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
    "app:toggle-view-filter": () => viewSelect.showPicker(),
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
      await handleViews(target.value as View);
    }),
  );
  sidebar.addEventListener("contextmenu", (e) => {
    const target = e.target as HTMLElement;
    if (target === sidebar) return;
    e.preventDefault();
    const noteElement = target.closest<HTMLDivElement>(".note-item");
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
      const target = e.target as HTMLElement;
      if (target === sidebar) return;
      const actionBtn = target.closest<HTMLButtonElement>(".menu-btn");
      if (actionBtn) {
        e.preventDefault();
        e.stopPropagation();
        const noteElement = target.closest<HTMLElement>(".note-item");
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
      const noteItem = target.closest<HTMLDivElement>(".note-item");
      const id = noteItem?.getAttribute("data-id");
      if (id) {
        await handleSelectNote(id);
      }
      return;
    }),
  );
}

//------------------------------------------------------------

// info-sidebar

function initInfoSidebar() {
  initializeInfobarRegistry();
  const { toggleBtn, infoSidebar } = getInfobarItems([
    "toggleBtn",
    "infoSidebar",
  ]);
  setSidebarState(infoSidebar, true);
  applyInfoSidebarListeners(toggleBtn, infoSidebar);
  registerAppEvents(document, {
    "app:toggle-info-sidebar": () => {
      const collapsed = infoSidebar.classList.contains("collapsed");
      setSidebarState(infoSidebar, !collapsed);
    },
  });
}

function applyInfoSidebarListeners(
  toggleBtn: HTMLButtonElement,
  infoSidebar: HTMLDivElement,
) {
  resizeSidebar(".resizer-infobar", ".info-sidebar", {
    minWidth: 220,
    maxWidth: 400,
    cssVariable: "--infobar-width",
    side: "right",
  });
  infoSidebar.addEventListener(
    "click",
    createAsyncHandler(async (e: Event) => {
      const target = e.target as HTMLElement;
      if (target === infoSidebar) return;
      const linkEl = target.closest<HTMLSpanElement>(".link");
      if (linkEl) {
        const link = linkEl.getAttribute("data-link");
        if (!link) return;
        await handleSelectNote(link);
        return;
      }
    }),
  );
  toggleBtn.addEventListener("click", () => {
    const collapsed = infoSidebar.classList.contains("collapsed");
    setSidebarState(infoSidebar, !collapsed);
  });
}

export { initInfoSidebar, initNotesSidebar };
