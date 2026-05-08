import { getAppItem } from "@/utils/registry";
import type { Editor } from "@tiptap/core";
import DOMPurify from "dompurify";
import TurndownService from "turndown";

const exportToMarkdown = (editor: Editor) => {
  const rawHtml = editor.getHTML();
  const cleanHtml = DOMPurify.sanitize(rawHtml);
  const turndownService = new TurndownService({
    headingStyle: "atx",
    hr: "---",
    bulletListMarker: "*",
    codeBlockStyle: "fenced",
  });
  const markdown = turndownService.turndown(cleanHtml);

  return markdown;
};

async function handleExport() {
  const editor = getAppItem("editor");
  const markdownString = exportToMarkdown(editor);
  const success = await window.electronAPI.saveMarkdown(markdownString);

  if (success) {
    console.log("File saved successfully!");
  }
}

export { exportToMarkdown };
