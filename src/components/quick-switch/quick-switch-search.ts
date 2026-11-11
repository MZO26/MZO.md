import {
  computeDisplayNotes,
  getAllUsableEditorCommands,
  getSettingsCommands,
  getTags,
  toDisplayBadges,
} from "@/components/quick-switch/quick-switch-actions";
import type { QuickSwitchState } from "@/components/quick-switch/quick-switch-init";
import { setDisplay } from "@/components/quick-switch/quick-switch-ui";
import { sanitizeSnippets } from "@/components/sidebar/sidebar-note-items";
import { handleSearch } from "@/components/sidebar/sidebar-search";
import { noteStore } from "@/state/state";
import { QUICK_SWITCH_FTS_LIMIT } from "@/utils/constants";
import { withLatestGuard } from "@/utils/helpers";
import type {
  QuickSwitchDisplayBadge,
  QuickSwitchFullTextItem,
} from "@/utils/types";
import {
  isNoteID,
  type Id,
  type NoteListItem,
  type SearchQuery,
} from "@shared/schemas/note-schema";
import { MAX_SEARCH_LENGTH, MIN_SEARCH_LENGTH } from "@shared/shared-constants";

const WORD_BOUNDARY = /[\s\-_/:.|()[\]{}]/;

function normalizeText(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function filterByTitle<T extends { title: string }>(
  query: string,
  items: readonly T[],
): T[] {
  const normalizedQuery = normalizeText(query).trim();
  if (!normalizedQuery) return [...items];
  const tokens = normalizedQuery.split(/\s+/);
  const matches: T[] = [];
  for (const item of items) {
    const normalizedTitle = normalizeText(item.title);
    const titleWords = normalizedTitle.split(WORD_BOUNDARY);
    if (
      normalizedTitle.includes(normalizedQuery) ||
      tokens.every((t) => titleWords.some((w) => w.startsWith(t)))
    ) {
      matches.push(item);
    }
  }
  return matches;
}

const filterTitles = withLatestGuard(
  async (isStale, query: SearchQuery, qsState: QuickSwitchState) => {
    const nextQuery = query.trim();
    if (!nextQuery || nextQuery.length > MAX_SEARCH_LENGTH) {
      qsState.lastQuery = "";
      const defaults = (await computeDisplayNotes()) ?? [];
      if (isStale()) return;
      await setDisplay(defaults, qsState);
      return;
    }
    if (nextQuery.startsWith("?")) {
      const query = nextQuery.slice(1).trim();
      if (query.length < MIN_SEARCH_LENGTH) {
        await setDisplay([], qsState);
        return;
      }
      if (qsState.lastQuery === query) return;
      const matches = await handleSearch(query, { quickSwitchScope: true });
      if (isStale() || !matches) return;
      qsState.lastQuery = query;
      const noteIndex = noteStore.get("noteIndex");
      const mapped: QuickSwitchFullTextItem[] = matches
        .slice(0, QUICK_SWITCH_FTS_LIMIT)
        .flatMap((m) => {
          const note = noteIndex.get(m.id);
          if (!note) return [];
          return [
            {
              id: m.id,
              title: m.title,
              snippet: sanitizeSnippets({
                note,
                snippets: { [m.id]: m.snippet },
              }),
              rank: m.rank,
              section: "fulltext" as const,
            },
          ];
        });
      await setDisplay(mapped, qsState);
      return;
    }
    if (nextQuery === qsState.lastQuery) return;
    qsState.lastQuery = nextQuery;
    if (nextQuery.startsWith("#")) {
      const tagQuery = nextQuery.slice(1).trim().toLowerCase();
      const notes = noteStore.get("notes");
      const matchedTags = filterByTitle(tagQuery, getTags(notes));
      const exactMatch = matchedTags.some(
        (t) => t.title.toLowerCase() === tagQuery,
      );
      if (tagQuery.length > 0 && !exactMatch) {
        matchedTags.push({
          title: tagQuery,
          section: "tag",
          count: 0,
          isActive: false,
        });
      }
      await setDisplay(matchedTags, qsState);
      return;
    }
    if (nextQuery.startsWith("[[")) {
      const linkQuery = nextQuery
        .slice(2)
        .replace(/[\[\]]/g, "")
        .trim();
      const rawNotes = linkQuery
        ? computeTitleFilterResults(linkQuery)
        : ((await computeDisplayNotes()) ?? []);
      if (isStale()) return;
      const notesToLink = rawNotes.flatMap((n) =>
        "id" in n
          ? [{ id: n.id, title: n.title, section: "wikilink" as const }]
          : [],
      );
      const normalizedQuery = linkQuery.toLowerCase();
      const exactMatch = notesToLink.some(
        (n) => n.title.toLowerCase() === normalizedQuery,
      );
      await setDisplay(
        [
          ...notesToLink,
          ...(linkQuery && !exactMatch
            ? [{ id: null, title: linkQuery, section: "wikilink" as const }]
            : []),
        ],
        qsState,
      );
      return;
    }
    if (nextQuery.startsWith("/") || nextQuery.startsWith(">")) {
      const cmdQuery = nextQuery.slice(1).trim();
      const matchedCommands = filterByTitle(
        cmdQuery,
        getAllUsableEditorCommands(),
      );
      const matchedSettings = filterByTitle(cmdQuery, getSettingsCommands());
      await setDisplay([...matchedCommands, ...matchedSettings], qsState);
      return;
    }
    const result = computeTitleFilterResults(nextQuery);
    if (result.length === 0) {
      const defaults = (await computeDisplayNotes()) ?? [];
      if (isStale()) return;
      await setDisplay(
        [
          ...defaults,
          ...(nextQuery.length > 0
            ? [{ title: nextQuery, section: "create" as const }]
            : []),
        ],
        qsState,
      );
      return;
    }
    await setDisplay(
      [...result, { title: nextQuery, section: "create" as const }],
      qsState,
    );
  },
);

function computeTitleFilterResults(query: SearchQuery) {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return [];
  const tokens = normalizedQuery.split(/\s+/);
  const notes = noteStore.get("notes");
  const results: {
    id: Id;
    title: NoteListItem["title"];
    score: number;
    index: number;
    updatedAtMs: number;
  }[] = [];
  for (const note of notes) {
    if (!isNoteID(note.id)) continue;
    const normalized = normalizeText(note.title);
    const index = normalized.indexOf(normalizedQuery);
    if (index === -1 && !tokens.every((t) => normalized.includes(t))) continue;
    let score: number = 4;
    if (normalized === normalizedQuery) score = 0;
    else if (index === 0) score = 1;
    else if (index > 0 && WORD_BOUNDARY.test(normalized[index - 1] ?? ""))
      score = 2;
    else {
      const titleWords = normalized.split(WORD_BOUNDARY);
      if (tokens.every((t) => titleWords.some((w) => w.startsWith(t))))
        score = 3;
    }
    results.push({
      id: note.id,
      title: note.title,
      score,
      index: index === -1 ? 999 : index,
      updatedAtMs: Date.parse(note.updated_at),
    });
  }
  results.sort(
    (a, b) =>
      a.score - b.score ||
      a.index - b.index ||
      a.title.length - b.title.length ||
      b.updatedAtMs - a.updatedAtMs,
  );
  const limit = Math.min(results.length, 15);
  const noteIndex = noteStore.get("noteIndex");
  const displayNotes: QuickSwitchDisplayBadge[] = [];
  displayNotes.push(
    ...toDisplayBadges(
      results.map((r) => r.id),
      "search",
      noteIndex,
      { limit },
    ),
  );
  return displayNotes;
}

export { filterTitles };
