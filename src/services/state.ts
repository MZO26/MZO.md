import { createStore } from "zustand/vanilla";

interface AppState {
  activeID: string | null;
}

const stateStore = createStore<AppState>()(() => ({
  activeID: null,
}));

const getNoteId = () => stateStore.getState().activeID;
const setNoteId = (id: string | null) => stateStore.setState({ activeID: id });

export { getNoteId, setNoteId, stateStore };
