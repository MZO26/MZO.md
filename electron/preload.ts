import { IPC_CHANNELS } from "@electron/ipc/ipc-channels";
import type {
  MenuType,
  Url,
  ZoomAction,
} from "@shared/schemas/electron-schema";
import type { ImagePayload } from "@shared/schemas/image-schema";
import type {
  CreateNotePayload,
  Id,
  NoteMenuPayload,
  SearchQuery,
  UpdateNotePayload,
} from "@shared/schemas/note-schema";
import type {
  ExportManyRequest,
  ExportRequest,
  FilePathRequest,
  OpenAutoExportPathRequest,
  SyncRequestPayload,
} from "@shared/schemas/request-schema";
import type { AppSettings, Theme } from "@shared/schemas/store-schema";
import type { TableAction, ValueOf } from "@shared/shared-types";
import {
  contextBridge,
  ipcRenderer,
  webUtils,
  type IpcRendererEvent,
} from "electron";

function subscribe<T extends unknown[]>(
  channel: ValueOf<typeof IPC_CHANNELS>,
  callback: (...args: T) => void,
): () => void {
  const listener = (_e: IpcRendererEvent, ...args: T) => {
    callback(...args);
  };
  ipcRenderer.on(channel, listener);
  return () => {
    ipcRenderer.removeListener(channel, listener);
  };
}
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld("electronAPI", {
      getPathForFile: (file: File) => webUtils.getPathForFile(file),
      showNotification: (
        title: Notification["title"],
        body: Notification["body"],
      ) => ipcRenderer.invoke(IPC_CHANNELS.SHOW_NOTIFICATION, title, body),
      setTheme: (theme: Theme, focus?: boolean) =>
        ipcRenderer.invoke(IPC_CHANNELS.SET_THEME, theme, focus),
      windowPin: () => ipcRenderer.invoke(IPC_CHANNELS.APP_PIN),
      imageWriteMany: (payload: ImagePayload[]) =>
        ipcRenderer.invoke(IPC_CHANNELS.WRITE_IMAGE, payload),
      onThemeChanged: (
        callback: (resolvedTheme: Extract<Theme, "dark" | "light">) => void,
      ) => {
        subscribe(IPC_CHANNELS.THEME_CHANGED, callback);
      },
      showContextMenu: (type: MenuType, payload?: NoteMenuPayload) =>
        ipcRenderer.send(IPC_CHANNELS.SHOW_CONTEXT_MENU, type, payload),
      onTriggerTableAction: (callback: (action: TableAction) => void) => {
        subscribe(IPC_CHANNELS.TRIGGER_TABLE_ACTION, callback);
      },
      onTriggerNoteAction: (callback: (payload: NoteMenuPayload) => void) => {
        subscribe(IPC_CHANNELS.TRIGGER_NOTE_ITEM_ACTION, callback);
      },
      onRequestFlush: (callback: () => void) =>
        subscribe(IPC_CHANNELS.REQUEST_FLUSH, () => callback()),
      confirmFlush: () => ipcRenderer.send(IPC_CHANNELS.CONFIRM_FLUSH),
      zoom: (action: ZoomAction) =>
        ipcRenderer.invoke(IPC_CHANNELS.APP_ZOOM, action),
      openExternal: (url: Url) =>
        ipcRenderer.invoke(IPC_CHANNELS.OPEN_EXTERNAL, url),
      openAutoExportFolder: (payload: OpenAutoExportPathRequest) =>
        ipcRenderer.invoke(IPC_CHANNELS.OPEN_AUTO_EXPORT_FOLDER, payload),
      openInDefaultEditor: (payload: OpenAutoExportPathRequest) =>
        ipcRenderer.invoke(IPC_CHANNELS.OPEN_DEFAULT_EDITOR, payload),
      getAutoExportPath: (payload: OpenAutoExportPathRequest) =>
        ipcRenderer.invoke(IPC_CHANNELS.GET_AUTO_EXPORT_PATH, payload),
      openAppPath: () => ipcRenderer.invoke(IPC_CHANNELS.OPEN_APP_PATH),
    });
    contextBridge.exposeInMainWorld("noteAPI", {
      search: (query: SearchQuery) =>
        ipcRenderer.invoke(IPC_CHANNELS.NOTE_SEARCH, query),
      getAll: () => ipcRenderer.invoke(IPC_CHANNELS.GET_ALL_NOTES),
      getAllBackup: () => ipcRenderer.invoke(IPC_CHANNELS.GET_ALL_NOTES_BACKUP),
      create: (payload: CreateNotePayload) =>
        ipcRenderer.invoke(IPC_CHANNELS.NOTE_CREATE, payload),
      createMany: (payload: CreateNotePayload[]) =>
        ipcRenderer.invoke(IPC_CHANNELS.NOTE_CREATE_MANY, payload),
      update: (payload: UpdateNotePayload, flush: boolean) =>
        ipcRenderer.invoke(IPC_CHANNELS.NOTE_UPDATE, payload, flush),
      delete: (id: Id) => ipcRenderer.invoke(IPC_CHANNELS.NOTE_DELETE, id),
      deleteMany: (ids: Id[]) =>
        ipcRenderer.invoke(IPC_CHANNELS.NOTE_DELETE_MANY, ids),
      selectAutoExportFolder: () =>
        ipcRenderer.invoke(IPC_CHANNELS.SELECT_AUTO_EXPORT_FOLDER),
      noteExport: (payload: ExportRequest) =>
        ipcRenderer.invoke(IPC_CHANNELS.NOTE_EXPORT, payload),
      noteExportMany: (payload: ExportManyRequest) =>
        ipcRenderer.invoke(IPC_CHANNELS.NOTE_EXPORT_MANY, payload),
      noteImport: (payload: FilePathRequest) =>
        ipcRenderer.invoke(IPC_CHANNELS.NOTE_IMPORT, payload),
      onTriggerExport: (
        callback: (id: Id, extension: ExportRequest["extension"]) => void,
      ) => {
        subscribe(IPC_CHANNELS.TRIGGER_EXPORT, callback);
      },
      onTriggerPath: (callback: (id: Id) => void) => {
        subscribe(IPC_CHANNELS.TRIGGER_SHOW_IN_FOLDER, callback);
      },
      onTriggerDefaultEditor: (callback: (id: Id) => void) => {
        subscribe(IPC_CHANNELS.TRIGGER_OPEN_DEFAULT_EDITOR, callback);
      },
      onTriggerCopyRichText: (callback: (id: Id) => void) => {
        subscribe(IPC_CHANNELS.TRIGGER_COPY_RICH_TEXT, callback);
      },
      onTriggerCopyPath: (callback: (id: Id) => void) => {
        subscribe(IPC_CHANNELS.TRIGGER_COPY_PATH, callback);
      },
      onTriggerDelete: (callback: (id: Id) => void) => {
        subscribe(IPC_CHANNELS.TRIGGER_DELETE, callback);
      },
      onTriggerDuplicate: (callback: (id: Id) => void) => {
        subscribe(IPC_CHANNELS.TRIGGER_DUPLICATE, callback);
      },
      onTriggerPin: (callback: (id: Id) => void) => {
        subscribe(IPC_CHANNELS.TRIGGER_PIN, callback);
      },
      onTriggerSelect: (callback: (id: Id) => void) => {
        subscribe(IPC_CHANNELS.TRIGGER_SELECT, callback);
      },
      onTriggerSync: (callback: (id: Id) => void) => {
        subscribe(IPC_CHANNELS.TRIGGER_SYNC, callback);
      },
      onTriggerCopySelectionRichText: (callback: () => void) => {
        subscribe(IPC_CHANNELS.TRIGGER_COPY_SELECTION_RICH_TEXT, callback);
      },
      onTriggerCopySelectionMarkdown: (callback: () => void) => {
        subscribe(IPC_CHANNELS.TRIGGER_COPY_SELECTION_MARKDOWN, callback);
      },
      onTriggerCopySelectionHTML: (callback: () => void) => {
        subscribe(IPC_CHANNELS.TRIGGER_COPY_SELECTION_HTML, callback);
      },
      syncRequest: (payload: SyncRequestPayload) =>
        ipcRenderer.invoke(IPC_CHANNELS.NOTE_SYNC, payload),
      getById: (id: Id) => ipcRenderer.invoke(IPC_CHANNELS.NOTE_GET_BY_ID, id),
      getManyById: (ids: Id[]) =>
        ipcRenderer.invoke(IPC_CHANNELS.NOTE_GET_MANY_BY_ID, ids),
      pin: (id: Id) => ipcRenderer.invoke(IPC_CHANNELS.NOTE_PIN, id),
      pinMany: (ids: Id[]) =>
        ipcRenderer.invoke(IPC_CHANNELS.NOTE_PIN_MANY, ids),
      databaseBackup: () => ipcRenderer.invoke(IPC_CHANNELS.DB_BACKUP),
      databaseBackupRestore: () =>
        ipcRenderer.invoke(IPC_CHANNELS.DB_BACKUP_RESTORE),
      setActiveNote: (id: Id) =>
        ipcRenderer.send(IPC_CHANNELS.SET_ACTIVE_NOTE, id),
    });
    contextBridge.exposeInMainWorld("storeAPI", {
      getSettings: (key: keyof AppSettings) =>
        ipcRenderer.invoke(IPC_CHANNELS.GET_SETTING, key),
      getAllSettings: () => ipcRenderer.invoke(IPC_CHANNELS.GET_ALL_SETTINGS),
      setSettings: (settings: Partial<AppSettings>) =>
        ipcRenderer.invoke(IPC_CHANNELS.SET_SETTING, settings),
    });
  } catch (error) {
    console.error("[PRELOAD]: Failed to load preload:", error);
    throw error;
  }
}
