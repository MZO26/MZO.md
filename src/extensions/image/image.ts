import { imageWriteMany } from "@/api/api";
import { ALLOWED_TYPES, MAX_SIZE, MIME_TO_EXT } from "@shared/constants";
import type { ImagePayload } from "@shared/schemas/image-schema";
import type { Result } from "@shared/types";
import type { Editor } from "@tiptap/core";

const worker = new Worker(new URL("./image-worker.ts", import.meta.url), {
  type: "module",
});

function compressImageInWorker(
  file: File,
  maxWidth = 1000,
  quality = 0.9,
): Promise<Result<Uint8Array>> {
  return new Promise(async (resolve) => {
    // uuid for compression job. functions like a tracking number to identify request
    const id = crypto.randomUUID();
    const arrayBuffer = await file.arrayBuffer();
    const handleMessage = (event: MessageEvent) => {
      if (event.data.id === id) {
        // only if id matches to filter out unrelated messages to this image
        worker.removeEventListener("message", handleMessage); // removes listener to free up memory
        if (event.data.success) {
          // if compression worked, event.data.data returns the compressed Uint8Array ready for IPC bridge.
          resolve({ success: true, data: event.data.data });
        } else {
          resolve({ success: false, error: event.data.message });
        }
      }
    };
    worker.addEventListener("message", handleMessage);
    worker.postMessage(
      { id, buffer: arrayBuffer, mimeType: file.type, maxWidth, quality },
      [arrayBuffer],
    );
  });
}

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
          console.error(
            "[processAndInsertImages]: Image compression failed:",
            result.error,
          );
          return null;
        }
        const extension =
          MIME_TO_EXT[file.type as keyof typeof MIME_TO_EXT] ?? "jpeg";
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
      console.error(
        "[processAndInsertImages -> imageWriteMany]: Failed to save image:",
        result.error,
      );
      return;
    }
    const content = result.data.flatMap((src) => [
      { type: "image", attrs: { src } },
      { type: "paragraph" },
    ]);
    editor
      .chain()
      .focus()
      .insertContent(content, {
        updateSelection: true,
      })
      .run();
  } catch (error) {
    console.error(
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
