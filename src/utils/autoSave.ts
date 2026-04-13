import { extractNoteDataFromEditor } from "../components/editor/editorHandlers";
import { saveNote } from "../features/notes/noteHandlers";
import type { AutoSaveConfig } from "../shared/types";
import { getValue, StorageKeys } from "./cache";
import { updateNotePayload } from "./factory";
import { debounce } from "./helpers";

let currentController: AbortController | null = null;

async function setupAutoSave({ editor, signal, noteID }: AutoSaveConfig) {
  const debouncedSave = debounce(saveNote, 2000);
  const handleEditorUpdate = () => {
    const editorData = extractNoteDataFromEditor(editor);
    const id = noteID || getValue(StorageKeys.NOTE_ID);
    if (id === null) return;
    const payload = updateNotePayload({ ...editorData, id });
    debouncedSave(payload);
  };
  editor.on("update", handleEditorUpdate);
  signal.addEventListener("abort", () => {
    editor.off("update", handleEditorUpdate);
    debouncedSave.flush();
  });
}

function abortCurrentSave() {
  if (currentController) {
    currentController.abort();
    currentController = null;
  }
}

function startNewSaveCycle(): AbortController {
  currentController = new AbortController();
  return currentController;
}

export { abortCurrentSave, setupAutoSave, startNewSaveCycle };
