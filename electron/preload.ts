import { contextBridge, ipcRenderer } from "electron";
console.log("--- PRELOAD AKTIV ---");

contextBridge.exposeInMainWorld("api", {
  openFile: () => ipcRenderer.invoke("file-open"),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  saveFile: (daten: any) => ipcRenderer.invoke("file-save", daten),
});
contextBridge.exposeInMainWorld("electronAPI", {
  getTheme: () => ipcRenderer.invoke("get-theme"),
  setTheme: (theme: Theme) => ipcRenderer.invoke("set-theme", theme),
  onThemeChanged: (callback: (theme: "dark" | "light") => void) =>
    ipcRenderer.on("theme-changed", (_event, theme) => callback(theme)),
});
contextBridge.exposeInMainWorld("notesAPI", {
  getAll: () => ipcRenderer.invoke("notes:getAll"),
  create: (title: string, content: string) =>
    ipcRenderer.invoke("notes:create", title, content),
  update: (id: string, title: string, content: string) =>
    ipcRenderer.invoke("notes:update", id, title, content),
  delete: (id: string) => ipcRenderer.invoke("notes:delete", id),
  getById: (id: string) => ipcRenderer.invoke("notes:getById", id),
});
