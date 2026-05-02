import { Editor } from "@tiptap/core";
import { createStore } from "zustand/vanilla";

interface AppState {
  activeID: string | null;
}

let globalEditorInstance: Editor | null = null;

const stateStore = createStore<AppState>()(() => ({
  activeID: null,
}));

const getNoteId = () => stateStore.getState().activeID;
const setNoteId = (id: string | null) => stateStore.setState({ activeID: id });

function setGlobalEditor(editor: Editor) {
  globalEditorInstance = editor;
}

function getEditor(): Editor {
  if (!globalEditorInstance) {
    throw new Error("Editor wurde noch nicht initialisiert!");
  }
  return globalEditorInstance;
}

export { getEditor, getNoteId, setGlobalEditor, setNoteId, stateStore };
