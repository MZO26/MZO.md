import { initEditor } from "./components/editor/editor";
import { updateDateTime } from "./components/editor/editorFooter";
import {
  collapseSidebar,
  initNotesSidebar,
  reloadNoteList,
} from "./components/sidebar2/sidebarNotes";
import { handleSearchInput } from "./features/search/searchInputHandler";
import { addNoteBtnHandler, closeModal } from "./handlers/buttonHandlers";
import { getSelectedFont, setSelectedFont } from "./settings/appearance/font";
import {
  applyAppTheme,
  setAppTheme,
  setCodeTheme,
} from "./settings/appearance/theme";
import { openModal } from "./settings/settings";
import { debounce, getElement } from "./utils/helpers";
import { renderIcons } from "./utils/icons";

document.addEventListener("DOMContentLoaded", async () => {
  initEditor("#editor");
  renderIcons();
  initNotesSidebar();
  await reloadNoteList();
  updateDateTime();
  const addNoteBtn = getElement(".add-note-btn");
  addNoteBtn.addEventListener("click", addNoteBtnHandler);

  const themeDropdown = getElement<HTMLSelectElement>("#theme-dropdown");
  const fontSelect = getElement<HTMLSelectElement>("#font-dropdown");
  const codeThemeSelect = getElement<HTMLSelectElement>("#code-theme-dropdown");
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
  if (codeThemeSelect) {
    codeThemeSelect.addEventListener("change", async () => {
      setCodeTheme(codeThemeSelect);
    });
  }
  const settingsBtn = getElement<HTMLButtonElement>(".settings-btn");
  settingsBtn.addEventListener("click", () => {
    openModal();
  });

  const closeModalBtn = getElement<HTMLButtonElement>(".closeModal-btn");
  closeModalBtn.addEventListener("click", closeModal);

  const collapseBtn = getElement<HTMLButtonElement>(".collapse-btn");
  collapseBtn.addEventListener("click", collapseSidebar);
});

setInterval(updateDateTime, 60000);
