import { saveImage } from "@/api/electronAPI";
import { showToast } from "@/utils/toast";
import { useDelayedSpinner } from "@/utils/ui";
import type { Result } from "@shared/types";
import type { Editor } from "@tiptap/core";

const mimeToExt = {
  "image/jpeg": "jpeg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
} as const;

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MAX_SIZE = 25 * 1024 * 1024; // 25MB -> 25MB * 1024 = 25,600KB -> *1024 = 26,214,400B. file.size from JS is always in bytes

const worker = new Worker(new URL("./image-worker.ts", import.meta.url), {
  type: "module",
});

function compressImageInWorker(
  file: File,
  maxWidth = 800,
  quality = 0.8,
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
          resolve({ success: false, message: event.data.message });
        }
      }
    };
    worker.addEventListener("message", handleMessage);
    worker.postMessage({ id, file, maxWidth, quality });
  });
}

async function processAndInsertImage(file: File, editor: Editor, pos: number) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    showToast("Error: Only JPG, PNG, GIF, and WebP are allowed.");
    return;
  }
  if (file.size > MAX_SIZE) {
    showToast("Error: Image must be under 25MB.");
    return;
  }
  const stopSpinner = useDelayedSpinner(100);
  try {
    const response = await compressImageInWorker(file);
    if (!response.success) {
      showToast(response.message);
      return;
    }
    const extension = mimeToExt[file.type as keyof typeof mimeToExt] ?? "jpeg";
    const saved = await saveImage({ imageData: response.data, extension });
    if (!saved.success) {
      showToast(saved.message);
      return;
    }
    editor
      .chain()
      .focus()
      .insertContentAt(pos, {
        type: "image",
        attrs: { src: saved.data.imageSrc },
      })
      .run();
  } catch (error) {
    console.error("Failed to process and insert image:", error);
    showToast("Error: Image compression failed.");
  } finally {
    if (stopSpinner) stopSpinner();
  }
}

async function promptImageUpload(editor: Editor) {
  if (!editor) return;
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/jpeg,image/png,image/gif,image/webp";
  input.onchange = async (event: Event) => {
    input.remove();
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const pos = editor.state.selection.to;
    await processAndInsertImage(file, editor, pos);
  };
  input.click();
}

export { compressImageInWorker, processAndInsertImage, promptImageUpload };
