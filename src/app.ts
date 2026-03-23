import { initEditor } from "./components/editor";
import { updateDateTime } from "./components/editorFooter";
import { openModal } from "./handlers/settings";
import { createNote } from "./notes/renderNotes";
import { getElement } from "./utils/helpers";
import { renderIcons } from "./utils/icons";
import { applyAppTheme, setAppTheme } from "./utils/theme";

document.addEventListener("DOMContentLoaded", async () => {
  renderIcons();
  const darkModeBtn = getElement<HTMLButtonElement>(".dark-mode-btn");
  await applyAppTheme(darkModeBtn);
  darkModeBtn.addEventListener("click", async () => {
    await setAppTheme(darkModeBtn);
  });
  window.electronAPI.onThemeChanged(async (theme) => {
    await applyAppTheme(darkModeBtn, theme);
  });
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
  initEditor("#editor");

  updateDateTime();

  document
    .querySelector(".add-note-btn")
    ?.addEventListener("click", async () => {
      await createNote();
    });

  document.querySelectorAll(".categoryItem")?.forEach((item) => {
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
