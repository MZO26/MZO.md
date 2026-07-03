import { processAndInsertImages } from "@/extensions/image/image";
import { ALLOWED_TYPES, DOMPURIFY_CONFIG } from "@shared/constants";
import { Extension } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";
import DOMPurify from "dompurify";

export const PasteHandler = Extension.create({
  name: "pasteHandler",

  addProseMirrorPlugins() {
    const editor = this.editor;

    return [
      new Plugin({
        props: {
          handlePaste(view, event) {
            const cb = event.clipboardData;
            if (!editor || !cb) return false;
            const files = Array.from(cb.files ?? []);
            const images = files.filter((f) => ALLOWED_TYPES.includes(f.type));
            if (images.length > 0) {
              event.preventDefault();
              const safeImages = images.slice(0, 20);
              if (images.length > 20) return false;
              void processAndInsertImages(safeImages, editor).catch((error) => {
                console.error(
                  "[PasteHandler]: Failed to process pasted images:",
                  error,
                );
              });
              return true;
            }
            const text = event.clipboardData?.getData("text/plain");
            const html = event.clipboardData?.getData("text/html");
            if (!text || html || !editor.markdown) {
              return false;
            }
            try {
              const normalized = text.replace(/\r\n?/g, "\n");
              const content = editor.markdown.parse(normalized);
              view.dispatch(
                view.state.tr.replaceSelectionWith(
                  editor.schema.nodeFromJSON(content),
                  false,
                ),
              );
              return true;
            } catch {
              return false;
            }
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
