import type { Editor } from "@tiptap/core";
import { showToast } from "../utils/toast";

function compressImage(
  file: File,
  maxWidth = 800,
  quality = 0.8,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      img.onload = () => {
        if (img.width > maxWidth) {
          canvas.width = maxWidth;
          canvas.height = (img.height * maxWidth) / img.width;
        } else {
          canvas.width = img.width;
          canvas.height = img.height;
        }
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
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

    if (file) {
      if (!allowedTypes.includes(file.type)) {
        console.error("Invalid file type.");
        showToast("Security Error: Only JPG, PNG, GIF, and WebP are allowed.");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        // 5MB limit
        showToast("Error: Image must be under 5MB.");
        return;
      }
      try {
        const compressedImage = await compressImage(file);
        editor.chain().focus().setImage({ src: compressedImage }).run();
      } catch (error) {
        console.error("Failed to process and insert image:", error);
      }
    }
  };

  input.click();
}

export { promptImageUpload };
