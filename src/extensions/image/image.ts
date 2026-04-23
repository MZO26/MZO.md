import type { Editor } from "@tiptap/core";
import type { WorkerResult } from "../../../shared/types";
import { showToast } from "../../utils/toast";
import { compressImage } from "./image-utils";

const worker = new Worker(new URL("./image-worker.ts", import.meta.url), {
  type: "module",
});

function compressImageInWorker(
  file: File,
  maxWidth = 800,
  quality = 0.8,
): Promise<WorkerResult> {
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
    // adds
    worker.postMessage({ id, file, maxWidth, quality });
  });
}

function promptImageUpload(editor: Editor) {
  const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];

  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/jpeg, image/png, image/gif, image/webp";
  input.onchange = async (event: Event) => {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) {
      showToast("No file provided.");
      return;
    }
    if (!allowedTypes.includes(file.type)) {
      console.error("Invalid file type.");
      showToast("Error: Only JPG, PNG, GIF, and WebP are allowed.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      // 5MB limit
      showToast("Error: Image must be under 5MB.");
      return;
    }
    try {
      const response = await compressImageInWorker(file);
      if (!response.success) {
        showToast(response.message);
        return;
      }
      const extension = "jpeg";
      const imageCompression = await window.electronAPI.saveImage({
        imageData: response.data,
        extension: extension,
      });
      if (!imageCompression.success) {
        showToast(imageCompression.message);
        return;
      }
      editor
        .chain()
        .focus()
        .setImage({ src: imageCompression.data.imageSrc })
        .run();
    } catch (error) {
      console.error("Failed to process and insert image:", error);
      showToast("Error: Image compression failed.");
    }
  };
  input.click();
}

export { compressImage, promptImageUpload };
