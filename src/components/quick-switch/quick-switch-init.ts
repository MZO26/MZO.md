import { truncateTitle } from "@/components/editor/editor-generators";
import { computeDisplayNotes } from "@/components/quick-switch/quick-switch-actions";
import { handleListKeydown } from "@/components/quick-switch/quick-switch-navigation";
import { filterTitles } from "@/components/quick-switch/quick-switch-search";
import {
  selectActive,
  setDisplay,
} from "@/components/quick-switch/quick-switch-ui";
import { restoreSidebarScope } from "@/components/sidebar/sidebar-views";
import { handleCreateNote, waitForFlush } from "@/notes/note-actions";
import { stateStore } from "@/state/state";
import { DEBOUNCE_MS } from "@/utils/constants";
import { createAsyncHandler, debounce, waitForPaint } from "@/utils/helpers";
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
      resetQuickSwitchState();
      switchListSearchInput.value = "";
      switchDialog.close();
      return;
    }
    resetQuickSwitchState();
    switchListSearchInput.value = "";
    const defaults = (await computeDisplayNotes()) ?? [];
    setDisplay(defaults, qsState);
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
      toggleSwitcher();
    }
  }

  function handleListClick(event: MouseEvent) {
    if (!switchDialog.open) return;
    if (!(event.target instanceof Element)) return;
    const optionEl = event.target.closest<HTMLDivElement>("[data-index]");
    if (!optionEl?.dataset["index"]) return;
    qsState.activeIndex = Number(optionEl.dataset["index"]);
    selectActive(qsState);
  }

  const debouncedTitleFilter = debounce((e: Event) => {
    if (!(e.target instanceof HTMLInputElement)) return;
    const value = (e.target.value ?? "").trim();
    filterTitles(value, qsState);
  }, DEBOUNCE_MS.very_fast);

  switchListSearchInput.addEventListener("input", debouncedTitleFilter);
  document.addEventListener("keydown", (e: KeyboardEvent) =>
    handleListKeydown(e, qsState, switchDialog),
  );
  switchListSearchInput.addEventListener(
    "keydown",
    createAsyncHandler(async (event) => {
      if (event.shiftKey && event.key === "Enter") {
        event.preventDefault();
        const value = (switchListSearchInput.value ?? "").trim();
        await handleCreateNote({
          activeTitle: truncateTitle(value),
          shouldNavigate: true,
        });
        editor.commands.focus();
        restoreSidebarScope();
      }
    }),
  );
  switchListEl.addEventListener("click", handleListClick);
  document.addEventListener("keydown", handleDocumentKeydown);
  appEvents.on(
    APP_EVENTS.TOGGLE_QUICK_SWITCH,
    async () => await toggleSwitcher(),
  );
}

export { initQuickSwitcher };
