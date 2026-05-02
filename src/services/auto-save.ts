import { handleSaveNote, pendingDeletions } from "@/features/note-actions";
import { cleanup } from "@/features/note-ui";
import { debounce } from "@/utils/helpers";
import type { Editor } from "@tiptap/core";
import { Node } from "@tiptap/pm/model";

function setupAutoSave(editor: Editor, id: string) {
  let lastSavedDoc: Node = editor.state.doc;
  const debouncedSave = debounce(async () => {
    if (!id || pendingDeletions.has(id)) return;
    if (editor.state.doc.eq(lastSavedDoc)) return;
    lastSavedDoc = editor.state.doc;
    await handleSaveNote(id, false);
  }, 2000);
  const updateHandler = () => debouncedSave();
  editor.on("update", updateHandler);
  return {
    flush: () => {
      editor.off("update", updateHandler);
      if (debouncedSave.flush) debouncedSave.flush();
    },
    cancel: () => {
      editor.off("update", updateHandler);
      if (debouncedSave.cancel) debouncedSave.cancel();
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
