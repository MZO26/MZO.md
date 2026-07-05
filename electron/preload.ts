import type { ImagePayload } from "@shared/schemas/image-schema";
import type {
  CreateNotePayload,
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
import type { MenuType, NoteMenuPayload, ZoomAction } from "@shared/types";
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

//----------------------------------------------------------

contextBridge.exposeInMainWorld(
  "appInfo",
  Object.freeze({
    isMac: process.platform === "darwin",
  }),
);
contextBridge.exposeInMainWorld("electronAPI", {
  getPathForFile: (file: File) => webUtils.getPathForFile(file),
  showNotification: (title: string, body: string) =>
    ipcRenderer.invoke("notification:show", title, body),
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
  showContextMenu: (menuType: MenuType, payload?: NoteMenuPayload) =>
    ipcRenderer.send("context-menu:show", menuType, payload),
  onTriggerTableAction: (callback: (action: string) => void) => {
    subscribe("trigger:table-action", callback);
  },
  onTriggerNoteAction: (callback: (payload: NoteMenuPayload) => void) => {
    subscribe("trigger:note-action", callback);
  },
  onRequestFlush: (callback: () => void) =>
    subscribe("request-flush", () => callback()),
  confirmFlush: () => ipcRenderer.send("flush-confirmed"),
  zoom: (action: ZoomAction) => ipcRenderer.invoke("zoom", action),
  openExternal: (url: string) => ipcRenderer.invoke("open:external", url),
  openAutoExportFolder: (payload: OpenAutoExportPathRequest) =>
    ipcRenderer.invoke("open:auto-export-folder", payload),
  getAutoExportPath: (payload: OpenAutoExportPathRequest) =>
    ipcRenderer.invoke("get:auto-export-path", payload),
  openAppPath: () => ipcRenderer.invoke("open:app-path"),
});
contextBridge.exposeInMainWorld("noteAPI", {
  getAll: () => ipcRenderer.invoke("note:get-all"),
  getAllBackup: () => ipcRenderer.invoke("note:get-all-backup"),
  create: (payload: CreateNotePayload) =>
    ipcRenderer.invoke("note:create", payload),
  createMany: (payload: CreateNotePayload[]) =>
    ipcRenderer.invoke("note:create-many", payload),
  update: (payload: UpdateNotePayload, flush: boolean) =>
    ipcRenderer.invoke("note:update", payload, flush),
  delete: (id: string) => ipcRenderer.invoke("note:delete", id),
  deleteMany: (ids: string[]) => ipcRenderer.invoke("note:delete-many", ids),
  selectAutoExportFolder: () => ipcRenderer.invoke("select:auto-export-folder"),
  noteExport: (payload: ExportRequest) =>
    ipcRenderer.invoke("note:export", payload),
  noteExportMany: (payload: ExportManyRequest) =>
    ipcRenderer.invoke("note:export-many", payload),
  noteImport: (payload: FilePathRequest) =>
    ipcRenderer.invoke("note:import", payload),
  onTriggerExport: (callback: (id: string, extension: string) => void) => {
    subscribe("note:trigger-export", callback);
  },
  onTriggerPath: (callback: (id: string) => void) => {
    subscribe("note:trigger-path", callback);
  },
  onTriggerCopyRichText: (callback: (id: string) => void) => {
    subscribe("note:trigger-copy-rich-text", callback);
  },
  onTriggerCopyPath: (callback: (id: string) => void) => {
    subscribe("note:trigger-copy-path", callback);
  },
  onTriggerDelete: (callback: (id: string) => void) => {
    subscribe("note:trigger-delete", callback);
  },
  onTriggerDuplicate: (callback: (id: string) => void) => {
    subscribe("note:trigger-duplicate", callback);
  },
  onTriggerPin: (callback: (id: string) => void) => {
    subscribe("note:trigger-pin", callback);
  },
  onTriggerSelect: (callback: (id: string) => void) => {
    subscribe("note:trigger-select", callback);
  },
  onTriggerSync: (callback: (id: string) => void) => {
    subscribe("note:trigger-sync", callback);
  },
  syncRequest: (payload: SyncRequestPayload) =>
    ipcRenderer.invoke("note:sync", payload),
  getById: (id: string) => ipcRenderer.invoke("note:getById", id),
  getManyById: (ids: string[]) => ipcRenderer.invoke("note:getManyById", ids),
  pin: (id: string) => ipcRenderer.invoke("note:pin", id),
  pinMany: (ids: string[]) => ipcRenderer.invoke("note:pin-many", ids),
  databaseBackup: () => ipcRenderer.invoke("db-backup"),
  databaseVacuum: () => ipcRenderer.invoke("db-vacuum"),
  databaseBackupRestore: () => ipcRenderer.invoke("db-backup-restore"),
  setActiveNote: (id: string | null) => ipcRenderer.send("note:set-active", id),
});
contextBridge.exposeInMainWorld("storeAPI", {
  onSettingsChanged: (callback: (settings: Partial<AppSettings>) => void) => {
    subscribe("settings-changed", callback);
  },
  getSettings: (key: string) => ipcRenderer.invoke("electron-store:get", key),
  getAllSettings: () => ipcRenderer.invoke("electron-store:getAll"),
  setSettings: (settings: Partial<AppSettings>) =>
    ipcRenderer.invoke("electron-store:set", settings),
});
