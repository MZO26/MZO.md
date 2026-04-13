import type { Editor } from "@tiptap/core";
import type z from "zod";
import type { EditorDocSchema } from "./schemas/editorSchema";
import type {
  NoteResponseSchema,
  NotesResponseSchema,
} from "./schemas/ipcSchema";
import type {
  CreateNotePayloadSchema,
  FTSRowsSchema,
  NoteSchema,
  UpdateNotePayloadSchema,
} from "./schemas/noteSchema";
import type { SettingsSchema } from "./schemas/settingsSchema";

interface AutoSaveConfig {
  editor: Editor;
  signal: AbortSignal;
  noteID?: string;
}

type SavedPosition = number | { from: number; to: number };
type NoteItemElements = {
  containers: {
    tagContainer: HTMLDivElement | null;
    snippetContainer: HTMLDivElement | null;
    dateContainer: HTMLDivElement | null;
    titleContainer: HTMLDivElement | null;
  };
  tags: string[];
};

type NoteResponse = z.infer<typeof NoteResponseSchema>;
type NotesReponse = z.infer<typeof NotesResponseSchema>;
type FTSRows = z.infer<typeof FTSRowsSchema>;
type Note = z.infer<typeof NoteSchema>;
type UpdateNotePayload = z.infer<typeof UpdateNotePayloadSchema>;
type CreateNotePayload = z.infer<typeof CreateNotePayloadSchema>;
type EditorDoc = z.infer<typeof EditorDocSchema>;
type Settings = z.infer<typeof SettingsSchema>;
type Result<T> =
  | { success: true; data: T }
  | { success: false; message: string };

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
  EditorDoc,
  Font,
  FTSRows,
  Note,
  NoteItemElements,
  NoteResponse,
  NotesReponse,
  Result,
  SavedPosition,
  Settings,
  Theme,
  UpdateNotePayload,
};
