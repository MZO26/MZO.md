import type { Editor } from "@tiptap/core";
import { setupZoomBar } from "../components/editorFooter";
import { setupToolbar } from "../components/editorHeader";
import { setupAutoSave, startNewSaveCycle } from "../utils/autoSave";
import { getValue, setValue, StorageKeys } from "../utils/cache";

function setupEditorHandlers(editor: Editor) {
  const currentController = startNewSaveCycle();
  const signal = currentController.signal;
  setupToolbar(editor);
  setupZoomBar();
  setupAutoSave({ editor, signal });

  return function destroyHandlers() {
    currentController.abort();
  };
}

class PositionManager {
  private savedPositions = getValue(StorageKeys.EDITOR_POS);
  private activeNoteId = getValue(StorageKeys.NOTE_ID);

  save(editor: Editor) {
    if (!this.activeNoteId || !editor) return;
    const { from, to } = editor.state.selection;
    this.savedPositions[this.activeNoteId] = from === to ? from : { from, to };
    setValue(StorageKeys.EDITOR_POS, this.savedPositions);
  }

  restore(editor: Editor, noteId: string) {
    const position = this.savedPositions[noteId];

    if (position !== undefined) {
      editor.chain().focus().setTextSelection(position).scrollIntoView().run();
    } else {
      editor.chain().focus("end").run();
    }

    this.activeNoteId = noteId;
    setValue(StorageKeys.NOTE_ID, this.activeNoteId);
  }
}
export { PositionManager, setupEditorHandlers };
