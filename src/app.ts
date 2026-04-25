import { editor, initEditor } from "./components/editor/editor";
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
  const infoSidebar = getElement<HTMLElement>(".info-sidebar");
  const infoSidebarToggle = getElement<HTMLButtonElement>(
    ".info-sidebar-toggle",
  );
  infoSidebarToggle.addEventListener("click", () => {
    infoSidebar.classList.toggle("off");
  });

  const editorEl = getElement<HTMLElement>("#editor");
  editorEl.addEventListener("mousedown", () => {
    if (!infoSidebar.classList.contains("off")) {
      infoSidebar.classList.add("off");
    }
  });
  const themeDropdown = getElement<HTMLSelectElement>("#theme-dropdown");
  const fontSelect = getElement<HTMLSelectElement>("#font-dropdown");
  const codeThemeSelect = getElement<HTMLSelectElement>("#code-theme-dropdown");
  const searchInput = getElement<HTMLInputElement>("#searchInput");
  const notesContainer = getElement<HTMLDivElement>(".notes-container");
  if (searchInput && notesContainer) {
    const debouncedSearch = debounce(() => {
      const value = searchInput.value.trim();
      void handleSearchInput(value, notesContainer);
    }, 500);
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
  const readOnlyBtn = getElement(".read-only-btn");
  readOnlyBtn.addEventListener("click", () => {
    editor?.setEditable(!editor.isEditable);
  });
  const widths = ["comfortable", "normal", "wide"] as const;
  const editorWidthBtn = getElement(".editor-width-btn");
  editorWidthBtn.addEventListener("click", () => {
    const current = editorEl.dataset["width"] || "normal";
    const index = widths.indexOf(current as (typeof widths)[number]);
    const next = widths[(index + 1) % widths.length];
    editorEl.dataset["width"] = next;
  });
  const closeModalBtn = getElement<HTMLButtonElement>(".closeModal-btn");
  closeModalBtn.addEventListener("click", closeModal);

  const collapseBtn = getElement<HTMLButtonElement>(".collapse-btn");
  collapseBtn.addEventListener("click", collapseSidebar);
  document.addEventListener("keydown", (event) => {
    const isCmdOrCtrl = event.ctrlKey || event.metaKey;

    if (isCmdOrCtrl && event.key.toLowerCase() === "o") {
      event.preventDefault();
      collapseSidebar();
    }
  });
});

setInterval(updateDateTime, 60000);
