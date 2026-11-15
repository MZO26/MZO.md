import { computeDisplayNotes, setDisplay } from "@/components/quick-switch/quick-switch-actions";
import { handleListKeydown } from "@/components/quick-switch/quick-switch-navigation";
import { filterTitles } from "@/components/quick-switch/quick-switch-search";
import { selectActive, setShortcuts } from "@/components/quick-switch/quick-switch-ui";
import { waitForFlush } from "@/notes/note-actions";
import { stateStore } from "@/state/state";
import { DEBOUNCE_MS } from "@/utils/constants";
import { createAsyncHandler, debounce, rendererLogger, waitForPaint } from "@/utils/helpers";
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
  function createInitialQuickSwitchState(): QuickSwitchState {
    return {
      activeIndex: 0,
      currentDisplayNotes: [],
      lastQuery: "",
    };
  }

  function resetQuickSwitchState() {
    Object.assign(qsState, createInitialQuickSwitchState());
  }

  const qsState: QuickSwitchState = createInitialQuickSwitchState();

  const { switchDialog, switchListEl, switchListSearchInput } = useDialog(
    "switchDialog",
    "switchListEl",
    "switchListSearchInput",
  );

  setShortcuts(switchDialog);

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
    const defaults = await computeDisplayNotes();
    setDisplay(defaults, qsState);
    if (editor.isFocused) editor.commands.blur();
    switchDialog.showModal();
    // wait for visibility transition to focus correctly
    await waitForPaint(3);
    switchListSearchInput.focus();
  }

  const unsubAppEvents = appEvents.on(
    APP_EVENTS.TOGGLE_QUICK_SWITCH,
    () => void toggleSwitcher().catch(rendererLogger.appError),
  );

  const documentKeydownHandler = (event: KeyboardEvent) => {
    const isEscape = switchDialog.open && event.key === "Escape";
    const isCtrlP = (event.ctrlKey || event.metaKey) && (event.key === "p" || event.key === "P");
    if (isEscape || isCtrlP) {
      event.preventDefault();
      void toggleSwitcher().catch(rendererLogger.appError);
    }
  };

  const listClickHandler = (event: MouseEvent) => {
    if (!switchDialog.open) return;
    if (!(event.target instanceof Element)) return;
    const optionEl = event.target.closest<HTMLDivElement>("[data-index]");
    if (!optionEl?.dataset["index"]) return;
    qsState.activeIndex = Number(optionEl.dataset["index"]);
    void selectActive(qsState, event).catch(rendererLogger.appError);
  };

  const listKeydownHandler = createAsyncHandler(async (e: KeyboardEvent) =>
    handleListKeydown(e, qsState, switchDialog),
  );

  const debouncedTitleFilter = debounce((e: Event) => {
    if (!(e.target instanceof HTMLInputElement)) return;
    const value = (e.target.value ?? "").trim();
    if (value.slice(1).trim() === "?") return;
    void filterTitles(value, qsState).catch(rendererLogger.devLog);
  }, DEBOUNCE_MS.very_fast);

  switchListSearchInput.addEventListener("input", debouncedTitleFilter);
  document.addEventListener("keydown", listKeydownHandler);
  switchListEl.addEventListener("click", listClickHandler);
  document.addEventListener("keydown", documentKeydownHandler);

  return function unsubscribe() {
    unsubAppEvents();
    switchListSearchInput.removeEventListener("input", debouncedTitleFilter);
    switchListEl.removeEventListener("click", listClickHandler);
    document.removeEventListener("keydown", listKeydownHandler);
    document.removeEventListener("keydown", documentKeydownHandler);
  };
}

export { initQuickSwitcher };
