import { findElement, requireElement } from "@/utils/dom";
import { initTippyDelegate } from "@/utils/ui";
import type { Editor } from "@tiptap/core";

function getTableOfContents(editor: Editor) {
  const headings: Array<{ id: string; level: number; text: string }> = [];
  editor.state.doc.descendants((node) => {
    if (node.type.name === "detailsBlock") return false;
    if (node.type.name === "heading") {
      headings.push({
        id: node.attrs["id"],
        level: node.attrs["level"],
        text: node.textContent,
      });
    }
    return true;
  });
  return headings;
}

export interface TocItem {
  id: string;
  level: number;
  text: string;
}

function initTableOfContents() {
  const container = requireElement(".toc");
  initTippyDelegate(container, document.documentElement, "left");
  container.addEventListener("click", (e) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;
    const button = target.closest("button[data-target-id]");
    if (!button) return;
    e.preventDefault();
    const targetId = button.getAttribute("data-target-id");
    if (targetId) {
      const heading = findElement(`[id="${targetId}"]`) as HTMLElement | null;
      if (!heading) return;
      heading.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  });
  return function updateToc(items: TocItem[]) {
    if (items.length === 0) {
      const span = document.createElement("span");
      span.textContent = "No headings here.";
      span.classList.add("info-span");
      container.replaceChildren(span);
      return;
    }
    const ul = document.createElement("ul");
    ul.className = "toc-list";
    for (const item of items) {
      const li = document.createElement("li");
      li.classList.add("toc-heading");
      const button = document.createElement("button");
      button.textContent = item.text;
      button.className = "toc-button";
      button.setAttribute("data-target-id", item.id);
      button.setAttribute("data-tippy-content", item.text);
      li.appendChild(button);
      ul.appendChild(li);
    }
    container.replaceChildren(ul);
  };
}

export { getTableOfContents, initTableOfContents };
