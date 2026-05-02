import { initListeners } from "@/api/listeners";
import { initEditor } from "@/components/editor/editor-init";
import { reloadNoteList } from "@/components/sidebar/sidebar-actions";
import { initSearchHandlers } from "@/components/sidebar/sidebar-filter-init";
import { initNotesSidebar } from "@/components/sidebar/sidebar-init";
import { collapseSidebar } from "@/components/sidebar/sidebar-state";
import { initHoverbar } from "@/components/toolbar/hoverbar";
import { buildMenu } from "@/components/toolbar/menu-builder";
import { createNoteButton } from "@/features/note-ui";
import { setGlobalEditor, setModalState } from "@/services/state";
import { initAppSettings } from "@/settings/setting-init";
import { updateDateTime } from "@/utils/date";
import { createAsyncHandler, getElement } from "@/utils/helpers";
import { renderIcons } from "@/utils/icons";
import { createContextMenu } from "@/utils/templates";

document.addEventListener("DOMContentLoaded", async () => {
  const editor = initEditor("#editor");
  setGlobalEditor(editor);
  initAppSettings();
  initListeners();
  renderIcons();
  initNotesSidebar();
  await reloadNoteList();
  updateDateTime();
  const toolbarContainer = getElement("#toolbar");
  buildMenu(toolbarContainer, editor, "toolbar");
  initHoverbar();
  initSearchHandlers();
  const notesContainer = getElement(".notes-container");
  notesContainer.addEventListener(
    "contextmenu",
    createAsyncHandler(createContextMenu),
  );
  const addNoteBtn = getElement(".add-note-btn");
  addNoteBtn.addEventListener("click", createAsyncHandler(createNoteButton));
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
  closeModalBtn.addEventListener("click", () => setModalState(false));
  const openModalBtn = getElement<HTMLButtonElement>(".settings-btn");
  openModalBtn.addEventListener("click", () => setModalState(true));
  const focusEditorBtn = getElement(".focus-btn");
  focusEditorBtn.addEventListener("click", () => {
    const editorElement = getElement(".ProseMirror");
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
