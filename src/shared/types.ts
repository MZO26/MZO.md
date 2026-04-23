import type { Editor } from "@tiptap/core";
import type { Settings } from "http2";
import type z from "zod";
import type { EditorDocSchema } from "./schemas/editorSchema";
import type { ImagePayloadSchema } from "./schemas/imageSchema";
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
type ImagePayload = z.infer<typeof ImagePayloadSchema>;
type Result<T> =
  | { success: true; data: T }
  | { success: false; message: string };
type AutoScrollOptions = {
  getScrollContainer: (editorRoot: HTMLElement) => HTMLElement;
  edge?: number;
  maxSpeed?: number;
};
type BubbleMenuCommands = (
  value?: string | undefined,
) => boolean | void | Promise<void>;

type Code =
  | "github-light"
  | "github-dark"
  | "atom-one-light"
  | "atom-one-dark"
  | "everforest-dark"
  | "everforest-light";

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

type TitleBarOverlayOptions = {
  color: string;
  symbolColor: string;
  height: number;
};

type ThemeConfig = {
  color: string; // background
  symbolColor: string; // button color
  isDark: boolean;
};

type ResolvedTheme = "light" | "dark";
type WorkerResult =
  | { success: true; data: Uint8Array }
  | { success: false; message: string };

export type {
  Actions,
  AutoSaveConfig,
  AutoScrollOptions,
  BubbleMenuCommands,
  Code,
  CreateNotePayload,
  EditorDoc,
  Font,
  FTSRows,
  ImagePayload,
  Note,
  NoteItemElements,
  NoteResponse,
  NotesReponse,
  ResolvedTheme,
  Result,
  SavedPosition,
  SaveState,
  Settings,
  ThemeConfig,
  TitleBarOverlayOptions,
  UpdateNotePayload,
  WorkerResult,
};
