export {};
import {
  IpcResponse,
  type CreateNotePayload,
  type ImagePayload,
  type NoteResponse,
  type NotesReponse,
  type Theme,
  type UpdateNotePayload,
} from "../shared/types";
import type { Settings } from "./schemas/storeSchema";

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
    electronAPI: {
      setTheme: (theme: Theme) => Promise<IpcResponse<Theme>>;
      saveImage: (
        payload: ImagePayload,
      ) => Promise<IpcResponse<{ imageSrc: string }>>;
    };
    noteAPI: {
      getAll: () => Promise<NotesReponse>;
      getById: (id: string) => Promise<NoteResponse>;
      create: (payload: CreateNotePayload) => Promise<NoteResponse>;
      update: (
        payload: UpdateNotePayload,
        flush: boolean,
      ) => Promise<NoteResponse>;
      delete: (id: string) => Promise<IpcResponse<void>>;
      searchNotes: (searchTerm: string, limit: number) => Promise<NotesReponse>;
    };
    storeApi: {
      getSettings: <K extends keyof Settings>(
        key: K,
      ) => Promise<IpcResponse<Settings[K]>>;
      setSettings: (
        settings: Partial<Settings>,
      ) => Promise<IpcResponse<Settings>>;
    };
  }
}
