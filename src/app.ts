import { editor, initEditor } from "./components/editor";
import { updateDateTime } from "./components/editorFooter";
import { openModal } from "./handlers/settings";
import {
  createNote,
  extractNoteDataFromEditor,
  reloadNoteList,
} from "./notes/noteHandlers";
import { addNoteToList, initializeContainer } from "./notes/noteItemHandlers";
import { getSelectedFont } from "./utils/font";
import { getElement, getElementOrNull } from "./utils/helpers";
import { renderIcons } from "./utils/icons";
import { applyAppTheme, setAppTheme } from "./utils/theme";

document.addEventListener("DOMContentLoaded", async () => {
  initEditor("#editor");
  renderIcons();
  await initializeContainer();
  await reloadNoteList();
  const addNoteBtn = document.querySelector(".add-note-btn");
  if (addNoteBtn) {
    addNoteBtn.addEventListener("click", async () => {
      console.log("Add note button clicked");
      console.log(editor);
      const data = extractNoteDataFromEditor(editor);
      console.log("Extracted note data: ", data);
      const note = await createNote(data);
      if (!note) return;
      console.log("adding note to list: ", note);
      addNoteToList(note);
    });
  }

  const themeDropdown = getElement<HTMLSelectElement>("#theme-dropdown");
  const fontSelect = getElementOrNull<HTMLSelectElement>("#font-dropdown");

  if (themeDropdown) {
    themeDropdown.addEventListener("change", setAppTheme);
    applyAppTheme(themeDropdown);
  }
  if (fontSelect) {
    fontSelect.addEventListener("change", getSelectedFont);
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
