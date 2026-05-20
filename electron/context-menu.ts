import type { NoteMenuPayload } from "@shared/types";
import { ipcMain, Menu, type BrowserWindow } from "electron";

let activeId: string | null = null;

ipcMain.on("set-active-note", (_event, id) => {
  activeId = id;
});

async function setUpEditorMenu() {
  const { default: contextMenu } = await import("electron-context-menu");

  contextMenu({
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
      defaultActions.saveImage({}),
      defaultActions.saveImageAs({}),
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

function setUpNoteMenu(win: BrowserWindow, payload: NoteMenuPayload) {
  const { id, pinned, bookmarked } = payload;
  const noteItemMenu = Menu.buildFromTemplate([
    {
      label: "Copy Note ID",
      click: () => win.webContents.send("note:trigger-id", id),
    },
    { type: "separator" },
    {
      label: pinned ? "Unpin Note" : "Pin to Top",
      click: () => win.webContents.send("note:trigger-pin", id),
    },
    {
      label: bookmarked ? "Remove Bookmark" : "Add Bookmark",
      click: () => win.webContents.send("note:trigger-bookmark", id),
    },
    {
      label: "Duplicate Note",
      click: () => win.webContents.send("note:trigger-duplicate", id),
    },
    {
      label: "Merge Note",
      click: () => win.webContents.send("note:trigger-merge", id),
    },
    { type: "separator" },
    {
      label: "Export Note as...",
      enabled: activeId !== null && activeId === id,
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
    { type: "separator" },
    {
      label: "Delete Note",
      click: () => win.webContents.send("note:trigger-delete", id),
    },
  ]);
  return noteItemMenu;
}

export { setUpEditorMenu, setUpNoteMenu, setUpTableMenu };
