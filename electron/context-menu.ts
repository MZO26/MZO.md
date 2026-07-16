import { isAutoExport } from "@electron/fs/fs-auto-export";
import { settingsService } from "@electron/handler/settings-handler";
import { validation } from "@electron/ipc/ipc-validation";
import { ExternalUrlSchema } from "@shared/schemas/editor-schema";
import { IdSchema, type NoteMenuPayload } from "@shared/schemas/note-schema";
import { clipboard, ipcMain, Menu, shell, type BrowserWindow } from "electron";

let activeId: string | null = null;

ipcMain.on("note:set-active", (_e, id: unknown) => {
  try {
    const validatedId = validation(IdSchema, id);
    activeId = validatedId;
  } catch (error: unknown) {
    console.error(`[IPC Bridge Error]: ${id} is not a valid UUID`, error);
    activeId = null;
  }
});

function pushOptionalSeparator(items: Electron.MenuItemConstructorOptions[]) {
  const last = items[items.length - 1];
  if (items.length > 0 && last?.type !== "separator") {
    items.push({ type: "separator" });
  }
}

function setUpEditorMenu(win: BrowserWindow) {
  win.webContents.on("context-menu", (_event, params) => {
    const items: Electron.MenuItemConstructorOptions[] = [];
    const hasSelection = params.selectionText?.trim().length > 0;
    const isImage = params.mediaType === "image";
    const hasLink = Boolean(params.linkURL);
    const canEdit =
      params.isEditable ||
      params.editFlags.canCut ||
      params.editFlags.canCopy ||
      params.editFlags.canPaste;
    if (!canEdit && !hasSelection && !isImage && !hasLink) return;
    const addAction = (
      flag: boolean,
      label: string,
      action: "cut" | "copy" | "paste" | "selectAll",
    ) => {
      if (flag) items.push({ label, click: () => win.webContents[action]() });
    };
    if (params.isEditable) {
      addAction(params.editFlags.canCut, "Cut", "cut");
      addAction(params.editFlags.canCopy, "Copy", "copy");
      addAction(params.editFlags.canPaste, "Paste", "paste");
      if (items.length > 0 && params.editFlags.canSelectAll) {
        pushOptionalSeparator(items);
        addAction(true, "Select All", "selectAll");
      }
    } else if (hasSelection && params.editFlags.canCopy) {
      addAction(true, "Copy", "copy");
    }
    if (hasSelection) {
      pushOptionalSeparator(items);
      const safeSearchText = params.selectionText?.trim().slice(0, 200);
      items.push({
        label: "Search with Google",
        click: async () => {
          try {
            const query = encodeURIComponent(safeSearchText);
            await shell.openExternal(
              `https://www.google.com/search?q=${query}`,
            );
          } catch (error) {
            console.error(
              "[setUpEditorMenu]: Failed to open search browser:",
              error,
            );
          }
        },
      });
      if (process.platform === "darwin") {
        items.push({
          label: "Look Up",
          click: () => {
            try {
              win.webContents.showDefinitionForSelection();
            } catch (error) {
              console.error(
                "[setUpEditorMenu]: Failed to lookup selection:",
                error,
              );
            }
          },
        });
      }
    }
    if (isImage || hasLink) {
      pushOptionalSeparator(items);
      if (isImage) {
        items.push({
          label: "Copy Image",
          click: () => {
            try {
              win.webContents.copyImageAt(params.x, params.y);
            } catch (error) {
              console.error("[setUpEditorMenu]: Failed to copy image:", error);
            }
          },
        });
        if (validation(ExternalUrlSchema, params.srcURL)) {
          items.push({
            label: "Copy Image Address",
            click: () => clipboard.writeText(params.srcURL),
          });
        }
      }
    }
    if (items[items.length - 1]?.type === "separator") {
      items.pop();
    }
    if (items.length === 0) return;
    const menu = Menu.buildFromTemplate(items);
    menu.popup({
      window: win,
      // for apple specific context menu features to work, frame has to be passed as an explicit reference
      ...(process.platform === "darwin" && params.frame != null
        ? { frame: params.frame }
        : {}),
    });
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
  const settings = settingsService.getSettings();
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
            settings["auto_export"] === true &&
            hasAutoExportedFile,
          visible: settings["auto_export"] === true,
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
        settings["auto_export"] === true &&
        hasAutoExportedFile,
      visible: settings["auto_export"] === true,
      click: () => win.webContents.send("note:trigger-sync", id),
    },
    {
      label: "Show in Folder",
      enabled:
        activeId !== null &&
        activeId === id &&
        settings["auto_export"] === true &&
        hasAutoExportedFile,
      visible: settings["auto_export"] === true,
      click: () => win.webContents.send("note:trigger-path", id),
    },
    {
      label: "Open in Editor",
      enabled:
        activeId !== null &&
        activeId === id &&
        settings["auto_export"] === true &&
        hasAutoExportedFile,
      visible: settings["auto_export"] === true,
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
