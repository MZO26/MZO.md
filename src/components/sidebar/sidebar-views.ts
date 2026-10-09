import { rendererLogger } from "@/app";
import { handleSidebarChange } from "@/components/sidebar/sidebar-ui";
import { handleUpdateSettings } from "@/settings/setting-actions";
import { noteStore, settingsStore, stateStore } from "@/state/state";
import { UNTAGGED } from "@/utils/constants";
import { compareNotes, updateNoteCount } from "@/utils/note-helpers";
import { getUIItem } from "@/utils/registry";
import type { SidebarParams } from "@/utils/types";
import type { Id, NoteListItem } from "@shared/schemas/note-schema";

let sidebarUpdatePending = false;

function matchesActiveTag(note: NoteListItem, activeTag: string | null) {
  if (activeTag === null) return true;
  if (activeTag === UNTAGGED) return !note.tags || note.tags.length === 0;
  return note.tags.includes(activeTag);
}

function computeIdsForTagView(
  notes: readonly NoteListItem[],
  tag: string | null,
) {
  const ids: Id[] = [];
  for (const note of notes) {
    if (matchesActiveTag(note, tag)) {
      ids.push(note.id);
    }
  }
  return ids;
}

function selectSidebarNotes(
  visibleIds: Id[],
  noteIndex: Map<Id, NoteListItem>,
  activeTag: string | null,
): NoteListItem[] {
  const result: NoteListItem[] = [];
  if (activeTag === null) {
    for (const id of visibleIds) {
      const note = noteIndex.get(id);
      // map returns undefined if key is missing
      if (note !== undefined) {
        result.push(note);
      }
    }
  } else {
    for (const id of visibleIds) {
      const note = noteIndex.get(id);
      if (note !== undefined && matchesActiveTag(note, activeTag))
        result.push(note);
    }
  }
  return result.sort(compareNotes);
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

function getSidebarParams(): SidebarParams {
  const { searchQuery, activeTag, activeId } = stateStore.getState();
  const { visibleIds, noteIndex, searchSnippets } = noteStore.getState();
  const display = settingsStore.get("note_item_display");
  const visibleNotes = selectSidebarNotes(visibleIds, noteIndex, activeTag);
  return {
    visibleNotes,
    searchSnippets,
    query: searchQuery,
    activeTag,
    activeId,
    display,
  };
}

function sidebarListener() {
  if (sidebarUpdatePending) return;
  sidebarUpdatePending = true;
  queueMicrotask(() => {
    sidebarUpdatePending = false;
    const next = getSidebarParams();
    updateNoteCount(next.visibleNotes.length);
    rendererLogger.devLog("Sidebar change");
    handleSidebarChange(next);
  });
}

export {
  applyView,
  computeIdsForTagView,
  getSidebarParams,
  matchesActiveTag,
  restoreSidebarScope,
  sidebarListener,
};
