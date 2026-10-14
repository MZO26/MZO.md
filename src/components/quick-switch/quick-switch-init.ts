import { rendererLogger } from "@/app";
import { getSimilarityMatching } from "@/components/quick-switch/quick-switch-similarity";
import { restoreSidebarScope } from "@/components/sidebar/sidebar-views";
import {
  handleCreateNote,
  handleSelectNote,
  waitForFlush,
} from "@/notes/note-actions";
import { noteStore, stateStore } from "@/state/state";
import { DEBOUNCE_MS, NAV_KEYS } from "@/utils/constants";
import { createInfoSpan } from "@/utils/dom";
import { debounce, waitForPaint } from "@/utils/helpers";
import { normalizeText } from "@/utils/note-helpers";
import { registerAppEvents, useDialog } from "@/utils/registry";
import type { QuickSwitchDisplayNote } from "@/utils/types";
import { createGlobalSpinner } from "@/utils/ui";
import {
  isNoteID,
  type Id,
  type Link,
  type NoteListItem,
  type SearchQuery,
} from "@shared/schemas/note-schema";
import { APP_EVENTS, MAX_SEARCH_LENGTH } from "@shared/shared-constants";
import type { Editor } from "@tiptap/core";

const WORD_BOUNDARY = /[\s\-_/:.|()[\]{}]/;

type QuickSwitchState = {
  activeIndex: number;
  currentDisplayNotes: readonly QuickSwitchDisplayNote[];
  lastQuery: SearchQuery;
  currentQueryId: number;
};

