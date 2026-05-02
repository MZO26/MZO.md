import { getNoteById, updateNote } from "@/api/noteAPI";
import { editor } from "@/components/editor/editor";
import {
  debouncedStatUpdate,
  getContent,
} from "@/components/editor/editorHandlers";
import { updateNoteInList } from "@/components/sidebar/sidebarNotes";
import { debouncedTagUpdate } from "@/extensions/tag";
import { viewNote } from "@/services/autoSave";
import { setNoteId } from "@/services/state";
import { setActiveItem } from "@/utils/helpers";
import { showToast } from "@/utils/toast";
import { getMetadata } from "@shared/generators/generators";
import type { Editor } from "@tiptap/core";
import { pendingDeletions } from "./buttonHandlers";

async function noteItemHandler(
  noteItem: HTMLDivElement,
  container: HTMLDivElement,
  editor: Editor,
) {
  const noteID = noteItem.dataset["id"];
  if (!noteID) return;
  const response = await getNoteById(noteID);
  if (!response.success) {
    showToast(response.message);
    return;
  }
  setNoteId(noteID);
  viewNote(response.data);
  debouncedTagUpdate(response.data.tags);
  debouncedStatUpdate(editor, response.data.content);
  setActiveItem(noteItem, container);
}

async function saveNote(id: string, flush: boolean = false): Promise<void> {
  if (!editor || !id || pendingDeletions.has(id)) return;
  const { content, plainText } = getContent(editor);
  const metaData = getMetadata(content, plainText);
  const payload = { id, content, plainText, ...metaData };
  const response = await updateNote(payload, flush);
  if (!response.success) {
    console.error("save failed for id", id);
    showToast(response.message);
    return;
  }
  updateNoteInList(response.data);
}

export { noteItemHandler, saveNote, updateNote };
