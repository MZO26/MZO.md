import { syncRequest } from "@/api/api";
import { rendererLogger } from "@/app";
import { debouncedSaveNote, handleSaveNote } from "@/notes/note-actions";
import {
  confirmWithDialog,
  dialogMutex,
  syncDialog,
} from "@/settings/dialog-init";
import { noteStore, settingsStore, stateStore } from "@/state/state";
import { sleep } from "@/utils/async";
import { CHAR_BASELINE, YIELD_MS } from "@/utils/constants";
import { requireElement } from "@/utils/dom";
import { getAppItem } from "@/utils/registry";
import type { Id, Note } from "@shared/schemas/note-schema";

async function waitForFlush(id: Id | null) {
  if (!id || stateStore.get("activeId") !== id) return;
  const noteIndex = noteStore.get("noteIndex");
  if (!noteIndex.has(id)) {
    return;
  }
  debouncedSaveNote.cancel();
  await handleSaveNote(id, true);
  return stateStore.get("activeId") === id;
}

async function ensureNoteSaved(id: Id) {
  const savedNote = await waitForFlush(id);
  if (!savedNote) return;
  const note = noteStore.get("noteIndex").get(id);
  if (!note) return;
  return {
    created_at: note.created_at,
    fileName: note.title,
    extension: "md" as const,
    updated_at: note.updated_at,
  };
}

const syncVersions = new Map();

export function createSyncSession(id: Id) {
  if (stateStore.get("activeId") !== id) return null;
  const version = (syncVersions.get(id) ?? 0) + 1;
  syncVersions.set(id, version);
  return {
    isCurrent: () =>
      stateStore.get("activeId") === id && syncVersions.get(id) === version,
    end: () => {
      if (syncVersions.get(id) === version) {
        syncVersions.delete(id);
      }
    },
  };
}

async function syncCheckNote(note: Readonly<Note>) {
  const session = createSyncSession(note.id);
  if (!session) return;
  try {
    if (!session.isCurrent()) return;
    const targetDir = settingsStore.get("auto_export_path");
    if (!targetDir) return;
    const editor = getAppItem("editor");
    const markdown = editor.getMarkdown();
    const syncResult = await syncRequest({
      created_at: note.created_at,
      updated_at: note.updated_at,
      fileName: note.title,
      markdown,
      targetDir,
    });
    if (!session.isCurrent()) return;
    if (!syncResult.success) {
      rendererLogger.appError(
        "[triggerSyncCheck]: Failed to perform sync check:",
        syncResult.error,
      );
      return;
    }
    const status = syncResult.data.status;
    switch (status) {
      case "UNCHANGED":
        rendererLogger.devLog("Sync Check: Note is in sync");
        break;
      case "MISSING":
        rendererLogger.devLog("Sync Check: Note not found in target directory");
        break;
      case "MODIFIED": {
        rendererLogger.devLog("Sync Check: Note is out of sync");
        const titleEl = requireElement<HTMLSpanElement>(
          ".sync-dialog-title",
          syncDialog,
        );
        const confirmed = await dialogMutex.runExclusive(async () =>
          confirmWithDialog(
            syncDialog,
            titleEl,
            "File got modified. Update note?",
          ),
        );
        if (!confirmed) return;
        if (!session.isCurrent()) return;
        if (syncResult.data.markdown.length > CHAR_BASELINE) {
          await sleep(YIELD_MS);
        }
        editor.commands.setContent(syncResult.data.markdown, {
          emitUpdate: true,
          contentType: "markdown",
        });
        break;
      }
      default:
        status satisfies never;
        break;
    }
  } finally {
    session.end();
  }
}

export { ensureNoteSaved, syncCheckNote, waitForFlush };
