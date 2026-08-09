import { restoreSidebarScope } from "@/components/sidebar/sidebar-views";
import { handleSelectNote, waitForFlush } from "@/notes/note-actions";
import { listEl, switchDialog } from "@/settings/dialog-init";
import { noteStore, stateStore } from "@/state/state";
import { createInfoSpan } from "@/utils/dom";
import { getAppItem, registerAppEvents } from "@/utils/registry";
import type { QuickSwitchDisplayNote } from "@/utils/types";
import { createGlobalSpinner } from "@/utils/ui";
import type { Id, Link, NoteListItem } from "@shared/schemas/note-schema";
import { APP_EVENTS } from "@shared/shared-constants";

function initQuickSwitcher() {
  const editor = getAppItem("editor");
  let activeIndex = 0;
  let currentDisplayNotes: QuickSwitchDisplayNote[] = [];
  async function toggleSwitcher() {
    if (switchDialog.open) {
      switchDialog.close();
      return;
    }
    const displayNotes = await getDisplayNotes();
    currentDisplayNotes = displayNotes;
    activeIndex = 0;
    if (editor.isFocused) {
      editor.commands.blur();
    }
    switchDialog.showModal();
    renderTitleList();
  }

  async function getDisplayNotes() {
    const activeId = stateStore.get("activeId") as Id;
    await waitForFlush(activeId);
    const { recentNotes, noteIndex } = noteStore.getState();
    const activeNote = activeId ? noteIndex.get(activeId) : undefined;
    // recent ids are already computed
    const recentIds = new Set(recentNotes);
    // backlinks and outgoing ones do need to be
    // recomputed and manually put together
    const backlinkIds = new Set<Id>();
    const outgoingIds = new Set<Id>();
    const displayNotes: QuickSwitchDisplayNote[] = [];
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
    const count = currentDisplayNotes.reduce(
      (acc, note) => {
        acc[note.section] = (acc[note.section] ?? 0) + 1;
        return acc;
      },
      {} as Record<QuickSwitchDisplayNote["section"], number>,
    );
    return count;
  }

  function renderTitleList() {
    listEl.replaceChildren();
    if (currentDisplayNotes.length === 0) {
      const span = createInfoSpan("No notes to display.", "quick-switch-empty");
      listEl.appendChild(span);
      return;
    }
    let lastSection: string | null = null;
    const count = getSectionCount();
    for (const [index, note] of currentDisplayNotes.entries()) {
      if (note.section !== lastSection) {
        const header = document.createElement("div");
        header.className = "quick-switch-section-header";
        header.textContent = getSectionLabel(note.section, count);
        listEl.appendChild(header);
        lastSection = note.section;
      }
      const optionEl = document.createElement("div");
      optionEl.className =
        index === activeIndex
          ? "quick-switch-item active"
          : "quick-switch-item";
      optionEl.dataset["index"] = String(index);
      const titleEl = createInfoSpan(note.title);
      optionEl.appendChild(titleEl);
      optionEl.title = note.title;
      listEl.appendChild(optionEl);
    }
  }

  function updateSelection() {
    const items = [
      ...listEl.querySelectorAll<HTMLDivElement>(".quick-switch-item"),
    ];
    for (const [index, item] of items.entries()) {
      const isActive = index === activeIndex;
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
      default:
        section satisfies never;
        return "";
    }
  }

  function move(delta: number) {
    if (!currentDisplayNotes.length) return;
    let nextIndex = activeIndex + delta;
    const maxIndex = currentDisplayNotes.length - 1;
    if (nextIndex < 0) {
      nextIndex = maxIndex;
    } else if (nextIndex > maxIndex) {
      nextIndex = 0;
    }
    activeIndex = nextIndex;
    updateSelection();
  }

  async function selectActive() {
    const activeNote = currentDisplayNotes[activeIndex];
    switchDialog.close();
    if (!activeNote || stateStore.get("activeId") === activeNote.id) {
      return;
    }
    const loading = createGlobalSpinner();
    await loading.wrap(async () => {
      await handleSelectNote(activeNote.id);
    });
    restoreSidebarScope();
  }

  async function handleListKeydown(event: KeyboardEvent) {
    if (!switchDialog.open) return;
    const isModifierPressed = event.metaKey || event.ctrlKey;
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (isModifierPressed) {
          activeIndex = currentDisplayNotes.length - 1;
          updateSelection();
        } else {
          move(1);
        }
        break;
      case "ArrowUp":
        event.preventDefault();
        if (isModifierPressed) {
          activeIndex = 0;
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
    activeIndex = Number(optionEl.dataset["index"]);
    selectActive();
  }

  document.addEventListener("keydown", handleListKeydown);
  listEl.addEventListener("click", handleListClick);
  document.addEventListener("keydown", handleDocumentKeydown);
  registerAppEvents(document, {
    // [] for computed keys to be evaluated correctly
    [APP_EVENTS.TOGGLE_QUICK_SWITCH]: toggleSwitcher,
  });
}

export { initQuickSwitcher };
