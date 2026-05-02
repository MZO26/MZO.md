import { initEditor } from "@/components/editor/editor";
import { initHoverbar } from "@/components/editor/hoverbar";
import {
  collapseSidebar,
  initNotesSidebar,
  reloadNoteList,
} from "@/components/sidebar/sidebarNotes";
import { buildMenu } from "@/components/toolbar/toolbarBuilder";
import { addNoteBtnHandler, setModalState } from "@/handlers/buttonHandlers";
import { initSearchHandlers } from "@/handlers/searchHandlers";
import { initAppSettings } from "@/settings/configSetup";
import { updateDateTime } from "@/utils/date";
import { createAsyncHandler, getElement } from "@/utils/helpers";
import { renderIcons } from "@/utils/icons";
import { createContextMenu } from "@/utils/templates";

document.addEventListener("DOMContentLoaded", async () => {
  const editor = initEditor("#editor");
  initAppSettings();
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
  addNoteBtn.addEventListener("click", createAsyncHandler(addNoteBtnHandler));
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
