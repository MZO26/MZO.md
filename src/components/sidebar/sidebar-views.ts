import { rendererLogger } from "@/app";
import { waitForFlush } from "@/notes/note-actions";
import { handleUpdateSettings } from "@/settings/setting-actions";
import { noteStore, stateStore } from "@/state/state";
import { getUIItem } from "@/utils/registry";
import { UNTAGGED } from "@shared/constants/renderer-constants";
import type { NoteListItem } from "@shared/schemas/note-schema";

function matchesActiveTag(note: NoteListItem, activeTag: string | null) {
  if (activeTag === null) return true;
  if (activeTag === UNTAGGED) return !note.tags || note.tags.length === 0;
  return note.tags.includes(activeTag);
}

function computeIdsForTagView(
  notes: Readonly<NoteListItem[]>,
  tag: string | null,
) {
  return notes
    .filter((note) => matchesActiveTag(note, tag))
    .map((note) => note.id);
}

async function applyView(
  nextTag: string | null,
  newState?: NoteListItem[],
  id?: string,
) {
  const { activeId, activeTag } = stateStore.getState();
  if (activeId && id && id === activeId && !newState) {
    // updated notes state from saving if an active tag gets deleted while note is open and tag view is applied
    rendererLogger.devLog("Saving in progress. Flushing note");
    // brittle as of now
    await waitForFlush(id);
  }
  if (activeTag === nextTag) {
    rendererLogger.devLog(
      "[applyView]: Same tag. Early return guard activated",
    );
    return;
  }
  stateStore.setState({ activeTag: nextTag, searchQuery: "" });
  getUIItem("searchInput").value = "";
  await handleUpdateSettings({ active_tag: nextTag });
  const notes = newState ?? noteStore.get("notes");
  noteStore.setState({
    visibleIds: computeIdsForTagView(notes, nextTag),
  });
}

function restoreSidebarScope() {
  const activeTag = stateStore.get("activeTag");
  stateStore.setState({ searchQuery: "" });
  getUIItem("searchInput").value = "";
  noteStore.setState((state) => ({
    visibleIds: computeIdsForTagView(state.notes, activeTag),
    searchSnippets: {},
  }));
}

export {
  applyView,
  computeIdsForTagView,
  matchesActiveTag,
  restoreSidebarScope,
};
