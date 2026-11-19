import db from "@electron/db/database";
import { mainLogger } from "@electron/handler/permission-handler";
import { IPC_CHANNELS } from "@electron/ipc/ipc-channels";
import { isNoteID, type Id } from "@shared/schemas/note-schema";
import { clipboard, ClipboardItem, Notification, type BrowserWindow } from "electron";

interface LinkState {
  rendererReady: boolean;
  queued: Id | null;
  pendingUrl: string | null;
}

const LinkAppState: LinkState = {
  rendererReady: false,
  queued: null,
  pendingUrl: null,
};

export const PROTOCOL = "mzo";

function handleUrl(win: BrowserWindow, raw: string) {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return;
  }
  if (url.protocol !== `${PROTOCOL}:`) return;
  if (url.hostname !== "open") return;
  const id = url.searchParams.get("note");
  if (!id || !isNoteID(id)) return;
  const idCheck = db.checkForNotes([id]);
  if (!idCheck) return;
  if (!win || !LinkAppState.rendererReady) {
    LinkAppState.queued = id;
    return;
  }
  win.webContents.send(IPC_CHANNELS.TRIGGER_OPEN_NOTE_URI, id);
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function getUriContent(id: Id, title: string) {
  const url = new URL(`${PROTOCOL}://open`);
  url.searchParams.set("note", id);
  const uri = url.toString();
  const html = `<a href="${escapeHtml(uri)}">${escapeHtml(title || "Untitled")}</a>`;
  return { uri, html };
}

async function copyNoteLinks(ids: Id[]) {
  try {
    const notes = db.checkForNotes(ids);
    if (notes.size === 0) return;
    const entries = Array.from(notes, ([id, title]) => getUriContent(id, title));
    await clipboard.write([
      new ClipboardItem({
        "text/plain": entries.map((e) => e.uri).join("\n"),
        "text/html": entries.map((e) => e.html).join("<br>"),
      }),
    ]);
    if (Notification.isSupported()) {
      new Notification({
        title: notes.size > 1 ? `Copied ${notes.size} links` : "Copied link",
      }).show();
    }
  } catch (error: unknown) {
    mainLogger.appError("[copyNoteLinks]: Copy failed:", error);
  }
}

export { copyNoteLinks, handleUrl, LinkAppState };
