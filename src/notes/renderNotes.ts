import type { Note } from "../../electron/database";
import { initEditor } from "../components/editor";
import { clearSavedItemId, setSavedItemId } from "../store/sharedStates";
import { debounce } from "../utils/helpers";

const renderNote = (note: Note) => {
  const container = document.querySelector(".notes-container") as HTMLElement;
  if (!container) return;
  const noteElement = document.createElement("div");
  noteElement.classList.add("noteItem");
  noteElement.dataset["id"] = note.id;
  const deleteBtn = document.createElement("button");
  deleteBtn.addEventListener("click", async (e) => {
    e.stopPropagation();
    await deleteNote(note.id);
    clearSavedItemId();
  });
  deleteBtn.classList.add("delete-btn");
  deleteBtn.textContent = "Löschen";
  deleteBtn.innerHTML = `<svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  fill="currentColor"
                  class="bi bi-trash3-fill"
                  viewBox="0 0 16 16"
                >
                  <path
                    d="M11 1.5v1h3.5a.5.5 0 0 1 0 1h-.538l-.853 10.66A2 2 0 0 1 11.115 16h-6.23a2 2 0 0 1-1.994-1.84L2.038 3.5H1.5a.5.5 0 0 1 0-1H5v-1A1.5 1.5 0 0 1 6.5 0h3A1.5 1.5 0 0 1 11 1.5m-5 0v1h4v-1a.5.5 0 0 0-.5-.5h-3a.5.5 0 0 0-.5.5M4.5 5.029l.5 8.5a.5.5 0 1 0 .998-.06l-.5-8.5a.5.5 0 1 0-.998.06m6.53-.528a.5.5 0 0 0-.528.47l-.5 8.5a.5.5 0 0 0 .998.058l.5-8.5a.5.5 0 0 0-.47-.528M8 4.5a.5.5 0 0 0-.5.5v8.5a.5.5 0 0 0 1 0V5a.5.5 0 0 0-.5-.5"
                  />
                </svg>`;
  const titleElement = document.createElement("div");
  titleElement.classList.add("title");
  titleElement.textContent = note.title || "Unbenannt";

  const dateElement = document.createElement("span");
  dateElement.classList.add("date");
  dateElement.textContent = note.created_at;

  noteElement.append(titleElement, dateElement, deleteBtn);
  noteElement.addEventListener("click", () => {
    viewNote(note.id);
    setSavedItemId(note.id);
  });
  container.appendChild(noteElement);
};

// const reloadNotes = async () => {
//   const container = document.querySelector(".notes-container") as HTMLElement;
//   if (!container) return;
//   container.innerHTML = "";
//   try {
//     const notes = await window.notesAPI.getAll();
//     notes.forEach(renderNote);
//   } catch (error) {
//     console.error("Fehler beim Laden der Notizen:", error);
//   }
// };

const createNote = async () => {
  try {
    const editor = initEditor("#editor");
    if (!editor) {
      console.error("Editor konnte nicht initialisiert werden.");
      return null;
    }
    const titleNode = editor.getJSON().content?.[0];
    const title =
      titleNode?.type === "heading" && titleNode.attrs?.["level"] === 1
        ? editor.getText().split("\n")[0] || "Unbenannt"
        : "Unbenannt";
    const content = editor.getHTML();
    const id = await window.notesAPI.create(title, content);
    console.log(`Note created with ID: ${id}`);
    renderNote({ id, title, content, created_at: new Date().toISOString() });
    return id;
  } catch (error) {
    console.error("Note erstellen fehlgeschlagen:", error);
    return null;
  }
};

const saveNote = async (note: Note) => {
  try {
    await window.notesAPI.update(note.id, note.title, note.content);
    console.log(`Note with ID ${note.id} updated successfully.`);
  } catch (error) {
    console.error(`Fehler beim Speichern der Note mit ID ${note.id}:`, error);
  }
};

const deleteNote = async (id: string) => {
  try {
    await window.notesAPI.delete(id);
  } catch (error) {
    console.error(`Fehler beim Löschen der Note mit ID ${id}:`, error);
  }
};

const viewNote = async (id: string) => {
  try {
    const note = await window.notesAPI.getById(id);
    if (note) {
      initEditor("#editor")?.commands.setContent(note.content);
    } else {
      console.warn(`Note mit ID ${id} nicht gefunden.`);
    }
  } catch (error) {
    console.error(`Fehler beim Laden der Note mit ID ${id}:`, error);
  }
};

const updateNote = debounce(
  async (id: string, title: string, content: string) => {
    try {
      await window.notesAPI.update(id, title, content);
    } catch (error) {
      console.error(`Fehler beim Aktualisieren der Note mit ID ${id}:`, error);
    }
  },
  5000,
);

export { createNote, deleteNote, saveNote, updateNote, viewNote };
