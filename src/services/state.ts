import { getElement } from "@/utils/helpers";
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
    throw new Error("NOT_FOUND");
  }
  return globalEditorInstance;
}

function setModalState(show: boolean): void {
  const overlay = getElement<HTMLDivElement>(".overlay");
  const modal = getElement<HTMLDivElement>(".modal");
  overlay.classList.toggle("show", show);
  modal.classList.toggle("show", show);
}

export {
  getEditor,
  getNoteId,
  setGlobalEditor,
  setModalState,
  setNoteId,
  stateStore,
};
