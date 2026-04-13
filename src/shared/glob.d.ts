export {};
import {
  IpcResponse,
  type CreateNotePayload,
  type NoteResponse,
  type NotesReponse,
  type Theme,
  type UpdateNotePayload,
} from "../shared/types";

declare module "*.css";
declare module "*?raw" {
  const content: string;
  export default content;
}

type IpcResponse<T> =
  | { success: true; data: T }
  | {
      success: false;
      message: string;
      errors?: Record<string, string[] | undefined>;
    };

declare global {
  interface Window {
    api: {
      openFile: () => Promise<{ path: string; content: string } | null>;
      saveFile: (data: {
        path: string | null;
        content: string;
      }) => Promise<string | boolean>;
    };
    electronAPI: {
      getTheme: () => Promise<IpcResponse<Theme>>;
      setTheme: (theme: Theme) => Promise<IpcResponse<Theme>>;
      onThemeChanged: (
        callback: (response: IpcResponse<Theme>) => void,
      ) => void;
    };
    noteAPI: {
      getAll: () => Promise<NotesReponse>;
      getById: (id: string) => Promise<NoteResponse>;
      create: (payload: CreateNotePayload) => Promise<NoteResponse>;
      update: (payload: UpdateNotePayload) => Promise<NoteResponse>;
      delete: (id: string) => Promise<IpcResponse<boolean>>;
      searchNotes: (searchTerm: string, limit: number) => Promise<NotesReponse>;
    };
    storeApi: {
      getSettings: <K extends keyof Settings>(
        key: K,
      ) => Promise<IpcResponse<Settings[K]>>;
      setSettings: <K extends keyof Settings>(
        key: K,
        value: Settings[K],
      ) => Promise<IpcResponse<boolean>>;
    };
  }
}
