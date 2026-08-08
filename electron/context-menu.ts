import { isAutoExport } from "@electron/fs/fs-auto-export";
import { mainLogger } from "@electron/handler/permission-handler";
import { settingsService } from "@electron/handler/settings-handler";
import { IPC_CHANNELS } from "@electron/ipc/ipc-channels";
import { AppBackendError } from "@electron/ipc/ipc-error-handler";
import {
  checkRateLimit,
  LIMITS,
  validation,
} from "@electron/ipc/ipc-validation";
import { AppErrorCode } from "@shared/errors";
import {
  IdSchema,
  type Id,
  type NoteMenuPayload,
} from "@shared/schemas/note-schema";
import { ALLOWED_PROTOCOLS, TABLE_ACTIONS } from "@shared/shared-constants";
import { clipboard, ipcMain, Menu, shell, type BrowserWindow } from "electron";

let activeId: Id | null = null;

ipcMain.on(IPC_CHANNELS.SET_ACTIVE_NOTE, (_e, id: unknown) => {
  try {
    if (!checkRateLimit(IPC_CHANNELS.SET_ACTIVE_NOTE, LIMITS.READ_LIGHT))
      throw new AppBackendError(AppErrorCode.RateLimitError);
    const validatedId = validation(IdSchema, id);
    activeId = validatedId;
  } catch (error: unknown) {
    mainLogger.appError(`[IPC Bridge Error]: ${id} is not a valid UUID`, error);
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
    const hasLink = !!params.linkURL;
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
            mainLogger.appError(
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
              mainLogger.appError(
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
              mainLogger.appError(
                "[setUpEditorMenu]: Failed to copy image:",
                error,
              );
            }
          },
        });
        if (ALLOWED_PROTOCOLS.some((p) => params.srcURL.startsWith(p))) {
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
      click: () =>
        win.webContents.send(
          IPC_CHANNELS.TRIGGER_TABLE_ACTION,
          TABLE_ACTIONS.ADD_ROW_BEFORE,
        ),
    },
    {
      label: "Add Row After",
      click: () =>
        win.webContents.send(
          IPC_CHANNELS.TRIGGER_TABLE_ACTION,
          TABLE_ACTIONS.ADD_ROW_AFTER,
        ),
    },
    { type: "separator" },
    {
      label: "Add Column Before",
      click: () =>
        win.webContents.send(
          IPC_CHANNELS.TRIGGER_TABLE_ACTION,
          TABLE_ACTIONS.ADD_COLUMN_BEFORE,
        ),
    },
    {
      label: "Add Column After",
      click: () =>
        win.webContents.send(
          IPC_CHANNELS.TRIGGER_TABLE_ACTION,
          TABLE_ACTIONS.ADD_COLUMN_AFTER,
        ),
    },
    { type: "separator" },
    {
      label: "Delete Row",
      click: () =>
        win.webContents.send(
          IPC_CHANNELS.TRIGGER_TABLE_ACTION,
          TABLE_ACTIONS.DELETE_ROW,
        ),
    },
    {
      label: "Delete Column",
      click: () =>
        win.webContents.send(
          IPC_CHANNELS.TRIGGER_TABLE_ACTION,
          TABLE_ACTIONS.DELETE_COLUMN,
        ),
    },
    {
      label: "Delete Table",
      click: () =>
        win.webContents.send(
          IPC_CHANNELS.TRIGGER_TABLE_ACTION,
          TABLE_ACTIONS.DELETE_TABLE,
        ),
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
          click: () =>
            win.webContents.send(IPC_CHANNELS.TRIGGER_COPY_RICH_TEXT, id),
        },
        {
          label: "File Path",
          enabled:
            activeId !== null &&
            activeId === id &&
            settings["auto_export"] === true &&
            hasAutoExportedFile,
          visible: settings["auto_export"] === true,
          click: () => win.webContents.send(IPC_CHANNELS.TRIGGER_COPY_PATH, id),
        },
      ],
    },
    { type: "separator" },
    {
      label: "Select...",
      click: () => win.webContents.send(IPC_CHANNELS.TRIGGER_SELECT, id),
    },
    {
      label: pinned ? "Unpin Note" : "Pin to Top",
      click: () => win.webContents.send(IPC_CHANNELS.TRIGGER_PIN, id),
    },
    {
      label: "Duplicate Note",
      click: () => win.webContents.send(IPC_CHANNELS.TRIGGER_DUPLICATE, id),
    },
    { type: "separator" },
    {
      label: "Export Note as...",
      submenu: [
        {
          label: "Markdown (.md)",
          click: () =>
            win.webContents.send(IPC_CHANNELS.TRIGGER_EXPORT, id, "md"),
        },
        {
          label: "HTML (.html)",
          click: () =>
            win.webContents.send(IPC_CHANNELS.TRIGGER_EXPORT, id, "html"),
        },
        {
          label: "JSON Document (.json)",
          click: () =>
            win.webContents.send(IPC_CHANNELS.TRIGGER_EXPORT, id, "json"),
        },
        {
          label: "Plain Text (.txt)",
          click: () =>
            win.webContents.send(IPC_CHANNELS.TRIGGER_EXPORT, id, "txt"),
        },
        {
          label: "PDF (.pdf)",
          click: () =>
            win.webContents.send(IPC_CHANNELS.TRIGGER_EXPORT, id, "pdf"),
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
      click: () => win.webContents.send(IPC_CHANNELS.TRIGGER_SYNC, id),
    },
    {
      label: "Show in Folder",
      enabled:
        activeId !== null &&
        activeId === id &&
        settings["auto_export"] === true &&
        hasAutoExportedFile,
      visible: settings["auto_export"] === true,
      click: () =>
        win.webContents.send(IPC_CHANNELS.TRIGGER_SHOW_IN_FOLDER, id),
    },
    {
      label: "Open in Editor",
      enabled:
        activeId !== null &&
        activeId === id &&
        settings["auto_export"] === true &&
        hasAutoExportedFile,
      visible: settings["auto_export"] === true,
      click: () =>
        win.webContents.send(IPC_CHANNELS.TRIGGER_OPEN_DEFAULT_EDITOR, id),
    },
    { type: "separator" },
    {
      label: "Delete Note",
      click: () => win.webContents.send(IPC_CHANNELS.TRIGGER_DELETE, id),
    },
  ]);
  return noteItemMenu;
}

export { setUpEditorMenu, setUpNoteMenu, setUpTableMenu };