function initQuickSwitcher(editor: Editor) {
  const qsState: QuickSwitchState = {
    activeIndex: 0,
    currentDisplayNotes: [],
    lastQuery: "",
    currentQueryId: 0,
  };
  const { switchDialog, switchListEl, switchListSearchInput } = useDialog(
    "switchDialog",
    "switchListEl",
    "switchListSearchInput",
  );

  async function setDisplayNotes(notes: readonly QuickSwitchDisplayNote[]) {
    qsState.currentDisplayNotes = [...notes];
    qsState.activeIndex = 0;
    renderTitleList();
  }

  function resetQuickSwitchState() {
    qsState.activeIndex = 0;
    qsState.currentDisplayNotes = [];
    qsState.lastQuery = "";
    qsState.currentQueryId = 0;
  }

  async function toggleSwitcher() {
    const { activeId, isDirty } = stateStore.getState();
    if (activeId && isDirty) await waitForFlush(activeId);
    if (switchDialog.open) {
      switchListSearchInput.value = "";
      resetQuickSwitchState();
      switchDialog.close();
      return;
    }
    resetQuickSwitchState();
    switchListSearchInput.value = "";
    const defaults = (await computeDisplayNotes()) ?? [];
    setDisplayNotes(defaults);
    if (editor.isFocused) editor.commands.blur();
    switchDialog.showModal();
    // wait for visibility transition to focus correctly
    await waitForPaint(3);
    switchListSearchInput.focus();
  }

  async function filterTitles(query: SearchQuery) {
    const nextQuery = query.trim();
    const queryId = ++qsState.currentQueryId;
    if (!nextQuery || nextQuery.length > MAX_SEARCH_LENGTH) {
      qsState.lastQuery = "";
      const defaults = (await computeDisplayNotes()) ?? [];
      if (queryId !== qsState.currentQueryId) return;
      await setDisplayNotes(defaults);
      return;
    }
    if (nextQuery === qsState.lastQuery) return;
    qsState.lastQuery = nextQuery;
    const result = computeTitleFilterResults(nextQuery);
    if (result.length === 0) {
      const defaults = (await computeDisplayNotes()) ?? [];
      if (queryId !== qsState.currentQueryId) return;
      await setDisplayNotes([
        ...defaults,
        ...(nextQuery.length > 0
          ? [{ title: nextQuery, section: "create" as const }]
          : []),
      ]);
      return;
    }
    await setDisplayNotes([...result, { title: nextQuery, section: "create" }]);
  }

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
      if (index === -1 && !tokens.every((t) => normalized.includes(t)))
        continue;
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
    const displayNotes: QuickSwitchDisplayNote[] = [];
    for (let i = 0; i < limit; i++) {
      const r = results[i];
      if (!r) continue;
      displayNotes.push({
        id: r.id,
        title: r.title,
        section: "search",
      });
    }
    return displayNotes;
  }

  async function computeDisplayNotes() {
    const activeId = stateStore.get("activeId") as Id | null;
    const displayNotes: QuickSwitchDisplayNote[] = [];
    const { recentNotes, noteIndex } = noteStore.getState();
    const activeNote = activeId ? noteIndex.get(activeId) : undefined;
    const recentIds = new Set(recentNotes);
    const backlinkIds = new Set<Id>();
    const outgoingIds = new Set<Id>();
    for (const id of recentNotes) {
      const note = noteIndex.get(id);
      if (!note || !recentIds.has(id)) continue;
      displayNotes.push({
        id: note.id,
        title: note.title,
        section: "recent",
      });
    }
    if (activeNote) {
      const { backlinks, outgoingLinks } = computeActiveNoteLinks(activeNote);
      const relatedNotes = await getSimilarityMatching(activeNote.id);
      rendererLogger.devLog(relatedNotes);
      for (const link of backlinks) {
        const linkedNote = noteIndex.get(link.id);
        if (!linkedNote || backlinkIds.has(linkedNote.id)) continue;
        backlinkIds.add(linkedNote.id);
        displayNotes.push({
          id: linkedNote.id,
          title: linkedNote.title,
          section: "backlink",
        });
      }
      for (const link of outgoingLinks) {
        const linkedNote = noteIndex.get(link.id);
        if (!linkedNote || outgoingIds.has(link.id)) continue;
        outgoingIds.add(link.id);
        displayNotes.push({
          id: linkedNote.id,
          title: linkedNote.title,
          section: "outgoing",
        });
      }
      for (const note of relatedNotes) {
        if (relatedNotes.length === 0) return;
        if (!noteIndex.has(note.id)) continue;
        displayNotes.push({
          id: note.id,
          title: note.title,
          section: "related",
        });
      }
    }
    return displayNotes;
  }

  function computeActiveNoteLinks(activeNote: NoteListItem) {
    const backlinks: Link[] = [];
    const outgoingLinks: Link[] = [];
    for (const link of activeNote.links) {
      if (link.id === activeNote.id) continue;
      if (link.dir === "in") {
        backlinks.push(link);
      } else if (link.dir === "out") {
        outgoingLinks.push(link);
      }
    }
    return { backlinks, outgoingLinks };
  }

  function getSectionCount() {
    const count = qsState.currentDisplayNotes.reduce(
      (acc, note) => {
        acc[note.section] = (acc[note.section] ?? 0) + 1;
        return acc;
      },
      {} as Record<QuickSwitchDisplayNote["section"], number>,
    );
    return count;
  }

  function renderTitleList() {
    switchListEl.replaceChildren();
    if (qsState.currentDisplayNotes.length === 0) {
      const span = createInfoSpan("No notes to display.", "quick-switch-empty");
      switchListEl.appendChild(span);
      return;
    }
    let lastSection: QuickSwitchDisplayNote["section"] | null = null;
    const count = getSectionCount();
    for (const [index, note] of qsState.currentDisplayNotes.entries()) {
      if (note.section !== lastSection) {
        const header = document.createElement("div");
        header.className = "quick-switch-section-header";
        header.textContent = getSectionLabel(note.section, count);
        switchListEl.appendChild(header);
        lastSection = note.section;
      }
      const optionEl = document.createElement("div");
      optionEl.className =
        index === qsState.activeIndex
          ? "quick-switch-item active"
          : "quick-switch-item";
      optionEl.dataset["index"] = String(index);
      const titleEl = createInfoSpan(note.title);
      optionEl.appendChild(titleEl);
      optionEl.title = note.title;
      switchListEl.appendChild(optionEl);
    }
  }

  function updateSelection() {
    const items = [
      ...switchListEl.querySelectorAll<HTMLDivElement>(".quick-switch-item"),
    ];
    for (const [index, item] of items.entries()) {
      const isActive = index === qsState.activeIndex;
      item.classList.toggle("active", isActive);
      if (isActive) {
        item.scrollIntoView({
          block: "nearest",
          behavior: "auto",
        });
      }
    }
  }

  function getSectionLabel(
    section: QuickSwitchDisplayNote["section"],
    count: Record<QuickSwitchDisplayNote["section"], number>,
  ) {
    switch (section) {
      case "recent":
        return `Recent (${count.recent})`;
      case "backlink":
        return `Backlinks (${count.backlink})`;
      case "outgoing":
        return `Links (${count.outgoing})`;
      case "related":
        return `Related (${count.related})`;
      case "search":
        return `Matching (${count.search})`;
      case "create":
        return `Create new note`;
      default:
        section satisfies never;
        return "";
    }
  }

  function move(delta: number) {
    if (!qsState.currentDisplayNotes.length) return;
    let nextIndex = qsState.activeIndex + delta;
    const maxIndex = qsState.currentDisplayNotes.length - 1;
    if (nextIndex < 0) {
      nextIndex = maxIndex;
    } else if (nextIndex > maxIndex) {
      nextIndex = 0;
    }
    qsState.activeIndex = nextIndex;
    updateSelection();
  }

  async function selectActive() {
    const activeNote = qsState.currentDisplayNotes[qsState.activeIndex];
    switchDialog.close();
    if (!activeNote) return;
    if (activeNote.section === "create") {
      await handleCreateNote({
        activeTitle: activeNote.title,
        shouldNavigate: true,
      });
      restoreSidebarScope();
      return;
    }
    if (stateStore.get("activeId") === activeNote.id) return;
    const loading = createGlobalSpinner();
    await loading.wrap(() => handleSelectNote(activeNote.id));
    restoreSidebarScope();
  }

  async function handleListKeydown(event: KeyboardEvent) {
    if (!switchDialog.open) return;
    if (!NAV_KEYS.has(event.key)) return;
    const isModifierPressed = event.metaKey || event.ctrlKey;
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (isModifierPressed) {
          qsState.activeIndex = qsState.currentDisplayNotes.length - 1;
          updateSelection();
        } else {
          move(1);
        }
        break;
      case "ArrowUp":
        event.preventDefault();
        if (isModifierPressed) {
          qsState.activeIndex = 0;
          updateSelection();
        } else {
          move(-1);
        }
        break;
      case "Enter":
        event.preventDefault();
        await selectActive();
        break;
    }
  }

  function handleDocumentKeydown(event: KeyboardEvent) {
    if (!event.ctrlKey && !event.metaKey) return;
    if (event.key === "p" || event.key === "P") {
      event.preventDefault();
      toggleSwitcher();
    }
  }

  function handleListClick(event: MouseEvent) {
    if (!switchDialog.open) return;
    if (!(event.target instanceof Element)) return;
    const optionEl = event.target.closest<HTMLDivElement>("[data-index]");
    if (!optionEl?.dataset["index"]) return;
    qsState.activeIndex = Number(optionEl.dataset["index"]);
    selectActive();
  }

  const debouncedTitleFilter = debounce((e: Event) => {
    if (!(e.target instanceof HTMLInputElement)) return;
    const value = (e.target.value ?? "").trim();
    filterTitles(value);
  }, DEBOUNCE_MS.very_fast);

  switchListSearchInput.addEventListener("input", debouncedTitleFilter);
  document.addEventListener("keydown", handleListKeydown);
  switchListEl.addEventListener("click", handleListClick);
  document.addEventListener("keydown", handleDocumentKeydown);
  registerAppEvents(document, {
    // [] for computed keys to be evaluated correctly
    [APP_EVENTS.TOGGLE_QUICK_SWITCH]: toggleSwitcher,
  });
}

export { initQuickSwitcher };
