import { setSidebarState } from "@/components/sidebar/sidebar-state";
import { handleSelectNote } from "@/features/note-actions";
import { createNoteButton } from "@/features/note-ui";
import { createAsyncHandler } from "@/utils/async";
import { requireElement } from "@/utils/dom";
import { getItem, registerAppEvents } from "@/utils/registry";
import { createContextMenu } from "@/utils/ui";
import { delegate } from "tippy.js";
import "tippy.js/dist/tippy.css";

async function initNotesSidebar(state: boolean) {
  const appContainer = getItem("appContainer");
  const sidebar = getItem("sidebar");
  const addNoteBtn = requireElement(".add-note-btn");
  delegate(sidebar, {
    target: "[tippy-content]",
    theme: "app-theme",
    content: (reference) =>
      reference.getAttribute("tippy-content") || "options",
  });
  const toggleSidebar = () => {
    const collapsed = appContainer.classList.contains("collapsed");
    setSidebarState(appContainer, "note-sidebar-state", !collapsed);
  };
  setSidebarState(appContainer, "note-sidebar-state", state);
  void appContainer.offsetWidth;
  appContainer.classList.remove("no-transition");
  addNoteBtn.addEventListener("click", createAsyncHandler(createNoteButton));
  sidebar.addEventListener(
    "click",
    createAsyncHandler(async (event) => {
      const target = event.target as HTMLElement;
      if (target === sidebar) return;
      const actionBtn = target.closest<HTMLButtonElement>("button");
      if (actionBtn) {
        event.preventDefault();
        event.stopPropagation();
        await createContextMenu(event);
        return;
      }
      const noteItem = target.closest<HTMLDivElement>(".noteItem");
      if (noteItem) {
        await handleSelectNote(noteItem);
        return;
      }
    }),
  );
  registerAppEvents(document, {
    "app:toggle-sidebar": () => toggleSidebar(),
    "app:create-new-note": () => createNoteButton(),
  });
}

export { initNotesSidebar };
