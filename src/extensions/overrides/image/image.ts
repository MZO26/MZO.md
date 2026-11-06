import { imageWriteMany } from "@/api/api";
import { ALLOWED_TYPES, MAX_SIZE, MIME_TO_EXT } from "@/utils/constants";
import { rendererLogger } from "@/utils/helpers";
import { compressImageInWorker } from "@/utils/workers/worker-init";
import type { ImagePayload } from "@shared/schemas/image-schema";
import type { Editor, JSONContent } from "@tiptap/core";

async function processAndInsertImages(
  files: File[],
  editor: Editor,
  dropPos: number,
) {
  const validFiles = files.filter(
    (file) => file.size <= MAX_SIZE && ALLOWED_TYPES.includes(file.type),
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
    if (payload.length === 0) return;
    const result = await imageWriteMany(payload);
    if (!result.success) {
      rendererLogger.appError(
        "[processAndInsertImages -> imageWriteMany]: Failed to save image:",
        result.error,
      );
      return;
    }
    const imageUrls = (Array.isArray(result.data) ? result.data : []).filter(
      (src): src is string => typeof src === "string" && src.length > 0,
    );
    if (imageUrls.length === 0) {
      rendererLogger.appError(
        "[processAndInsertImages]: imageWriteMany returned no valid image URLs",
        result,
      );
      return;
    }
    const content: JSONContent[] = imageUrls.map((src) => ({
      type: "image",
      attrs: {
        src,
        alt: "",
      },
    }));
    editor
      .chain()
      .focus()
      .insertContentAt(dropPos, content, {
        updateSelection: true,
      })
      .run();
  } catch {}
}

async function promptImageUpload(editor: Editor) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/jpeg,image/png,image/gif,image/webp";
  input.multiple = true;
  input.onchange = async (e: Event) => {
    if (!(e.target instanceof HTMLInputElement)) return;
    const files = e.target.files;
    if (!files) return;
    const pos = editor.state.selection.from;
    await processAndInsertImages(Array.from(files), editor, pos);
  };
  input.click();
}

export { processAndInsertImages, promptImageUpload };
