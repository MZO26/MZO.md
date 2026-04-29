import { handleEditorEmptyState } from "../../components/editor/editorHandlers";
import {
  addManyNotesToList,
  handleSidebarEmptyState,
  reloadNoteList,
} from "../../components/sidebar/sidebarNotes";
import { debounce, getElement } from "../../utils/helpers";
import { showToast } from "../../utils/toast";
import { getViews, searchNotes } from "./searchAPI";

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
  addManyNotesToList(response.data);
}

async function handleViews(view: string) {
  const response = await getViews(view);
  if (!response.success) {
    showToast(response.message);
    return;
  }
  reloadNoteList(response.data);
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

  smartViewContainer.addEventListener("click", async (event) => {
    const target = (event.target as HTMLButtonElement).closest(
      "button[data-view]",
    ) as HTMLButtonElement | null;
    const view = target?.dataset["view"];
    if (!view) return;
    await handleViews(view);
  });
}

export { initSearchHandlers };
