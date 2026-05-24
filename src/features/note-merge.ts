import { mergeNotes } from "@/api/api";
import { debouncedUpdateStats } from "@/components/sidebar/info-sidebar-actions";
import { cleanupDeletedNoteUI, viewNote } from "@/features/note-actions";
import { stopAutoSave } from "@/features/note-auto-save";
import { stateStore } from "@/settings/app-state";
import { findElement, setActiveItem } from "@/utils/dom";
import { getAppItem } from "@/utils/registry";
import { useDelayedSpinner } from "@/utils/ui";
import { validateUUID } from "@/utils/validate";

async function handleMergeNotes(id1: string, id2: string) {
  const validatedId = validateUUID(id2);
  if (!validatedId) {
    console.error("Invalid Note ID format.");
    return;
  }
  if (id1 === validatedId) {
    console.error("You cannot merge a note with itself.");
    return;
  }
  stopAutoSave(getAppItem("editor"), "cancel");
  const stopSpinner = useDelayedSpinner(100);
  try {
    const result = await mergeNotes(id1, validatedId);
    if (!result.success) {
      console.error("Failed to merge notes:", result.error);
      return;
    }
    const noteBItem = findElement<HTMLDivElement>(
      `div[data-id="${validatedId}"]`,
    );
    if (noteBItem) cleanupDeletedNoteUI(validatedId, noteBItem);
    stateStore.setState({ activeId: result.data.id });
    viewNote(result.data);
    debouncedUpdateStats(result.data);
    const noteItem = findElement<HTMLDivElement>(
      `.note-item[data-id="${result.data.id}"]`,
    );
    if (noteItem) setActiveItem(noteItem, getAppItem("sidebar"));
  } catch (error) {
    console.error("Merge failed:", error);
  } finally {
    if (stopSpinner) stopSpinner();
  }
}

export { handleMergeNotes };
