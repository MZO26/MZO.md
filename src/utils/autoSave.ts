import { extractNoteDataFromEditor, saveNote } from "../handlers/noteHandlers";
import type { AutoSaveConfig, CreateNotePayload } from "../shared/types";
import { getValue, StorageKeys } from "./cache";
import { debounce } from "./helpers";

let currentController: AbortController | null = null;

function setupAutoSave({ editor, signal }: AutoSaveConfig) {
  const saveNoteData = async (
    payload: CreateNotePayload,
    id: string | null,
  ) => {
    const { title, content, snippet, tags } = payload;
    await saveNote(
      {
        title: title || "New note",
        content: content || "",
        snippet,
        tags: tags || [],
      },
      id,
    );
  };
  const debouncedSave = debounce(saveNoteData, 2000);
  const handleEditorUpdate = () => {
    const { title, content, snippet, tags } = extractNoteDataFromEditor(editor);
    const noteID = getValue(StorageKeys.NOTE_ID);
    debouncedSave({ title, content, snippet, tags }, noteID);
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
