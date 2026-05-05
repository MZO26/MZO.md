import { debouncedSetSettings } from "@/api/settingsAPI";
import { el } from "@/utils/helpers";
import { getItem } from "@/utils/registry";
import { createElement, Library, SearchX } from "lucide";

async function setSidebarState(
  element: HTMLElement,
  key: string,
  collapsed: boolean,
): Promise<void> {
  const isCollapsed = element.classList.contains("collapsed");
  if (isCollapsed === collapsed) return;
  element.classList.toggle("collapsed", collapsed);
  debouncedSetSettings({ [key]: collapsed });
}

function handleSidebarEmptyState(searchInput?: string) {
  const sidebar = getItem("sidebar");
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

function showSidebarEmptyState(searchInput?: string) {
  const isSearch = Boolean(searchInput?.trim());
  const iconNode = createElement(isSearch ? SearchX : Library);
  iconNode.classList.add("empty-state-icon");
  const titleText = isSearch ? "No results found" : "No notes here";
  const descriptionNode = isSearch
    ? el(
        "p",
        { className: "empty-state-description" },
        "No notes matching ",
        el("strong", {}, `"${searchInput}"`),
      )
    : el(
        "p",
        { className: "empty-state-description" },
        "Create a note to get started.",
      );
  return el(
    "div",
    { className: "sidebar-empty-state empty-state-content" },
    iconNode,
    el("h3", { className: "empty-state-title" }, titleText),
    descriptionNode,
  );
}

export { handleSidebarEmptyState, setSidebarState };
