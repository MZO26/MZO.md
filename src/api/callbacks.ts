import {
  triggerCopyRichText,
  triggerCopySelectionHtml,
  triggerCopySelectionMarkdown,
  triggerCopySelectionRichText,
  triggerDuplicate,
  triggerNoteItemMenu,
  triggerPin,
  triggerSingleDelete,
  triggerSingleExport,
  triggerTableMenu,
} from "@/components/sidebar/sidebar-triggers";
import { debouncedSaveNote } from "@/notes/note-actions";
import { stateStore } from "@/state/state";
import { createGlobalSpinner } from "@/utils/ui";
import type { Id, NoteMenuPayload } from "@shared/schemas/note-schema";
import type { ExportContent } from "@shared/schemas/request-schema";
import type { ResolvedTheme } from "@shared/shared-types";

function initListeners() {
  window.electronAPI.onTriggerTableAction((action) => triggerTableMenu(action));

  window.electronAPI.onTriggerNoteAction((payload: NoteMenuPayload) =>
    triggerNoteItemMenu(payload),
  );

  window.noteAPI.onTriggerExport(
    async (id: Id, extension: ExportContent["extension"]) => {
      await triggerSingleExport(id, extension);
    },
  );

  window.noteAPI.onTriggerCopyRichText(async (id: Id) => {
    const loading = createGlobalSpinner();
    await loading.wrap(() => triggerCopyRichText(id));
  });

  window.noteAPI.onTriggerCopySelectionRichText(async () => {
    await triggerCopySelectionRichText();
  });

  window.noteAPI.onTriggerCopySelectionHTML(async () => {
    await triggerCopySelectionHtml();
  });

  window.noteAPI.onTriggerCopySelectionMarkdown(async () => {
    await triggerCopySelectionMarkdown();
  });

  window.noteAPI.onTriggerDelete(async (id: Id) => {
    await triggerSingleDelete(id);
  });

  window.noteAPI.onTriggerPin(async (id: Id) => {
    await triggerPin(id);
  });

  window.noteAPI.onTriggerSelect((id: Id) => {
    stateStore.setState((state) => {
      const nextSelectedIds = new Set(state.selectedIds);
      nextSelectedIds.add(id);
      return {
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
