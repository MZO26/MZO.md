import { requireElement } from "@/utils/dom";
import { renderIcons } from "@/utils/icons";
import { getAppItem } from "@/utils/registry";

async function setSidebarState(
  element: HTMLDivElement,
  collapsed: boolean,
): Promise<void> {
  const isCollapsed = element.classList.contains("collapsed");
  if (isCollapsed === collapsed) return;
  element.classList.toggle("collapsed", collapsed);
}

function handleSidebarEmptyState(searchInput?: string) {
  const sidebar = getAppItem("sidebar");
  const existing = sidebar.querySelector(".sidebar-empty-state");
  const hasNotes = sidebar.childElementCount > (existing ? 1 : 0);
  if (hasNotes) {
    if (existing) existing.remove();
  } else {
    const newEmptyState = showSidebarEmptyState(searchInput);
    if (existing) {
      existing.replaceWith(newEmptyState);
    } else {
      sidebar.appendChild(newEmptyState);
    }
  }
}

const template = requireElement<HTMLTemplateElement>(
  "#sidebar-empty-state-template",
);

const sidebarEmptyState = template.content.firstElementChild as HTMLDivElement;

function showSidebarEmptyState(searchInput?: string) {
  const isSearch = Boolean(searchInput?.trim());
  const emptyState = sidebarEmptyState.cloneNode(true) as HTMLDivElement;
  const iconEl = emptyState.querySelector<HTMLElement>("#sidebar-empty-icon");
  const titleEl =
    emptyState.querySelector<HTMLHeadingElement>(".empty-state-title");
  const descEl = emptyState.querySelector<HTMLParagraphElement>(
    ".empty-state-description",
  );
  if (isSearch) {
    iconEl!.setAttribute("data-lucide", "search-x");
    titleEl!.textContent = "No results found";
    const strongEl = document.createElement("strong");
    strongEl.textContent = `"${searchInput}"`;
    descEl!.replaceChildren("No notes matching ", strongEl);
  } else {
    iconEl!.setAttribute("data-lucide", "library");
    titleEl!.textContent = "No notes here";
    descEl!.textContent = "Create a note to get started.";
  }
  renderIcons(emptyState);

  return emptyState;
}

export { handleSidebarEmptyState, setSidebarState };
