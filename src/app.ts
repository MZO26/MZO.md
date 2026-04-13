import { initEditor } from "./components/editor/editor";
import { updateDateTime } from "./components/editor/editorFooter";
import { initEditorHandlers } from "./components/editor/editorHandlers";
import {
  initNotesSidebar,
  reloadNoteList,
} from "./components/sidebar2/sidebarNotes";
import { handleSearchInput } from "./features/search/searchInputHandler";
import { addNoteBtnHandler, closeModal } from "./handlers/buttonHandlers";
import { getSelectedFont, setSelectedFont } from "./settings/appearance/font";
import { applyAppTheme, setAppTheme } from "./settings/appearance/theme";
import { openModal } from "./settings/settings";
import { setValue, StorageKeys } from "./utils/cache";
import { debounce, getElement, getElementOrNull } from "./utils/helpers";
import { renderIcons } from "./utils/icons";

document.addEventListener("DOMContentLoaded", async () => {
  const editor = initEditor("#editor");
  initEditorHandlers(editor);
  renderIcons();
  initNotesSidebar();
  await reloadNoteList();
  updateDateTime();
  const addNoteBtn = getElement(".add-note-btn");
  addNoteBtn.addEventListener("click", addNoteBtnHandler);

  const themeDropdown = getElement<HTMLSelectElement>("#theme-dropdown");
  const fontSelect = getElementOrNull<HTMLSelectElement>("#font-dropdown");
  const searchInput = getElement<HTMLInputElement>("#searchInput");
  const notesContainer = getElement<HTMLDivElement>(".notes-container");
  if (searchInput && notesContainer) {
    const debouncedSearch = debounce(async () => {
      await handleSearchInput(searchInput, notesContainer);
    }, 300);
    searchInput.addEventListener("input", debouncedSearch);
  }
  if (themeDropdown) {
    themeDropdown.addEventListener("change", setAppTheme);
    applyAppTheme(themeDropdown);
  }
  if (fontSelect) {
    fontSelect.addEventListener("change", setSelectedFont);
    getSelectedFont(fontSelect);
  }
  const settingsBtn = getElement<HTMLButtonElement>(".settings-btn");
  settingsBtn.addEventListener("click", () => {
    openModal();
  });

  const closeModalBtn = getElement<HTMLButtonElement>(".closeModal-btn");
  closeModalBtn.addEventListener("click", closeModal);

  document.querySelectorAll(".categoryItem").forEach((item) => {
    item.addEventListener("click", () => {
      const sidebar = getElement<HTMLDivElement>(".sidebar-notes");
      const appContainer = getElement<HTMLDivElement>(".app-container");
      const editor = getElement<HTMLDivElement>("#editor");
      sidebar.classList.toggle("collapsed");
      appContainer.classList.toggle("collapsed");
      editor.classList.toggle("collapsed");
      if (sidebar.classList.contains("collapsed")) {
        setValue(StorageKeys.SIDEBAR_COLLAPSED, true);
      } else {
        setValue(StorageKeys.SIDEBAR_COLLAPSED, false);
      }
    });
  });
  setInterval(updateDateTime, 60000);
});
