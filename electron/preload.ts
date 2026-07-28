import type { Url } from "@shared/schemas/editor-schema";
import type { MenuType, ZoomAction } from "@shared/schemas/electron-schema";
import type { ImagePayload } from "@shared/schemas/image-schema";
import type {
  CreateNotePayload,
  Id,
  Ids,
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
import type { TableAction } from "@shared/types";
import {
  contextBridge,
  ipcRenderer,
  webUtils,
  type IpcRendererEvent,
} from "electron";

function subscribe<T extends unknown[]>(
  channel: string,
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

contextBridge.exposeInMainWorld(
  "appInfo",
  Object.freeze({
    isMac: process.platform === "darwin",
  }),
);
contextBridge.exposeInMainWorld("electronAPI", {
  getPathForFile: (file: File) => webUtils.getPathForFile(file),
  showNotification: (
    title: Notification["title"],
    body: Notification["body"],
  ) => ipcRenderer.invoke("notification:show", title, body),
  setTheme: (theme: Theme, focus?: boolean) =>
    ipcRenderer.invoke("theme:set", theme, focus),
  windowPin: () => ipcRenderer.invoke("app:pin"),
  imageWriteMany: (payload: ImagePayload[]) =>
    ipcRenderer.invoke("image:write-many", payload),
  onThemeChanged: (
    callback: (resolvedTheme: Extract<Theme, "dark" | "light">) => void,
  ) => {
    subscribe("theme-changed", callback);
  },
  showContextMenu: (type: MenuType, payload?: NoteMenuPayload) =>
    ipcRenderer.send("context-menu:show", type, payload),
  onTriggerTableAction: (callback: (action: TableAction) => void) => {
    subscribe("trigger:table-action", callback);
  },
  onTriggerNoteAction: (callback: (payload: NoteMenuPayload) => void) => {
    subscribe("trigger:note-action", callback);
  },
  onRequestFlush: (callback: () => void) =>
    subscribe("request-flush", () => callback()),
  confirmFlush: () => ipcRenderer.send("flush-confirmed"),
  zoom: (action: ZoomAction) => ipcRenderer.invoke("zoom", action),
  openExternal: (url: Url) => ipcRenderer.invoke("open:external", url),
  openAutoExportFolder: (payload: OpenAutoExportPathRequest) =>
    ipcRenderer.invoke("open:auto-export-folder", payload),
  openInDefaultEditor: (payload: OpenAutoExportPathRequest) =>
    ipcRenderer.invoke("open:default-editor", payload),
  getAutoExportPath: (payload: OpenAutoExportPathRequest) =>
    ipcRenderer.invoke("get:auto-export-path", payload),
  openAppPath: () => ipcRenderer.invoke("open:app-path"),
});
contextBridge.exposeInMainWorld("noteAPI", {
  search: (query: SearchQuery) => ipcRenderer.invoke("note:search", query),
  getAll: () => ipcRenderer.invoke("note:get-all"),
  getAllBackup: () => ipcRenderer.invoke("note:get-all-backup"),
  create: (payload: CreateNotePayload) =>
    ipcRenderer.invoke("note:create", payload),
  createMany: (payload: CreateNotePayload[]) =>
    ipcRenderer.invoke("note:create-many", payload),
  update: (payload: UpdateNotePayload, flush: boolean) =>
    ipcRenderer.invoke("note:update", payload, flush),
  delete: (id: Id) => ipcRenderer.invoke("note:delete", id),
  deleteMany: (ids: Ids) => ipcRenderer.invoke("note:delete-many", ids),
  selectAutoExportFolder: () => ipcRenderer.invoke("select:auto-export-folder"),
  noteExport: (payload: ExportRequest) =>
    ipcRenderer.invoke("note:export", payload),
  noteExportMany: (payload: ExportManyRequest) =>
    ipcRenderer.invoke("note:export-many", payload),
  noteImport: (payload: FilePathRequest) =>
    ipcRenderer.invoke("note:import", payload),
  onTriggerExport: (
    callback: (id: Id, extension: ExportRequest["extension"]) => void,
  ) => {
    subscribe("note:trigger-export", callback);
  },
  onTriggerPath: (callback: (id: Id) => void) => {
    subscribe("note:trigger-path", callback);
  },
  onTriggerDefaultEditor: (callback: (id: Id) => void) => {
    subscribe("note:trigger-default-editor", callback);
  },
  onTriggerCopyRichText: (callback: (id: Id) => void) => {
    subscribe("note:trigger-copy-rich-text", callback);
  },
  onTriggerCopyPath: (callback: (id: Id) => void) => {
    subscribe("note:trigger-copy-path", callback);
  },
  onTriggerDelete: (callback: (id: Id) => void) => {
    subscribe("note:trigger-delete", callback);
  },
  onTriggerDuplicate: (callback: (id: Id) => void) => {
    subscribe("note:trigger-duplicate", callback);
  },
  onTriggerPin: (callback: (id: Id) => void) => {
    subscribe("note:trigger-pin", callback);
  },
  onTriggerSelect: (callback: (id: Id) => void) => {
    subscribe("note:trigger-select", callback);
  },
  onTriggerSync: (callback: (id: Id) => void) => {
    subscribe("note:trigger-sync", callback);
  },
  syncRequest: (payload: SyncRequestPayload) =>
    ipcRenderer.invoke("note:sync", payload),
  getById: (id: Id) => ipcRenderer.invoke("note:getById", id),
  getManyById: (ids: Ids) => ipcRenderer.invoke("note:getManyById", ids),
  pin: (id: Id) => ipcRenderer.invoke("note:pin", id),
  pinMany: (ids: Ids) => ipcRenderer.invoke("note:pin-many", ids),
  databaseBackup: () => ipcRenderer.invoke("db-backup"),
  databaseBackupRestore: () => ipcRenderer.invoke("db-backup-restore"),
  setActiveNote: (id: Id) => ipcRenderer.send("note:set-active", id),
});
contextBridge.exposeInMainWorld("storeAPI", {
  onSettingsChanged: (callback: (settings: Partial<AppSettings>) => void) => {
    subscribe("settings-changed", callback);
  },
  getSettings: (key: keyof AppSettings) =>
    ipcRenderer.invoke("electron-store:get", key),
  getAllSettings: () => ipcRenderer.invoke("electron-store:getAll"),
  setSettings: (settings: Partial<AppSettings>) =>
    ipcRenderer.invoke("electron-store:set", settings),
});
