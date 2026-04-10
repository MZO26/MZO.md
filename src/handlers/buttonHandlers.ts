import { editor } from "../components/editor";
import { addOneNoteToList } from "../components/sidebarNotes";
import type { Note } from "../shared/types";
import { getValue, removeValue, StorageKeys } from "../utils/cache";
import { renderIcons } from "../utils/icons";
import { noteItemTemplate } from "../utils/templates";
import { createNote, reloadNoteList } from "./noteHandlers";

async function addNoteBtnHandler() {
  const activeID = getValue(StorageKeys.NOTE_ID);
  let note: Note | undefined;
  if (activeID) {
    removeValue(StorageKeys.NOTE_ID);
    note = await createNote({
      title: "New note",
      content: '{"type": "doc", "content": []}',
      snippet: "",
      tags: [],
    });
    console.log("new note created: ", note);
    editor?.commands.setContent("", { emitUpdate: false }); //prevents debounced update to create another note
    editor?.commands.focus();
    if (note) {
      addOneNoteToList(note);
    }
  }
}

async function handleSearchInput(
  inputElement: HTMLInputElement,
  notesContainer: HTMLDivElement,
) {
  const searchInput = inputElement.value.trim();
  if (searchInput === "") {
    await reloadNoteList();
    return;
  }
  const response = await window.noteAPI.searchNotes(searchInput);
  const results = response.data;

  if (!results || results.length === 0) {
    notesContainer.innerHTML = `
      <div class="empty-state">
        <p>Keine Notizen für "${searchInput}" gefunden.</p>
      </div>
    `;
    return;
  }
  notesContainer.innerHTML = results
    .map((result: any) => {
      const tagsArray = result.tags ? result.tags.trim().split(" ") : [];
      return noteItemTemplate({
        title: result.title,
        content: result.content,
        snippet: result.contentSnippet,
        updated_at: result.updated_at,
        tags: tagsArray,
      });
    })
    .join("");
  const newNoteElements =
    notesContainer.querySelectorAll<HTMLDivElement>(".noteItem");
  newNoteElements.forEach((noteElement) => {
    renderIcons(noteElement);
  });
}

export { addNoteBtnHandler, handleSearchInput };
