import { contextBridge, ipcRenderer, type IpcRendererEvent } from "electron";
import type {
  CreateNotePayload,
  Theme,
  UpdateNotePayload,
} from "../src/shared/types";
console.log("--- PRELOAD AKTIV ---");

contextBridge.exposeInMainWorld("api", {
  openFile: () => ipcRenderer.invoke("file-open"),
  saveFile: (daten: any) => ipcRenderer.invoke("file-save", daten),
});
contextBridge.exposeInMainWorld("electronAPI", {
  getTheme: () => ipcRenderer.invoke("get:theme"),
  setTheme: (theme: Theme) => ipcRenderer.invoke("set:theme", theme),
  onThemeChanged: (callback: (response: any) => void) =>
    ipcRenderer.on("theme:changed", (_event: IpcRendererEvent, response: any) =>
      callback(response),
    ),
});
contextBridge.exposeInMainWorld("noteAPI", {
  getAll: () => ipcRenderer.invoke("note:getAll"),
  create: (payload: CreateNotePayload) =>
    ipcRenderer.invoke("note:create", payload),
  update: (payload: UpdateNotePayload) =>
    ipcRenderer.invoke("note:update", payload),
  delete: (id: string) => ipcRenderer.invoke("note:delete", id),
  getById: (id: string) => ipcRenderer.invoke("note:getById", id),
  searchNotes: (searchTerm: string) =>
    ipcRenderer.invoke("note:search", searchTerm),
});
contextBridge.exposeInMainWorld("storeApi", {
  getSettings: (key: string) => ipcRenderer.invoke("electron-store:get", key),
  setSettings: (key: string, value: any) =>
    ipcRenderer.invoke("electron-store:set", key, value),
});
