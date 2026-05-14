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
function setUpNoteMenu(
  win: BrowserWindow,
  id: string,
  pinned: boolean,
  bookmarked: boolean,
) {
  const noteItemMenu = Menu.buildFromTemplate([
    {
      label: "Copy Note ID",
      click: () => win.webContents.send("note:trigger-id", id),
    },
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
    { type: "separator" },
    {
      label: "Export Note as...",
      enabled: activeId !== null && activeId === id,
      submenu: [
        {
          label: "Markdown (.md)",
          click: () => win.webContents.send("note:trigger-export", "md"),
        },
        {
          label: "HTML (.html)",
          click: () => win.webContents.send("note:trigger-export", "html"),
        },
        {
          label: "JSON Document (.json)",
          click: () => win.webContents.send("note:trigger-export", "json"),
        },
        {
          label: "Plain Text (.txt)",
          click: () => win.webContents.send("note:trigger-export", "txt"),
        },
        {
          label: "PDF (.pdf)",
          click: () => win.webContents.send("note:trigger-export", "pdf"),
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

export { setUpEditorMenu, setUpNoteMenu };
