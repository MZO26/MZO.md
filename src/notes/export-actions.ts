import { getNoteById } from "@/api/api";
import {
  getCachedEditorExtensions,
  getMarkdownManager,
} from "@/components/editor/editor-features";
import { DOMPURIFY_CONFIG } from "@shared/constants";
import { AppErrorCode } from "@shared/errors";
import { titleGenerator } from "@shared/generators";
import type { Note } from "@shared/schemas/note-schema";
import type { ExportRequest } from "@shared/schemas/request-schema";
import type { ExportedContent, ExportFormat, Result } from "@shared/types";
import { generateHTML, generateText } from "@tiptap/core";
import DOMPurify from "dompurify";

async function getBatchExportContent(
  notes: Note[],
  extension: ExportFormat,
): Promise<Result<ExportedContent[]>> {
  try {
    let formatContent: (content: Note["content"]) => string;
    switch (extension) {
      case "json":
        formatContent = (c) => JSON.stringify(c, null, 2);
        break;
      case "txt": {
        const exts = getCachedEditorExtensions();
        formatContent = (c) => generateText(c, exts, { blockSeparator: "\n" });
        break;
      }
      case "html": {
        const exts = getCachedEditorExtensions();
        formatContent = (c) => generateHTML(c, exts);
        break;
      }
      case "md": {
        const manager = getMarkdownManager();
        formatContent = (c) => manager.serialize(c);
        break;
      }
      default:
        return { success: false, error: AppErrorCode.InvalidData };
    }
    const data: ExportedContent[] = [];
    for (const note of notes) {
      if (!note?.content) continue;
      data.push({
        created_at: note.created_at,
        fileName: note.title,
        content: formatContent(note.content),
        extension,
      });
    }
    return { success: true, data };
  } catch (error) {
    console.error(
      `[getBatchExportContent]: Failed batch export for ${extension.toUpperCase()}:`,
      error,
    );
    return { success: false, error: AppErrorCode.InvalidData };
  }
}

//------------------------------------------------------------

// single export content function triggered by callback on note menu interaction

async function getExportContent(
  id: string,
  extension: string,
): Promise<Result<ExportRequest>> {
  const result = await getNoteById(id);
  if (!result.success) {
    return { success: false, error: result.error };
  }
  const note = result.data;
  let content: string;
  switch (extension) {
    case "json":
      content = JSON.stringify(note.content, null, 2);
      break;
    case "html":
    case "pdf":
      const html = generateHTML(note.content, getCachedEditorExtensions());
      content = DOMPurify.sanitize(html, DOMPURIFY_CONFIG);
      break;
    case "md":
      content = getMarkdownManager().serialize(note.content);
      break;
    case "txt":
      content = generateText(note.content, getCachedEditorExtensions(), {
        blockSeparator: "\n",
      });
      break;
    default:
      console.error(
        "[getExportContent]: Unsupported export format:",
        extension,
      );
      return {
        success: false,
        error: AppErrorCode.InvalidData,
      };
  }
  const payload: ExportRequest = {
    created_at: note.created_at,
    extension,
    fileName: titleGenerator(note.content),
    content,
  };
  return { success: true, data: payload };
}

export { getBatchExportContent, getExportContent };
