import { importNote } from "@/api/fileAPI";
import { getNoteEditorExtensions } from "@/components/editor/editor-init";
import { sanitize } from "@/utils/sanitize";
import { showToast } from "@/utils/toast";
import { getMetadata } from "@shared/generators/generators";
import type { CreateNotePayload } from "@shared/schemas/note-schema";
import type { ContentType } from "@shared/types";
import { Editor, type Content } from "@tiptap/core";

async function handleImportFile() {
  const response = await importNote();
  if (!response.success) {
    console.error(response.message);
    showToast(response.message);
    return response;
  }
  const filesToProcess = response.data;
  const processedNotes = [];
  const failedFiles = [];
  for (const fileData of filesToProcess) {
    try {
      let content: Content;
      switch (fileData?.extension) {
        case "html":
          content = sanitize(fileData.content);
          break;
        case "json":
          content = JSON.parse(fileData.content);
          break;
        default:
          content = fileData?.content;
      }
      processedNotes.push({
        title: fileData?.fileName || "Untitled",
        extension: fileData?.extension,
        content: content,
      });
    } catch (error) {
      console.error(error);
      failedFiles.push(fileData?.fileName ?? "Unknown File");
    }
  }
  if (failedFiles.length > 0) {
    showToast(`Error importing ${failedFiles.length} file(s)`);
  } else if (processedNotes.length > 0) {
    showToast(`Successfully imported ${processedNotes.length} note(s)`);
  }

  return { success: true, notes: processedNotes };
}

const extensionToContentType = (ext: string): ContentType | undefined => {
  const map: Record<string, ContentType> = {
    md: "markdown",
    html: "html",
    json: "json",
  };
  return map[ext];
};

async function getImportedContent(
  files: {
    title: string;
    extension: "html" | "md" | "txt" | "json";
    content: Content;
  }[],
) {
  const processedPayloads: CreateNotePayload[] = [];
  const headlessEditor = new Editor({
    extensions: getNoteEditorExtensions(),
  });
  for (const file of files) {
    const contentType = extensionToContentType(file.extension);
    if (contentType !== undefined) {
      headlessEditor.commands.setContent(file.content, { contentType });
    } else {
      headlessEditor.commands.setContent(file.content);
    }
    const json = headlessEditor.getJSON();
    const plainText = headlessEditor.getText();
    const markdown = headlessEditor.getMarkdown();
    const metadata = getMetadata(json, plainText);
    const payload: CreateNotePayload = {
      content: json,
      plainText: plainText,
      markdown: markdown,
      ...metadata,
      pinned: false,
      bookmarked: false,
    };
    processedPayloads.push(payload);
  }
  headlessEditor.destroy();
  return processedPayloads;
}

export { getImportedContent, handleImportFile };
