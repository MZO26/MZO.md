import { getSettings } from "@/api/settingsAPI";
import { editor } from "@/components/editor/editor-init";
import { handleSelectNote } from "@/features/note-actions";
import { createAsyncHandler, getElement } from "@/utils/helpers";
import { createContextMenu } from "@/utils/templates";

async function initNotesSidebar() {
  const response = await getSettings("collapsed-state");
  const collapsed = response.success ? response.data === true : false;
  const appContainer = getElement(".app-container");
  if (collapsed) {
    appContainer.classList.add("sidebar-collapsed");
  } else appContainer.classList.remove("sidebar-collapsed");
  void appContainer.offsetWidth;
  appContainer.classList.remove("no-transition");
  const container = getElement<HTMLDivElement>(".notes-container");
  container.addEventListener(
    "click",
    createAsyncHandler(async (event) => {
      const target = event.target as HTMLElement;
      // early return if clicking the container background
      if (target === container) return;
      const actionBtn = target.closest<HTMLButtonElement>("button");
      if (actionBtn) {
        event.preventDefault();
        event.stopPropagation();
        await createContextMenu(event);
        return;
      }
      const noteItem = target.closest<HTMLDivElement>(".noteItem");
      if (noteItem && editor) {
        await handleSelectNote(noteItem, container, editor);
        return;
      }
    }),
  );
}

export { initNotesSidebar };
