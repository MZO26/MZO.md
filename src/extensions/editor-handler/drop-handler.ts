import { resolveMarkConflicts } from "@/components/editor/editor-actions";
import { isValidExtension } from "@/components/sidebar/sidebar-file-drop";
import { processAndInsertImages } from "@/extensions/overrides/image/image";
import { normalizeFileContent } from "@/notes/import-actions";
import {
  ALLOWED_TYPES,
  MAX_DROP_LENGTH,
  MAX_DROP_PASTE_CHARACTERS,
} from "@/utils/constants";
import { getExtension, rendererLogger } from "@/utils/helpers";
import { MAX_BYTES_FILE } from "@shared/shared-constants";
import { Editor, Extension } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";

async function processDroppedFiles(editor: Editor, files: File[], pos: number) {
  const nodesToInsert: Record<string, unknown>[] = [];
  for (const file of files) {
    const extension = getExtension(file.name);
    if (!isValidExtension(extension)) continue;
    if (file.size > MAX_BYTES_FILE) continue;
    try {
      const content = await file.text();
      if (content.length > MAX_DROP_PASTE_CHARACTERS) continue;
      const json = await normalizeFileContent({
        fileName: file.name,
        content,
        extension,
      });
      if (!json) return;
      if (Array.isArray(json)) {
        nodesToInsert.push(...json);
      } else if (json.type === "doc" && Array.isArray(json.content)) {
        const resolved = resolveMarkConflicts(json.content);
        nodesToInsert.push(...resolved);
      } else {
        nodesToInsert.push(json);
      }
    } catch (error) {
      rendererLogger.appError(
        `[processDroppedFiles]: Failed to process ${file.name}:`,
        error,
      );
    }
  }
  if (nodesToInsert.length > 0) {
    const safePos = Math.min(Math.max(0, pos), editor.state.doc.content.size);
    editor.commands.insertContentAt(safePos, nodesToInsert);
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
            const files = event.dataTransfer?.files;
            if (!files || files.length === 0) return false;
            const coords = view.posAtCoords({
              left: event.clientX,
              top: event.clientY,
            });
            const dropCandidates = Iterator.from(files)
              .filter(
                (f) =>
                  ALLOWED_TYPES.includes(f.type) ||
                  isValidExtension(getExtension(f.name)),
              )
              .take(MAX_DROP_LENGTH)
              .toArray();
            if (dropCandidates.length === 0) return false;
            event.preventDefault();
            const dropPos = coords?.pos ?? editor.state.selection.from;
            const { images = [], content = [] } = Object.groupBy(
              dropCandidates,
              (f) => (ALLOWED_TYPES.includes(f.type) ? "images" : "content"),
            );
            void (async () => {
              try {
                if (images.length > 0) {
                  await processAndInsertImages(images, editor, dropPos);
                }
                if (content.length > 0) {
                  await processDroppedFiles(editor, content, dropPos);
                }
              } catch (error) {
                rendererLogger.appError(
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

export { processDroppedFiles };
