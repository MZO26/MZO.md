import { getByTag, getViews, searchNotes } from "@/api/noteAPI";
import { handleEditorEmptyState } from "@/components/editor/editorEmptyState";
import { handleSidebarEmptyState } from "@/components/sidebar/sidebarEmptyState";
import {
  addManyNotesToList,
  reloadNoteList,
} from "@/components/sidebar/sidebarNotes";
import { createAsyncHandler, debounce, getElement } from "@/utils/helpers";
import { showToast } from "@/utils/toast";

async function handleSearchInput(
  searchInput: string,
  notesContainer: HTMLDivElement,
) {
  notesContainer.innerHTML = "";
  try {
    if (searchInput === "") {
      await reloadNoteList();
      return;
    }
  } catch (error) {
    console.error(`(searchInputHandler): Failed to reload note list`);
    return;
  }
  const response = await searchNotes(searchInput, 20);
  if (!response.success) {
    showToast(response.message);
    handleEditorEmptyState();
    handleSidebarEmptyState(notesContainer, searchInput);
    return;
  }
  addManyNotesToList(response.data, notesContainer);
}

async function handleViews(view: string) {
  const response = await getViews(view);
  if (!response.success) {
    showToast(response.message);
    return;
  }
  reloadNoteList(response.data);
}

async function searchByTag(tag: string) {
  const response = await getByTag(tag);
  if (!response.success) {
    showToast(response.message);
    return;
  }
  await reloadNoteList(response.data);
}

function initSearchHandlers() {
  const searchInput = getElement<HTMLInputElement>("#searchInput");
  const notesContainer = getElement<HTMLDivElement>(".notes-container");
  if (searchInput && notesContainer) {
    const debouncedSearch = debounce(() => {
      const value = searchInput.value.trim();
      void handleSearchInput(value, notesContainer);
    }, 500);
    searchInput.addEventListener("input", debouncedSearch);
  }

  const smartViewContainer = getElement(".smart-view-list");
  const infoSidebarTagContainer = getElement<HTMLDivElement>(".tag-container");

  smartViewContainer.addEventListener(
    "click",
    createAsyncHandler(async (event) => {
      const target = event.target as HTMLElement;
      if (target === smartViewContainer) return;
      const button = target.closest(
        "button[data-view]",
      ) as HTMLButtonElement | null;
      if (!button) return;
      const view = button.dataset["view"];
      if (!view) return;
      handleViews(view);
    }),
  );

  infoSidebarTagContainer.addEventListener(
    "click",
    createAsyncHandler(async (e: Event) => {
      const target = e.target as HTMLElement;
      if (target === infoSidebarTagContainer) return;
      const spanEl = target.closest(".tag") as HTMLSpanElement | null;
      if (!spanEl) return;
      const tag = spanEl.dataset["tag"];
      if (!tag) return;
      searchByTag(tag);
    }),
  );
}

export { initSearchHandlers };
