import {
  getCachedEditorExtensions,
  getMarkdownManager,
} from "@/components/editor/editor-features";
import { stateStore } from "@/settings/app-state";
import { addActiveTagToDoc } from "@/utils/note";
import { DOMPURIFY_CONFIG } from "@shared/constants";
import { AppErrorCode } from "@shared/errors";
import {
  getMetadata,
  textConverter,
  titleGenerator,
  wrapAsDoc,
} from "@shared/generators";
import type { EditorDoc } from "@shared/schemas/editor-schema";
import type { CreateNotePayload } from "@shared/schemas/note-schema";
import type { ImportedContent, Result } from "@shared/types";
import { generateJSON } from "@tiptap/core";
import DOMPurify from "dompurify";

// function to either sanitize content or format it to make import cleaner

function normalizeFileContent(file: ImportedContent): EditorDoc | undefined {
  const { content, extension } = file;
  if (typeof content !== "string") return undefined;
  try {
    switch (extension) {
      case "json": {
        try {
          const parsed = JSON.parse(content);
          if (isEditorDoc(parsed)) return parsed;
          const doc = wrapAsDoc(parsed);
          return isEditorDoc(doc) ? doc : undefined;
        } catch (error) {
          console.error("[normalizeFileContent]: JSON Parse failed:", error);
          return undefined;
        }
      }
      case "html": {
        const safe = DOMPurify.sanitize(content, DOMPURIFY_CONFIG);
        const doc = generateJSON(safe, getCachedEditorExtensions());
        return isEditorDoc(doc) ? doc : undefined;
      }
      case "md": {
        const doc = getMarkdownManager().parse(content);
        return isEditorDoc(doc) ? doc : undefined;
      }
      case "txt": {
        const doc = wrapAsDoc(textConverter(content));
        return isEditorDoc(doc) ? doc : undefined;
      }
      default:
        return undefined;
    }
  } catch (error) {
    console.error(
      `[normalizeFileContent]: Normalization failed for extension .${extension}:`,
      error,
    );
    return undefined;
  }
}

function isEditorDoc(value: unknown): value is EditorDoc {
  if (typeof value !== "object" || value === null) return false;
  if (!("type" in value) || value.type !== "doc") return false;
  if (!("content" in value) || !Array.isArray(value.content)) return false;
  return true;
}

async function setImportedContent(
  files: ImportedContent[],
): Promise<Result<CreateNotePayload[]>> {
  try {
    const processedPayloads: CreateNotePayload[] = [];
    for (const file of files) {
      const json = normalizeFileContent(file);
      if (!json) return { success: false, error: AppErrorCode.InvalidData };
      const updatedJson = addActiveTagToDoc(json, stateStore.get("activeTag"));
      const metadata = getMetadata(updatedJson);
      const payload: CreateNotePayload = {
        title: titleGenerator(updatedJson),
        content: updatedJson,
        ...metadata,
        pinned: false,
      };
      processedPayloads.push(payload);
    }
    return { success: true, data: processedPayloads };
  } catch (error) {
    console.error(
      "[setImportedContent]: Failed to process imported content:",
      error,
    );
    return { success: false, error: AppErrorCode.InvalidData };
  }
}

export { normalizeFileContent, setImportedContent };
