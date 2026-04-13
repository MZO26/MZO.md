import type { Editor, JSONContent } from "@tiptap/core";
import { EditorState } from "@tiptap/pm/state";
import { positionManager } from "../../components/editor/editor";
import { updateStats } from "../../components/editor/editorFooter";
import { handleEditorEmptyState } from "../../components/editor/editorHandlers";
import { updateNoteInList } from "../../components/sidebar2/sidebarNotes";
import type { Note, UpdateNotePayload } from "../../shared/types";
import {
  abortCurrentSave,
  setupAutoSave,
  startNewSaveCycle,
} from "../../utils/autoSave";
import { getValue, setValue, StorageKeys } from "../../utils/cache";
import { setActiveItem } from "../../utils/helpers";
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

async function saveNote(note: UpdateNotePayload): Promise<void> {
  const currentId =
    note.id !== undefined ? note.id : getValue(StorageKeys.NOTE_ID);
  if (currentId === null) return;
  try {
    const result = await updateNote(note);
    if (!result.success) {
      showToast(result.message);
      return;
    }
    updateNoteInList(result.data);
    setValue(StorageKeys.NOTE_ID, note.id);
    console.log("saved!");
  } catch (error) {
    console.error(`Error saving note: `, error);
  }
}

function viewNote(note: Note, editor: Editor): void {
  if (!editor) return;
  abortCurrentSave();
  positionManager.save(editor); // save position from old note
  handleEditorEmptyState(note.id);
  editor.commands.setContent(note.content as JSONContent, {
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
