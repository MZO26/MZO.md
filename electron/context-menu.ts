import { isAutoExport } from "@electron/fs/fs-auto-export";
import { store } from "@electron/store";
import type { NoteMenuPayload } from "@shared/types";
import { ipcMain, Menu, type BrowserWindow } from "electron";

let activeId: string | null = null;

ipcMain.on("note:set-active", (_e, id: string | null) => {
  activeId = id;
});

async function setUpEditorMenu(win: BrowserWindow) {
  const { default: contextMenu } = await import("electron-context-menu");
  contextMenu({
    window: win,
    shouldShowMenu: (_event, params) =>
      params.isEditable || params.mediaType === "image" || !!params.linkURL,
    menu: (defaultActions) => [
      defaultActions.cut({}),
      defaultActions.copy({}),
      defaultActions.paste({}),
      defaultActions.separator(),
      defaultActions.searchWithGoogle({}),
      defaultActions.lookUpSelection({}),
      defaultActions.separator(),
      defaultActions.selectAll({}),
      defaultActions.separator(),
      defaultActions.copyImage({}),
      defaultActions.copyImageAddress({}),
      defaultActions.copyLink({}),
    ],
  });
}
function setUpTableMenu(win: BrowserWindow) {
  const tableMenu = Menu.buildFromTemplate([
    {
      label: "Add Row Before",
      click: () => win.webContents.send("trigger:table-action", "addRowBefore"),
    },
    {
      label: "Add Row After",
      click: () => win.webContents.send("trigger:table-action", "addRowAfter"),
    },
    { type: "separator" },
    {
      label: "Add Column Before",
      click: () =>
        win.webContents.send("trigger:table-action", "addColumnBefore"),
    },
    {
      label: "Add Column After",
      click: () =>
        win.webContents.send("trigger:table-action", "addColumnAfter"),
    },
    { type: "separator" },
    {
      label: "Delete Row",
      click: () => win.webContents.send("trigger:table-action", "deleteRow"),
    },
    {
      label: "Delete Column",
      click: () => win.webContents.send("trigger:table-action", "deleteColumn"),
    },
    {
      label: "Delete Table",
      click: () => win.webContents.send("trigger:table-action", "deleteTable"),
    },
  ]);
  return tableMenu;
}

async function setUpNoteMenu(win: BrowserWindow, payload: NoteMenuPayload) {
  const { id, pinned } = payload;
  const hasAutoExportedFile = await isAutoExport(id);
  const noteItemMenu = Menu.buildFromTemplate([
    {
      label: "Copy...",
      submenu: [
        {
          label: "Rich Text",
          click: () => win.webContents.send("note:trigger-copy-rich-text", id),
        },
        {
          label: "File Path",
          enabled:
            activeId !== null &&
            activeId === id &&
            store.get("auto-export") === true &&
            hasAutoExportedFile,
          visible: store.get("auto-export") === true,
          click: () => win.webContents.send("note:trigger-copy-path", id),
        },
      ],
    },
    { type: "separator" },
    {
      label: "Select...",
      click: () => win.webContents.send("note:trigger-select", id),
    },
    {
      label: pinned ? "Unpin Note" : "Pin to Top",
      click: () => win.webContents.send("note:trigger-pin", id),
    },
    {
      label: "Duplicate Note",
      click: () => win.webContents.send("note:trigger-duplicate", id),
    },
    { type: "separator" },
    {
      label: "Export Note as...",
      submenu: [
        {
          label: "Markdown (.md)",
          click: () => win.webContents.send("note:trigger-export", id, "md"),
        },
        {
          label: "HTML (.html)",
          click: () => win.webContents.send("note:trigger-export", id, "html"),
        },
        {
          label: "JSON Document (.json)",
          click: () => win.webContents.send("note:trigger-export", id, "json"),
        },
        {
          label: "Plain Text (.txt)",
          click: () => win.webContents.send("note:trigger-export", id, "txt"),
        },
        {
          label: "PDF (.pdf)",
          click: () => win.webContents.send("note:trigger-export", id, "pdf"),
        },
      ],
    },
    {
      label: "Reload from File",
      enabled:
        activeId !== null &&
        activeId === id &&
        store.get("auto-export") === true &&
        hasAutoExportedFile,
      visible: store.get("auto-export") === true,
      click: () => win.webContents.send("note:trigger-sync", id),
    },
    {
      label: "Show in Folder",
      enabled:
        activeId !== null &&
        activeId === id &&
        store.get("auto-export") === true &&
        hasAutoExportedFile,
      visible: store.get("auto-export") === true,
      click: () => win.webContents.send("note:trigger-path", id),
    },
    {
      label: "Open in Editor",
      enabled:
        activeId !== null &&
        activeId === id &&
        store.get("auto-export") === true &&
        hasAutoExportedFile,
      visible: store.get("auto-export") === true,
      click: () => win.webContents.send("note:trigger-default-editor", id),
    },
    { type: "separator" },
    {
      label: "Delete Note",
      click: () => win.webContents.send("note:trigger-delete", id),
    },
  ]);
  return noteItemMenu;
}

export { setUpEditorMenu, setUpNoteMenu, setUpTableMenu };
