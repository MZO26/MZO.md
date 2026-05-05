import { editor } from "@/components/editor/editor-init";
import { setSidebarState } from "@/components/sidebar/sidebar-state";
import { handleSelectNote } from "@/features/note-actions";
import { createNoteButton } from "@/features/note-ui";
import {
  createAsyncHandler,
  getElement,
  registerAppEvents,
} from "@/utils/helpers";
import { getItem } from "@/utils/registry";
import { createContextMenu } from "@/utils/templates";

async function initNotesSidebar(state: boolean) {
  const collapsed = state;
  const appContainer = getItem("appContainer");
  const sidebar = getItem("sidebar");
  const addNoteBtn = getElement(".add-note-btn");
  setSidebarState(appContainer, "note-sidebar-state", collapsed);
  void appContainer.offsetWidth;
  appContainer.classList.remove("no-transition");
  const toggleSidebar = () => {
    const collapsed = appContainer.classList.contains("collapsed");
    setSidebarState(appContainer, "note-sidebar-state", !collapsed);
  };
  sidebar.addEventListener(
    "contextmenu",
    createAsyncHandler(createContextMenu),
  );
  addNoteBtn.addEventListener("click", createAsyncHandler(createNoteButton));
  sidebar.addEventListener(
    "click",
    createAsyncHandler(async (event) => {
      const target = event.target as HTMLElement;
      // early return if clicking the container background
      if (target === sidebar) return;
      const actionBtn = target.closest<HTMLButtonElement>("button");
      if (actionBtn) {
        event.preventDefault();
        event.stopPropagation();
        await createContextMenu(event);
        return;
      }
      const noteItem = target.closest<HTMLDivElement>(".noteItem");
      if (noteItem && editor) {
        await handleSelectNote(noteItem, sidebar, editor);
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
