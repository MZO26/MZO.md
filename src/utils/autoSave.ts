import type { AutoSaveConfig } from "../../shared/types";
import { saveNote } from "../features/notes/noteHandlers";
import { getValue, StorageKeys } from "./cache";
import { debounce } from "./helpers";

let currentController: AbortController | null = null;

async function setupAutoSave({ editor, signal, noteID }: AutoSaveConfig) {
  let lastSavedDoc = editor.state.doc;
  // executeSave always gets the current id and calls save function with id and flush args
  const executeSave = (flush: boolean) => {
    // early return if nothing changed
    if (editor.state.doc === lastSavedDoc) return;
    const id = noteID || getValue(StorageKeys.NOTE_ID);
    if (id !== null) {
      saveNote(id, flush);
      lastSavedDoc = editor.state.doc;
    }
  };
  // wraps executeSave function in 2000ms debounce. debouncedSave now is a variable that holds the debounced function
  const debouncedSave = debounce(executeSave, 2000);
  // wrap the debouncedSave constant into a named reference so it can be identified and removed later on (by abort) to prevent memory leaks
  const handleEditorUpdate = () => {
    debouncedSave(false); // normal update
  };
  editor.on("update", handleEditorUpdate);
  signal.addEventListener("abort", () => {
    // uses named reference to remove specific listener
    editor.off("update", handleEditorUpdate);
    debouncedSave(true); // executes save immediately and flags flush args as true
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
