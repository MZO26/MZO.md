import type { Editor } from "@tiptap/core";
import { editor, positionManager } from "../components/editor";
import {
  addManyNotesToList,
  addOneNoteToList,
  updateNoteInList,
} from "../components/sidebarNotes";
import type {
  CreateNotePayload,
  Note,
  NoteData,
  UpdateNotePayload,
} from "../shared/types";
import {
  abortCurrentSave,
  setupAutoSave,
  startNewSaveCycle,
} from "../utils/autoSave";
import { getValue, removeValue, setValue, StorageKeys } from "../utils/cache";
import { getElement, safeParse } from "../utils/helpers";

async function deleteNote(id: string, noteElement: HTMLElement): Promise<void> {
  try {
    const result = await window.noteAPI.delete(id);
    if (result.success) {
      noteElement.remove();
      const noteID = getValue(StorageKeys.NOTE_ID);
      if (noteID === id) {
        removeValue(StorageKeys.NOTE_ID);
        editor?.commands.clearContent();
      }
    }
  } catch (error) {
    console.error("Failed to delete note:", error);
    return;
  }
}

async function getNoteById(id: string): Promise<Note | undefined> {
  try {
    const result = await window.noteAPI.getById(id);
    console.log("Get note by ID result: ", result);
    if (!result.success) {
      console.warn(`Note with ID ${id} not found.`);
      return undefined;
    }
    return result.data;
  } catch (error) {
    console.error(`Error fetching note with ID ${id}: `, error);
    return undefined;
  }
}

async function createNote(note: CreateNotePayload): Promise<Note | undefined> {
  const payload: CreateNotePayload = {
    title: note.title || "New note",
    content: note.content || '{"type": "doc", "content": []}',
    snippet: note.snippet || "",
    tags: note.tags || [],
  };
  const result = await window.noteAPI.create(payload);
  if (!result.success) {
    console.warn("Failed to create note: ", result.message);
    return undefined;
  }
  return result.data;
}

async function saveNote(noteData: NoteData, id?: string | null): Promise<void> {
  const currentId = id !== undefined ? id : getValue(StorageKeys.NOTE_ID);
  if (currentId === null) {
    const newNote = await createNote(noteData);
    console.log("new note created");
    if (!newNote) return;
    addOneNoteToList(newNote);
    setValue(StorageKeys.NOTE_ID, newNote.id);
  } else {
    const updatePayload: UpdateNotePayload = { ...noteData, id: currentId };
    const updatedNote = await updateNote(updatePayload);
    if (!updatedNote) return;
    updateNoteInList(updatedNote);
  }
}

async function reloadNoteList(): Promise<boolean> {
  const container = getElement<HTMLDivElement>(".notes-container");
  if (!container) return false;
  container.innerHTML = "";
  try {
    const result = await window.noteAPI.getAll();
    console.log("Reload notes result: ", result);
    if (!result.success) {
      return false;
    }
    const notes = result.data as Note[];
    addManyNotesToList(notes);
    return true;
  } catch (error) {
    console.error("Error loading notes:", error);
    return false;
  }
}

async function updateNote(note: UpdateNotePayload): Promise<Note | undefined> {
  try {
    const payload: UpdateNotePayload = {
      id: note.id,
      title: note.title || "",
      content: note.content || '{"type": "doc", "content": []}',
      snippet: note.snippet || "",
      tags: note.tags || [],
    };
    const result = await window.noteAPI.update(payload);
    if (!result.success) {
      console.warn(`Note with ID ${note.id} not found for update.`);
      return undefined;
    }

    console.log(`Note with ID ${note.id} updated successfully.`);
    return result.data;
  } catch (error) {
    console.error(`Error updating note with ID ${note.id}: `, error);
    return undefined;
  }
}

function extractNoteDataFromEditor(editor: Editor | null) {
  const plainText = editor?.getText() ?? "";
  const jsonObj = editor?.getJSON() ?? { type: "doc", content: [] };
  const content = JSON.stringify(jsonObj);
  const snippet = plainText
    .replace(/#[\p{L}\p{N}_]+/gu, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  const lines = plainText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const title: string = lines[0] ?? "New note";
  const tagMatches = plainText.match(/#[\p{L}\p{N}_]+/gu);
  const tags = tagMatches
    ? Array.from(new Set(tagMatches.map((tag) => tag.slice(1))))
    : [];
  return { title, content, snippet, tags };
}

async function viewNote(note: Note, editor: Editor): Promise<void> {
  if (!editor) return;
  abortCurrentSave();
  positionManager.save(editor); // save position from old note
  const content = safeParse(note.content);
  editor.commands.setContent(content, { emitUpdate: false });
  positionManager.restore(editor, note.id); // moves cursor and updates id
  const newController = startNewSaveCycle();
  setupAutoSave({
    editor,
    signal: newController.signal,
  });
}

export {
  createNote,
  deleteNote,
  extractNoteDataFromEditor,
  getNoteById,
  reloadNoteList,
  safeParse,
  saveNote,
  updateNote,
  viewNote,
};
