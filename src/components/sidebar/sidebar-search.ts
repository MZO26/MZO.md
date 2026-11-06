import { search } from "@/api/api";
import {
  matchesActiveTag,
  restoreSidebarScope,
} from "@/components/sidebar/sidebar-views";
import { noteStore, stateStore } from "@/state/state";
import { DEBOUNCE_MS } from "@/utils/constants";
import { debounce, rendererLogger } from "@/utils/helpers";
import type { MappedMatches } from "@/utils/types";
import { appEvents } from "@shared/event-emitter";
import {
  isNoteID,
  type Id,
  type NoteListItem,
  type SearchQuery,
} from "@shared/schemas/note-schema";
import { APP_EVENTS, MAX_SEARCH_LENGTH } from "@shared/shared-constants";

let currentSearchId = 0;

async function handleSearch(searchInput: SearchQuery) {
  const nextQuery = searchInput.trim();
  if (nextQuery.length > MAX_SEARCH_LENGTH) return;
  const { searchQuery, activeTag } = stateStore.getState();
  if (nextQuery === searchQuery) return;
  stateStore.setState({ searchQuery: nextQuery });
  if (!nextQuery) {
    restoreSidebarScope();
    appEvents.emit(APP_EVENTS.SYNC_EDITOR_SEARCH, { query: "" });
    return;
  }
  const searchId = ++currentSearchId;
  const result = await search(nextQuery);
  if (searchId !== currentSearchId) return;
  if (!result.success) {
    rendererLogger.appError("[handleSearch]: Failed to search:", result.error);
    return;
  }
  const data: MappedMatches[] = [];
  for (const row of result.data) {
    data.push({
      id: row.id,
      title: row.title,
      snippet: row.search_match,
      rank: row.rank,
    });
  }
  computeSearchResult(data, noteStore.get("noteIndex"), activeTag);
  appEvents.emit(APP_EVENTS.SYNC_EDITOR_SEARCH, { query: nextQuery });
}

function computeSearchResult(
  matches: MappedMatches[],
  noteIndex: Map<Id, NoteListItem>,
  activeTag: string | null,
) {
  const searchSnippets: Record<Id, string> = {};
  const visibleIds: Id[] = [];
  for (const match of matches) {
    if (!isNoteID(match.id)) continue;
    searchSnippets[match.id] = match.snippet;
    const note = noteIndex.get(match.id);
    if (note && matchesActiveTag(note, activeTag)) {
      visibleIds.push(match.id);
    }
  }
  noteStore.setState({
    visibleIds,
    searchSnippets,
  });
}

const debouncedSearch = debounce((e: Event) => {
  if (!(e.target instanceof HTMLInputElement)) return;
  const value = (e.target.value ?? "").trim();
  handleSearch(value);
}, DEBOUNCE_MS.very_fast);

export { debouncedSearch };
