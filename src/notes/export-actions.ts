import { getNoteById } from "@/api/api";
import {
  getCachedEditorExtensions,
  getMarkdownManager,
} from "@/components/editor/editor-features";
import { getPlainTextFromJson } from "@/components/editor/editor-init";
import { noteStore } from "@/settings/app-state";
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
  const processedPayloads: ExportedContent[] = [];
  if (extension === "json" || extension === "txt") {
    try {
      const isJson = extension === "json";
      for (const note of notes) {
        processedPayloads.push({
          created_at: note.created_at,
          fileName: note.title,
          content: isJson
            ? JSON.stringify(note.content, null, 2)
            : getPlainTextFromJson(note.content),
          extension,
        });
      }
      return { success: true, data: processedPayloads };
    } catch (error) {
      console.error(
        "[getBatchExportContent]: Failed converting data for batch export (JSON / TXT): ",
        error,
      );
      return { success: false, error: AppErrorCode.InvalidData };
    }
  }
  const markdown = extension === "md";
  try {
    const extensions = getCachedEditorExtensions();
    const manager = markdown ? getMarkdownManager() : null;
    for (const note of notes) {
      if (!note?.content) continue;
      let outputContent: string;
      if (markdown) {
        outputContent = manager!.serialize(note.content);
      } else {
        outputContent = generateHTML(note.content, extensions);
      }
      processedPayloads.push({
        created_at: note.created_at,
        fileName: note.title,
        content: outputContent,
        extension,
      });
    }
    return { success: true, data: processedPayloads };
  } catch (error) {
    console.error(
      "[getBatchExportContent]: Failed converting data for batch export (MD / HTML):",
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
  const activeNote = noteStore.getState().activeNote;
  let note: Note | null = null;
  if (activeNote?.id === id) {
    note = activeNote;
  } else {
    const result = await getNoteById(id);
    if (!result.success) {
      return { success: false, error: result.error };
    }
    note = result.data;
  }
  if (!note) return { success: false, error: AppErrorCode.InvalidData };
  let content: string;
  switch (extension) {
    case "json":
      content = JSON.stringify(note.content);
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
      content = generateText(note.content, getCachedEditorExtensions());
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
