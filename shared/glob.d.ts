import type {
  MenuType,
  Notification,
  Url,
  ZoomAction,
} from "@shared/schemas/electron-schema";
import type { ImagePayload } from "@shared/schemas/image-schema";
import type {
  CreateNotePayload,
  Id,
  Note,
  NoteListItem,
  NoteMenuPayload,
  SearchQuery,
  SearchResult,
  UpdateNotePayload,
} from "@shared/schemas/note-schema";
import type {
  ExportContent,
  ExportRequest,
  FilePathRequest,
  ImportRequest,
  OpenAutoExportPathRequest,
  SyncRequestPayload,
  SyncResult,
} from "@shared/schemas/request-schema";
import type { AppSettings, Theme } from "@shared/schemas/store-schema";
import type { ImportStats, Result, TableAction } from "@shared/shared-types";

declare global {
  interface Window {
    electronAPI: {
      getPathForFile: (file: File) => string;
      showNotification: (
        title: Notification["title"],
        body: Notification["body"],
      ) => Promise<Result<void>>;
      setTheme: (
        theme: Theme,
        focus?: boolean,
      ) => Promise<Result<Exclude<Theme, "system">>>;
      windowPin: () => Promise<Result<boolean>>;
      imageWriteMany: (
        payload: ImagePayload[],
      ) => Promise<Result<{ imageSrc: string }[]>>;
      onThemeChanged: (
        callback: (resolvedTheme: Extract<Theme, "dark" | "light">) => void,
      ) => () => void;
      showContextMenu: (menuType: MenuType, payload?: NoteMenuPayload) => void;
      onTriggerTableAction: (callback: (action: TableAction) => void) => void;
      onTriggerNoteAction: (
        callback: (payload: NoteMenuPayload) => void,
      ) => void;
      onRequestFlush: (callback: () => void) => () => void;
      confirmFlush: () => void;
      zoom: (action: ZoomAction) => Promise<Result<number>>;
      openExternal: (url: Url) => Promise<Result<string | void>>;
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
      search: (query: SearchQuery) => Promise<Result<SearchResult[]>>;
      getAll: () => Promise<Result<readonly NoteListItem[]>>;
      getAllBackup: () => Promise<Result<readonly Note[]>>;
      getById: (id: Id) => Promise<Result<Readonly<Note>>>;
      getManyById: (ids: Id[]) => Promise<Result<readonly Note[]>>;
      create: (payload: CreateNotePayload) => Promise<Result<NoteListItem>>;
      createMany: (
        payload: CreateNotePayload[],
      ) => Promise<Result<readonly NoteListItem[]>>;
      update: (
        payload: UpdateNotePayload,
        flush: boolean,
      ) => Promise<Result<NoteListItem>>;
      delete: (id: Id) => Promise<Result<void>>;
      deleteMany: (ids: Id[]) => Promise<Result<void>>;
      selectAutoExportFolder: () => Promise<Result<string>>;
      noteExport: (payload: ExportRequest) => Promise<Result<ExportRequest>>;
      onTriggerExport: (
        callback: (id: Id, extension: ExportContent["extension"]) => void,
      ) => () => void;
      onTriggerPath: (callback: (id: Id) => void) => () => void;
      onTriggerDefaultEditor: (callback: (id: Id) => void) => () => void;
      onTriggerCopyRichText: (callback: (id: Id) => void) => () => void;
      onTriggerCopyPath: (callback: (id: Id) => void) => () => void;
      noteExportMany: (
        payload: ExportContent[],
      ) => Promise<Result<ExportContent[]>>;
      noteImport: (
        payload: FilePathRequest,
      ) => Promise<Result<{ data: ImportRequest[]; stats: ImportStats }>>;
      onTriggerDelete: (callback: (id: Id) => void) => () => void;
      onTriggerDuplicate: (callback: (id: Id) => void) => () => void;
      onTriggerPin: (callback: (id: Id) => void) => () => void;
      onTriggerSelect: (callback: (id: Id) => void) => () => void;
      onTriggerSync: (callback: (id: Id) => void) => () => void;
      syncRequest: (payload: SyncRequestPayload) => Promise<Result<SyncResult>>;
      pin: (id: Id) => Promise<Result<boolean>>;
      pinMany: (ids: Id[]) => Promise<Result<boolean>>;
      databaseBackup: () => Promise<Result<number>>;
      databaseBackupRestore: () => Promise<Result<void>>;
      setActiveNote: (id: Id) => void;
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
