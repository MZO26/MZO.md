import { search } from "@/api/api";
import { rendererLogger } from "@/app";
import {
  matchesActiveTag,
  restoreSidebarScope,
} from "@/components/sidebar/sidebar-views";
import { noteStore, stateStore } from "@/state/state";
import { memoize } from "@/state/state-actions";
import { debounce } from "@/utils/async";
import {
  MAX_SEARCH_LENGTH,
  DEBOUNCE_MS,
} from "@shared/constants/renderer-constants";
import type { NoteListItem, SearchQuery } from "@shared/schemas/note-schema";

async function handleSearch(searchInput: SearchQuery) {
  const nextQuery = searchInput.trim();
  if (nextQuery.length > MAX_SEARCH_LENGTH) return;
  const prevQuery = stateStore.get("searchQuery");
  if (nextQuery === prevQuery) {
    rendererLogger.devLog("Same query. Skipping search");
    return;
  }
  stateStore.setState({ searchQuery: nextQuery });
  if (!nextQuery) {
    restoreSidebarScope();
    return;
  }
  const result = await search(nextQuery);
  if (!result.success) {
    rendererLogger.appError("[handleSearch]: Failed to search:", result.error);
    return;
  }
  const data = result.data.map((row) => {
    const { search_match, ...rest } = row;
    return {
      ...rest,
      snippet: row.search_match,
    };
  });
  applySearchResults(data);
}

const computeSearchResult = memoize(
  (
    matches: { snippet: string; id: string; title: string; rank: number }[],
    noteIndex: Map<string, NoteListItem>,
    activeTag: string | null,
  ) => {
    const searchSnippets: Record<string, string> = {};
    const visibleIds: string[] = [];
    for (const match of matches) {
      searchSnippets[match.id] = match.snippet;
      const note = noteIndex.get(match.id);
      if (note && matchesActiveTag(note, activeTag)) {
        visibleIds.push(match.id);
      }
    }
    return { visibleIds, searchSnippets };
  },
);

function applySearchResults(
  matches: { snippet: string; id: string; title: string; rank: number }[],
) {
  const next = computeSearchResult(
    matches,
    noteStore.get("noteIndex"),
    stateStore.get("activeTag"),
  );
  noteStore.setState(next);
}

const debouncedSearch = debounce((e: Event) => {
  const target = e.target as HTMLInputElement | null;
  if (!target) return;
  const value = (target.value ?? "").trim();
  handleSearch(value);
}, DEBOUNCE_MS.fast);

export { debouncedSearch };
