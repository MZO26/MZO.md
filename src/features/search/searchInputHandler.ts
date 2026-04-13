import {
  addManyNotesToList,
  handleSidebarEmptyState,
  reloadNoteList,
} from "../../components/sidebar2/sidebarNotes";
import { renderIcons } from "../../utils/icons";
import { searchNotes } from "./searchAPI";

async function handleSearchInput(
  inputElement: HTMLInputElement,
  notesContainer: HTMLDivElement,
) {
  notesContainer.innerHTML = "";
  const searchInput = inputElement.value.trim();

  try {
    if (searchInput === "") {
      await reloadNoteList();
      return;
    }

    const response = await searchNotes(searchInput);

    if (!response || response.length === 0) {
      handleSidebarEmptyState(notesContainer, searchInput);
      return;
    }
    addManyNotesToList(response);
  } catch (error) {
    const action = searchInput === "" ? "reload note list" : "search notes";
    console.error(`Failed to ${action}:`, error);
    return;
  }
  const newNoteElements =
    notesContainer.querySelectorAll<HTMLDivElement>(".noteItem");
  newNoteElements.forEach((noteElement) => {
    renderIcons(noteElement);
  });
}

export { handleSearchInput };
