import type { Editor } from "@tiptap/core";

interface Note {
  id: string;
  title: string;
  content: string;
  snippet: string;
  created_at: string;
  updated_at: string;
  tags: string[];
}

interface IpcResponse<T = void> {
  success: boolean;
  message?: string;
  data?: T;
}

interface AutoSaveConfig {
  editor: Editor;
  signal: AbortSignal;
}

type CreateNotePayload = Omit<Note, "id" | "created_at" | "updated_at">;
type UpdateNotePayload = Omit<Note, "created_at" | "updated_at">;
type NoteData = Omit<Note, "id" | "created_at" | "updated_at">;

type SavedPosition = number | { from: number; to: number };

type Theme =
  | "light"
  | "dark"
  | "dark-glass"
  | "light-glass"
  | "paper"
  | "nord"
  | "sepia"
  | "lavender"
  | "system";

type Font =
  | "system"
  | "arial"
  | "verdana"
  | "trebuchet"
  | "georgia"
  | "courier"
  | "times"
  | "palpatino"
  | "garamond"
  | "tahoma"
  | "century"
  | "consolas";

export type {
  AutoSaveConfig,
  CreateNotePayload,
  Font,
  IpcResponse,
  Note,
  NoteData,
  SavedPosition,
  Theme,
  UpdateNotePayload,
};
