import type { Editor } from "@tiptap/core";
import { createIcons, Trash2 } from "lucide";
import { initEditor } from "../components/editor";
import type { Note } from "../shared/types";
import { getSavedItemId, setSavedItemId } from "../store/sharedStates";
import { getElement } from "../utils/helpers";
import { noteItemTemplate } from "../utils/templates";

// separation of concerns: renderNote, viewNote, saveNote, deleteNote, reloadNotesList, updateNote
// renderNote needs the Template of the noteItem and creates it. It should return the created noteItem. It also should add the event listener for the click on noteItem and the delete button.
// viewNote should take an ID as param and display the saved note from the database on the editor
// deleteNote should take the noteItem as param and select the delete button on it. It should also delete the entry from the database and remove the noteItem from the notes list. If the deleted note is currently open in the editor, it should clear the editor.
// reloadNotesList should reload the notes if one gets rendered or updated
// updateNote should check if note exists and if yes, call the update function from the database. If it doesn't exist call saveNote to create a new one. It should also update the noteItem in the notes list if it exists. It should be debounced to not call the database on every keystroke, but only after the user stopped typing for a certain amount of time (e.g. 5 seconds). To unite the update and create function, the saveNote function should be able to handle both cases, if the note exists or not. If it doesn't exist, it should create a new one and return the id of the created note. If it exists, it should update the existing note and return the id of the updated note. The updateNote function should then check if the noteItem exists in the notes list and if yes, update it with the new title and tags. If it doesn't exist, it should call renderNote to create a new noteItem in the notes list.

const editor = initEditor("#editor");
let editorAbortController: AbortController | null = null;
let saveTimeout: NodeJS.Timeout | null = null;

function renderNote(note: Note): HTMLDivElement | undefined {
  const noteElement = document.createElement("div");
  noteElement.classList.add("noteItem");
  noteElement.dataset["id"] = note.id;
  noteElement.innerHTML = noteItemTemplate(
    note.title,
    new Date(note.created_at).toLocaleString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    note.tags || [],
  );
  createIcons({
    icons: {
      Trash2,
    },
  });
  return noteElement;
}

async function deleteNote(id: string, noteElement: HTMLElement): Promise<void> {
  const result = await window.noteAPI.delete(id);
  if (result.success) {
    noteElement.remove();
    if (getSavedItemId() === id) {
      editor?.commands.clearContent();
    }
  }
}

async function createNote(note: Partial<Note>): Promise<string | undefined> {
  const result = await window.noteAPI.create(
    note.title || "New note",
    note.content || "",
    note.tags || [],
  );
  if (!result.success) {
    console.warn("Failed to create note: ", result.message);
    return undefined;
  }
  return result.data;
}

async function saveNote(note: Partial<Note>): Promise<void> {
  const currentId = getSavedItemId();
  if (currentId === null) {
    const newId = await createNote(note);
    if (newId) {
      setSavedItemId(newId);
    }
  } else {
    await updateNote({ ...note, id: currentId });
  }
}

async function reloadNoteList(): Promise<boolean> {
  const container = getElement<HTMLDivElement>(".notes-container");
  if (!container) return false;
  container.innerHTML = "";
  try {
    const result = await window.noteAPI.getAll();
    if (!result.success) {
      return false;
    }
    const notes = result.data;
    const fragment = document.createDocumentFragment();
    if (!notes) return false;
    notes.forEach((note: Note) => {
      const noteElement = renderNote(note);
      if (noteElement) {
        fragment.appendChild(noteElement);
      }
    });
    container.appendChild(fragment);
    return true;
  } catch (error) {
    console.error("Error loading notes:", error);
    return false;
  }
}

async function updateNote(
  note: Partial<Note> & { id: string },
): Promise<boolean> {
  try {
    const result = await window.noteAPI.update(
      note.id,
      note.title || "",
      note.content || "",
      note.tags || [],
    );
    if (!result.success) {
      console.warn(`Note with ID ${note.id} not found for update.`);
      return false;
    }
    console.log(`Note with ID ${note.id} updated successfully.`);
    return true;
  } catch (error) {
    console.error(`Error updating note with ID ${note.id}: `, error);
    return false;
  }
}

function extractNoteDataFromEditor(editor: Editor) {
  const plainText = editor?.getText();
  const content = editor?.getHTML();
  const lines = plainText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const title = lines.length > 0 ? lines[0] : "New note";
  const tagMatches = plainText.match(/#[\p{L}\p{N}_]+/gu);
  const tags = tagMatches
    ? Array.from(new Set(tagMatches.map((tag) => tag.slice(1))))
    : [];
  return { title, content, tags };
}

async function viewNote(note: Note, editor: Editor): Promise<void> {
  if (editorAbortController) {
    editorAbortController.abort();
  }
  editorAbortController = new AbortController();
  const signal = editorAbortController.signal;
  setSavedItemId(note.id);
  editor?.commands.setContent(note.content);
  const handleEditorUpdate = async () => {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      const { title, content, tags } = extractNoteDataFromEditor(editor);
      saveNote({
        id: note.id,
        title: title || "New note",
        content: content || "",
        tags: tags || [],
      });
    }, 1000);
  };

  editor.on("update", handleEditorUpdate);
  signal.addEventListener("abort", () => {
    editor.off("update", handleEditorUpdate);
  });
}
export {
  createNote,
  deleteNote,
  reloadNoteList,
  renderNote,
  updateNote,
  viewNote,
};
