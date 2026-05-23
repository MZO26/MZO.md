import { getByTag, getViews, searchNotes } from "@/api/api";
import {
  addManyNotesToList,
  reloadNoteList,
} from "@/components/sidebar/sidebar-actions";
import { handleSidebarEmptyState } from "@/components/sidebar/sidebar-state";
import { requireElement } from "@/utils/dom";
import { getAppItem } from "@/utils/registry";
import { showToast } from "@/utils/toast";
import type { ViewItem } from "@shared/types";

const views: ViewItem[] = [
  { id: "all", label: "All Notes" },
  { id: "bookmarked", label: "Bookmarked" },
  { id: "pinned", label: "Pinned" },
  { id: "todos", label: "Pending Todos" },
  { id: "untagged", label: "Untagged Notes" },
];

async function handleSearchInput(searchInput: string) {
  const sidebar = getAppItem("sidebar");
  sidebar.innerHTML = "";
  try {
    if (searchInput === "") {
      await reloadNoteList();
      return;
    }
  } catch (error) {
    console.error(`(searchInputHandler): Failed to reload note list`);
    return;
  }
  const response = await searchNotes(searchInput, 50);
  if (!response.success) {
    showToast(response.message);
    return;
  }
  addManyNotesToList(response.data);
  handleSidebarEmptyState(searchInput);
}

function createViews(views: ViewItem[]) {
  const select = requireElement<HTMLSelectElement>(".view-select");
  for (const view of views) {
    const option = document.createElement("option");
    option.textContent = view["label"];
    option.value = view["id"];
    select.append(option);
  }
  return select;
}

async function handleViews(view: string) {
  const response = await getViews(view);
  if (!response.success) {
    showToast(response.message);
    return;
  }
  await reloadNoteList(response.data);
}

async function searchByTag(tag: string) {
  const response = await getByTag(tag);
  if (!response.success) {
    showToast(response.message);
    return;
  }
  await reloadNoteList(response.data);
}

export { createViews, handleSearchInput, handleViews, searchByTag, views };
