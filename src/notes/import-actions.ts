import { getNoteEditorExtensions } from "@/components/editor/editor-init";
import { sleep } from "@/utils/async";
import {
  BATCH_SIZE,
  CONTENT_TYPE_MAP,
  DOMPURIFY_CONFIG,
  YIELD_INTERVAL,
} from "@shared/constants";
import { AppErrorCode } from "@shared/errors";
import { getMetadata, titleGenerator } from "@shared/generators";
import type { CreateNotePayload } from "@shared/schemas/note-schema";
import type { ImportedContent, Result } from "@shared/types";
import { Editor, type Content } from "@tiptap/core";
import DOMPurify from "dompurify";

// function to either sanitize content or format it to make import cleaner

function normalizeFileContent(file: ImportedContent): Content | string | null {
  const { content, extension } = file;
  if (!content) return null;
  if (typeof content === "string") {
    if (extension === "json") {
      try {
        return JSON.parse(content);
      } catch (error) {
        console.error("[normalizeFileContent]: Failed to parse JSON:", error);
        return null;
      }
    }
    if (extension === "html") {
      return DOMPurify.sanitize(content, DOMPURIFY_CONFIG);
    }
    if (extension === "md") {
      return content;
    }
  }
  //already object
  if (extension === "json") {
    return content;
  }
  return null;
}

// processes all files within limits and creates payloads that match the create note schema

async function setImportedContent(
  files: ImportedContent[],
): Promise<Result<CreateNotePayload[]>> {
  const headlessEditor = new Editor({
    extensions: getNoteEditorExtensions(),
  });
  try {
    let i = 0;
    const processedPayloads: CreateNotePayload[] = [];
    for (const file of files) {
      if (i > 0 && i % BATCH_SIZE === 0) {
        await sleep(YIELD_INTERVAL);
      }
      const contentType = CONTENT_TYPE_MAP[file.extension];
      const content = normalizeFileContent(file);
      if (content) {
        const options = contentType ? { contentType } : undefined;
        headlessEditor.commands.setContent(content, options);
      }
      const json = headlessEditor.getJSON();
      const text = headlessEditor.getText();
      const metadata = getMetadata(json);
      const payload: CreateNotePayload = {
        title: titleGenerator(json),
        content: json,
        plainText: text,
        ...metadata,
        pinned: false,
      };
      processedPayloads.push(payload);
      i++;
    }
    return { success: true, data: processedPayloads };
  } catch (error) {
    console.error(
      "[setImportedContent]: Failed to process imported content:",
      error,
    );
    return { success: false, error: AppErrorCode.InvalidData };
  } finally {
    headlessEditor.destroy();
  }
}

export { setImportedContent };
