import { rendererLogger } from "@/app";
import { handleSelectNote } from "@/notes/note-actions";
import { noteStore, stateStore } from "@/state/state";
import { getAppItem } from "@/utils/registry";
import { type Id } from "@shared/schemas/note-schema";
import { triggerSingleDelete } from "./sidebar-triggers";

async function navigateSidebar(e: KeyboardEvent) {
  const visibleIds = noteStore.get("visibleIds");
  if (!visibleIds || visibleIds.length === 0) return;
  const isModifierPressed = e.metaKey || e.ctrlKey;
  const { activeId, hoverId } = stateStore.getState();
  let activeIndex = hoverId ? visibleIds.indexOf(hoverId) : -1;
  if (activeIndex === -1) {
    activeIndex = activeId ? visibleIds.indexOf(activeId) : -1;
  }
  rendererLogger.devLog(activeIndex);
  switch (e.key) {
    case "ArrowDown":
      e.preventDefault();
      activeIndex = isModifierPressed
        ? visibleIds.length - 1
        : move(1, activeIndex, visibleIds);
      break;
    case "ArrowUp":
      e.preventDefault();
      activeIndex = isModifierPressed ? 0 : move(-1, activeIndex, visibleIds);
      break;
    case "Enter":
      if (isModifierPressed) return;
      e.preventDefault();
      const activeNote = visibleIds[activeIndex];
      if (!activeNote || activeId === activeNote) return;
      await handleSelectNote(activeNote);
      return;
    case "Backspace":
    case "Delete":
      e.preventDefault();
      const targetId = visibleIds[activeIndex];
      if (!targetId) return;
      await triggerSingleDelete(targetId);
      return;
  }
  const newHoverId = visibleIds[activeIndex];
  if (newHoverId) stateStore.setState({ hoverId: newHoverId });
}

function updateHover(activeId: Id | null) {
  const sidebar = getAppItem("sidebar");
  const items = [...sidebar.querySelectorAll<HTMLDivElement>(".note-item")];
  for (const item of items) {
    const isHovered = item.dataset["id"] === activeId;
    item.classList.toggle("is-hovered", isHovered);
    if (isHovered) {
      item.scrollIntoView({
        block: "nearest",
        behavior: "auto",
      });
    }
  }
}

function move(delta: number, currentIndex: number, visibleIds: readonly Id[]) {
  if (visibleIds.length === 0) return currentIndex;
  // delta is +1 by ArrowDown or -1 by ArrowUp
  let nextIndex = currentIndex + delta;
  const maxIndex = visibleIds.length - 1;
  if (nextIndex < 0) {
    // jump to bottom if arrow up at the very top
    nextIndex = maxIndex;
  } else if (nextIndex > maxIndex) {
    // jump to top if arrow down on the very bottom
    nextIndex = 0;
  }
  return nextIndex;
}

export { move, navigateSidebar, updateHover };
