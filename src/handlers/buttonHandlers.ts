import { editor } from "../components/editor";
import { addNoteToList } from "../components/sidebarNotes";
import { clearSavedItemId, getSavedItemId } from "../shared/sharedStates";
import { createNote, extractNoteDataFromEditor } from "./noteHandlers";

async function addNoteBtnHandler() {
  const activeId = getSavedItemId();
  if (activeId) {
    const note = await createNote();
    if (note) {
      addNoteToList(note);
    }
    editor?.commands.setContent("", { emitUpdate: false }); //prevents debounced update to create another note
    editor?.commands.focus();
    clearSavedItemId();
    return;
  } else {
    const data = extractNoteDataFromEditor(editor);
    const note = await createNote(data);
    console.log("adding note to list: ", note);
    if (note) {
      console.log("note is here");
      addNoteToList(note);
    }
  }
}

export { addNoteBtnHandler };
