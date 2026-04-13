import DOMPurify from "dompurify";
import emptySidebar from "../../assets/emptySidebar.svg?raw";
import searchNotFound from "../../assets/searchNotFound.svg?raw";

function handleSidebarEmptyState(
  container: HTMLDivElement,
  searchInput?: string | undefined,
) {
  if (container.childElementCount === 0) {
    const emptyStateNode = showSidebarEmptyState(searchInput);
    container.appendChild(emptyStateNode);
    return;
  } else if (
    container.childElementCount === 1 &&
    container.firstElementChild?.classList.contains("sidebar-empty-state")
  ) {
    return;
  }
  const existingEmptyState = container.querySelector(".sidebar-empty-state");
  if (existingEmptyState) {
    existingEmptyState.remove();
  }
}

function showSidebarEmptyState(searchInput?: string | undefined) {
  const emptyStateContainer = document.createElement("div");
  const p = document.createElement("p");
  emptyStateContainer.className = "sidebar-empty-state";
  if (searchInput) {
    emptyStateContainer.innerHTML = searchNotFound;
    const safeInput = DOMPurify.sanitize(searchInput);
    p.innerHTML = `No results found for <strong>${safeInput}</strong>`;
  } else {
    emptyStateContainer.innerHTML = emptySidebar;
    p.innerHTML = "No notes here";
  }
  emptyStateContainer.appendChild(p);
  return emptyStateContainer;
}

export { handleSidebarEmptyState };
