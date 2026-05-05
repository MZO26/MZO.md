import { createNote, deleteNote, getNoteById, updateNote } from "@/api/noteAPI";
import { editor } from "@/components/editor/editor-init";
import { handleEditorEmptyState } from "@/components/editor/editor-state";
import {
  debouncedStatUpdate,
  debouncedTagUpdate,
} from "@/components/sidebar/info-sidebar-actions";
import { updateNoteInList } from "@/components/sidebar/sidebar-actions";
import { handleSidebarEmptyState } from "@/components/sidebar/sidebar-state";
import { viewNote } from "@/features/note-ui";
import { stopAutoSave } from "@/services/auto-save";
import { getNoteId, setNoteId } from "@/services/state";
import { setActiveItem } from "@/utils/helpers";
import { getItem } from "@/utils/registry";
import { showToast } from "@/utils/toast";
import { getMetadata } from "@shared/generators/generators";
import type { CreateNotePayload } from "@shared/schemas/note-schema";
import type { Editor } from "@tiptap/core";

export const pendingDeletions = new Set<string>();

function getContent(editor: Editor) {
  const plainText = editor.getText();
  const content = editor.getJSON();
  return { content, plainText };
}

async function handleCreateNote() {
  const editorContent = {
    content: { type: "doc" as const, content: [{ type: "paragraph" }] },
    plainText: "",
  };
  const metadata = getMetadata(editorContent.content, editorContent.plainText);
  const payload: CreateNotePayload = { ...editorContent, ...metadata };
  return await createNote(payload);
}

async function handleDeleteNote(id: string, noteElement: HTMLDivElement) {
  const editor = getItem("editor");
  stopAutoSave(editor, "cancel");
  pendingDeletions.add(id);
  const response = await deleteNote(id);
  if (!response.success) {
    pendingDeletions.delete(id);
    showToast(response.message);
    return;
  }
  showToast("Note deleted");
  noteElement.remove();
  handleSidebarEmptyState();
  const noteID = getNoteId();
  if (noteID === id) {
    setNoteId(null);
    editor?.commands.clearContent();
    handleEditorEmptyState();
  }
  setTimeout(() => pendingDeletions.delete(id), 1000);
}

async function handleSaveNote(
  id: string,
  flush: boolean = false,
): Promise<void> {
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
  debouncedTagUpdate(response.data.tags);
  updateNoteInList(response.data);
}

async function handleSelectNote(
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
  debouncedStatUpdate(editor);
  setActiveItem(noteItem, container);
}

export { handleCreateNote, handleDeleteNote, handleSaveNote, handleSelectNote };
