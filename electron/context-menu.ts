import { Menu, type BrowserWindow } from "electron";

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
      label: pinned ? "Unpin Note" : "Pin to Top",
      click: () => win.webContents.send("note:trigger-pin", id),
    },
    {
      label: bookmarked ? "Remove Bookmark" : "Add Bookmark",
      click: () => win.webContents.send("note:trigger-bookmark", id),
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
