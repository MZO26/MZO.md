import { createInfoSpan } from "@/components/sidebar/sidebar-features";
import { findElement, requireElement } from "@/utils/dom";
import { initTippyDelegate } from "@/utils/ui";
import type { Editor } from "@tiptap/core";

function getTableOfContents(editor: Editor | null) {
  const headings: TocItem[] = [];
  editor?.state.doc.descendants((node) => {
    if (node.type.name === "detailsBlock") return false;
    if (node.type.name === "heading") {
      const text = (
        typeof node.textContent === "string" ? node.textContent : ""
      ).trim();
      const { id, level } = node.attrs || {};
      if (!text || typeof id !== "string") return true;
      headings.push({
        id,
        level: typeof level === "number" ? level : 1,
        text,
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
  const container = requireElement<HTMLDivElement>(".toc");
  initTippyDelegate(container, document.documentElement, "left");
  container.addEventListener("click", (e) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;
    const button = target.closest<HTMLButtonElement>("button[data-target-id]");
    if (!button) return;
    const targetId = button.getAttribute("data-target-id");
    if (targetId) {
      const heading = findElement<HTMLHeadingElement>(`[id="${targetId}"]`);
      if (!heading) return;
      heading.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  });
  return function updateToc(items: TocItem[]) {
    if (items.length === 0) {
      const span = createInfoSpan("No headings here.");
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
