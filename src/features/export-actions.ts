import { getAll } from "@/api/api";
import { getNoteEditorExtensions } from "@/components/editor/editor-init";
import { sleep } from "@/utils/async";
import { getAppItem } from "@/utils/registry";
import {
  AppErrorCode,
  BATCH_SIZE,
  DOMPURIFY_CONFIG,
  YIELD_INTERVAL,
} from "@shared/constants";
import { titleGenerator } from "@shared/generators/generators";
import type { ExportRequest } from "@shared/schemas/export-schema";
import type { ExportedContent, ExportFormat, Result } from "@shared/types";
import { Editor } from "@tiptap/core";
import DOMPurify from "dompurify";

async function getBatchExportContent(
  extension: ExportFormat,
): Promise<Result<ExportedContent[]>> {
  const result = await getAll();
  if (!result.success) {
    return { success: false, error: result.error };
  }
  const notes = result.data;
  const data: ExportedContent[] = [];
  if (extension === "json" || extension === "txt") {
    try {
      const isJson = extension === "json";
      for (const note of notes) {
        data.push({
          id: note.id,
          fileName: note.title,
          content: isJson
            ? JSON.stringify(note.content, null, 2)
            : (note.plainText ?? ""),
          extension,
        });
      }
      return { success: true, data };
    } catch (error) {
      console.error(
        "Failed converting data for batch export (JSON / TXT): ",
        error,
      );
      return { success: false, error: AppErrorCode["InvalidData"] };
    }
  }
  const headlessEditor = new Editor({
    extensions: getNoteEditorExtensions(),
  });

  const markdown = extension === "md";
  try {
    let i = 0;
    for (const note of notes) {
      if (i > 0 && i % BATCH_SIZE === 0) {
        await sleep(YIELD_INTERVAL); // prevent ui stuttering
      }
      headlessEditor.commands.setContent(note.content);
      data.push({
        id: note.id,
        fileName: note.title,
        content: markdown
          ? headlessEditor.getMarkdown()
          : DOMPurify.sanitize(headlessEditor.getHTML(), DOMPURIFY_CONFIG),
        extension,
      });
      i++;
    }
    return { success: true, data };
  } catch (error) {
    console.error(
      "Failed converting data for batch export (MD / HTML):",
      error,
    );
    return { success: false, error: AppErrorCode["InvalidData"] };
  } finally {
    headlessEditor.destroy();
  }
}

function getExportContent(
  id: string,
  extension: string,
): Result<ExportRequest> {
  const editor = getAppItem("editor");
  try {
    const fileName = titleGenerator(editor.getText());
    let payload: ExportRequest;
    switch (extension) {
      case "json":
        payload = {
          id,
          extension: "json",
          content: JSON.stringify(editor.getJSON()),
          fileName,
        };
        break;
      case "html":
        payload = {
          id,
          extension: "html",
          content: DOMPurify.sanitize(editor.getHTML(), DOMPURIFY_CONFIG),
          fileName,
        };
        break;
      case "md":
        payload = {
          id,
          extension: "md",
          content: editor.getMarkdown(),
          fileName,
        };
        break;
      case "txt":
        payload = {
          id,
          extension: "txt",
          content: editor.getText(),
          fileName,
        };
        break;
      case "pdf":
        payload = {
          id,
          extension: "pdf",
          content: DOMPurify.sanitize(editor.getHTML(), DOMPURIFY_CONFIG),
          fileName,
        };
        break;
      default:
        console.error("Unsupported export format:", extension);
        return {
          success: false,
          error: AppErrorCode["InvalidData"],
        };
    }
    return { success: true, data: payload };
  } catch (error) {
    console.error("Failed converting data for single export:", error);
    return { success: false, error: AppErrorCode["UnknownError"] };
  }
}

export { getBatchExportContent, getExportContent };
