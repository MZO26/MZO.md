import { setUpNoteMenu } from "@electron/context-menu";
import db from "@electron/db/database";
import { checkRateLimit, safeResponse } from "@electron/ipc/ipc-validation";
import { win } from "@electron/main";
import { LIMITS } from "@shared/constants";
import {
  CreateNotePayloadSchema,
  CreateNotesPayloadsSchema,
  IdSchema,
  SearchSchema,
  TagSchema,
  UpdateNotePayloadSchema,
} from "@shared/schemas/note-schema";
import { validation } from "@shared/validation";
import { ipcMain } from "electron";

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
      const validatedData = validation(CreateNotePayloadSchema, payload);
      const result = db.create(validatedData);
      return result;
    });
  });

  ipcMain.handle("note:create-many", (e, payloads: unknown) => {
    return safeResponse(e, async () => {
      if (!checkRateLimit("note:create", LIMITS.WRITE_STANDARD))
        throw new Error("RATE_LIMIT");
      const validatedData = validation(CreateNotesPayloadsSchema, payloads);
      const result = db.createMany(validatedData);
      return result;
    });
  });

  ipcMain.handle("note:merge", (e, idA: unknown, idB: unknown) => {
    return safeResponse(e, async () => {
      if (!checkRateLimit("note:merge", LIMITS.WRITE_STANDARD))
        throw new Error("RATE_LIMIT");
      const validatedidA = validation(IdSchema, idA);
      const validatedidB = validation(IdSchema, idB);
      const resultA = db.getById(validatedidA);
      const resultB = db.getById(validatedidB);
      const mergedJSON = {
        type: "doc" as const,
        content: [
          ...resultA.content.content,
          { type: "horizontalRule" },
          ...resultB.content.content,
        ],
      };
      const outgoingA = resultA.links
        .filter((l) => l.dir === "out")
        .map((l) => l.id);
      const outgoingB = resultB.links
        .filter((l) => l.dir === "out")
        .map((l) => l.id);
      const mergedOutgoingLinks = [...new Set([...outgoingA, ...outgoingB])];
      const validatedData = validation(UpdateNotePayloadSchema, {
        ...resultA,
        content: mergedJSON,
        links: mergedOutgoingLinks,
      });
      const result = db.update(validatedData);
      return result;
    });
  });

  ipcMain.handle("note:update", (e, payload: unknown, flush: unknown) => {
    return safeResponse(e, async () => {
      if (!flush) {
        if (!checkRateLimit("note:update", LIMITS.WRITE_LIGHT))
          throw new Error("RATE_LIMIT");
      } else {
        if (!checkRateLimit("note:flush-override", LIMITS.WRITE_FLUSH)) {
          throw new Error("RATE_LIMIT");
        }
      }
      const validatedData = validation(UpdateNotePayloadSchema, payload);
      const result = db.update(validatedData);
      return result;
    });
  });

  ipcMain.handle("note:delete", (e, id: unknown) => {
    return safeResponse(e, async () => {
      if (!checkRateLimit("note:search", LIMITS.WRITE_STANDARD))
        throw new Error("RATE_LIMIT");
      const validatedData = validation(IdSchema, id);
      const result = db.delete(validatedData);
      return result;
    });
  });

  ipcMain.handle("note:getById", (e, id: unknown) => {
    return safeResponse(e, async () => {
      if (!checkRateLimit("note:getById", LIMITS.READ_LIGHT))
        throw new Error("RATE_LIMIT");
      const validatedData = validation(IdSchema, id);
      const result = db.getById(validatedData);
      return result;
    });
  });

  ipcMain.handle("note:getByTag", (e, tag: unknown) => {
    return safeResponse(e, async () => {
      if (!checkRateLimit("note:getById", LIMITS.READ_LIGHT))
        throw new Error("RATE_LIMIT");
      const validatedData = validation(TagSchema, tag);
      const result = db.searchByTag(validatedData);
      return result;
    });
  });

  ipcMain.handle("note:search", (e, searchTerm: unknown, limit: unknown) => {
    return safeResponse(e, async () => {
      if (!checkRateLimit("note:search", LIMITS.READ_HEAVY))
        throw new Error("RATE_LIMIT");
      const validatedData = validation(SearchSchema, { searchTerm, limit });
      const { searchTerm: validSearchTerm, limit: validSearchLimit } =
        validatedData;
      const result = db.search.searchNotes(validSearchTerm, validSearchLimit);
      return result;
    });
  });

  ipcMain.handle("note:pin", (e, id: unknown) => {
    return safeResponse(e, async () => {
      if (!checkRateLimit("note:pin", LIMITS.READ_LIGHT))
        throw new Error("RATE_LIMIT");
      const validatedData = validation(IdSchema, id);
      const result = db.togglePin(validatedData);
      return result;
    });
  });

  ipcMain.handle("note:bookmark", (e, id: unknown) => {
    return safeResponse(e, async () => {
      if (!checkRateLimit("note:bookmark", LIMITS.READ_LIGHT))
        throw new Error("RATE_LIMIT");
      const validatedData = validation(IdSchema, id);
      const result = db.toggleBookmark(validatedData);
      return result;
    });
  });

  ipcMain.handle("views:get", (e, view: unknown) => {
    let result;
    return safeResponse(e, async () => {
      if (!checkRateLimit(`get:view:${view}`, LIMITS.READ_HEAVY))
        throw new Error("RATE_LIMIT");
      switch (view) {
        case "bookmarked":
          result = db.getBookMarkedNotes();
          break;
        case "pinned":
          result = db.getPinnedNotes();
          break;
        case "todos":
          result = db.getNotesWithActionItems();
          break;
        case "all":
          return db.getAll();
        case "untagged":
          return db.getUntaggedNotes();
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
