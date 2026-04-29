import { initEditor } from "./components/editor/editor";
import {
  setUpEditorSettings,
  updateDateTime,
} from "./components/editor/editorFooter";
import { initHoverbar } from "./components/editor/hoverbar";
import { buildToolbar } from "./components/editor/toolbar/toolbar";
import {
  collapseSidebar,
  initNotesSidebar,
  reloadNoteList,
} from "./components/sidebar/sidebarNotes";
import { initSearchHandlers } from "./features/search/searchHandlers";
import { addNoteBtnHandler, closeModal } from "./handlers/buttonHandlers";
import {
  applyAppTheme,
  setAppTheme,
  setCodeTheme,
} from "./settings/settings-service";
import { getElement } from "./utils/helpers";
import { renderIcons } from "./utils/icons";

document.addEventListener("DOMContentLoaded", async () => {
  const editor = initEditor("#editor");
  renderIcons();
  initNotesSidebar();
  await reloadNoteList();
  updateDateTime();
  const toolbarContainer = getElement("#toolbar");
  buildToolbar(toolbarContainer, editor);
  initHoverbar();
  initSearchHandlers();
  getElement(".notes-container")?.addEventListener("contextmenu", (e) => {
    const item = (e.target as Element).closest<HTMLElement>(".noteItem");
    if (!item) return;
    e.preventDefault();
    const id = item.dataset["id"];
    const pinned = item.dataset["pinned"] === "true";
    const bookmarked = item.dataset["bookmarked"] === "true";
    if (!id) return;
    window.electronAPI.showContextMenu(id, pinned, bookmarked);
  });
  setUpEditorSettings({
    selectId: "#font-family",
    storageKey: "font-family",
    cssVar: "--editor-font-family",
    defaultValue: "system",
  });

  setUpEditorSettings({
    selectId: "#line-height",
    storageKey: "line-height",
    cssVar: "--editor-line-height",
    defaultValue: 1.5,
    min: 1.2,
    max: 1.7,
  });

  setUpEditorSettings({
    selectId: "#font-size",
    storageKey: "font-size",
    cssVar: "--editor-font-size",
    defaultValue: 16,
    min: 12,
    max: 24,
    formatValue: (v) => `${v}px`,
  });

  const themeDropdown = getElement<HTMLSelectElement>("#theme");
  window.electronAPI.onThemeChanged(async (newTheme) => {
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
  const closeModalBtn = getElement<HTMLButtonElement>(".closeModal-btn");
  closeModalBtn.addEventListener("click", closeModal);
  const focusEditorBtn = getElement(".focus-editor-btn");
  focusEditorBtn.addEventListener("click", () => {
    const editorElement = document.querySelector(".ProseMirror");
    if (editorElement) {
      editorElement.classList.toggle("focus-mode-active");
    }
  });

  const codeThemeSelect = getElement<HTMLSelectElement>("#code-theme");

  if (themeDropdown) {
    themeDropdown.addEventListener("change", setAppTheme);
    applyAppTheme(themeDropdown);
  }

  if (codeThemeSelect) {
    codeThemeSelect.addEventListener("change", async () => {
      setCodeTheme(codeThemeSelect);
    });
  }

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
