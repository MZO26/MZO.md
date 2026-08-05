import { imageWriteMany } from "@/api/api";
import { rendererLogger } from "@/app";
import { compressImageInWorker } from "@/utils/workers/worker-init";
import {
  ALLOWED_TYPES,
  MAX_SIZE,
  MIME_TO_EXT,
} from "@shared/constants/renderer-constants";
import type { ImagePayload } from "@shared/schemas/image-schema";
import type { ImageContent } from "@shared/types";
import type { Editor } from "@tiptap/core";

async function processAndInsertImages(files: File[], editor: Editor | null) {
  if (!editor) return;
  const validFiles = files.filter(
    (file) =>
      ALLOWED_TYPES.includes(file.type) &&
      file.size <= MAX_SIZE &&
      file.type.startsWith("image/"),
  );
  if (validFiles.length === 0) return;
  try {
    const compressedResults = await Promise.all(
      validFiles.map(async (file) => {
        const result = await compressImageInWorker(file);
        if (!result.success) {
          rendererLogger.appError(
            "[processAndInsertImages]: Image compression failed:",
            result.error,
          );
          return null;
        }
        const extension = MIME_TO_EXT[file.type] ?? "webp";
        return {
          extension,
          imageData: result.data,
        };
      }),
    );
    const payload = compressedResults.filter(
      (item): item is ImagePayload => item !== null,
    );
    const result = await imageWriteMany(payload);
    if (!result.success) {
      rendererLogger.appError(
        "[processAndInsertImages -> imageWriteMany]: Failed to save image:",
        result.error,
      );
      return;
    }
    const content: ImageContent = [];
    for (const src of result.data) {
      content.push({ type: "image", attrs: { src } }, { type: "paragraph" });
    }
    editor
      .chain()
      .focus()
      .insertContent(content, {
        updateSelection: true,
      })
      .run();
  } catch (error) {
    rendererLogger.appError(
      "[processAndInsertImages]: Unknown Error. Failed to process and insert image:",
      error,
    );
  }
}

async function promptImageUpload(editor: Editor | null) {
  if (!editor) return;
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/jpeg,image/png,image/gif,image/webp";
  input.multiple = true;
  input.onchange = async (event: Event) => {
    const target = event.target as HTMLInputElement | null;
    if (!target) return;
    const files = target.files;
    if (!files) return;
    await processAndInsertImages(Array.from(files), editor);
  };
  input.click();
}

export { compressImageInWorker, processAndInsertImages, promptImageUpload };
