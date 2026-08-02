import { getTextMetrics } from "@/extensions/text-metrics";
import { createTemplateCloner, findElement, isDiv } from "@/utils/dom";
import { renderIcons } from "@/utils/icons";
import { estimateReadingTime } from "@/utils/note";
import { getAppItem, getTemplateItem, getUIItems } from "@/utils/registry";

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

function updateStats() {
  const editor = getAppItem("editor");
  const { wordCountEl, charCountEl, readingTime } = getUIItems([
    "wordCountEl",
    "charCountEl",
    "readingTime",
  ]);
  const { characters, words } = getTextMetrics(editor);
  charCountEl.textContent =
    characters === 1 ? "1 character" : `${characters} characters`;
  wordCountEl.textContent = words === 1 ? "1 word" : `${words} words`;
  readingTime.textContent = estimateReadingTime(words);
}

export { handleEditorEmptyState, updateStats };
