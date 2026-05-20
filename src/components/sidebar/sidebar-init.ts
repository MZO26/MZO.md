import { searchByTag } from "@/components/sidebar/sidebar-filter";
import { setSidebarState } from "@/components/sidebar/sidebar-state";
import { handleSelectNote } from "@/features/note-actions";
import { createNoteButton, importNoteButton } from "@/features/note-buttons";
import { createAsyncHandler } from "@/utils/async";
import { requireElement } from "@/utils/dom";
import { getAppItem, registerAppEvents } from "@/utils/registry";
import { delegate } from "tippy.js";
import "tippy.js/dist/tippy.css";

const toggleSidebar = (appContainer: HTMLDivElement) => {
  const collapsed = appContainer.classList.contains("collapsed");
  setSidebarState(appContainer, "note-sidebar-state", !collapsed);
};

async function initNotesSidebar() {
  const appContainer = getAppItem("appContainer");
  const sidebar = getAppItem("sidebar");
  const sidebarContainer = requireElement<HTMLDivElement>(".sidebar-container");
  const addNoteBtn = requireElement<HTMLButtonElement>(".add-note-btn");
  const importBtn = requireElement<HTMLButtonElement>(".import-btn");
  delegate(sidebarContainer, {
    target: "[data-tippy-content]",
    theme: "app-theme",
    trigger: "mouseenter",
  });
  applySidebarListeners(sidebar, addNoteBtn, importBtn);
  registerAppEvents(document, {
    "app:toggle-sidebar": () => toggleSidebar(appContainer),
    "app:create-new-note": () => createNoteButton(),
  });
}

function applySidebarListeners(
  sidebar: HTMLDivElement,
  addNoteBtn: HTMLButtonElement,
  importBtn: HTMLButtonElement,
) {
  addNoteBtn.addEventListener("click", createAsyncHandler(createNoteButton));
  importBtn.addEventListener("click", createAsyncHandler(importNoteButton));
  sidebar.addEventListener(
    "click",
    createAsyncHandler(async (e) => {
      const target = e.target as HTMLElement;
      if (target === sidebar) return;
      const actionBtn = target.closest<HTMLButtonElement>("button");
      const span = target.closest<HTMLSpanElement>(".searchTag");
      const tag = span?.getAttribute("tag");
      if (tag) {
        e.preventDefault();
        e.stopPropagation();
        await searchByTag(tag);
        return;
      }
      if (actionBtn) {
        e.preventDefault();
        e.stopPropagation();
        const target = e.target as HTMLElement;
        const item = target.closest<HTMLElement>(".noteItem");
        if (!item) return;
        e.preventDefault();
        const id = item.dataset["id"];
        if (!id) return;
        const isPinned = item.dataset["pinned"] === "true";
        const isBookmarked = item.dataset["bookmarked"] === "true";
        window.electronAPI.showContextMenu("note", {
          id: id,
          pinned: isPinned,
          bookmarked: isBookmarked,
        });
        return;
      }
      const noteItem = target.closest<HTMLDivElement>(".noteItem");
      if (noteItem) {
        await handleSelectNote(noteItem);
        return;
      }
    }),
  );
}

export { initNotesSidebar };
