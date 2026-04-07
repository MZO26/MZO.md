import { contextBridge, ipcRenderer, type IpcRendererEvent } from "electron";
import type { Theme } from "../src/shared/types";
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
  create: (title: string, content: string, tags: string[] = []) =>
    ipcRenderer.invoke("note:create", title, content, tags),
  update: (id: string, title: string, content: string, tags: string[] = []) =>
    ipcRenderer.invoke("note:update", id, title, content, tags),
  delete: (id: string) => ipcRenderer.invoke("note:delete", id),
  getById: (id: string) => ipcRenderer.invoke("note:getById", id),
});
contextBridge.exposeInMainWorld("storeApi", {
  getSettings: (key: string) => ipcRenderer.invoke("electron-store:get", key),
  setSettings: (key: string, value: any) =>
    ipcRenderer.invoke("electron-store:set", key, value),
});
