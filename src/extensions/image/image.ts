import { imageWrite } from "@/api/api";
import { useDelayedSpinner } from "@/utils/ui";
import { ALLOWED_TYPES, MAX_SIZE, MIME_TO_EXT } from "@shared/constants";
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
  return new Promise((resolve) => {
    // uuid for compression job. functions like a tracking number to identify request
    const id = crypto.randomUUID();
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
    worker.postMessage({ id, file, maxWidth, quality });
  });
}

async function processAndInsertImage(file: File, editor: Editor | null) {
  if (!editor) return;
  if (!ALLOWED_TYPES.includes(file.type)) {
    console.error("[processAndInsertImage]: Invalid file type.");
    return;
  }
  if (file.size > MAX_SIZE) {
    console.error("[processAndInsertImage]: File size exceeds the limit.");
    return;
  }
  try {
    const result = await compressImageInWorker(file);
    if (!result.success) {
      console.error(
        "[processAndInsertImage]: Image compression failed:",
        result.error,
      );
      return;
    }
    const extension =
      MIME_TO_EXT[file.type as keyof typeof MIME_TO_EXT] ?? "jpeg";
    const saved = await imageWrite({ imageData: result.data, extension });
    if (!saved.success) {
      console.error("[imageWrite]: Failed to save image:", saved.error);
      return;
    }
    const currentPos = editor?.state.selection.to;
    editor
      .chain()
      .focus()
      .insertContentAt(currentPos, {
        type: "image",
        attrs: { src: saved.data.imageSrc },
      })
      .run();
  } catch (error) {
    console.error(
      "[processAndInsertImage]: Unknown Error. Failed to process and insert image:",
      error,
    );
  }
}

async function promptImageUpload(editor: Editor | null) {
  if (!editor) return;
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/jpeg,image/png,image/gif,image/webp";
  input.onchange = async (event: Event) => {
    const target = event.target as HTMLInputElement | null;
    const file = target?.files?.[0];
    if (!file) return;
    const stopSpinner = useDelayedSpinner();
    await processAndInsertImage(file, editor).finally(() => {
      if (stopSpinner) stopSpinner();
    });
  };
  input.click();
}

export { compressImageInWorker, processAndInsertImage, promptImageUpload };
