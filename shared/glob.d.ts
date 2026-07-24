import type { Note, NoteListItem } from "@shared/schemas/note-schema";
import type {
  ExportRequest,
  FilePathRequest,
  ImportRequest,
  OpenAutoExportPathRequest,
  SyncRequestPayload,
} from "@shared/schemas/request-schema";
import type { AppSettings, Theme } from "@shared/schemas/store-schema";
import {
  Result,
  type CreateNotePayload,
  type ImagePayload,
  type UpdateNotePayload,
} from "@shared/shared/types";
import type {
  ExportedContent,
  ImportStats,
  MenuType,
  NoteMenuPayload,
  SyncResult,
} from "@shared/types";

declare global {
  interface Window {
    appInfo: Readonly<{ isMac: boolean }>;
    electronAPI: {
      getPathForFile: (file: File) => string;
      showNotification: (title: string, body: string) => Promise<Result<void>>;
      setTheme: (theme: Theme, focus?: boolean) => Promise<Result<Theme>>;
      windowPin: () => Promise<Result<boolean>>;
      imageWriteMany: (payload: ImagePayload[]) => Promise<
        Result<
          {
            imageSrc: string;
          }[]
        >
      >;
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
      openExternal: (url: string) => Promise<Result<void>>;
      openAutoExportFolder: (
        payload: OpenAutoExportPathRequest,
      ) => Promise<Result<boolean>>;
      openInDefaultEditor: (
        payload: OpenAutoExportPathRequest,
      ) => Promise<Result<boolean>>;
      getAutoExportPath: (
        payload: OpenAutoExportPathRequest,
      ) => Promise<Result<string | null>>;
      openAppPath: () => Promise<Result<boolean>>;
    };
    noteAPI: {
      getAll: () => Promise<Result<NoteListItem[]>>;
      getAllBackup: () => Promise<Result<Note[]>>;
      getById: (id: string) => Promise<Result<Note>>;
      getManyById: (ids: string[]) => Promise<Result<Note[]>>;
      create: (payload: CreateNotePayload) => Promise<Result<NoteListItem>>;
      createMany: (
        payload: CreateNotePayload[],
      ) => Promise<Result<NoteListItem[]>>;
      update: (
        payload: UpdateNotePayload,
        flush: boolean,
      ) => Promise<Result<NoteListItem>>;
      delete: (id: string) => Promise<Result<void>>;
      deleteMany: (ids: string[]) => Promise<Result<void>>;
      selectAutoExportFolder: () => Promise<Result<string>>;
      noteExport: (payload: ExportRequest) => Promise<Result<ExportRequest>>;
      onTriggerExport: (
        callback: (id: string, extension: string) => void,
      ) => () => void;
      onTriggerPath: (callback: (id: string) => void) => () => void;
      onTriggerDefaultEditor: (callback: (id: string) => void) => () => void;
      onTriggerCopyRichText: (callback: (id: string) => void) => () => void;
      onTriggerCopyPath: (callback: (id: string) => void) => () => void;
      noteExportMany: (
        payload: ExportedContent[],
      ) => Promise<Result<ExportedContent[]>>;
      noteImport: (
        payload: FilePathRequest,
      ) => Promise<Result<{ data: ImportRequest[]; stats: ImportStats }>>;
      onTriggerDelete: (callback: (id: string) => void) => () => void;
      onTriggerDuplicate: (callback: (id: string) => void) => () => void;
      onTriggerPin: (callback: (id: string) => void) => () => void;
      onTriggerSelect: (callback: (id: string) => void) => () => void;
      onTriggerSync: (callback: (id: string) => void) => () => void;
      syncRequest: (payload: SyncRequestPayload) => Promise<Result<SyncResult>>;
      pin: (id: string) => Promise<Result<boolean>>;
      pinMany: (ids: string[]) => Promise<Result<boolean>>;
      databaseBackup: () => Promise<Result<number>>;
      databaseBackupRestore: () => Promise<Result<void>>;
      setActiveNote: (id: string) => void;
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
