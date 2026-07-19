import { createInfoSpan } from "@/components/sidebar/sidebar-features";
import { handleSelectNote } from "@/notes/note-actions";
import {
  noteStore,
  restoreSidebarScope,
  stateStore,
} from "@/settings/app-state";
import { listEl, switchDialog } from "@/settings/dialog-init";
import { getAppItem } from "@/utils/registry";
import { createGlobalSpinner, initTippyDelegate } from "@/utils/ui";
import type { NoteListItem } from "@shared/schemas/note-schema";

function initQuickSwitcher() {
  initTippyDelegate(switchDialog, switchDialog);
  const editor = getAppItem("editor");
  let activeIndex = 0;
  let currentDisplayNotes: Pick<NoteListItem, "id" | "title">[] = [];
  function toggleSwitcher() {
    if (switchDialog.open) {
      switchDialog.close();
      return;
    }
    const { recentNotes, noteIndex } = noteStore.getState();
    const displayNotes: Pick<NoteListItem, "id" | "title">[] = [];
    for (const id of recentNotes) {
      const note = noteIndex.get(id);
      if (!note) continue;
      displayNotes.push({
        id: note.id,
        title: note.title,
      });
    }
    currentDisplayNotes = displayNotes;
    activeIndex = 0;
    if (editor.isFocused) {
      editor.commands.blur();
    }
    switchDialog.showModal();
    renderTitleList();
  }

  function renderTitleList() {
    listEl.replaceChildren();
    if (currentDisplayNotes.length === 0) {
      const span = createInfoSpan("No recent notes.", "quick-switch-empty");
      listEl.appendChild(span);
      return;
    }
    for (const [index, note] of currentDisplayNotes.entries()) {
      const optionEl = document.createElement("div");
      optionEl.className =
        index === activeIndex
          ? "quick-switch-item active"
          : "quick-switch-item";
      optionEl.dataset["index"] = String(index);
      const titleEl = createInfoSpan(note.title);
      optionEl.appendChild(titleEl);
      listEl.appendChild(optionEl);
    }
  }

  function updateSelection() {
    const items = Array.from(
      listEl.querySelectorAll<HTMLDivElement>(".quick-switch-item"),
    );
    for (const [index, item] of items.entries()) {
      item?.classList.toggle("active", index === activeIndex);
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
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "p") {
      event.preventDefault();
      toggleSwitcher();
    }
  }

  function handleListClick(event: MouseEvent) {
    const target = event.target as HTMLElement | null;
    if (!target) return;
    const optionEl = target.closest<HTMLDivElement>("[data-index]");
    if (!optionEl?.dataset["index"]) return;
    activeIndex = Number(optionEl.dataset["index"]);
    selectActive();
  }

  document.addEventListener("keydown", handleListKeydown);
  listEl.addEventListener("click", handleListClick);
  document.addEventListener("keydown", handleDocumentKeydown);
}

export { initQuickSwitcher };
