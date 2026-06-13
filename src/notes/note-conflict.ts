import { openSyncPath, sync } from "@/api/api";
import { settingsStore, stateStore } from "@/settings/app-state";
import { initConflictDialog } from "@/settings/dialog-init";
import { getAppItem } from "@/utils/registry";
import { DEBOUNCE_MS } from "@shared/constants";
import { titleGenerator } from "@shared/generators";
import { type SyncRequest } from "@shared/schemas/export-schema";
import type { Note } from "@shared/schemas/note-schema";
import { handleSaveNote } from "./note-actions";

const { conflictDialog } = initConflictDialog();

function isMirrorEnabled() {
  return settingsStore.get("mirror-mode") ?? false;
}

async function handleConflicDecision(
  decision: string,
  syncPayload: SyncRequest,
  note: Note,
) {
  if (decision === "open") {
    await openSyncPath(syncPayload);
  } else if (decision === "overwrite") {
    const editor = getAppItem("editor");
    const markdown = isMirrorEnabled() ? editor.getMarkdown() : undefined;
    const content = editor.getJSON();
    await handleSaveNote(note.id, content, markdown);
  }
}

async function handleConflict(note: Note, markdown: string) {
  const now = Date.now();
  const lastSynced = stateStore.get("lastSyncedAt") || 0;
  if (now - lastSynced < DEBOUNCE_MS.slow) return;
  const syncPayload: SyncRequest = {
    id: note.id,
    fileName: titleGenerator(note.content),
    content: markdown,
    extension: "md",
    updated_at: note.updated_at,
  };
  stateStore.setState({ lastSyncedAt: now });
  const result = await sync(syncPayload);
  if (!result.success || !result.data) return;
  switch (result.data.type) {
    case "MISSING_RESOLVED":
      return result.data.type;
    case "IN_SYNC":
      return result.data.type;
    case "OUT_OF_SYNC": {
      conflictDialog.returnValue = "";
      const handleConflictClose = async () => {
        await handleConflicDecision(
          conflictDialog.returnValue,
          syncPayload,
          note,
        );
      };
      conflictDialog.addEventListener("close", handleConflictClose, {
        once: true,
      });
      conflictDialog.showModal();
      return result.data.type;
    }
  }
}

export { handleConflict, isMirrorEnabled };
