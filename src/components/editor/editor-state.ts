import { createNoteButton } from "@/features/note-buttons";
import { stateStore } from "@/settings/app-state";
import { createAsyncHandler } from "@/utils/async";
import { requireElement } from "@/utils/dom";
import { renderIcons } from "@/utils/icons";
import { getAppItem } from "@/utils/registry";

function handleEditorEmptyState() {
  const editorContainer = getAppItem("editorContainer") as HTMLDivElement;
  const editorView = requireElement<HTMLDivElement>(".editor-view");
  let emptyState = editorContainer.querySelector<HTMLDivElement>(
    ".editor-empty-state",
  );
  if (!emptyState) {
    emptyState = createEditorEmptyState();
    editorContainer.appendChild(emptyState);
  }
  const { activeId } = stateStore.getState();
  const showEmptyState = !activeId;
  editorView.classList.toggle("hidden", showEmptyState);
  emptyState.classList.toggle("hidden", !showEmptyState);
  emptyState.inert = !showEmptyState;
}

const template = requireElement<HTMLTemplateElement>(
  "#editor-empty-state-template",
);

const editorEmptyState = template.content.firstElementChild as HTMLDivElement;

function createEditorEmptyState() {
  const emptyState = editorEmptyState.cloneNode(true) as HTMLDivElement;
  renderIcons(emptyState);
  const handleClick = createAsyncHandler(async (e: Event) => {
    const target = e.target as HTMLElement;
    if (target.closest(".empty-state-add-note-btn")) {
      await createNoteButton();
    }
  });
  emptyState.addEventListener("click", handleClick);
  return emptyState;
}

export { createEditorEmptyState, handleEditorEmptyState };
