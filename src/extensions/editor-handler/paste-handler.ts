import { rendererLogger } from "@/app";
import { getMarkdownManager } from "@/components/editor/editor-actions";
import { processAndInsertImages } from "@/extensions/image/image";
import {
  ALLOWED_TYPES,
  DOMPURIFY_CONFIG,
  MAX_DROP_LENGTH,
} from "@/utils/constants";
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
            if (!clipboardData || !editor) return false;
            const files = Array.from(clipboardData.files ?? []);
            const images = files.filter((f) => ALLOWED_TYPES.includes(f.type));
            if (images.length > 0) {
              event.preventDefault();
              const safeImages = images.slice(0, MAX_DROP_LENGTH);
              void processAndInsertImages(safeImages, editor).catch(
                (error: unknown) => {
                  rendererLogger.appError(
                    "[PasteHandler]: Image processing failed:",
                    error,
                  );
                },
              );
              return true;
            }
            const html = clipboardData.getData("text/html");
            const plainText = clipboardData.getData("text/plain") || "";
            if (plainText.length > MAX_CHARACTERS) {
              event.preventDefault();
              return true;
            }
            if (!html && looksLikeMarkdown(plainText)) {
              event.preventDefault();
              const json = getMarkdownManager().parse(plainText);
              editor.commands.insertContent(json, { contentType: "json" });
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

function looksLikeMarkdown(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  const strongSignals = [
    /^#{1,6}\s+\S/m,
    /^```/m,
    /!\[[^\]\n]*\]\([^)\n]+\)/,
    /\[[^\]\n]+\]\([^)\n]+\)/,
    /^={3,}$\vert{}^-{3,}$/m,
  ];

  if (strongSignals.some((pattern) => pattern.test(trimmed))) return true;

  let matchCount = 0;

  const inlinePatterns = [
    /\*\*[^*\n]+\*\*/g,
    /__[^_\n]+__/g,
    /(?:^|[^\w*])\*[^*\n]+\*(?!\w)/g,
    /(?:^|[^\w_])_[^_\n]+_(?!\w)/g,
    /~~[^~\n]+~~/g,
    /`[^`\n]+`/g,
  ];

  for (const pattern of inlinePatterns) {
    const matches = trimmed.match(pattern);
    if (matches) matchCount += matches.length;
    if (matchCount >= 2) return true;
  }

  const lines = trimmed.split(/\r?\n/);

  const blockPatterns = [
    /^>\s?\S/,
    /^[-*+]\s+\S/,
    /^\d+[.)]\s+\S/,
    /^\|.+\|$/,
    /^(-{3,}|\*{3,}|_{3,})$/,
  ];

  for (const line of lines) {
    for (const pattern of blockPatterns) {
      if (pattern.test(line)) {
        matchCount++;
        if (matchCount >= 3) return true;
        break;
      }
    }
  }

  return false;
}
