import { getNoteEditorExtensions } from "@/components/editor/editor-init";
import { sleep } from "@/utils/async";
import {
  AppErrorCode,
  BATCH_SIZE,
  CONTENT_TYPE_MAP,
  DOMPURIFY_CONFIG,
  YIELD_INTERVAL,
} from "@shared/constants";
import { getMetadata } from "@shared/generators/generators";
import type { CreateNotePayload } from "@shared/schemas/note-schema";
import type { ImportedContent, Result } from "@shared/types";
import { Editor, type JSONContent } from "@tiptap/core";
import DOMPurify from "dompurify";

function textConverter(txt: string) {
  if (!txt) return undefined;
  const lines = txt.split(/\r?\n/);
  const content: JSONContent[] = [];
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine) {
      content.push({
        type: "paragraph",
        content: [{ type: "text", text: line }],
      });
    }
  }
  return content;
}

function normalizeFileContent(file: ImportedContent) {
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
    const plainText = textConverter(content);
    return plainText ? { type: "doc", content: plainText } : null;
  }
  //already object
  if (extension === "json") {
    return content;
  }
  return null;
}

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
      const plainText = headlessEditor.getText();
      const metadata = getMetadata(json, plainText);
      const payload: CreateNotePayload = {
        content: json,
        plainText: plainText,
        ...metadata,
        pinned: false,
        bookmarked: false,
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
