import { rendererLogger } from "@/app";
import { handleUpdateSettings } from "@/settings/setting-actions";
import { noteStore, stateStore } from "@/state/state";
import { UNTAGGED } from "@/utils/constants";
import { getUIItem } from "@/utils/registry";
import type { NoteListItem } from "@shared/schemas/note-schema";

function matchesActiveTag(note: NoteListItem, activeTag: string | null) {
  if (activeTag === null) return true;
  if (activeTag === UNTAGGED) return !note.tags || note.tags.length === 0;
  return note.tags.includes(activeTag);
}

function computeIdsForTagView(
  notes: readonly NoteListItem[],
  tag: string | null,
) {
  return notes
    .filter((note) => matchesActiveTag(note, tag))
    .map((note) => note.id);
}

async function applyView(
  nextTag: string | null,
  newState?: readonly NoteListItem[],
) {
  const activeTag = stateStore.get("activeTag");
  if (activeTag === nextTag) {
    rendererLogger.devLog(
      "[applyView]: Same tag. Early return guard activated",
    );
    return;
  }
  stateStore.setState({ activeTag: nextTag, searchQuery: "" });
  await handleUpdateSettings({ active_tag: nextTag });
  restoreSidebarScope(newState);
}

function restoreSidebarScope(newState?: readonly NoteListItem[]) {
  const activeTag = stateStore.get("activeTag");
  stateStore.setState({ searchQuery: "" });
  getUIItem("searchInput").value = "";
  noteStore.setState((state) => ({
    visibleIds: computeIdsForTagView(newState ?? state.notes, activeTag),
    searchSnippets: {},
  }));
}

export {
  applyView,
  computeIdsForTagView,
  matchesActiveTag,
  restoreSidebarScope,
};
