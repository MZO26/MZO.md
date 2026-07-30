import { getNoteById } from "@/api/api";
import { rendererLogger } from "@/app";
import { getCachedEditorExtensions } from "@/components/editor/editor-requests";
import { titleGenerator } from "@/utils/generators";
import { getAppItem } from "@/utils/registry";
import { needsLandscape } from "@/utils/ui";
import { DOMPURIFY_CONFIG, NODE_BASELINE } from "@shared/constants";
import { AppErrorCode } from "@shared/errors";
import type { Note } from "@shared/schemas/note-schema";
import type {
  ExportContent,
  ExportRequest,
} from "@shared/schemas/request-schema";
import type { Result } from "@shared/types";
import { generateHTML, generateText } from "@tiptap/core";
import DOMPurify from "dompurify";

async function getBatchExportContent(
  notes: Readonly<Note[]>,
  extension: ExportContent["extension"],
): Promise<Result<ExportContent[]>> {
  try {
    switch (extension) {
      case "json":
        return {
          success: true,
          data: notes.map((note) => ({
            created_at: note.created_at,
            fileName: note.title,
            extension: extension,
            content: JSON.stringify(note.content, null, 2),
          })),
        };
      case "txt": {
        const exts = getCachedEditorExtensions();
        return {
          success: true,
          data: notes.map((note) => ({
            created_at: note.created_at,
            fileName: note.title,
            extension: extension,
            content: generateText(note.content, exts, { blockSeparator: "\n" }),
          })),
        };
      }
      case "html": {
        const exts = getCachedEditorExtensions();
        return {
          success: true,
          data: notes.map((note) => ({
            created_at: note.created_at,
            fileName: note.title,
            extension: extension,
            content: generateHTML(note.content, exts),
          })),
        };
      }
      case "pdf": {
        const exts = getCachedEditorExtensions();
        return {
          success: true,
          data: notes.map((note) => {
            const html = generateHTML(note.content, exts) as Extract<
              ExportContent["extension"],
              "html"
            >;
            const noteSize = note.content.content?.length;
            const landscape =
              typeof noteSize === "number" && noteSize > NODE_BASELINE
                ? false
                : needsLandscape(html);
            return {
              created_at: note.created_at,
              fileName: note.title,
              extension: extension,
              content: html,
              landscape,
            };
          }),
        };
      }
      case "md": {
        const editor = getAppItem("editor");
        return {
          success: true,
          data: notes.map((note) => ({
            created_at: note.created_at,
            fileName: note.title,
            extension: extension,
            content: editor.markdown?.serialize(note.content) ?? "",
          })),
        };
      }
      default:
        return { success: false, error: AppErrorCode.InvalidData };
    }
  } catch (error) {
    rendererLogger.appError(
      `[getBatchExportContent]: Failed batch export for ${extension.toUpperCase()}:`,
      error,
    );
    return { success: false, error: AppErrorCode.InvalidData };
  }
}

// single export content function triggered by callback on note menu interaction

async function getExportContent(
  id: string,
  extension: ExportContent["extension"],
): Promise<Result<ExportRequest>> {
  const result = await getNoteById(id);
  if (!result.success) {
    return { success: false, error: result.error };
  }
  const note = result.data;
  switch (extension) {
    case "json": {
      return {
        success: true,
        data: {
          created_at: note.created_at,
          extension,
          fileName: titleGenerator(note.content),
          content: JSON.stringify(note.content),
        },
      };
    }
    case "html": {
      const html = generateHTML(
        note.content,
        getCachedEditorExtensions(),
      ) as Extract<ExportContent["extension"], "html">;
      return {
        success: true,
        data: {
          created_at: note.created_at,
          extension,
          fileName: titleGenerator(note.content),
          content: DOMPurify.sanitize(html, DOMPURIFY_CONFIG),
        },
      };
    }
    case "pdf": {
      const html = generateHTML(
        note.content,
        getCachedEditorExtensions(),
      ) as Extract<ExportContent["extension"], "html">;
      const noteSize = note.content.content?.length;
      const landscape =
        typeof noteSize === "number" && noteSize > NODE_BASELINE
          ? false
          : needsLandscape(html);
      rendererLogger.devLog(landscape);
      return {
        success: true,
        data: {
          created_at: note.created_at,
          extension,
          fileName: titleGenerator(note.content),
          content: DOMPurify.sanitize(html, DOMPURIFY_CONFIG),
          landscape,
        },
      };
    }
    case "md": {
      const editor = getAppItem("editor");
      return {
        success: true,
        data: {
          created_at: note.created_at,
          extension,
          fileName: titleGenerator(note.content),
          content: editor.markdown?.serialize(note.content) ?? "",
        },
      };
    }
    case "txt": {
      return {
        success: true,
        data: {
          created_at: note.created_at,
          extension,
          fileName: titleGenerator(note.content),
          content: generateText(note.content, getCachedEditorExtensions(), {
            blockSeparator: "\n",
          }),
        },
      };
    }
    default:
      rendererLogger.appError(
        "[getExportContent]: Unsupported export format:",
        extension,
      );
      return {
        success: false,
        error: AppErrorCode.InvalidData,
      };
  }
}

export { getBatchExportContent, getExportContent };
