import type { QuickSwitchState } from "@/components/quick-switch/quick-switch-init";
import {
  selectActive,
  updateSelection,
} from "@/components/quick-switch/quick-switch-ui";
import { NAV_KEYS } from "@/utils/constants";

async function handleListKeydown(
  event: KeyboardEvent,
  qsState: QuickSwitchState,
  switchDialog: HTMLDialogElement,
) {
  if (!switchDialog.open) return;
  if (!NAV_KEYS.has(event.key)) return;
  const isModifierPressed = event.metaKey || event.ctrlKey;
  switch (event.key) {
    case "ArrowDown":
      event.preventDefault();
      if (isModifierPressed) {
        qsState.activeIndex = qsState.currentDisplayNotes.length - 1;
        updateSelection(qsState);
      } else {
        move(1, qsState);
      }
      break;
    case "ArrowUp":
      event.preventDefault();
      if (isModifierPressed) {
        qsState.activeIndex = 0;
        updateSelection(qsState);
      } else {
        move(-1, qsState);
      }
      break;
    case "Enter":
      event.preventDefault();
      await selectActive(qsState);
      break;
  }
}

function move(delta: number, qsState: QuickSwitchState) {
  if (!qsState.currentDisplayNotes.length) return;
  let nextIndex = qsState.activeIndex + delta;
  const maxIndex = qsState.currentDisplayNotes.length - 1;
  if (nextIndex < 0) {
    nextIndex = maxIndex;
  } else if (nextIndex > maxIndex) {
    nextIndex = 0;
  }
  qsState.activeIndex = nextIndex;
  updateSelection(qsState);
}

export { handleListKeydown, move };
