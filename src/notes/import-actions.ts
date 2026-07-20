import { getCachedEditorExtensions } from "@/components/editor/editor-features";
import { stateStore } from "@/settings/app-state";
import { addActiveTagToDoc } from "@/utils/note";
import { DOMPURIFY_CONFIG } from "@shared/constants";
import { AppErrorCode } from "@shared/errors";
import {
  getMetadata,
  jsonConverter,
  textConverter,
  titleGenerator,
  wrapAsDoc,
} from "@shared/generators";
import type { EditorDoc } from "@shared/schemas/editor-schema";
import type { CreateNotePayload } from "@shared/schemas/note-schema";
import type { ImportedContent, Result } from "@shared/types";
import { generateJSON } from "@tiptap/core";
import DOMPurify from "dompurify";
import { marked } from "marked";

// function to either sanitize content or format it to make import cleaner

function normalizeFileContent(file: ImportedContent): EditorDoc | undefined {
  const { content, extension } = file;
  if (!content) return undefined;
  if (typeof content === "string") {
    if (extension === "json") {
      const doc = wrapAsDoc(jsonConverter(content));
      return isEditorDoc(doc) ? doc : undefined;
    }
    if (extension === "html") {
      const safe = DOMPurify.sanitize(content, DOMPURIFY_CONFIG);
      const doc = generateJSON(safe, getCachedEditorExtensions());
      return isEditorDoc(doc) ? doc : undefined;
    }
    if (extension === "md") {
      const html = marked.parse(content) as string;
      const safe = DOMPurify.sanitize(html, DOMPURIFY_CONFIG);
      const doc = generateJSON(safe, getCachedEditorExtensions());
      return isEditorDoc(doc) ? doc : undefined;
    }
    if (extension === "txt") {
      const doc = wrapAsDoc(textConverter(content));
      return isEditorDoc(doc) ? doc : undefined;
    }
  }
  //already object
  if (extension === "json" && isEditorDoc(content)) {
    return content;
  }
  return undefined;
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
