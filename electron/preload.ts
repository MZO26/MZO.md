import type {
  ExportManyRequest,
  ExportRequest,
  OpenAutoExportPathRequest,
} from "@shared/schemas/export-schema";
import type { ImagePayload } from "@shared/schemas/image-schema";
import type {
  CreateNotePayload,
  UpdateNotePayload,
} from "@shared/schemas/note-schema";
import type { AppSettings, Theme } from "@shared/schemas/store-schema";
import type {
  MenuType,
  NoteMenuPayload,
  ViewId,
  ZoomAction,
} from "@shared/types";
import { contextBridge, ipcRenderer, type IpcRendererEvent } from "electron";

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
  startupReady: () => ipcRenderer.send("app:start-ready"),
  showNotification: (title: string, body: string) =>
    ipcRenderer.invoke("notification:show", title, body),
  setTheme: (theme: Theme, focus?: boolean) =>
    ipcRenderer.invoke("theme:set", theme, focus),
  windowPin: () => ipcRenderer.invoke("app:pin"),
  imageWrite: (payload: ImagePayload) =>
    ipcRenderer.invoke("image:write", payload),
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
  noteImport: () => ipcRenderer.invoke("note:import"),
  onTriggerExport: (callback: (id: string, extension: string) => void) => {
    subscribe("note:trigger-export", callback);
  },
  onTriggerPath: (callback: (id: string) => void) => {
    subscribe("note:trigger-path", callback);
  },
  onTriggerCopyMarkdown: (callback: (id: string) => void) => {
    subscribe("note:trigger-copy-markdown", callback);
  },
  onTriggerCopyPath: (callback: (id: string) => void) => {
    subscribe("note:trigger-copy-path", callback);
  },
  onTriggerDelete: (callback: (id: string) => void) => {
    subscribe("note:trigger-delete", callback);
  },
  onTriggerId: (callback: (id: string) => void) => {
    subscribe("note:trigger-id", callback);
  },
  onTriggerDuplicate: (callback: (id: string) => void) => {
    subscribe("note:trigger-duplicate", callback);
  },
  onTriggerPin: (callback: (id: string) => void) => {
    subscribe("note:trigger-pin", callback);
  },
  getById: (id: string) => ipcRenderer.invoke("note:getById", id),
  getManyById: (ids: string[]) => ipcRenderer.invoke("note:getManyById", ids),
  pin: (id: string) => ipcRenderer.invoke("note:pin", id),
  getViews: (view: ViewId, id: string | null) =>
    ipcRenderer.invoke("views:get", view, id),
  dbMaintenance: (action: string) =>
    ipcRenderer.invoke("db-maintenance", action),
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
