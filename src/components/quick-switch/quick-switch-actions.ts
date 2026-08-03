import { noteStore } from "@/state/state";

function markNoteAsRecent(noteId: string) {
  noteStore.setState((state) => {
    const recentNotes = state.recentNotes.filter(
      (id) => id !== noteId && state.noteIndex.has(id),
    );
    return {
      recentNotes: [noteId, ...recentNotes].slice(0, 5),
    };
  });
}

function removeRecentNote(noteId: string) {
  noteStore.setState((state) => ({
    recentNotes: state.recentNotes.filter((id) => id !== noteId),
  }));
}

function pruneRecentNotes() {
  noteStore.setState((state) => ({
    recentNotes: state.recentNotes.filter((id) => state.noteIndex.has(id)),
  }));
}

export { markNoteAsRecent, pruneRecentNotes, removeRecentNote };
