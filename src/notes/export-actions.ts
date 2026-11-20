import { getNoteById } from "@/api/api";
import { getCachedEditorExtensions } from "@/components/editor/editor-actions";
import { DOMPURIFY_CONFIG, NODE_BASELINE } from "@/utils/constants";
import { rendererLogger } from "@/utils/helpers";
import { useCore } from "@/utils/registry";
import { AppErrorCode } from "@shared/errors";
import type { Id, Note } from "@shared/schemas/note-schema";
import type { ExportRequest } from "@shared/schemas/request-schema";
import type { Result } from "@shared/shared-types";
import { generateHTML } from "@tiptap/core";
import DOMPurify from "dompurify";

type BaseOpts = { fileName?: string };

type PdfOpts = BaseOpts & { landscape?: boolean };

type BuildRequestArgs =
  | [note: Note, extension: "pdf", content: string, opts?: PdfOpts]
  | [
      note: Note,
      extension: Exclude<ExportRequest["extension"], "pdf">,
      content: string,
      opts?: BaseOpts,
    ];

function buildRequest(...args: BuildRequestArgs): ExportRequest {
  const [note, extension, content, opts] = args;
  if (extension === "pdf") {
    return {
      created_at: note.created_at,
      fileName: opts?.fileName ?? note.title,
      extension,
      content,
      landscape: opts?.landscape ?? false,
    };
  }
  return {
    created_at: note.created_at,
    fileName: opts?.fileName ?? note.title,
    extension,
    content,
  };
}

function shouldUseLandscape(note: Note, html: string): boolean {
  const noteSize = note.content.content?.length ?? 0;
  return noteSize > NODE_BASELINE ? false : needsLandscape(html);
}

function createNoteExporter(extension: ExportRequest["extension"]): (note: Note) => ExportRequest {
  switch (extension) {
    case "json":
      return (note) => buildRequest(note, "json", JSON.stringify(note.content, null, 2));

    case "txt":
      return (note) => buildRequest(note, "txt", note.plain_text);

    case "html": {
      const exts = getCachedEditorExtensions();
      return (note) => {
        const html = DOMPurify.sanitize(generateHTML(note.content, exts), DOMPURIFY_CONFIG);
        return buildRequest(note, "html", html);
      };
    }

    case "pdf": {
      const exts = getCachedEditorExtensions();
      return (note) => {
        const rawHtml = generateHTML(note.content, exts);
        const landscape = shouldUseLandscape(note, rawHtml);
        const html = DOMPurify.sanitize(rawHtml, DOMPURIFY_CONFIG);
        return buildRequest(note, "pdf", html, { landscape });
      };
    }

    case "md": {
      const { editor } = useCore("editor");
      return (note) => buildRequest(note, "md", editor.markdown?.serialize(note.content) ?? "");
    }

    default:
      extension satisfies never;
      throw new Error(`Unsupported export format: ${String(extension)}`);
  }
}

function getBatchExportContent(
  notes: readonly Note[],
  extension: ExportRequest["extension"],
): Result<ExportRequest[]> {
  try {
    const toRequest = createNoteExporter(extension);
    return { success: true, data: notes.map(toRequest) };
  } catch (error) {
    rendererLogger.appError(
      `[getBatchExportContent]: Failed batch export for ${extension.toUpperCase()}:`,
      error,
    );
    return { success: false, error: AppErrorCode.InvalidData };
  }
}

async function getExportContent(
  id: Id,
  extension: ExportRequest["extension"],
): Promise<Result<ExportRequest>> {
  const result = await getNoteById(id);
  if (!result.success) {
    return { success: false, error: result.error };
  }
  try {
    const toRequest = createNoteExporter(extension);
    return { success: true, data: toRequest(result.data) };
  } catch (error) {
    rendererLogger.appError(
      `[getExportContent]: Failed export for ${extension.toUpperCase()}:`,
      error,
    );
    return { success: false, error: AppErrorCode.InvalidData };
  }
}

function needsLandscape(content: string): boolean {
  const dom = new DOMParser().parseFromString(content, "text/html");
  for (const table of dom.querySelectorAll<HTMLTableElement>("table")) {
    const firstRow = table.querySelector<HTMLTableRowElement>("tr");
    if (!firstRow) continue;
    let columnCount = 0;
    for (const cell of firstRow.querySelectorAll<HTMLTableCellElement>("th, td")) {
      columnCount += Number(cell.getAttribute("colspan")) || 1;
    }
    if (columnCount >= 5) return true;
  }
  return false;
}

export { getBatchExportContent, getExportContent };
