import { setSelectionMode } from "@/components/sidebar/sidebar-selection";
import {
  triggerCopyFilePath,
  triggerCopyRichText,
  triggerCopyWikilink,
  triggerDuplicate,
  triggerNoteItemMenu,
  triggerOpenAutoExportFolder,
  triggerPin,
  triggerSingleDelete,
  triggerSingleExport,
  triggerTableMenu,
} from "@/components/sidebar/sidebar-triggers";
import { debouncedSaveNote, handleSaveNote } from "@/notes/note-actions";
import { noteStore, settingsStore, stateStore } from "@/settings/app-state";
import { initDeleteDialog } from "@/settings/dialog-init";
import { getAppItem } from "@/utils/registry";
import type { NoteMenuPayload } from "@shared/types";

//-------------------------------------------------------

// helper functions for callbacks

export const { deleteDialog } = initDeleteDialog();

async function ensureNoteSaved(id: string) {
  const note = noteStore.get("notes").find((n) => n.id === id);
  const activeId = stateStore.get("activeId");
  if (!note || activeId !== note.id) return;
  const editor = getAppItem("editor");
  const autoExportPayload = {
    id: note.id,
    fileName: note.title,
    extension: "md" as const,
    updated_at: note.updated_at,
  };
  debouncedSaveNote.cancel();
  await handleSaveNote(note.id, editor.getJSON(), editor.getMarkdown());
  return autoExportPayload;
}

//----------------------------------------------------------

// electron callbacks that only get registered once at startup. Thus no need for assignment of cleanups
function initListeners() {
  window.storeAPI.onSettingsChanged((settings) => {
    settingsStore.setState(settings);
  });

  window.electronAPI.onTriggerTableAction((action) => triggerTableMenu(action));

  window.electronAPI.onTriggerNoteAction((payload: NoteMenuPayload) =>
    triggerNoteItemMenu(payload),
  );

  window.noteAPI.onTriggerExport(async (id: string, extension: string) => {
    await triggerSingleExport(id, extension);
  });

  window.noteAPI.onTriggerPath(async (id: string) => {
    const autoExportPayload = await ensureNoteSaved(id);
    if (!autoExportPayload) return;
    await triggerOpenAutoExportFolder(autoExportPayload);
  });

  window.noteAPI.onTriggerCopyPath(async (id: string) => {
    const syncPayload = await ensureNoteSaved(id);
    if (!syncPayload) return;
    await triggerCopyFilePath(syncPayload);
  });

  window.noteAPI.onTriggerCopyRichText(async (id: string) => {
    await triggerCopyRichText(id);
  });

  window.noteAPI.onTriggerDelete(async (id: string) => {
    await triggerSingleDelete(id);
  });

  window.noteAPI.onTriggerId(async (id: string) => {
    await triggerCopyWikilink(id);
  });

  window.noteAPI.onTriggerPin(async (id: string) => {
    await triggerPin(id);
  });

  window.noteAPI.onTriggerSelect((id: string) => {
    const selectionMode = stateStore.get("selectionMode");
    const selectedIds = stateStore.get("selectedIds");
    selectedIds.add(id);
    setSelectionMode(!selectionMode);
  });

  window.noteAPI.onTriggerDuplicate(async (id: string) => {
    await triggerDuplicate(id);
  });

  window.electronAPI.onThemeChanged(async (resolvedTheme) => {
    document.documentElement.dataset["theme"] = resolvedTheme;
  });

  window.electronAPI.onRequestFlush(async () => {
    debouncedSaveNote.flush();
    window.electronAPI.confirmFlush();
  });
}

export { initListeners };
