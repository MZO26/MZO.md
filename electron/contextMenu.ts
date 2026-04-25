import { Menu, MenuItem, type BrowserWindow } from "electron";

function setUpContextMenu(win: BrowserWindow) {
  win.webContents.on("context-menu", (_event, params) => {
    const menu = new Menu();
    if (params.selectionText.trim().length > 0) {
      menu.append(new MenuItem({ label: "Copy", role: "copy" }));
    }
    if (params.isEditable) {
      menu.append(new MenuItem({ label: "Paste", role: "paste" }));
    }
    menu.append(new MenuItem({ type: "separator" }));
    menu.append(
      new MenuItem({
        label: "My Custom Action",
        click: () => {
          console.log(
            "User clicked the custom action at X:",
            params.x,
            "Y:",
            params.y,
          );
        },
      }),
    );
    if (win)
      menu.popup({
        window: win,
        x: params.x,
        y: params.y,
      });
  });
}

export { setUpContextMenu };
