import { createNote, deleteNote, getNoteById, updateNote } from "@/api/noteAPI";
import { editor } from "@/components/editor/editor-init";
import { handleEditorEmptyState } from "@/components/editor/editor-state";
import {
  updateNoteTags,
  updateStats,
} from "@/components/sidebar/info-sidebar-actions";
import { updateNoteInList } from "@/components/sidebar/sidebar-actions";
import { handleSidebarEmptyState } from "@/components/sidebar/sidebar-state";
import { stopAutoSave } from "@/features/note-auto-save";
import { viewNote } from "@/features/note-ui";
import { stateStore } from "@/settings/app-state";
import { setActiveItem } from "@/utils/dom";
import { getAppItem } from "@/utils/registry";
import { showToast } from "@/utils/toast";
import { getMetadata } from "@shared/generators/generators";
import type {
  CreateNotePayload,
  UpdateNotePayload,
} from "@shared/schemas/note-schema";

export const pendingDeletions = new Set<string>();

function getContent() {
  const editor = getAppItem("editor");
  const plainText = editor.getText();
  const content = editor.getJSON();
  const markdown = editor.getMarkdown();
  return { content, plainText, markdown };
}

async function handleCreateNote() {
  const editorContent = {
    content: { type: "doc" as const, content: [{ type: "paragraph" }] },
    plainText: "",
    markdown: "",
  };
  const metadata = getMetadata(editorContent.content, editorContent.plainText);
  const payload: CreateNotePayload = {
    ...editorContent,
    ...metadata,
    pinned: false,
    bookmarked: false,
  };
  return await createNote(payload);
}

async function handleDeleteNote(id: string, noteElement: HTMLDivElement) {
  const editor = getAppItem("editor");
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
  const { activeId } = stateStore.getState();
  if (activeId === id) {
    stateStore.setState({ activeId: null });
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
  const editorContent = getContent();
  const metaData = getMetadata(editorContent.content, editorContent.plainText);
  const payload: UpdateNotePayload = {
    id,
    ...editorContent,
    ...metaData,
  };
  const response = await updateNote(payload, flush);
  if (!response.success) {
    console.error("save failed for id", id);
    showToast(response.message);
    return;
  }
  updateStats();
  updateNoteTags(response.data.tags);
  updateNoteInList(response.data);
}

async function handleSelectNote(noteItem: HTMLDivElement) {
  const noteID = noteItem.dataset["id"];
  if (!noteID) return;
  const response = await getNoteById(noteID);
  if (!response.success) {
    showToast(response.message);
    return;
  }
  stateStore.setState({ activeId: noteID });
  viewNote(response.data);
  updateNoteTags(response.data.tags);
  updateStats();
  setActiveItem(noteItem, getAppItem("sidebar"));
}

export { handleCreateNote, handleDeleteNote, handleSaveNote, handleSelectNote };
