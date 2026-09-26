import { rendererLogger } from "@/app";
import { getCachedEditorExtensions } from "@/components/editor/editor-actions";
import {
  extractFrontmatter,
  getFrontmatterMetadata,
} from "@/extensions/frontmatter";
import { addActiveTagToDoc } from "@/extensions/tag/tag-handler";
import { addActiveLinkToDoc } from "@/extensions/wikilink/wikilink-handler";
import { stateStore } from "@/state/state";
import { DOMPURIFY_CONFIG } from "@/utils/constants";
import {
  getMetadata,
  textConverter,
  titleGenerator,
  wrapAsDoc,
} from "@/utils/generators";
import type { Metadata } from "@/utils/types";
import { workOnMarkdownParsing } from "@/utils/workers/worker-init";
import { AppErrorCode } from "@shared/errors";
import { isEditorDoc } from "@shared/schemas/editor-schema";
import type { CreateNotePayload } from "@shared/schemas/note-schema";
import type { ImportContent } from "@shared/schemas/request-schema";
import type { Result } from "@shared/shared-types";
import { generateJSON, generateText, type JSONContent } from "@tiptap/core";
import DOMPurify from "dompurify";

// function to either sanitize content or format it to make import cleaner

async function normalizeFileContent(
  file: ImportContent,
): Promise<JSONContent | undefined> {
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
        return isEditorDoc(doc) ? doc : undefined;
      }
      case "md": {
        try {
          const response = await workOnMarkdownParsing(content);
          if (!response.success) {
            rendererLogger.appError(
              "[normalizeFileContent]: Worker failed to parse Markdown:",
              response.error,
            );
            return undefined;
          }
          const doc = response.success ? JSON.parse(response.data) : undefined;
          return isEditorDoc(doc) ? doc : undefined;
        } catch (error) {
          rendererLogger.appError(
            "[normalizeFileContent]: Failed to parse JSON",
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
      let content = file.content;
      let extracted: Pick<Metadata, "tags" | "links"> = { tags: [], links: [] };
      if (file.extension === "md") {
        const frontmatter = extractFrontmatter(file.content);
        if (frontmatter) {
          rendererLogger.devLog("YAML:", JSON.stringify(frontmatter.yaml));
          content = frontmatter.body;
          extracted = getFrontmatterMetadata(frontmatter.yaml);
          rendererLogger.devLog(extracted);
        }
      }
      const json = await normalizeFileContent({ ...file, content });
      if (!json) continue;
      let updatedJson = addActiveTagToDoc(json, activeTag);
      if (extracted.tags) {
        for (const tag of extracted.tags) {
          updatedJson = addActiveTagToDoc(updatedJson, tag);
        }
      }
      if (extracted.links) {
        for (const link of extracted.links) {
          updatedJson = addActiveLinkToDoc(updatedJson, link);
        }
      }
      const text = generateText(updatedJson, extensions);
      const metadata = getMetadata(updatedJson);
      const payload: CreateNotePayload = {
        title: titleGenerator(updatedJson),
        content: updatedJson,
        plain_text: text,
        ...metadata,
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
