import {
  createManyNotes,
  createNote,
  deleteNote,
  getNoteById,
  importNote,
  showNotification,
  updateNote,
} from "@/api/api";
import {
  getContent,
  resetEditorHistory,
} from "@/components/editor/editor-actions";
import { editor } from "@/components/editor/editor-init";
import { handleEditorEmptyState } from "@/components/editor/editor-state";
import { debouncedUpdateStats } from "@/components/sidebar/info-sidebar-actions";
import {
  addManyNotesToList,
  addOneNoteToList,
  updateNoteInList,
} from "@/components/sidebar/sidebar-actions";
import { handleSidebarEmptyState } from "@/components/sidebar/sidebar-state";
import { setupAutoSave, stopAutoSave } from "@/features/note-auto-save";
import { noteStore, stateStore } from "@/settings/app-state";
import { setActiveItem } from "@/utils/dom";
import { getAppItem } from "@/utils/registry";
import { CLEANUP } from "@shared/constants";
import { getMetadata } from "@shared/generators/generators";
import type {
  CreateNotePayload,
  Note,
  UpdateNotePayload,
} from "@shared/schemas/note-schema";
import { setImportedContent } from "./import-actions";

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
  const result = await createNote(payload);
  if (!result.success) {
    console.error("[handleCreateNote]: Failed to create note:", result.error);
    return;
  }
  noteStore.setState((state) => ({
    notes: [...state.notes, result.data],
  }));
  stateStore.setState({ activeId: result.data.id });
  addOneNoteToList(result.data);
  handleEditorEmptyState();
  viewNote(result.data);
}

async function handleImportNote() {
  const imported = await importNote();
  if (!imported.success) return;
  const processedPayloads = await setImportedContent(imported.data);
  if (!processedPayloads.success) return;
  const result = await createManyNotes(processedPayloads.data);
  if (!result.success) {
    console.error(
      "[handleImportNote]: Failed to create imported notes:",
      result.error,
    );
    return;
  }
  const count = imported.data.length;
  await showNotification(
    "Import Successful",
    `Successfully imported ${count} file${count === 1 ? "" : "s"}.`,
  );
  noteStore.setState((state) => ({
    notes: [...state.notes, ...result.data],
  }));
  addManyNotesToList(result.data);
  handleEditorEmptyState();
}

function cleanupDeletedNoteUI(id: string, noteElement?: HTMLDivElement) {
  if (noteElement) noteElement.remove();
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
  const result = await deleteNote(id);
  if (!result.success) {
    console.error("[handleDeleteNote]: Failed to delete:", result.error);
    return;
  }
  cleanupDeletedNoteUI(id, noteElement);
}

async function handleSaveNote(id: string, flush: boolean = false) {
  if (!editor || !id) return;
  const editorContent = getContent();
  const metaData = getMetadata(editorContent.content, editorContent.plainText);
  const payload: UpdateNotePayload = {
    id,
    ...editorContent,
    ...metaData,
  };
  const result = await updateNote(payload, flush);
  if (!result.success) {
    console.error("[handleSaveNote]: save failed", result.error);
    return;
  }
  debouncedUpdateStats(result.data);
  await updateNoteInList(result.data);
}

async function handleSelectNote(noteItem: HTMLDivElement) {
  const noteID = noteItem.getAttribute("data-id");
  if (!noteID) return;
  const result = await getNoteById(noteID);
  if (!result.success) {
    console.error("[handleSelectNote]: Failed to fetch note:", result.error);
    return;
  }
  stateStore.setState({ activeId: noteID });
  viewNote(result.data);
  setActiveItem(noteItem, getAppItem("sidebar"));
}

function viewNote(note: Note): void {
  const editor = getAppItem("editor");
  debouncedUpdateStats.cancel();
  stopAutoSave(editor, "flush");
  handleEditorEmptyState();
  editor.commands.setContent(note.content, {
    emitUpdate: false,
  });
  resetEditorHistory(editor);
  const newCleanup = setupAutoSave(editor, note.id);
  debouncedUpdateStats(note);
  debouncedUpdateStats.flush();
  CLEANUP.set(editor, newCleanup);
  requestAnimationFrame(() => {
    editor.commands.focus();
  });
}

export {
  cleanupDeletedNoteUI,
  handleCreateNote,
  handleDeleteNote,
  handleImportNote,
  handleSaveNote,
  handleSelectNote,
  viewNote,
};
