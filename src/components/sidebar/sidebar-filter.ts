import { getByTag, getViews, searchNotes } from "@/api/noteAPI";
import { handleEditorEmptyState } from "@/components/editor/editor-state";
import {
  addManyNotesToList,
  reloadNoteList,
} from "@/components/sidebar/sidebar-actions";
import { handleSidebarEmptyState } from "@/components/sidebar/sidebar-state";
import { setNoteId } from "@/services/state";
import { showToast } from "@/utils/toast";

async function handleSearchInput(
  searchInput: string,
  notesContainer: HTMLDivElement,
) {
  notesContainer.innerHTML = "";
  setNoteId(null);
  try {
    if (searchInput === "") {
      await reloadNoteList();
      return;
    }
  } catch (error) {
    console.error(`(searchInputHandler): Failed to reload note list`);
    return;
  }
  const response = await searchNotes(searchInput, 50);
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

export { handleSearchInput, handleViews, searchByTag };
