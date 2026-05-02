import { getElement } from "@/utils/helpers";
import type { JSONContent } from "@tiptap/core";

function getTodoStats(content: JSONContent) {
  let total = 0;
  let completed = 0;
  if (!content) {
    return { total, completed, left: 0 };
  }
  const stack: JSONContent[] = [content];
  while (stack.length > 0) {
    const node = stack.pop()!;
    if (node.type === "taskItem") {
      total++;
      if (node.attrs?.["checked"]) {
        completed++;
      }
    }
    const content = node.content;
    if (content) {
      for (let i = 0, len = content.length; i < len; i++) {
        const child = content[i];
        if (child) {
          stack.push(child);
        }
      }
    }
  }
  return {
    total,
    completed,
    left: total - completed,
  };
}

function calculateToDos(content: JSONContent) {
  const stats = getTodoStats(content);
  const container = getElement(".todo-progress-container");
  if (stats.total === 0) {
    if (container.style.display !== "none") container.style.display = "none";
    return;
  }

  if (container.style.display !== "block") container.style.display = "block";

  const countLabel = getElement<HTMLElement>("#todo-count");
  const progressBar = getElement<HTMLElement>("#todo-progress");

  if (countLabel) countLabel.innerText = `${stats.completed}/${stats.total}`;

  if (progressBar) {
    const percentage = (stats.completed / stats.total) * 100;
    progressBar.style.width = `${percentage}%`;
    progressBar.style.backgroundColor =
      percentage === 100 ? "var(--tag-color)" : "var(--text-muted)";
  }
}

export { calculateToDos, getTodoStats };
