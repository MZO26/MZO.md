import { handleEditorEmptyState } from "@/components/editor/editorEmptyState";
import { pendingDeletions } from "@/handlers/buttonHandlers";
import { saveNote } from "@/handlers/noteHandlers";
import { debounce } from "@/utils/helpers";
import type { Note } from "@shared/schemas/noteSchema";
import type { Editor } from "@tiptap/core";
import { Node } from "@tiptap/pm/model";
import { EditorState } from "@tiptap/pm/state";
import { getEditor } from "./state";

export const cleanup = new WeakMap<
  Editor,
  { flush: () => void; cancel: () => void }
>();

function resetEditorHistory(editor: Editor) {
  const newState = EditorState.create({
    doc: editor.state.doc,
    plugins: editor.state.plugins,
    schema: editor.state.schema,
  });
  editor.view.updateState(newState);
}

function viewNote(note: Note): void {
  const editor = getEditor();
  stopAutoSave(editor, "flush");
  handleEditorEmptyState(note.id);
  editor.commands.setContent(note.content, { emitUpdate: false });
  resetEditorHistory(editor);
  editor.commands.focus();
  const newCleanup = setupAutoSave(editor, note.id);
  cleanup.set(editor, newCleanup);
}

function setupAutoSave(editor: Editor, id: string) {
  let lastSavedDoc: Node = editor.state.doc;
  const debouncedSave = debounce(async () => {
    if (!id || pendingDeletions.has(id)) return;
    if (editor.state.doc.eq(lastSavedDoc)) return;
    lastSavedDoc = editor.state.doc;
    await saveNote(id, false);
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

export { setupAutoSave, stopAutoSave, viewNote };
