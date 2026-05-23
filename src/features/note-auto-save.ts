import {
  cleanup,
  handleSaveNote,
  pendingDeletions,
} from "@/features/note-actions";
import { debounce } from "@/utils/async";
import type { Editor } from "@tiptap/core";
import { Node } from "@tiptap/pm/model";

function setupAutoSave(editor: Editor, id: string) {
  let lastSavedDoc: Node = editor.state.doc;
  let pendingSave: Promise<void> | null = null;
  const debouncedSave = debounce(async () => {
    if (!id || pendingDeletions.has(id) || pendingSave) return;
    const docToSave = editor.state.doc;
    if (docToSave.eq(lastSavedDoc)) return;
    const savePromise = handleSaveNote(id, false);
    pendingSave = savePromise;
    try {
      await savePromise;
      lastSavedDoc = docToSave;
    } catch (err) {
      console.error("Autosave failed:", err);
    } finally {
      pendingSave = null;
    }
  }, 1000);
  const updateHandler = () => debouncedSave();
  editor.on("update", updateHandler);
  return {
    flush: async () => {
      editor.off("update", updateHandler);
      debouncedSave.flush();
      await pendingSave;
    },
    cancel: () => {
      editor.off("update", updateHandler);
      debouncedSave.cancel();
    },
  };
}

function stopAutoSave(editor: Editor, action: "flush" | "cancel" = "flush") {
  const existingCleanup = cleanup.get(editor);

  if (existingCleanup) {
    existingCleanup[action]();
    cleanup.delete(editor);
  }
}

export { setupAutoSave, stopAutoSave };
