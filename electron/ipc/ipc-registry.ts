import { registerElectronIpc } from "@electron/ipc/ipc-electron";
import { registerFileIpc } from "@electron/ipc/ipc-fs";
import { registerNoteIpc } from "@electron/ipc/ipc-note";
import { registerSettingsIpc } from "@electron/ipc/ipc-settings";
import { BrowserWindow } from "electron";

function registerIpc(win: BrowserWindow) {
  registerElectronIpc(win);
  registerNoteIpc(win);
  registerSettingsIpc(win);
  registerFileIpc(win);
}

export { registerIpc };
