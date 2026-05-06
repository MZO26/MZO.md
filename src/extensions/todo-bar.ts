import { requireElement } from "@/utils/dom";
import { getTodoStats } from "@shared/generators/note-metadata";
import type { JSONContent } from "@tiptap/core";

function calculateToDos(content: JSONContent) {
  const stats = getTodoStats(content);
  const container = requireElement(".todo-progress-container");
  if (stats.total === 0) {
    if (container.style.display !== "none") container.style.display = "none";
    return;
  }
  if (container.style.display !== "block") container.style.display = "block";
  const countLabel = requireElement<HTMLElement>("#todo-count");
  const progressBar = requireElement<HTMLElement>("#todo-progress");
  if (countLabel) countLabel.innerText = `${stats.completed}/${stats.total}`;
  if (progressBar) {
    const percentage = (stats.completed / stats.total) * 100;
    progressBar.style.width = `${percentage}%`;
    progressBar.style.backgroundColor =
      percentage === 100 ? "var(--tag-color)" : "var(--text-muted)";
  }
}

export { calculateToDos, getTodoStats };
