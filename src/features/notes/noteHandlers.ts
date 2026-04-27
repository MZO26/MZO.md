import type { Editor } from "@tiptap/core";
import { EditorState } from "@tiptap/pm/state";
import type { Note } from "../../../shared/schemas/noteSchema";
import { editor } from "../../components/editor/editor";
import { updateStats } from "../../components/editor/editorFooter";
import {
  extractNoteDataFromEditor,
  handleEditorEmptyState,
} from "../../components/editor/editorHandlers";
import { updateNoteInList } from "../../components/sidebar/sidebarNotes";
import { debouncedTagUpdate } from "../../extensions/tag";
import { debouncedToDoUpdate } from "../../extensions/toDoBar";
import {
  abortCurrentSave,
  setupAutoSave,
  startNewSaveCycle,
} from "../../utils/autoSave";
import { setValue, StorageKeys } from "../../utils/cache";
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
  const response = await getNoteById(noteID);
  if (!response.success) {
    showToast(response.message);
    return;
  }
  setValue(StorageKeys.NOTE_ID, noteID);
  viewNote(response.data, editor);
  debouncedTagUpdate(response.data.tags);
  debouncedToDoUpdate(response.data.content);
  updateStats(editor);
  setActiveItem(noteItem, container);
}

async function saveNote(id: string, flush: boolean = false): Promise<void> {
  if (!editor) return;
  const editorData = extractNoteDataFromEditor(editor);
  const payload = { ...editorData, id };
  const response = await updateNote(payload, flush);
  if (!response.success) {
    showToast(response.message);
    return;
  }
  updateNoteInList(response.data);
  setValue(StorageKeys.NOTE_ID, id);
}

function viewNote(note: Note, editor: Editor): void {
  if (!editor) return;
  abortCurrentSave();
  handleEditorEmptyState(note.id);
  editor.commands.setContent(note.content, { emitUpdate: false });
  const newState = EditorState.create({
    doc: editor.state.doc,
    plugins: editor.state.plugins,
    schema: editor.state.schema,
  });
  editor.view.updateState(newState);
  editor.commands.focus();
  editor.commands.unsetAllMarks();
  const newController = startNewSaveCycle();
  setupAutoSave({
    editor,
    signal: newController.signal,
    noteID: note.id,
  });
}

export { noteItemHandler, saveNote, updateNote, viewNote };
