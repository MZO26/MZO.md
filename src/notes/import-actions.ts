import { getCachedEditorExtensions } from "@/components/editor/editor-actions";
import {
  snippetGenerator,
  textConverter,
  titleGenerator,
  walkDoc,
  wrapAsDoc,
} from "@/components/editor/editor-generators";
import { addActiveTagToDoc } from "@/extensions/tag/tag-handler";
import { isRecord, stateStore } from "@/state/state";
import { DOMPURIFY_CONFIG } from "@/utils/constants";
import { rendererLogger, withPerformanceLog } from "@/utils/helpers";
import { workOnMarkdownParsing } from "@/utils/workers/worker-init";
import { AppErrorCode } from "@shared/errors";
import { isEditorDoc } from "@shared/schemas/editor-schema";
import type { CreateNotePayload } from "@shared/schemas/note-schema";
import type { ImportContent } from "@shared/schemas/request-schema";
import type { Result } from "@shared/shared-types";
import { generateJSON, generateText, type JSONContent } from "@tiptap/core";
import DOMPurify from "dompurify";

async function normalizeFileContent(
  file: ImportContent,
): Promise<JSONContent | undefined> {
  const { content, extension } = file;
  if (typeof content !== "string") return undefined;
  try {
    switch (extension) {
      case "json": {
        try {
          const parsed: unknown = JSON.parse(content);
          if (!isRecord(parsed)) return undefined;
          const doc = isEditorDoc(parsed) ? parsed : wrapAsDoc(parsed);
          return doc;
        } catch (error) {
          rendererLogger.appError(
            "[normalizeFileContent]: JSON Parse failed:",
            error,
          );
          return undefined;
        }
      }
      case "html": {
        const safe = DOMPurify.sanitize(content, DOMPURIFY_CONFIG);
        const doc = generateJSON(safe, getCachedEditorExtensions());
        return isEditorDoc(doc) ? doc : wrapAsDoc(doc);
      }
      case "md": {
        try {
          const response = await withPerformanceLog(workOnMarkdownParsing)(
            content,
          );
          if (!response.success) {
            rendererLogger.appError(
              "[normalizeFileContent]: Worker failed to parse Markdown:",
              response.error,
            );
            return undefined;
          }
          const doc: unknown = JSON.parse(response.data);
          if (!isRecord(doc)) return undefined;
          return wrapAsDoc(doc);
        } catch (error) {
          rendererLogger.appError(
            "[normalizeFileContent]: Failed to parse JSON",
            error,
          );
          return undefined;
        }
      }
      case "txt": {
        const doc = wrapAsDoc(textConverter(content));
        return isEditorDoc(doc) ? doc : undefined;
      }
      default:
        extension satisfies never;
        return undefined;
    }
  } catch (error) {
    rendererLogger.appError(
      `[normalizeFileContent]: Normalization failed for extension .${extension}:`,
      error,
    );
    return undefined;
  }
}

async function setImportedContent(
  files: ImportContent[],
): Promise<Result<CreateNotePayload[]>> {
  try {
    const processedPayloads: CreateNotePayload[] = [];
    const activeTag = stateStore.get("activeTag");
    const extensions = getCachedEditorExtensions();
    for (const file of files) {
      const content = file.content;
      const json = await normalizeFileContent({ ...file, content });
      if (!json) continue;
      const updatedJson = addActiveTagToDoc(json, activeTag);
      const text = generateText(updatedJson, extensions);
      const payload: CreateNotePayload = {
        title: titleGenerator(updatedJson),
        snippet: snippetGenerator(updatedJson),
        content: updatedJson,
        plain_text: text,
        ...walkDoc(updatedJson),
        pinned: false,
      };
      processedPayloads.push(payload);
    }
    if (processedPayloads.length === 0 && files.length > 0) {
      return { success: false, error: AppErrorCode.InvalidData };
    }
    return { success: true, data: processedPayloads };
  } catch (error) {
    rendererLogger.appError(
      "[setImportedContent]: Failed to process imported content:",
      error,
    );
    return { success: false, error: AppErrorCode.InvalidData };
  }
}

export { normalizeFileContent, setImportedContent };
