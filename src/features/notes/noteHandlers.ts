import type { Editor } from "@tiptap/core";
import { EditorState } from "@tiptap/pm/state";
import { editor, positionManager } from "../../components/editor/editor";
import { updateStats } from "../../components/editor/editorFooter";
import {
  extractNoteDataFromEditor,
  handleEditorEmptyState,
} from "../../components/editor/editorHandlers";
import { updateNoteInList } from "../../components/sidebar2/sidebarNotes";
import type { Note } from "../../shared/types";
import {
  abortCurrentSave,
  setupAutoSave,
  startNewSaveCycle,
} from "../../utils/autoSave";
import { setValue, StorageKeys } from "../../utils/cache";
import { updateNotePayload } from "../../utils/factory";
import { setActiveItem } from "../../utils/helpers";
import { showSaveIndicator } from "../../utils/savingStatus";
import { showToast } from "../../utils/toast";
import { getNoteById, updateNote } from "./noteAPI";

async function noteItemHandler(
  noteItem: HTMLDivElement,
  container: HTMLDivElement,
  editor: Editor,
) {
  const noteID = noteItem.dataset["id"];
  if (!noteID) return;
  try {
    const result = await getNoteById(noteID);
    if (!result.success) {
      showToast(result.message);
      return;
    }
    setValue(StorageKeys.NOTE_ID, noteID);
    viewNote(result.data, editor);
    updateStats(result.data.plainText);
    console.log("Viewing note with content: ", result.data.snippet);
    setActiveItem(noteItem, container);
  } catch (error) {
    console.error("(noteHandler): Failed to open note: ", error);
    return;
  }
}

async function saveNote(id: string): Promise<void> {
  const editorData = extractNoteDataFromEditor(editor);
  const payload = updateNotePayload({ id, ...editorData });
  try {
    const result = await updateNote(payload);
    if (!result.success) {
      showSaveIndicator("error");
      return;
    }
    updateNoteInList(result.data);
    setValue(StorageKeys.NOTE_ID, id);
    document.startViewTransition(() => {
      showSaveIndicator("success");
    });
  } catch (error) {
    showSaveIndicator("error");
    console.error("(noteHandler): Failed saving note: ", error);
  }
}

function viewNote(note: Note, editor: Editor): void {
  if (!editor) return;
  abortCurrentSave();
  positionManager.save(editor); // save position from old note
  handleEditorEmptyState(note.id);
  editor.commands.setContent(note.content, {
    emitUpdate: false,
  });
  const newState = EditorState.create({
    doc: editor.state.doc,
    plugins: editor.state.plugins,
    schema: editor.state.schema,
  });
  editor.view.updateState(newState);
  editor.commands.focus();
  editor.commands.unsetAllMarks();
  positionManager.restore(editor, note.id); // moves cursor and updates id
  const newController = startNewSaveCycle();
  setupAutoSave({
    editor,
    signal: newController.signal,
    noteID: note.id,
  });
}

export { noteItemHandler, saveNote, updateNote, viewNote };
