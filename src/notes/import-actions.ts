import { getCachedEditorExtensions } from "@/components/editor/editor-actions";
import {
  ensureEditorDoc,
  snippetGenerator,
  textConverter,
  titleGenerator,
  walkDoc,
} from "@/components/editor/editor-generators";
import { addActiveTagToDoc } from "@/extensions/tag/tag-handler";
import { stateStore } from "@/state/state";
import { DOMPURIFY_CONFIG } from "@/utils/constants";
import { rendererLogger, withPerformanceLog } from "@/utils/helpers";
import { workOnMarkdownParsing } from "@/utils/workers/worker-init";
import { AppErrorCode } from "@shared/errors";
import type { CreateNotePayload } from "@shared/schemas/note-schema";
import type { ImportContent } from "@shared/schemas/request-schema";
import type { Result } from "@shared/shared-types";
import { generateJSON, generateText, type JSONContent } from "@tiptap/core";
import DOMPurify from "dompurify";

async function normalizeFileContent(file: ImportContent): Promise<JSONContent | undefined> {
  const { content, extension } = file;
  if (typeof content !== "string") return undefined;
  try {
    switch (extension) {
      case "json":
        return ensureEditorDoc(JSON.parse(content));
      case "html": {
        const safe = DOMPurify.sanitize(content, DOMPURIFY_CONFIG);
        return generateJSON(safe, getCachedEditorExtensions());
      }
      case "md": {
        const response = await withPerformanceLog(workOnMarkdownParsing)(content);
        if (!response.success) {
          rendererLogger.appError("[normalizeFileContent]: Worker failed:", response.error);
          return undefined;
        }
        return ensureEditorDoc(JSON.parse(response.data));
      }
      case "txt":
        return ensureEditorDoc(textConverter(content));
      default:
        extension satisfies never;
        return undefined;
    }
  } catch (error) {
    rendererLogger.appError(
      `[normalizeFileContent]: Normalization failed for .${extension}:`,
      error,
    );
    return undefined;
  }
}

async function setImportedContent(files: ImportContent[]): Promise<Result<CreateNotePayload[]>> {
  try {
    const processedPayloads: CreateNotePayload[] = [];
    const activeTag = stateStore.get("activeTag");
    const extensions = getCachedEditorExtensions();
    for (const file of files) {
      const content = file.content;
      const json = await normalizeFileContent({ ...file, content });
      if (!json) {
        rendererLogger.appError(
          `[setImportedContent]: Skipping file (${file.extension}), normalizeFileContent returned undefined. Content length: ${content?.length}`,
        );
        continue;
      }
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
    rendererLogger.appError("[setImportedContent]: Failed to process imported content:", error);
    return { success: false, error: AppErrorCode.InvalidData };
  }
}

export { normalizeFileContent, setImportedContent };
