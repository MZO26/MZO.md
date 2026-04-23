import { contextBridge, ipcRenderer } from "electron";
import type { AppTheme } from "../src/shared/schemas/storeSchema";
import type {
  CreateNotePayload,
  ImagePayload,
  Settings,
  UpdateNotePayload,
} from "../src/shared/types";
console.log("--- PRELOAD ACTIVE ---");

contextBridge.exposeInMainWorld("electronAPI", {
  setTheme: (theme: AppTheme) => ipcRenderer.invoke("set:theme", theme),
  saveImage: (payload: ImagePayload) =>
    ipcRenderer.invoke("saveImage", payload),
});
contextBridge.exposeInMainWorld("noteAPI", {
  getAll: () => ipcRenderer.invoke("note:getAll"),
  create: (payload: CreateNotePayload) =>
    ipcRenderer.invoke("note:create", payload),
  update: (payload: UpdateNotePayload, flush: boolean) =>
    ipcRenderer.invoke("note:update", payload, flush),
  delete: (id: string) => ipcRenderer.invoke("note:delete", id),
  getById: (id: string) => ipcRenderer.invoke("note:getById", id),
  searchNotes: (searchTerm: string) =>
    ipcRenderer.invoke("note:search", searchTerm),
});
contextBridge.exposeInMainWorld("storeApi", {
  getSettings: (key: string) => ipcRenderer.invoke("electron-store:get", key),
  setSettings: (settings: Settings) =>
    ipcRenderer.invoke("electron-store:set", settings),
});
