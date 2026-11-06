import { getMarkdownManager } from "@/components/editor/editor-actions";
import { isValidExtension } from "@/components/sidebar/sidebar-file-drop";
import { processAndInsertImages } from "@/extensions/overrides/image/image";
import {
  ALLOWED_TYPES,
  DOMPURIFY_CONFIG,
  MAX_DROP_LENGTH,
} from "@/utils/constants";
import { getExtension, rendererLogger } from "@/utils/helpers";
import { MAX_CHARACTERS } from "@shared/shared-constants";
import { Extension, type JSONContent } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";
import DOMPurify from "dompurify";
import { processDroppedFiles } from "./drop-handler";

function resolveMarkConflicts(nodes: JSONContent[]): JSONContent[] {
  return nodes.map((node) => {
    if (
      node.type === "text" &&
      node.marks?.some((mark) => mark.type === "code")
    ) {
      return {
        ...node,
        marks: node.marks.filter((mark) => mark.type !== "bold"),
      };
    }
    if (node.content) {
      return {
        ...node,
        content: resolveMarkConflicts(node.content),
      };
    }
    return node;
  });
}

const strongSignals = [
  /^#{1,6}\s+\S/m,
  /^```/m,
  /!\[[^\]\n]*\]\([^)\n]+\)/,
  /\[[^\]\n]+\]\([^)\n]+\)/,
  /^\S[^\r\n]*\r?\n(?:={3,}|-{3,})$/m,
  /^---\r?\n(?:\w[\w-]*:\s?.*\r?\n)+---$/m,
  /^\s*(?:[-*+]|\d{1,3}[.)])\s+\[[ xX]\]\s+\S/m,
];

const inlinePatterns = [
  /\*\*[^*\n]+\*\*/g,
  /__[^_\n]+__/g,
  /(?:^|[^\w*])\*[^*\n]+\*(?!\w)/g,
  /(?:^|[^\w_])_[^_\n]+_(?!\w)/g,
  /~~[^~\n]+~~/g,
  /`[^`\n]+`/g,
];

const blockPatterns = [
  /^>\s?\S/,
  /^\s*[-*+]\s+\S/,
  /^\s*\d{1,3}[.)]\s+\S/,
  /^\|.+\|$/,
  /^(-{3,}|\*{3,}|_{3,})$/,
];

export const PasteHandler = Extension.create({
  name: "PasteHandler", // Tipp: In Tiptap nutzt man meist camelCase ("pasteHandler")

  addProseMirrorPlugins() {
    const editor = this.editor;

    return [
      new Plugin({
        props: {
          handlePaste(_view, event) {
            const clipboardData = event.clipboardData;
            if (!clipboardData) return false;
            const files = Array.from(clipboardData.files ?? []);
            if (files.length > 0) {
              const candidates = files
                .filter(
                  (f) =>
                    ALLOWED_TYPES.includes(f.type) ||
                    isValidExtension(getExtension(f.name)),
                )
                .slice(0, MAX_DROP_LENGTH);
              if (candidates.length > 0) {
                event.preventDefault();
                const pastePos = editor.state.selection.from;
                const imageFiles = candidates.filter((f) =>
                  ALLOWED_TYPES.includes(f.type),
                );
                const contentFiles = candidates.filter(
                  (f) => !ALLOWED_TYPES.includes(f.type),
                );
                void (async () => {
                  try {
                    if (imageFiles.length > 0) {
                      await processAndInsertImages(
                        imageFiles,
                        editor,
                        pastePos,
                      );
                    }
                    if (contentFiles.length > 0) {
                      await processDroppedFiles(editor, contentFiles, pastePos);
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

function looksLikeMarkdown(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (strongSignals.some((pattern) => pattern.test(trimmed))) return true;
  let matchCount = 0;
  for (const pattern of inlinePatterns) {
    const matches = trimmed.match(pattern);
    if (matches) matchCount += matches.length;
    if (matchCount >= 2) return true;
  }
  const lines = trimmed.split(/\r?\n/);
  for (const line of lines) {
    for (const pattern of blockPatterns) {
      if (pattern.test(line)) {
        matchCount++;
        if (matchCount >= 2) return true;
        break;
      }
    }
  }
  return false;
}
