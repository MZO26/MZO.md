import { handleSaveNote, pendingDeletions } from "@/features/note-actions";
import { cleanup } from "@/features/note-ui";
import { debounce } from "@/utils/async";
import type { Editor } from "@tiptap/core";
import { Node } from "@tiptap/pm/model";

function setupAutoSave(editor: Editor, id: string) {
  let lastSavedDoc: Node = editor.state.doc;
  let pendingSave: Promise<void> | null = null;
  const debouncedSave = debounce(async () => {
    if (!id || pendingDeletions.has(id)) return;
    if (editor.state.doc.eq(lastSavedDoc)) return;
    pendingSave = handleSaveNote(id, false);
    await pendingSave;
    lastSavedDoc = editor.state.doc;
    pendingSave = null;
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

function stopAutoSave(
  editor: Editor,
  action: "flush" | "cancel" = "flush",
): void {
  const existingCleanup = cleanup.get(editor);

  if (existingCleanup) {
    existingCleanup[action]();
    cleanup.delete(editor);
  }
}

export { setupAutoSave, stopAutoSave };
