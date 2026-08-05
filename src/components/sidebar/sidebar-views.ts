import { updateSettings } from "@/api/api";
import { rendererLogger } from "@/app";
import { flushSave } from "@/notes/note-actions";
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
  updatedNotes?: NoteListItem[],
) {
  const { activeId, activeTag } = stateStore.getState();
  if (activeId && !updatedNotes) {
    // updated notes state from saving if an active tag gets deleted while note is open and tag view is applied
    // doc changed to see if there are any unsaved changes before commiting to the view
    rendererLogger.devLog("Saving in progress. Flushing note");
    await flushSave(activeId);
  }
  if (activeTag === nextTag) {
    rendererLogger.devLog(
      "[applyView]: Same tag. Early return guard activated",
    );
    return;
  }
  stateStore.setState({ activeTag: nextTag, searchQuery: "" });
  getUIItem("searchInput").value = "";
  updateSettings({ active_tag: nextTag });
  const notes = updatedNotes ?? noteStore.get("notes");
  noteStore.setState({
    visibleIds: computeIdsForTagView(notes, nextTag),
  });
  rendererLogger.devLog(noteStore.get("visibleIds"));
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
