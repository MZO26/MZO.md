import { processAndInsertImages } from "@/extensions/image/image";
import {
  ALLOWED_TYPES,
  DOMPURIFY_CONFIG,
  MAX_DROP_PASTE_CHARACTERS,
} from "@shared/constants";
import { Extension } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";
import DOMPurify from "dompurify";

export const PasteHandler = Extension.create({
  name: "PasteHandler",

  addProseMirrorPlugins() {
    const editor = this.editor;

    return [
      new Plugin({
        props: {
          handlePaste(_view, event) {
            const clipboardData = event.clipboardData;
            if (!clipboardData || !editor) return false;
            const files = Array.from(clipboardData.files ?? []);
            const images = files.filter((f) => ALLOWED_TYPES.includes(f.type));
            if (images.length > 0) {
              event.preventDefault();
              const safeImages = images.slice(0, 20);
              void processAndInsertImages(safeImages, editor).catch(
                (error: unknown) => {
                  console.error(
                    "[PasteHandler]: Image processing failed:",
                    error,
                  );
                },
              );
              return true;
            }
            const plainText = clipboardData.getData("text/plain") || "";
            if (plainText.length > MAX_DROP_PASTE_CHARACTERS) {
              event.preventDefault();
              return true;
            }
            return false;
          },
        },
      }),
    ];
  },
});

export const GoogleDocsCleanup = Extension.create({
  name: "googleDocsCleanup",
  transformPastedHTML(html) {
    return (
      html
        // Remove Google Docs spans with inline styles
        .replace(/<span[^>]*style="[^"]*"[^>]*>(.*?)<\/span>/gi, "$1")
        // Remove Google Docs IDs
        .replace(/\s+id="docs-internal-[^"]*"/gi, "")
        // Remove empty spans
        .replace(/<span>(.*?)<\/span>/gi, "$1")
    );
  },
});

export const WordCleanup = Extension.create({
  name: "wordCleanup",
  transformPastedHTML(html) {
    return (
      html
        // Remove Word-specific classes
        .replace(/\s+class="Mso[^"]*"/gi, "")
        // Remove Word-specific tags
        .replace(/<o:p>.*?<\/o:p>/gi, "")
        // Remove conditional comments
        .replace(/<!--\[if.*?<!\[endif\]-->/gs, "")
    );
  },
});

export const SecurityCleanup = Extension.create({
  name: "securityCleanup",
  transformPastedHTML(html) {
    return DOMPurify.sanitize(html, DOMPURIFY_CONFIG);
  },
});
