import {
  copyMarkdownSelection,
  copyRichTextSelection,
  deleteSelection,
  exportSelection,
  pinSelection,
} from "@/components/sidebar/sidebar-selection";
import {
  triggerCopyMarkdown,
  triggerCopyRichText,
  triggerCopySelectionMarkdown,
  triggerCopySelectionRichText,
  triggerDuplicate,
  triggerExtractToNote,
  triggerPin,
  triggerSingleDelete,
  triggerSingleExport,
  triggerTableMenu,
} from "@/components/sidebar/sidebar-triggers";
import { debouncedSaveNote } from "@/notes/note-actions";
import { stateStore } from "@/state/state";
import { createGlobalSpinner } from "@/utils/ui";
import type { Id } from "@shared/schemas/note-schema";
import type { ExportContent } from "@shared/schemas/request-schema";
import type { ResolvedTheme } from "@shared/shared-types";

function initListeners() {
  window.electronAPI.onTriggerTableAction((action) => triggerTableMenu(action));

  window.noteAPI.onTriggerExport(
    async (ids: Id[], extension: ExportContent["extension"]) => {
      const [singleId] = ids;
      if (singleId && ids.length === 1) {
        await triggerSingleExport(singleId, extension);
        return;
      }
      await exportSelection(ids);
    },
  );

  window.noteAPI.onTriggerCopyRichText(async (ids: Id[]) => {
    const loading = createGlobalSpinner();
    const [singleId] = ids;
    if (singleId && ids.length === 1) {
      await loading.wrap(() => triggerCopyRichText(singleId));
      return;
    }
    await loading.wrap(() => copyRichTextSelection(ids));
  });

  window.noteAPI.onTriggerCopyMarkdown(async (ids: Id[]) => {
    const loading = createGlobalSpinner();
    const [singleId] = ids;
    if (singleId && ids.length === 1) {
      await loading.wrap(() => triggerCopyMarkdown(singleId));
      return;
    }
    await loading.wrap(() => copyMarkdownSelection(ids));
  });

  window.noteAPI.onTriggerCopySelectionRichText(async () => {
    await triggerCopySelectionRichText();
  });

  window.noteAPI.onTriggerCopySelectionMarkdown(async () => {
    await triggerCopySelectionMarkdown();
  });

  window.noteAPI.onTriggerExtractToNote(async () => {
    await triggerExtractToNote();
  });

  window.noteAPI.onTriggerDelete(async (ids: Id[]) => {
    const [singleId] = ids;
    if (singleId && ids.length === 1) {
      await triggerSingleDelete(singleId);
      return;
    }
    await deleteSelection(ids);
  });

  window.noteAPI.onTriggerPin(async (ids: Id[]) => {
    const [singleId] = ids;
    if (singleId && ids.length === 1) {
      await triggerPin(singleId);
      return;
    }
    await pinSelection(ids);
  });

  window.noteAPI.onTriggerSelect((ids: Id[]) => {
    stateStore.setState((state) => {
      if (ids.length === 0) {
        if (!state.selectionMode && state.selectedIds.size === 0) return state;
        return {
          ...state,
          selectionMode: false,
          selectedIds: new Set<Id>(),
        };
      }
      const nextSelectedIds = state.selectedIds.union(new Set(ids));
      if (
        state.selectionMode &&
        nextSelectedIds.size === state.selectedIds.size
      )
        return state;
      return {
        ...state,
        selectionMode: true,
        selectedIds: nextSelectedIds,
      };
    });
  });

  window.noteAPI.onTriggerDuplicate(async (id: Id) => {
    await triggerDuplicate(id);
  });

  window.electronAPI.onThemeChanged(
    (resolvedTheme: Readonly<ResolvedTheme>) => {
      document.documentElement.dataset["theme"] = resolvedTheme;
    },
  );

  window.electronAPI.onRequestFlush(async () => {
    debouncedSaveNote.flush();
    window.electronAPI.confirmFlush();
  });
}

export { initListeners };
