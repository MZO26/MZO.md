import { rendererLogger } from "@/utils/helpers";
import { useCore } from "@/utils/registry";
import { createInfoSpan, requireElement } from "@/utils/ui";
import { type Editor } from "@tiptap/core";

export interface TocItem {
  id: string;
  level: number;
  text: string;
}

function getTableOfContents(editor: Editor) {
  const headings: TocItem[] = [];
  const headingType = editor.schema.nodes["heading"];
  if (!headingType) return headings;
  editor.state.doc.descendants((node) => {
    if (node.type.spec.code) return false;
    if (node.type === headingType) {
      const text = node.textContent.trim();
      const { id, level } = node.attrs || {};
      if (text || typeof id === "string") {
        headings.push({
          id,
          level: typeof level === "number" ? level : 1,
          text,
        });
      }
      return false;
    }
    if (node.isTextblock) return false;
    return true;
  });
  return headings;
}

function initTableOfContents() {
  const container = requireElement<HTMLDivElement>(".toc");
  const editorWrapper = document.querySelector<HTMLDivElement>("#editor");
  container.addEventListener("click", (e) => {
    if (!(e.target instanceof HTMLElement)) return;
    const button = e.target.closest<HTMLButtonElement>(
      "button[data-target-id]",
    );
    if (!button) return;
    const targetId = button.getAttribute("data-target-id");
    rendererLogger.devLog("targetId", targetId);
    if (targetId) {
      if (!editorWrapper) return;
      const heading = editorWrapper.querySelector<HTMLHeadingElement>(
        `[id="${CSS.escape(targetId)}"]`,
      );
      if (!heading) return;
      const { editor } = useCore("editor");
      const pos = editor.view.posAtDOM(heading, 0);
      editor.commands.highlightHeading(pos);
      editor.view.dom.focus({ preventScroll: true });
      const wrapperRect = editorWrapper.getBoundingClientRect();
      const headingRect = heading.getBoundingClientRect();
      const topOffset = 16;
      editorWrapper.scrollTop += headingRect.top - wrapperRect.top - topOffset;
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
      button.title = item.text;
      li.appendChild(button);
      ul.appendChild(li);
    }
    container.replaceChildren(ul);
  };
}

export { getTableOfContents, initTableOfContents };
