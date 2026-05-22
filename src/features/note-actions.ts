import { createNote, deleteNote, getNoteById, updateNote } from "@/api/noteAPI";
import { editor } from "@/components/editor/editor-init";
import { handleEditorEmptyState } from "@/components/editor/editor-state";
import { debouncedUpdateStats } from "@/components/sidebar/info-sidebar-actions";
import { updateNoteInList } from "@/components/sidebar/sidebar-actions";
import { handleSidebarEmptyState } from "@/components/sidebar/sidebar-state";
import { setupAutoSave, stopAutoSave } from "@/features/note-auto-save";
import { noteStore, stateStore } from "@/settings/app-state";
import { setActiveItem } from "@/utils/dom";
import { getAppItem } from "@/utils/registry";
import { showToast } from "@/utils/toast";
import { getMetadata } from "@shared/generators/generators";
import type {
  CreateNotePayload,
  Note,
  UpdateNotePayload,
} from "@shared/schemas/note-schema";
import { Editor } from "@tiptap/core";
import { EditorState } from "@tiptap/pm/state";

export const pendingDeletions = new Set<string>();

function getContent() {
  const editor = getAppItem("editor");
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
  const payload: CreateNotePayload = {
    ...editorContent,
    ...metadata,
    pinned: false,
    bookmarked: false,
  };
  return await createNote(payload);
}

function cleanupDeletedNoteUI(id: string, noteElement?: HTMLDivElement) {
  if (noteElement) {
    noteElement.remove();
  }
  noteStore.setState((state) => ({
    notes: state.notes.filter((n) => n.id !== id),
  }));
  handleSidebarEmptyState();
  const { activeId } = stateStore.getState();
  if (activeId === id) {
    stateStore.setState({ activeId: null });
    const editor = getAppItem("editor");
    editor?.commands.clearContent();
    handleEditorEmptyState();
  }
}

async function handleDeleteNote(id: string, noteElement: HTMLDivElement) {
  const editor = getAppItem("editor");
  debouncedUpdateStats.cancel();
  stopAutoSave(editor, "cancel");
  pendingDeletions.add(id);
  const response = await deleteNote(id);
  if (!response.success) {
    pendingDeletions.delete(id);
    showToast(response.message);
    return;
  }
  showToast("Note deleted");
  cleanupDeletedNoteUI(id, noteElement);
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
  debouncedUpdateStats(response.data);
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
  setActiveItem(noteItem, getAppItem("sidebar"));
}

const cleanup = new WeakMap<
  Editor,
  { flush: () => Promise<void>; cancel: () => void }
>();

function resetEditorHistory(editor: Editor): void {
  const newState = EditorState.create({
    doc: editor.state.doc,
    plugins: editor.state.plugins,
    schema: editor.state.schema,
  });
  editor.view.updateState(newState);
}

function viewNote(note: Note): void {
  const editor = getAppItem("editor");
  debouncedUpdateStats.flush();
  stopAutoSave(editor, "flush");
  handleEditorEmptyState();
  editor.commands.setContent(note.content, {
    emitUpdate: false,
  });
  resetEditorHistory(editor);
  const newCleanup = setupAutoSave(editor, note.id);
  debouncedUpdateStats(note);
  debouncedUpdateStats.flush();
  cleanup.set(editor, newCleanup);
  requestAnimationFrame(() => {
    editor.commands.focus();
  });
}

export {
  cleanup,
  cleanupDeletedNoteUI,
  handleCreateNote,
  handleDeleteNote,
  handleSaveNote,
  handleSelectNote,
  viewNote,
};
