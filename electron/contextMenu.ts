import { Menu, type BrowserWindow } from "electron";

function setUpContextMenu(
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
    {
      label: "Duplicate Note",
      click: () => win.webContents.send("note:trigger-duplicate", id),
    },
    { type: "separator" },
    {
      label: "Delete Note",
      click: () => win.webContents.send("note:trigger-delete", id),
    },
  ]);
  return noteItemMenu;
}
export { setUpContextMenu };
