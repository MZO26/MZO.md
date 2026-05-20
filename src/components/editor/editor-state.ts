import { createNoteButton } from "@/features/note-buttons";
import { stateStore } from "@/settings/app-state";
import { createAsyncHandler } from "@/utils/async";
import { requireElement } from "@/utils/dom";
import { renderIcons } from "@/utils/icons";

function handleEditorEmptyState() {
  const editorContainer = requireElement(".editor-container");
  const editorView = requireElement(".editor-view");
  let emptyState = editorContainer.querySelector<HTMLDivElement>(
    ".editor-empty-state",
  );
  const { activeId } = stateStore.getState();
  if (!emptyState) {
    const { emptyState: newEmptyState } = createEditorEmptyState();
    editorContainer.appendChild(newEmptyState);
    emptyState = newEmptyState;
  }
  if (!activeId) {
    editorView.classList.add("hidden");
    emptyState.classList.remove("hidden");
    emptyState.inert = false;
  } else {
    editorView.classList.remove("hidden");
    emptyState.classList.add("hidden");
  }
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
  return { emptyState };
}

export { createEditorEmptyState, handleEditorEmptyState };
