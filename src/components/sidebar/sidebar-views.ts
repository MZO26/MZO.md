import { handleSidebarChange } from "@/components/sidebar/sidebar-ui";
import { handleUpdateSettings } from "@/settings/setting-actions";
import { noteStore, settingsStore, stateStore } from "@/state/state";
import { UNTAGGED } from "@/utils/constants";
import { compareNotes, rendererLogger } from "@/utils/helpers";
import { useUI } from "@/utils/registry";
import type { SidebarParams } from "@/utils/types";
import type { Id, NoteListItem } from "@shared/schemas/note-schema";

let sidebarUpdatePending = false;

/**
 * Checks whether a note matches the currently active tag filter.
 *
 * - `null` → matches everything (no filter).
 * - `UNTAGGED` → matches only notes with zero tags.
 * - any other tag → matches if present in `note.tags`.
 *
 * @param note The note to test.
 * @param activeTag The active filter value.
 * @returns `true` if the note should be visible under this filter.
 */

function matchesActiveTag(note: NoteListItem, activeTag: string | null) {
  if (activeTag === null) return true;
  if (activeTag === UNTAGGED) return !note.tags || note.tags.length === 0;
  return note.tags.includes(activeTag);
}

/**
 * Computes the ordered list of note ids that match a given tag filter.
 *
 * Iterates over `notes` in their current order and collects ids where
 * {@link matchesActiveTag} returns `true`. Used to set `visibleIds`
 * when switching tag views.
 *
 * @param notes The full note list to filter.
 * @param tag The tag filter (`null` for "all").
 * @returns Matching note ids in the same order as `notes`.
 */

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

/**
 * Resolves visible note ids into sorted, tag-filtered note objects for the sidebar.
 *
 * Looks up each id in `noteIndex`, applies {@link matchesActiveTag} when a
 * tag filter is active, and returns the results sorted via `compareNotes`.
 * Ids that no longer resolve to a note are silently skipped.
 *
 * @param visibleIds The currently visible ids (already order-relevant).
 * @param noteIndex Map for O(1) id → note lookup.
 * @param activeTag Active tag filter (`null` = no filter).
 * @returns Sorted, filtered note list ready for rendering.
 */

function selectSidebarNotes(
  visibleIds: Id[],
  noteIndex: Map<Id, NoteListItem>,
  activeTag: string | null,
): readonly NoteListItem[] {
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
  return result.toSorted(compareNotes);
}

/**
 * Switches the active tag view, persists the setting, and restores the sidebar.
 *
 * Early-returns if `nextTag` equals the current `activeTag`.
 * Otherwise:
 * - Sets `activeTag` and clears `searchQuery` in the state store.
 * - Persists the new tag via `handleUpdateSettings`.
 * - Calls {@link restoreSidebarScope} to recompute `visibleIds` and reset search UI.
 *
 * @param nextTag The tag to switch to (`null` for "all notes").
 * @param [newState] Optional pre-computed note list; falls back to the store's current `notes`.
 *
 * @example
 * await applyView(null);              // show all notes
 * await applyView("project-alpha");   // filter to one tag
 * await applyView(UNTAGGED);         // show only untagged
 */

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

/**
 * Resets the sidebar's search state and recomputes `visibleIds` for the active tag.
 *
 * Clears `searchQuery` (store + input element), empties `searchSnippets`,
 * and rebuilds `visibleIds` via {@link computeIdsForTagView} using either
 * the provided note list or the store's current `notes`.
 *
 * @param [newState] Note list to filter; defaults to `noteStore.get("notes")`.
 */

function restoreSidebarScope(newState?: readonly NoteListItem[]) {
  const activeTag = stateStore.get("activeTag");
  stateStore.setState({ searchQuery: "" });
  const { searchInput } = useUI("searchInput");
  searchInput.value = "";
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

function createNoteUpdater() {
  let element: HTMLDivElement | null = null;
  return function updateNoteCount(count: number) {
    const { sidebarFooter } = useUI("sidebarFooter");
    element ??= sidebarFooter.querySelector<HTMLDivElement>(".note-count");
    if (!element) return;
    element.textContent = `${count} ${count === 1 ? "note" : "notes"}`;
  };
}

const updateNoteCount = createNoteUpdater();

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

export { applyView, matchesActiveTag, restoreSidebarScope, sidebarListener };
