import type { ExportRequest } from "@shared/schemas/export-schema";
import type { Note } from "@shared/schemas/note-schema";
import type { AppSettings, Theme } from "@shared/schemas/store-schema";
import {
  IpcResponse,
  type CreateNotePayload,
  type ImagePayload,
  type UpdateNotePayload,
} from "@shared/shared/types";

declare module "*.css";

declare global {
  interface Window {
    exportAPI: {
      noteExport: (
        payload: ExportRequest,
      ) => Promise<IpcResponse<ExportRequest>>;
      onTriggerExport: (
        callback: (payload: ExportRequest) => void,
      ) => () => void;
    };
    electronAPI: {
      platform: () => Promise<IpcResponse<string>>;
      setTheme: (theme: Theme, focus?: boolean) => Promise<IpcResponse<Theme>>;
      saveImage: (
        payload: ImagePayload,
      ) => Promise<IpcResponse<{ imageSrc: string }>>;
      onThemeChanged: (callback: (theme: Theme) => void) => () => void;
      showContextMenu: (
        id: string,
        pinned: boolean,
        bookmarked: boolean,
      ) => Promise<IpcResponse<void>>;
      onRequestFlush: (callback: () => void) => () => void;
      confirmFlush: () => void;
      zoom: (action: ZoomAction) => Promise<IpcResponse<number>>;
      search: (text: string) => void;
      searchNext: (text: string) => void;
      onResults: (callback: (result: SearchResult) => void) => () => void;
      saveMarkdown: (content: any) => Promise<IpcResponse<boolean>>;
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
      getByTag: (tag: string) => Promise<IpcResponse<Note[]>>;
      onTriggerDelete: (callback: (id: string) => void) => () => void;
      onTriggerDuplicate: (callback: (id: string) => void) => () => void;
      onTriggerPin: (callback: (id: string) => void) => () => void;
      onTriggerBookmark: (callback: (id: string) => void) => () => void;
      searchNotes: (
        searchTerm: string,
        limit: number,
      ) => Promise<IpcResponse<Note[]>>;
      pin: (id: string) => Promise<IpcResponse<boolean>>;
      bookmark: (id: string) => Promise<IpcResponse<boolean>>;
      getViews: (view) => Promise<IpcResponse<Note[]>>;
    };
    storeAPI: {
      getSettings: <K extends keyof AppSettings>(
        key: K,
      ) => Promise<IpcResponse<AppSettings[K]>>;
      getAllSettings: () => Promise<IpcResponse<AppSettings>>;
      setSettings: (
        settings: Partial<AppSettings>,
      ) => Promise<IpcResponse<AppSettings>>;
    };
  }
}
