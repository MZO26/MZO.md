import { importNote } from "@/api/fileAPI";
import { getNoteEditorExtensions } from "@/components/editor/editor-init";
import { sanitize } from "@/utils/sanitize";
import { showToast } from "@/utils/toast";
import { getMetadata } from "@shared/generators/generators";
import type { CreateNotePayload } from "@shared/schemas/note-schema";
import type { ContentType, ImportedContent, Result } from "@shared/types";
import { Editor, type Content, type JSONContent } from "@tiptap/core";

async function handleImportFile(): Promise<Result<ImportedContent[]>> {
  const response = await importNote();
  if (!response.success) {
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
  return { success: true, data: processedNotes };
}

const extensionToContentType = (ext: string): ContentType | undefined => {
  const map: Record<string, ContentType> = {
    md: "markdown",
    html: "html",
    json: "json",
  };
  return map[ext];
};

function importTxtToJSON(txt: string): JSONContent[] | undefined {
  if (!txt) return undefined;
  const lines = txt.split(/\r?\n/);
  const content: JSONContent[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]?.trim();
    if (line && line.length > 0) {
      content.push({
        type: "paragraph",
        content: [{ type: "text", text: line }],
      });
    }
  }
  return content;
}

async function getImportedContent(
  files: {
    title: string;
    extension: "html" | "md" | "txt" | "json";
    content: Content;
  }[],
): Promise<Result<CreateNotePayload[]>> {
  const headlessEditor = new Editor({
    extensions: getNoteEditorExtensions(),
  });
  try {
    const processedPayloads: CreateNotePayload[] = [];
    for (const file of files) {
      const contentType = extensionToContentType(file.extension);
      if (contentType !== undefined) {
        headlessEditor.commands.setContent(file.content, { contentType });
      } else {
        const content = importTxtToJSON(file.content as string);
        if (content)
          headlessEditor.commands.setContent({
            type: "doc",
            content: content,
          });
      }
      const json = headlessEditor.getJSON();
      const plainText = headlessEditor.getText();
      const metadata = getMetadata(json, plainText);
      const payload: CreateNotePayload = {
        content: json,
        plainText: plainText,
        ...metadata,
        pinned: false,
        bookmarked: false,
      };
      processedPayloads.push(payload);
    }
    return { success: true, data: processedPayloads };
  } catch (error) {
    return {
      success: false,
      message: "One or more files couldn't be imported.",
    };
  } finally {
    headlessEditor.destroy();
  }
}

export { getImportedContent, handleImportFile };
