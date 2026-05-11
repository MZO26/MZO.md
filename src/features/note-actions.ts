import { createNote, deleteNote, getNoteById, updateNote } from "@/api/noteAPI";
import { editor } from "@/components/editor/editor-init";
import { handleEditorEmptyState } from "@/components/editor/editor-state";
import {
  updateNoteTags,
  updateStats,
} from "@/components/sidebar/info-sidebar-actions";
import { updateNoteInList } from "@/components/sidebar/sidebar-actions";
import { handleSidebarEmptyState } from "@/components/sidebar/sidebar-state";
import { settingsStore, stateStore } from "@/features/app-state";
import { stopAutoSave } from "@/features/note-auto-save";
import { viewNote } from "@/features/note-ui";
import { setActiveItem } from "@/utils/dom";
import { getAppItem } from "@/utils/registry";
import { showToast } from "@/utils/toast";
import { getMetadata } from "@shared/generators/generators";
import type { CreateNotePayload } from "@shared/schemas/note-schema";

export const pendingDeletions = new Set<string>();

function getContent() {
  const editor = getAppItem("editor");
  const plainText = editor.getText();
  const content = editor.getJSON();
  if (settingsStore.get("mirror-mode") === "fs") {
    const markdown = editor.getMarkdown();
    return { content, plainText, markdown };
  }
  return { content, plainText };
}

async function handleCreateNote() {
  const editorContent = {
    content: { type: "doc" as const, content: [{ type: "paragraph" }] },
    plainText: "",
  };
  const metadata = getMetadata(editorContent.content, editorContent.plainText);
  const is_mirrored = settingsStore.get("mirror-mode") === "fs" ? true : false;
  const payload: CreateNotePayload = {
    ...editorContent,
    ...metadata,
    is_mirrored,
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
  const { content, plainText, markdown } = getContent();
  const metaData = getMetadata(content, plainText);
  const is_mirrored = markdown ? true : false;
  const payload = {
    id,
    content,
    plainText,
    markdown,
    is_mirrored,
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
