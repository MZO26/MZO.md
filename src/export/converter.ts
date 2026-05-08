import { getAppItem } from "@/utils/registry";
import { showToast } from "@/utils/toast";
import {
  ExportRequestSchema,
  type ExportRequest,
} from "@shared/schemas/export-schema";
import DOMPurify from "dompurify";

export function validateExport(payload: unknown): ExportRequest | null {
  const editor = getAppItem("editor");
  const parsed = ExportRequestSchema.safeParse(payload);
  if (!parsed.success) {
    console.error(parsed.error);
    showToast("Invalid export payload");
    return null;
  }
  const { content, extension, defaultName } = parsed.data;
  let exportContent: string; // base for json from tiptap
  try {
    switch (extension) {
      case "json":
        exportContent = content;
        break;

      case "html":
        const html = editor.getHTML();
        exportContent = DOMPurify.sanitize(html);
        break;

      case "md":
        const htmlForMarkdown = editor.getHTML();
        break;

      case "txt":
        exportContent = editor.getText();
        break;

      default:
        showToast("Unsupported export format:", extension);
        return null;
    }
  } catch (error) {
    showToast(`Export conversion failed ${error}`);
    return null;
  }
  return {
    content: exportContent,
    extension,
    defaultName,
  };
}
