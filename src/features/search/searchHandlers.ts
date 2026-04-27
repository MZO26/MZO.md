import { handleEditorEmptyState } from "../../components/editor/editorHandlers";
import {
  addManyNotesToList,
  handleSidebarEmptyState,
  reloadNoteList,
} from "../../components/sidebar/sidebarNotes";
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

export { handleSearchInput, handleViews };
