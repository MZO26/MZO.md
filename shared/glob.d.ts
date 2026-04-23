export {};
import {
  IpcResponse,
  type CreateNotePayload,
  type ImagePayload,
  type Theme,
  type UpdateNotePayload,
} from "../shared/types";
import type { Note } from "./schemas/noteSchema";
import type { Settings } from "./schemas/storeSchema";

declare module "*.css";
declare module "*?raw" {
  const content: string;
  export default content;
}

declare global {
  interface Window {
    electronAPI: {
      setTheme: (theme: Theme) => Promise<IpcResponse<Theme>>;
      saveImage: (
        payload: ImagePayload,
      ) => Promise<IpcResponse<{ imageSrc: string }>>;
    };
    noteAPI: {
      getAll: () => Promise<IpcResponse<Note[]>>;
      getById: (id: string) => Promise<IpcResponse<Note>>;
      create: (payload: CreateNotePayload) => Promise<IpcResponse<Note>>;
      update: (
        payload: UpdateNotePayload,
        flush: boolean,
      ) => Promise<IpcResponse<Note>>;
      delete: (id: string) => Promise<IpcResponse<void>>;
      searchNotes: (
        searchTerm: string,
        limit: number,
      ) => Promise<IpcResponse<Note[]>>;
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
