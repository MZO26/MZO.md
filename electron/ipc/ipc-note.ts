import { setUpNoteMenu } from "@electron/context-menu";
import db from "@electron/db/database";
import { win } from "@electron/main";
import { LIMITS } from "@shared/constants";
import {
  validateCreate,
  validateId,
  validateSearch,
  validateTag,
  validateUpdate,
} from "@shared/validation";
import { ipcMain } from "electron";
import { checkRateLimit, safeResponse } from "./ipc-validation";

function registerNoteIpc() {
  ipcMain.handle("note:getAll", (e) => {
    return safeResponse(e, async () => {
      if (!checkRateLimit("note:getAll", LIMITS.READ_HEAVY))
        throw new Error("RATE_LIMIT");
      const result = db.getAll();
      return result;
    });
  });

  ipcMain.handle("note:create", (e, payload: unknown) => {
    return safeResponse(e, async () => {
      if (!checkRateLimit("note:create", LIMITS.WRITE_STANDARD))
        throw new Error("RATE_LIMIT");
      const validatedData = validateCreate(payload);
      const result = db.create(validatedData);
      return result;
    });
  });

  ipcMain.handle("note:update", (e, payload: unknown, flush: unknown) => {
    return safeResponse(e, async () => {
      if (!flush) {
        if (!checkRateLimit("note:update-flush", 100)) {
          throw new Error("RATE_LIMIT");
        }
        if (!checkRateLimit("note:update", LIMITS.WRITE_LIGHT))
          throw new Error("RATE_LIMIT");
      }
      const validatedData = validateUpdate(payload);
      const result = db.update(validatedData);
      return result;
    });
  });

  ipcMain.handle("note:delete", (e, id: unknown) => {
    return safeResponse(e, async () => {
      if (!checkRateLimit("note:search", LIMITS.WRITE_STANDARD))
        throw new Error("RATE_LIMIT");
      const validatedData = validateId(id);
      const result = db.delete(validatedData);
      return result;
    });
  });

  ipcMain.handle("note:getById", (e, id: unknown) => {
    return safeResponse(e, async () => {
      if (!checkRateLimit("note:getById", LIMITS.READ_LIGHT))
        throw new Error("RATE_LIMIT");
      const validatedData = validateId(id);
      const result = db.getById(validatedData);
      return result;
    });
  });

  ipcMain.handle("note:getByTag", (e, tag: string) => {
    return safeResponse(e, async () => {
      if (!checkRateLimit("note:getById", LIMITS.READ_LIGHT))
        throw new Error("RATE_LIMIT");
      const validatedData = validateTag(tag);
      const result = db.searchByTag(validatedData);
      return result;
    });
  });

  ipcMain.handle("note:search", (e, searchTerm: unknown, limit: unknown) => {
    return safeResponse(e, async () => {
      if (!checkRateLimit("note:search", LIMITS.READ_HEAVY))
        throw new Error("RATE_LIMIT");
      const validatedData = validateSearch(searchTerm, limit);
      const { searchTerm: validSearchTerm, limit: validSearchLimit } =
        validatedData;
      const result = db.search.searchNotes(validSearchTerm, validSearchLimit);
      return result;
    });
  });

  ipcMain.handle("note:pin", (e, id: string) => {
    return safeResponse(e, async () => {
      if (!checkRateLimit("note:pin", LIMITS.READ_LIGHT))
        throw new Error("RATE_LIMIT");
      const validatedData = validateId(id);
      const result = db.togglePin(validatedData);
      return result;
    });
  });

  ipcMain.handle("note:bookmark", (e, id: string) => {
    return safeResponse(e, async () => {
      if (!checkRateLimit("note:bookmark", LIMITS.READ_LIGHT))
        throw new Error("RATE_LIMIT");
      const validatedData = validateId(id);
      const result = db.toggleBookmark(validatedData);
      return result;
    });
  });

  ipcMain.handle("views:get", (e, view) => {
    let result;
    return safeResponse(e, async () => {
      if (!checkRateLimit(`get:view:${view}`, LIMITS.READ_HEAVY))
        throw new Error("RATE_LIMIT");
      switch (view) {
        case "bookmarked":
          result = db.views.getBookmarkedNotes();
          break;
        case "pinned":
          result = db.views.getPinnedNotes();
          break;
        case "todos":
          result = db.views.getNotesWithActionItems();
          break;
        case "all":
          return db.getAll();
        case "untagged":
          return db.views.getUntaggedNotes();
        default:
          throw new Error("INVALID_VIEW");
      }
      return result;
    });
  });

  ipcMain.on(
    "show-note-menu",
    (e, id: string, pinned: boolean, bookmarked: boolean) => {
      return safeResponse(e, async () => {
        if (!checkRateLimit("zoom:get", LIMITS.READ_LIGHT))
          throw new Error("RATE_LIMIT");
        if (win) {
          const contextMenu = setUpNoteMenu(win, id, pinned, bookmarked);
          contextMenu.popup({ window: win });
        }
      });
    },
  );
}

export { registerNoteIpc };
