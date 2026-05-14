import type {
  ExportManyRequest,
  ExportRequest,
} from "@shared/schemas/export-schema";
import type { ImagePayload } from "@shared/schemas/image-schema";
import type {
  CreateNotePayload,
  UpdateNotePayload,
} from "@shared/schemas/note-schema";
import type { AppSettings, Theme } from "@shared/schemas/store-schema";
import type { ZoomAction } from "@shared/types";
import { contextBridge, ipcRenderer, type IpcRendererEvent } from "electron";

console.log("--- PRELOAD ACTIVE ---");

function subscribe<T>(
  channel: string,
  callback: (payload: T) => void,
): () => void {
  const listener = (_e: IpcRendererEvent, payload: T) => {
    callback(payload);
  };
  ipcRenderer.on(channel, listener);
  return () => {
    ipcRenderer.removeListener(channel, listener);
  };
}
contextBridge.exposeInMainWorld("fileAPI", {
  selectFolder: () => ipcRenderer.invoke("select-folder"),
  noteExport: (payload: ExportRequest) =>
    ipcRenderer.invoke("note:export", payload),
  onTriggerExport: (callback: (payload: ExportRequest) => void) => {
    subscribe("note:trigger-export", callback);
  },
  noteExportMany: (payload: ExportManyRequest) =>
    ipcRenderer.invoke("note:export-many", payload),
  noteImport: () => ipcRenderer.invoke("note:import"),
});
contextBridge.exposeInMainWorld("electronAPI", {
  platform: () => ipcRenderer.invoke("platform:get"),
  setTheme: (theme: Theme, focus?: boolean) =>
    ipcRenderer.invoke("set:theme", theme, focus),
  onThemeChanged: (callback: (theme: Theme) => void) => {
    subscribe("theme-changed", callback);
  },
  saveImage: (payload: ImagePayload) =>
    ipcRenderer.invoke("saveImage", payload),
  showContextMenu: (id: string, pinned: boolean, bookmarked: boolean) =>
    ipcRenderer.send("show-note-menu", id, pinned, bookmarked),
  onRequestFlush: (callback: () => void) =>
    subscribe("request-flush", () => callback()),
  confirmFlush: () => ipcRenderer.send("flush-confirmed"),
  zoom: (action: ZoomAction) => ipcRenderer.invoke("zoom", action),
});
contextBridge.exposeInMainWorld("noteAPI", {
  getAll: () => ipcRenderer.invoke("note:getAll"),
  create: (payload: CreateNotePayload) =>
    ipcRenderer.invoke("note:create", payload),
  createMany: (payload: CreateNotePayload[]) =>
    ipcRenderer.invoke("note:create-many", payload),
  update: (payload: UpdateNotePayload, flush: boolean) =>
    ipcRenderer.invoke("note:update", payload, flush),
  delete: (id: string) => ipcRenderer.invoke("note:delete", id),
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
  onTriggerBookmark: (callback: (id: string) => void) => {
    subscribe("note:trigger-bookmark", callback);
  },
  getById: (id: string) => ipcRenderer.invoke("note:getById", id),
  getByTag: (tag: string) => ipcRenderer.invoke("note:getByTag", tag),
  searchNotes: (searchTerm: string) =>
    ipcRenderer.invoke("note:search", searchTerm),
  pin: (id: string) => ipcRenderer.invoke("note:pin", id),
  bookmark: (id: string) => ipcRenderer.invoke("note:bookmark", id),
  getViews: (view: string) => ipcRenderer.invoke("views:get", view),
  setActiveNote: (id: string | null) => ipcRenderer.send("set-active-note", id),
});
contextBridge.exposeInMainWorld("storeAPI", {
  onSettingsChanged: (callback: (settings: Partial<AppSettings>) => void) => {
    subscribe("settings-change", callback);
  },
  getSettings: (key: string) => ipcRenderer.invoke("electron-store:get", key),
  getAllSettings: () => ipcRenderer.invoke("electron-store:getAll"),
  setSettings: (settings: Partial<AppSettings>) =>
    ipcRenderer.invoke("electron-store:set", settings),
});
