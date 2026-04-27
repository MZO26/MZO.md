import type { AppTheme } from "../shared/schemas/storeSchema";
import { editor, initEditor } from "./components/editor/editor";
import { updateDateTime } from "./components/editor/editorFooter";
import {
  collapseSidebar,
  initNotesSidebar,
  reloadNoteList,
} from "./components/sidebar/sidebarNotes";
import {
  handleSearchInput,
  handleViews,
} from "./features/search/searchHandlers";
import { addNoteBtnHandler, closeModal } from "./handlers/buttonHandlers";
import {
  applyAppTheme,
  getSelectedFont,
  setAppTheme,
  setCodeTheme,
  setSelectedFont,
} from "./settings/settings-service";
import { debounce, getElement } from "./utils/helpers";
import { renderIcons } from "./utils/icons";

document.addEventListener("DOMContentLoaded", async () => {
  initEditor("#editor");
  renderIcons();
  initNotesSidebar();
  await reloadNoteList();
  updateDateTime();

  const themeDropdown = getElement<HTMLSelectElement>("#theme-dropdown");
  window.electronAPI.onThemeChanged(async (newTheme) => {
    console.log("FRONTEND RECEIVED THEME:", newTheme);
    await applyAppTheme(themeDropdown, newTheme, true);
  });
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

  const searchInput = getElement<HTMLInputElement>("#searchInput");
  const notesContainer = getElement<HTMLDivElement>(".notes-container");
  if (searchInput && notesContainer) {
    const debouncedSearch = debounce(() => {
      const value = searchInput.value.trim();
      void handleSearchInput(value, notesContainer);
    }, 500);
    searchInput.addEventListener("input", debouncedSearch);
  }

  const smartViewContainer = document.querySelector(".smart-view-list");

  smartViewContainer?.addEventListener("click", async (event) => {
    const target = (event.target as HTMLButtonElement).closest(
      "button[data-view]",
    ) as HTMLButtonElement | null;
    const view = target?.dataset["view"];
    if (!view) return;
    await handleViews(view);
  });

  const fontSelect = getElement<HTMLSelectElement>("#font-dropdown");

  if (fontSelect) {
    fontSelect.addEventListener("change", setSelectedFont);
    getSelectedFont(fontSelect);
  }

  const codeThemeSelect = getElement<HTMLSelectElement>("#code-theme-dropdown");

  if (themeDropdown) {
    themeDropdown.addEventListener("change", setAppTheme);
    applyAppTheme(themeDropdown);
  }

  if (codeThemeSelect) {
    codeThemeSelect.addEventListener("change", async () => {
      setCodeTheme(codeThemeSelect);
    });
  }

  const focusBtn = getElement(".focus-btn");
  focusBtn.addEventListener("click", async () => {
    const theme = document.body.dataset["theme"] as AppTheme;
    const appContainer = getElement<HTMLDivElement>(".app-container");
    const editorHeader = getElement(".editor-header");
    const currentState = appContainer.classList.contains("focus");
    const dragRegion = getElement(".drag-region");
    const frameLeft = getElement(".frame-left");
    const frameRight = getElement(".frame-right");
    const editorContainer = getElement(".editor-container");
    editorHeader.classList.toggle("focus");
    infoSidebarToggle.classList.toggle("focus");
    dragRegion.classList.toggle("focus");
    editorContainer.classList.toggle("focus");
    infoSidebar.classList.toggle("focus");
    frameLeft.classList.toggle("focus");
    frameRight.classList.toggle("focus");
    const newState = !currentState;
    appContainer.classList.toggle("focus", newState);
    await window.electronAPI.setTheme(theme, newState);
  });

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
  const focusEditorBtn = getElement(".focus-editor-btn");
  focusEditorBtn.addEventListener("click", () => {
    const editorElement = document.querySelector(".ProseMirror");
    if (editorElement) {
      editorElement.classList.toggle("focus-mode-active");
    }
  });
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
