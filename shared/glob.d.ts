import type {
  ExportRequest,
  ImportRequest,
} from "@shared/schemas/export-schema";
import type { Note } from "@shared/schemas/note-schema";
import type { AppSettings, Theme } from "@shared/schemas/store-schema";
import {
  Result,
  type CreateNotePayload,
  type ImagePayload,
  type UpdateNotePayload,
} from "@shared/shared/types";
import type { ImageSrc, MenuType } from "@shared/types";

declare module "*.css";

declare global {
  interface Window {
    fileAPI: {
      noteExport: (payload: ExportRequest) => Promise<Result<ExportRequest>>;
      onTriggerExport: (
        callback: (id: string, extension: string) => void,
      ) => () => void;
      noteExportMany: (
        payload: ExportedContent[],
      ) => Promise<Result<ExportedContent[]>>;
      noteImport: () => Promise<Result<ImportRequest[]>>;
      imageWrite: (payload: ImagePayload) => Promise<Result<ImageSrc>>;
    };
    electronAPI: {
      startupReady: () => void;
      setTheme: (theme: Theme, focus?: boolean) => Promise<Result<Theme>>;
      showNotification: (title: string, body: string) => Promise<Result<void>>;
      onThemeChanged: (
        callback: (resolvedTheme: Extract<Theme, "dark" | "light">) => void,
      ) => () => void;
      showContextMenu: (menuType: MenuType, payload?: NoteMenuPayload) => void;
      onTriggerTableAction: (callback: (action: string) => void) => void;
      onTriggerNoteAction: (
        callback: (payload: NoteMenuPayload) => void,
      ) => void;
      onRequestFlush: (callback: () => void) => () => void;
      confirmFlush: () => void;
      zoom: (action: string) => Promise<Result<number>>;
    };
    noteAPI: {
      getAll: () => Promise<Result<Note[]>>;
      getById: (id: string) => Promise<Result<Note>>;
      getManyById: (ids: string[]) => Promise<Result<Note[]>>;
      create: (payload: CreateNotePayload) => Promise<Result<Note>>;
      createMany: (payload: CreateNotePayload[]) => Promise<Result<Note[]>>;
      merge: (idA: string, idB: string) => Promise<Result<Note>>;
      update: (
        payload: UpdateNotePayload,
        flush: boolean,
      ) => Promise<Result<Note>>;
      delete: (id: string) => Promise<Result<void>>;
      getByTag: (tag: string) => Promise<Result<Note[]>>;
      onTriggerDelete: (callback: (id: string) => void) => () => void;
      onTriggerId: (callback: (id: string) => void) => () => void;
      onTriggerMerge: (callback: (id: string) => void) => () => void;
      onTriggerDuplicate: (callback: (id: string) => void) => () => void;
      onTriggerPin: (callback: (id: string) => void) => () => void;
      onTriggerBookmark: (callback: (id: string) => void) => () => void;
      searchNotes: (
        searchTerm: string,
        limit: number,
      ) => Promise<Result<Note[]>>;
      pin: (id: string) => Promise<Result<boolean>>;
      bookmark: (id: string) => Promise<Result<boolean>>;
      getViews: (view) => Promise<Result<Note[]>>;
      dbMaintenance: (action) => Promise<Result<number>>;
      setActiveNote: (id: string | null) => void;
    };
    storeAPI: {
      onSettingsChanged: (
        callback: (settings: Partial<AppSettings>) => void,
      ) => () => void;
      getSettings: <K extends keyof AppSettings>(
        key: K,
      ) => Promise<Result<AppSettings[K]>>;
      getAllSettings: () => Promise<Result<AppSettings>>;
      setSettings: (
        settings: Partial<AppSettings>,
      ) => Promise<Result<AppSettings>>;
    };
  }
}
