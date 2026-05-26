import { mergeNotes } from "@/api/api";
import { debouncedUpdateStats } from "@/components/sidebar/info-sidebar-actions";
import { cleanupDeletedNoteUI, handleViewNote } from "@/features/note-actions";
import { stopAutoSave } from "@/features/note-auto-save";
import { noteStore, stateStore } from "@/settings/app-state";
import { findElement, setActiveItem } from "@/utils/dom";
import { getAppItem } from "@/utils/registry";
import { validateUUID } from "@/utils/validate";

async function handleMergeNotes(idA: string, idB: string) {
  const validatedId = validateUUID(idB);
  if (!validatedId) {
    console.error("[handleMergeNotes]: Invalid Note ID format.");
    return;
  }
  if (idA === validatedId) {
    console.error("[handleMergeNotes]: Cannot merge a note with itself.");
    return;
  }
  stopAutoSave(getAppItem("editor"), "cancel");
  const result = await mergeNotes(idA, validatedId);
  if (!result.success) {
    console.error("[handleMergeNotes]: Failed to merge notes:", result.error);
    return;
  }
  noteStore.setState((state) => ({
    notes: state.notes
      .filter((note) => note.id !== idA)
      .map((note) => (note.id === idB ? result.data : note)),
  }));
  stateStore.setState({ activeId: result.data.id });
  const noteBElement = findElement<HTMLDivElement>(
    `div[data-id="${validatedId}"]`,
    getAppItem("sidebar"),
  );
  if (noteBElement) cleanupDeletedNoteUI(validatedId, noteBElement);
  handleViewNote(result.data);
  debouncedUpdateStats(result.data);
  const noteElement = findElement<HTMLDivElement>(
    `.note-item[data-id="${result.data.id}"]`,
    getAppItem("sidebar"),
  );
  if (noteElement) setActiveItem(noteElement, getAppItem("sidebar"));
}

export { handleMergeNotes };
