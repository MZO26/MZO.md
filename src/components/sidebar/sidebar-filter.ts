import { getByTag, getViews, searchNotes } from "@/api/noteAPI";
import { handleEditorEmptyState } from "@/components/editor/editor-state";
import {
  addManyNotesToList,
  reloadNoteList,
} from "@/components/sidebar/sidebar-actions";
import { handleSidebarEmptyState } from "@/components/sidebar/sidebar-state";
import { stateStore } from "@/features/app-state";
import { getAppItem } from "@/utils/registry";
import { showToast } from "@/utils/toast";
import { el } from "@/utils/ui";

interface ViewItem {
  id: string;
  label: string;
}

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
  stateStore.setState({ activeId: null });
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
    handleEditorEmptyState();
    return;
  }
  addManyNotesToList(response.data);
  handleSidebarEmptyState(searchInput);
}

function createViews(views: ViewItem[]) {
  const listItems = views.map((view) => {
    const btn = el("button", {}, view["label"]);
    btn.setAttribute("data-view", view["id"]);

    return el("li", {}, btn);
  });
  return el("ul", { className: "smart-view-list" }, ...listItems);
}

async function handleViews(view: string) {
  const response = await getViews(view);
  if (!response.success) {
    showToast(response.message);
    return;
  }
  reloadNoteList(response.data);
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
