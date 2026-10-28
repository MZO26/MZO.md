import { mainLogger } from "@electron/handler/permission-handler";
import { IPC_CHANNELS } from "@electron/ipc/ipc-channels";
import { ExternalUrlSchema } from "@shared/schemas/electron-schema";
import { type NoteMenuPayload } from "@shared/schemas/note-schema";
import { TABLE_ACTIONS } from "@shared/shared-constants";
import { app, clipboard, Menu, shell, type BrowserWindow } from "electron";
import path from "node:path";

const MAX_SPELLING_SUGGESTIONS = 4;

function pushOptionalSeparator(items: Electron.MenuItemConstructorOptions[]) {
  const last = items[items.length - 1];
  if (items.length > 0 && last?.type !== "separator") {
    items.push({ type: "separator" });
  }
}

function addAction(
  flag: boolean,
  label: string,
  action: "cut" | "copy" | "paste" | "selectAll",
  items: Electron.MenuItemConstructorOptions[],
  win: BrowserWindow,
) {
  if (flag) items.push({ label, click: () => win.webContents[action]() });
}

function setUpEditorMenu(win: BrowserWindow) {
  win.webContents.on("context-menu", (_event, params) => {
    const items: Electron.MenuItemConstructorOptions[] = [];
    const hasSelection = params.selectionText?.trim().length > 0;
    const isImage = params.mediaType === "image";
    const hasLink = !!params.linkURL;
    mainLogger.devLog(params.isEditable);
    if (!params.isEditable && !isImage && !hasLink) {
      mainLogger.devLog("Early return");
      return;
    }
    if (params.isEditable) {
      addAction(params.editFlags.canCut, "Cut", "cut", items, win);
      addAction(params.editFlags.canCopy, "Copy", "copy", items, win);
      addAction(params.editFlags.canPaste, "Paste", "paste", items, win);
      if (items.length > 0 && params.editFlags.canSelectAll) {
        pushOptionalSeparator(items);
        addAction(true, "Select All", "selectAll", items, win);
      }
    } else if (hasSelection) {
      addAction(true, "Copy", "copy", items, win);
    }
    if (hasSelection) {
      items.push({
        label: "Extract content",
        click: () =>
          win.webContents.send(IPC_CHANNELS.TRIGGER_EXTRACT_SELECTION),
      });
      pushOptionalSeparator(items);
      items.push({
        label: "Copy As…",
        submenu: [
          {
            label: "Rich Text",
            click: () => {
              win.webContents.send(
                IPC_CHANNELS.TRIGGER_COPY_SELECTION_RICH_TEXT,
              );
            },
          },
          {
            label: "Markdown",
            click: () => {
              win.webContents.send(
                IPC_CHANNELS.TRIGGER_COPY_SELECTION_MARKDOWN,
              );
            },
          },
        ],
      });
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
    if (params.misspelledWord) {
      pushOptionalSeparator(items);
      const suggestions = params.dictionarySuggestions.slice(
        0,
        MAX_SPELLING_SUGGESTIONS,
      );
      if (suggestions.length > 0) {
        for (const suggestion of suggestions) {
          items.push({
            label: suggestion,
            click: () => {
              win.webContents.replaceMisspelling(suggestion);
            },
          });
        }
      } else {
        items.push({
          label: "No Suggestions",
          enabled: false,
        });
      }
      pushOptionalSeparator(items);
      items.push({
        label: "Add to Dictionary",
        click: () => {
          win.webContents.session.addWordToSpellCheckerDictionary(
            params.misspelledWord,
          );
        },
      });
    }
    if (isImage || hasLink) {
      const hasImageAddress = isImage
        ? ExternalUrlSchema.safeParse(params.srcURL)
        : null;
      const hasLinkUrl = hasLink
        ? ExternalUrlSchema.safeParse(params.linkURL)
        : null;
      pushOptionalSeparator(items);
      if (isImage && hasImageAddress?.success) {
        items.push({
          label: "Save Image As…",
          click: () => {
            win.webContents.downloadURL(hasImageAddress.data);
          },
        });
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
        (items.push({
          label: "Open image",
          click: () => {
            const hashFilename = path.basename(
              new URL(hasImageAddress.data).pathname,
            );
            const localPath = path.join(
              app.getPath("userData"),
              "images",
              hashFilename,
            );
            void shell.openPath(localPath);
          },
        }),
          items.push({
            label: "Copy Image Address",
            click: () => {
              clipboard.writeText(hasImageAddress.data);
            },
          }));
      }
      if (hasLink && hasLinkUrl?.success) {
        items.push({
          label: "Open Link",
          click: async () => {
            try {
              await shell.openExternal(hasLinkUrl.data);
            } catch (error) {
              mainLogger.appError(
                "[setUpEditorMenu]: Failed to open link:",
                error,
              );
            }
          },
        });
        items.push({
          label: "Copy Link Address",
          click: () => {
            clipboard.writeText(hasLinkUrl.data);
          },
        });
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
  const { selectedIds, selectionMode, pinned } = payload;
  const noteLabel =
    selectedIds.length > 1 ? `${selectedIds.length} Notes` : "Note";
  const noteItemMenu = Menu.buildFromTemplate([
    {
      label: "Copy...",
      submenu: [
        {
          label: "Rich Text",
          click: () =>
            win.webContents.send(
              IPC_CHANNELS.TRIGGER_COPY_RICH_TEXT,
              selectedIds,
            ),
        },
        {
          label: "Markdown",
          click: () =>
            win.webContents.send(
              IPC_CHANNELS.TRIGGER_COPY_MARKDOWN,
              selectedIds,
            ),
        },
      ],
    },
    { type: "separator" },
    {
      label:
        selectionMode && selectedIds.length > 0
          ? `Clear selection (${selectedIds.length})`
          : selectionMode
            ? "Exit selection"
            : "Select items...",
      click: () =>
        win.webContents.send(
          IPC_CHANNELS.TRIGGER_SELECT,
          selectionMode ? [] : selectedIds,
        ),
    },
    {
      label:
        selectionMode && selectedIds.length > 1
          ? `Toggle Pins (${selectedIds.length})`
          : pinned
            ? "Unpin"
            : "Pin to top",
      click: () => win.webContents.send(IPC_CHANNELS.TRIGGER_PIN, selectedIds),
    },
    {
      label: "Duplicate Note",
      visible: selectedIds.length === 1,
      click: () =>
        win.webContents.send(IPC_CHANNELS.TRIGGER_DUPLICATE, selectedIds),
    },
    { type: "separator" },
    {
      label: `Export ${noteLabel} as...`,
      submenu: [
        {
          label: "Markdown (.md)",
          click: () =>
            win.webContents.send(
              IPC_CHANNELS.TRIGGER_EXPORT,
              selectedIds,
              "md",
            ),
        },
        {
          label: "HTML (.html)",
          click: () =>
            win.webContents.send(
              IPC_CHANNELS.TRIGGER_EXPORT,
              selectedIds,
              "html",
            ),
        },
        {
          label: "JSON Document (.json)",
          click: () =>
            win.webContents.send(
              IPC_CHANNELS.TRIGGER_EXPORT,
              selectedIds,
              "json",
            ),
        },
        {
          label: "Plain Text (.txt)",
          click: () =>
            win.webContents.send(
              IPC_CHANNELS.TRIGGER_EXPORT,
              selectedIds,
              "txt",
            ),
        },
        {
          label: "PDF (.pdf)",
          click: () =>
            win.webContents.send(
              IPC_CHANNELS.TRIGGER_EXPORT,
              selectedIds,
              "pdf",
            ),
        },
      ],
    },
    { type: "separator" },
    {
      label: `Delete ${noteLabel}`,
      click: () =>
        win.webContents.send(IPC_CHANNELS.TRIGGER_DELETE, selectedIds),
    },
  ]);
  return noteItemMenu;
}

export { setUpEditorMenu, setUpNoteMenu, setUpTableMenu };
