import { showNotification } from "@/api/api";
import { rendererLogger } from "@/app";
import {
  triggerCopyFilePath,
  triggerCopyRichText,
  triggerCopySelectionHtml,
  triggerCopySelectionMarkdown,
  triggerCopySelectionRichText,
  triggerDuplicate,
  triggerMetadataSuggestion,
  triggerNoteItemMenu,
  triggerOpenAutoExportFolder,
  triggerOpenInDefaultEditor,
  triggerPin,
  triggerSingleDelete,
  triggerSingleExport,
  triggerSyncCheck,
  triggerTableMenu,
} from "@/components/sidebar/sidebar-triggers";
import {
  debouncedSaveNote,
  ensureNoteSaved,
  handleImportNote,
  waitForFlush,
} from "@/notes/note-actions";
import { confirmWithDialog, syncDialog } from "@/settings/dialog-init";
import { noteStore, stateStore } from "@/state/state";
import { requireElement } from "@/utils/dom";
import { addActiveLinkToDoc, addActiveTagToDoc } from "@/utils/note";
import { getAppItem } from "@/utils/registry";
import { createGlobalSpinner } from "@/utils/ui";
import type { Id, NoteMenuPayload } from "@shared/schemas/note-schema";
import type { ExportContent } from "@shared/schemas/request-schema";

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

  window.noteAPI.onTriggerPath(async (id: Id) => {
    const autoExportPayload = await ensureNoteSaved(id);
    if (!autoExportPayload) return;
    await triggerOpenAutoExportFolder(autoExportPayload);
  });

  window.noteAPI.onTriggerDefaultEditor(async (id: Id) => {
    const autoExportPayload = await ensureNoteSaved(id);
    if (!autoExportPayload) return;
    await triggerOpenInDefaultEditor(autoExportPayload);
  });

  window.noteAPI.onTriggerCopyPath(async (id: Id) => {
    const syncPayload = await ensureNoteSaved(id);
    if (!syncPayload) return;
    await triggerCopyFilePath(syncPayload);
  });

  window.noteAPI.onTriggerCopyRichText(async (id: Id) => {
    const loading = createGlobalSpinner();
    await loading.wrap(async () => {
      await triggerCopyRichText(id);
    });
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

  window.noteAPI.onTriggerMetadataSuggestion(async (id: Id) => {
    const loading = createGlobalSpinner(100);
    await loading.wrap(async () => {
      const result = await triggerMetadataSuggestion(id);
      if (!result?.note || !result.links || !result.tags) {
        rendererLogger.devLog(
          `note: ${result?.note}, links: ${result?.links}, tags: ${result?.tags}`,
        );
        await showNotification("No metadata to add", "");
        return;
      }
      if (
        !Array.isArray(result.tags) ||
        !Array.isArray(result.links) ||
        (result.links.length === 0 && result.tags.length === 0)
      ) {
        await showNotification("No metadata to add", "");
        return;
      }
      const current = noteStore.get("noteIndex").get(id);
      if (!current) return;
      const filteredTags = result.tags.filter((t) => !current.tags.includes(t));
      let content = result.note.content;
      const tagslotsLeft = 5 - current.tags.length;
      let addedLinks = 0;
      let addedTags = 0;
      if (result.tags.length > 0 && tagslotsLeft > 0) {
        for (const tag of filteredTags) {
          if (addedTags >= tagslotsLeft) break;
          content = addActiveTagToDoc(content, tag);
          addedTags++;
        }
      }
      if (result.links.length > 0) {
        for (const link of result.links) {
          content = addActiveLinkToDoc(content, link.id);
          addedLinks++;
        }
      }
      getAppItem("editor").commands.setContent(content, {
        contentType: "json",
      });
      await waitForFlush(id);
      addedTags + addedLinks > 0
        ? await showNotification(
            `Added ${addedTags} tags / ${addedLinks} Links.`,
            "",
          )
        : await showNotification("No metadata available to add", "");
    });
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

  window.noteAPI.onTriggerSync(async (id: Id) => {
    const loading = createGlobalSpinner();
    await loading.wrap(async () => {
      await triggerSyncCheck(id);
    });
  });

  window.electronAPI.onThemeChanged(async (resolvedTheme) => {
    document.documentElement.dataset["theme"] = resolvedTheme;
  });

  window.noteAPI.onDirSync(async (dirResult) => {
    const titleEl = requireElement<HTMLSpanElement>(
      ".sync-dialog-title",
      syncDialog,
    );
    const confirmed = await confirmWithDialog(
      syncDialog,
      titleEl,
      "External changes detected",
    );
    if (!confirmed) return;
    const loading = createGlobalSpinner(500);
    await loading.wrap(async () => {
      await handleImportNote({ source: "external", filePaths: dirResult });
    });
  });

  window.electronAPI.onRequestFlush(async () => {
    debouncedSaveNote.flush();
    window.electronAPI.confirmFlush();
  });
}

export { initListeners };
