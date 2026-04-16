import type { Editor } from "@tiptap/core";
import type z from "zod";
import type { THEME_MAP } from "../constants/themes";
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

type Actions = Record<
  string,
  {
    run: () => void;
    isActive?: () => boolean;
    isDisabled?: () => boolean;
  }
>;

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
type SaveState = "hidden" | "saving" | "success" | "error";

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
type AutoScrollOptions = {
  getScrollContainer: (editorRoot: HTMLElement) => HTMLElement;
  edge?: number;
  maxSpeed?: number;
};

type Theme = "system" | keyof typeof THEME_MAP;

type Code =
  | "github-light"
  | "github-dark"
  | "atom-one-light"
  | "atom-one-dark"
  | "dracula"
  | "monokai"
  | "vs2015"
  | "zenburn"
  | "a11y-dark"
  | "a11y-light"
  | "xcode"
  | "docco";

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
  Actions,
  AutoSaveConfig,
  AutoScrollOptions,
  Code,
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
  SaveState,
  Settings,
  Theme,
  UpdateNotePayload,
};
