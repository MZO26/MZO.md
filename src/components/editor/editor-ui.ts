import { createTemplateCloner, findElement, isDiv } from "@/utils/dom";
import { renderIcons } from "@/utils/icons";
import { getAppItem, getTemplateItem } from "@/utils/registry";

const getEditorEmptyStateClone = createTemplateCloner(
  "editorEmptyStateTemplate",
  isDiv,
);

function handleEditorEmptyState(activeId: string | null) {
  const editorContainer = getAppItem("editorContainer");
  const editorView = getTemplateItem("editorView");
  const topToolbar = findElement<HTMLDivElement>(".toolbar-hover-zone");
  const existingEmptyState = findElement<HTMLDivElement>(
    ".editor-empty-state",
    editorContainer,
  );
  const showEmptyState = !activeId;
  editorView.classList.toggle("hidden", showEmptyState);
  topToolbar?.classList.toggle("hidden", showEmptyState);
  if (showEmptyState) {
    if (!existingEmptyState) {
      const newEmptyState = getEditorEmptyStateClone();
      editorContainer.appendChild(newEmptyState);
      renderIcons(newEmptyState);
    }
  } else if (existingEmptyState) {
    existingEmptyState.remove();
  }
}

export { handleEditorEmptyState };
