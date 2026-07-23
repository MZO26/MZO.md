import { processAndInsertImages } from "@/extensions/image/image";
import { normalizeFileContent } from "@/notes/import-actions";
import { getExtension, isValidExtension } from "@/utils/note";
import {
  ALLOWED_TYPES,
  MAX_BYTES_FILE,
  MAX_DROP_LENGTH,
  MAX_DROP_PASTE_CHARACTERS,
} from "@shared/constants";
import { Editor, Extension } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";

async function processDroppedFiles(editor: Editor | null, files: File[]) {
  if (!editor) return;
  for (const file of files) {
    const extension = getExtension(file.name);
    if (!isValidExtension(extension)) continue;
    if (file.size > MAX_BYTES_FILE) continue;
    try {
      const content = await file.text();
      if (content.length > MAX_DROP_PASTE_CHARACTERS) continue;
      const json = normalizeFileContent({
        fileName: file.name,
        content,
        extension,
      });
      if (json) editor.commands.insertContent(json, { contentType: "json" });
    } catch (error) {
      console.error(
        `["processDroppedFiles]: Failed to process ${file.name}:`,
        error,
      );
    }
  }
}

export const DropHandler = Extension.create({
  name: "dropHandler",
  addProseMirrorPlugins() {
    const editor = this.editor;
    return [
      new Plugin({
        props: {
          handleDrop(view, event, _slice, moved) {
            if (moved) return false;
            const files = Array.from(event.dataTransfer?.files ?? []);
            if (files.length === 0) return false;
            const coords = view.posAtCoords({
              left: event.clientX,
              top: event.clientY,
            });
            const dropCandidates = files
              .slice(0, MAX_DROP_LENGTH)
              .filter(
                (file) =>
                  ALLOWED_TYPES.includes(file.type) ||
                  isValidExtension(getExtension(file.name)),
              );
            if (dropCandidates.length === 0) return false;
            event.preventDefault();
            void (async () => {
              try {
                if (coords) {
                  editor.chain().focus().setTextSelection(coords.pos).run();
                } else {
                  editor.chain().focus().run();
                }
                const imageFiles = dropCandidates.filter((f) =>
                  ALLOWED_TYPES.includes(f.type),
                );
                const contentFiles = dropCandidates.filter(
                  (f) => !ALLOWED_TYPES.includes(f.type),
                );
                if (imageFiles.length > 0) {
                  await processAndInsertImages(imageFiles, editor);
                }
                if (contentFiles.length > 0) {
                  await processDroppedFiles(editor, contentFiles);
                }
              } catch (error) {
                console.error(
                  "[DropHandler]: Failed to process dropped file:",
                  error,
                );
              }
            })();
            return true;
          },
        },
      }),
    ];
  },
});
