import { initEditor } from "./components/editor";
import { updateDateTime } from "./components/editorFooter";
import { initializeContainer } from "./components/sidebarNotes";
import { addNoteBtnHandler } from "./handlers/buttonHandlers";
import { reloadNoteList } from "./handlers/noteHandlers";
import { getSelectedFont, setSelectedFont } from "./settings/appearance/font";
import { applyAppTheme, setAppTheme } from "./settings/appearance/theme";
import { openModal } from "./settings/settings";
import { getElement, getElementOrNull } from "./utils/helpers";
import { renderIcons } from "./utils/icons";

document.addEventListener("DOMContentLoaded", async () => {
  initEditor("#editor");
  renderIcons();
  await initializeContainer();
  await reloadNoteList();
  const addNoteBtn = getElement(".add-note-btn");
  addNoteBtn.addEventListener("click", addNoteBtnHandler);

  const themeDropdown = getElement<HTMLSelectElement>("#theme-dropdown");
  const fontSelect = getElementOrNull<HTMLSelectElement>("#font-dropdown");

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
  closeModalBtn.addEventListener("click", () => {
    const overlay = getElement<HTMLDivElement>(".overlay");
    const modal = getElement<HTMLDivElement>(".modal");
    overlay.classList.remove("show");
    modal.classList.remove("show");
  });

  updateDateTime();

  document.querySelectorAll(".categoryItem").forEach((item) => {
    item.addEventListener("click", () => {
      const sidebar = getElement<HTMLDivElement>(".sidebar-notes");
      const appContainer = getElement<HTMLDivElement>(".app-container");
      const editor = getElement<HTMLDivElement>("#editor");
      sidebar.classList.toggle("collapsed");
      appContainer.classList.toggle("collapsed");
      editor.classList.toggle("collapsed");
    });
  });

  setInterval(updateDateTime, 60000);
});
