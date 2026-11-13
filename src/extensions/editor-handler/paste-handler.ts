import {
  getMarkdownManager,
  looksLikeMarkdown,
  resolveMarkConflicts,
} from "@/components/editor/editor-actions";
import { isValidExtension } from "@/components/sidebar/sidebar-file-drop";
import { processDroppedFiles } from "@/extensions/editor-handler/drop-handler";
import { processAndInsertImages } from "@/extensions/overrides/image/image";
import {
  ALLOWED_TYPES,
  DOMPURIFY_CONFIG,
  MAX_DROP_LENGTH,
} from "@/utils/constants";
import { getExtension, rendererLogger } from "@/utils/helpers";
import { MAX_CHARACTERS } from "@shared/shared-constants";
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
            if (!clipboardData || clipboardData.files.length === 0)
              return false;
            const pasteCandidates = Iterator.from(clipboardData.files)
              .filter(
                (f) =>
                  ALLOWED_TYPES.includes(f.type) ||
                  isValidExtension(getExtension(f.name)),
              )
              .take(MAX_DROP_LENGTH)
              .toArray();
            if (pasteCandidates.length > 0) {
              event.preventDefault();
              const pastePos = editor.state.selection.from;
              const { images = [], content = [] } = Object.groupBy(
                pasteCandidates,
                (f) => (ALLOWED_TYPES.includes(f.type) ? "images" : "content"),
              );
              void (async () => {
                try {
                  if (images.length > 0) {
                    await processAndInsertImages(images, editor, pastePos);
                  }
                  if (content.length > 0) {
                    await processDroppedFiles(editor, content, pastePos);
                  }
                } catch (error) {
                  rendererLogger.appError(
                    "[PasteHandler]: File paste processing failed:",
                    error,
                  );
                }
              })();
              return true;
            }
            const html = clipboardData.getData("text/html");
            const plainText = clipboardData.getData("text/plain") || "";
            if (plainText.length > MAX_CHARACTERS) {
              event.preventDefault();
              return true;
            }
            if (!html && looksLikeMarkdown(plainText)) {
              try {
                const json = getMarkdownManager().parse(plainText);
                const content = json?.content;
                if (!content) return false;
                const resolved = resolveMarkConflicts(content);
                event.preventDefault();
                editor.commands.insertContent(resolved);
                return true;
              } catch (error) {
                rendererLogger.appError(
                  "[PasteHandler]: Failed to insert clipboard content",
                  error,
                );
                return false;
              }
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
