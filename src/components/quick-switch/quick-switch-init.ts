import { computeDisplayNotes } from "@/components/quick-switch/quick-switch-actions";
import { handleListKeydown } from "@/components/quick-switch/quick-switch-navigation";
import { filterTitles } from "@/components/quick-switch/quick-switch-search";
import {
  selectActive,
  setDisplay,
  setShortcuts,
} from "@/components/quick-switch/quick-switch-ui";
import { waitForFlush } from "@/notes/note-actions";
import { stateStore } from "@/state/state";
import { DEBOUNCE_MS } from "@/utils/constants";
import { debounce, rendererLogger, waitForPaint } from "@/utils/helpers";
import { useDialog } from "@/utils/registry";
import type { QuickSwitchDisplayBadge } from "@/utils/types";
import { appEvents } from "@shared/event-emitter";
import { type SearchQuery } from "@shared/schemas/note-schema";
import { APP_EVENTS } from "@shared/shared-constants";
import type { Editor } from "@tiptap/core";

export type QuickSwitchState = {
  activeIndex: number;
  currentDisplayNotes: readonly QuickSwitchDisplayBadge[];
  lastQuery: SearchQuery;
};

function initQuickSwitcher(editor: Editor) {
  const qsState: QuickSwitchState = {
    activeIndex: 0,
    currentDisplayNotes: [],
    lastQuery: "",
  };
  const { switchDialog, switchListEl, switchListSearchInput } = useDialog(
    "switchDialog",
    "switchListEl",
    "switchListSearchInput",
  );

  setShortcuts(switchDialog);

  function resetQuickSwitchState() {
    qsState.activeIndex = 0;
    qsState.currentDisplayNotes = [];
    qsState.lastQuery = "";
  }

  async function toggleSwitcher() {
    const { activeId, isDirty } = stateStore.getState();
    if (activeId && isDirty) await waitForFlush(activeId);
    if (switchDialog.open) {
      filterTitles.invalidate();
      resetQuickSwitchState();
      switchListSearchInput.value = "";
      switchDialog.close();
      return;
    }
    resetQuickSwitchState();
    switchListSearchInput.value = "";
    const defaults = (await computeDisplayNotes()) ?? [];
    await setDisplay(defaults, qsState);
    if (editor.isFocused) editor.commands.blur();
    switchDialog.showModal();
    // wait for visibility transition to focus correctly
    await waitForPaint(3);
    switchListSearchInput.focus();
  }

  function handleDocumentKeydown(event: KeyboardEvent) {
    const isEscape = switchDialog.open && event.key === "Escape";
    const isCtrlP =
      (event.ctrlKey || event.metaKey) &&
      (event.key === "p" || event.key === "P");
    if (isEscape || isCtrlP) {
      event.preventDefault();
      void toggleSwitcher().catch(rendererLogger.appError);
    }
  }

  function handleListClick(event: MouseEvent) {
    if (!switchDialog.open) return;
    if (!(event.target instanceof Element)) return;
    const optionEl = event.target.closest<HTMLDivElement>("[data-index]");
    if (!optionEl?.dataset["index"]) return;
    qsState.activeIndex = Number(optionEl.dataset["index"]);
    void selectActive(qsState, event).catch(rendererLogger.appError);
  }

  const debouncedTitleFilter = debounce((e: Event) => {
    if (!(e.target instanceof HTMLInputElement)) return;
    const value = (e.target.value ?? "").trim();
    if (value.slice(1).trim() === "?") return;
    void filterTitles(value, qsState).catch(rendererLogger.devLog);
  }, DEBOUNCE_MS.very_fast);

  const onListKeydown = (e: KeyboardEvent) =>
    handleListKeydown(e, qsState, switchDialog);

  switchListSearchInput.addEventListener("input", debouncedTitleFilter);

  document.addEventListener("keydown", onListKeydown);
  switchListEl.addEventListener("click", handleListClick);
  document.addEventListener("keydown", handleDocumentKeydown);
  const unsubAppEvents = appEvents.on(
    APP_EVENTS.TOGGLE_QUICK_SWITCH,
    async () => await toggleSwitcher(),
  );
  return function unsubscribe() {
    unsubAppEvents();
    switchListSearchInput.removeEventListener("input", debouncedTitleFilter);
    switchListEl.removeEventListener("click", handleListClick);
    document.removeEventListener("keydown", onListKeydown);
    document.removeEventListener("keydown", handleDocumentKeydown);
  };
}

export { initQuickSwitcher };
