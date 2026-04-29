import { contextBridge, ipcRenderer } from "electron";
import type { ImagePayload } from "../shared/schemas/imageSchema";
import type {
  CreateNotePayload,
  UpdateNotePayload,
} from "../shared/schemas/noteSchema";
import type { AppSettings, Theme } from "../shared/schemas/storeSchema";

console.log("--- PRELOAD ACTIVE ---");

contextBridge.exposeInMainWorld("electronAPI", {
  setTheme: (theme: Theme, focus?: boolean) =>
    ipcRenderer.invoke("set:theme", theme, focus),
  onThemeChanged: (callback: (theme: Theme) => void) => {
    ipcRenderer.removeAllListeners("theme-changed");
    const listener = (_event: any, theme: Theme) => callback(theme);
    ipcRenderer.on("theme-changed", listener);
    return () => ipcRenderer.removeListener("theme-changed", listener);
  },
  saveImage: (payload: ImagePayload) =>
    ipcRenderer.invoke("saveImage", payload),
  showContextMenu: (id: string, pinned: boolean, bookmarked: boolean) =>
    ipcRenderer.send("show-note-menu", id, pinned, bookmarked),
});
contextBridge.exposeInMainWorld("noteAPI", {
  getAll: () => ipcRenderer.invoke("note:getAll"),
  create: (payload: CreateNotePayload) =>
    ipcRenderer.invoke("note:create", payload),
  update: (payload: UpdateNotePayload, flush: boolean) =>
    ipcRenderer.invoke("note:update", payload, flush),
  delete: (id: string) => ipcRenderer.invoke("note:delete", id),
  onTriggerDelete: (callback: (id: string) => void) => {
    ipcRenderer.removeAllListeners("note:trigger-delete");
    const listener = (_event: any, id: string) => callback(id);
    ipcRenderer.on("note:trigger-delete", listener);
    return () => ipcRenderer.removeListener("note:trigger-delete", listener);
  },
  onTriggerDuplicate: (callback: (id: string) => void) => {
    ipcRenderer.removeAllListeners("note:trigger-duplicate");
    const listener = (_event: any, id: string) => callback(id);
    ipcRenderer.on("note:trigger-duplicate", listener);
    return () => ipcRenderer.removeListener("note:trigger-duplicate", listener);
  },
  onTriggerPin: (callback: (id: string) => void) => {
    ipcRenderer.removeAllListeners("note:trigger-pin");
    const listener = (_event: any, id: string) => callback(id);
    ipcRenderer.on("note:trigger-pin", listener);
    return () => ipcRenderer.removeListener("note:trigger-pin", listener);
  },
  onTriggerBookmark: (callback: (id: string) => void) => {
    ipcRenderer.removeAllListeners("note:trigger-bookmark");
    const listener = (_event: any, id: string) => callback(id);
    ipcRenderer.on("note:trigger-bookmark", listener);
    return () => ipcRenderer.removeListener("note:trigger-bookmark", listener);
  },
  getById: (id: string) => ipcRenderer.invoke("note:getById", id),
  searchNotes: (searchTerm: string) =>
    ipcRenderer.invoke("note:search", searchTerm),
  pin: (id: string) => ipcRenderer.invoke("note:pin", id),
  bookmark: (id: string) => ipcRenderer.invoke("note:bookmark", id),
  getViews: (view: string) => ipcRenderer.invoke("views:get", view),
});
contextBridge.exposeInMainWorld("storeApi", {
  getSettings: (key: string) => ipcRenderer.invoke("electron-store:get", key),
  setSettings: (settings: AppSettings) =>
    ipcRenderer.invoke("electron-store:set", settings),
});
