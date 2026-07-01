import { processAndInsertImages } from "@/extensions/image/image";
import {
  ALLOWED_TYPES,
  CONTENT_TYPE_MAP,
  DOMPURIFY_CONFIG,
} from "@shared/constants";
import { Extension } from "@tiptap/core";
import { Plugin, Selection } from "@tiptap/pm/state";
import DOMPurify from "dompurify";

function getExtension(name: string) {
  const index = name.lastIndexOf(".");
  return index > 0 ? name.slice(index + 1).toLowerCase() : "";
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
            if (!coords) return false;
            const safeFiles = files.slice(0, 20);
            const supportedFiles = safeFiles.filter((file) => {
              if (ALLOWED_TYPES.includes(file.type)) return true;
              const ext = getExtension(file.name);
              return ext === "txt" || ext in CONTENT_TYPE_MAP;
            });
            if (supportedFiles.length === 0) return false;
            event.preventDefault();
            void (async () => {
              try {
                const $pos = view.state.doc.resolve(coords.pos);
                const safeSelection = Selection.near($pos);
                view.dispatch(view.state.tr.setSelection(safeSelection));
                const imageFiles = supportedFiles.filter((file) =>
                  ALLOWED_TYPES.includes(file.type),
                );
                if (imageFiles.length > 0) {
                  await processAndInsertImages(imageFiles, editor);
                }
                const nonImageFiles = supportedFiles.filter(
                  (file) => !ALLOWED_TYPES.includes(file.type),
                );
                for (const file of nonImageFiles) {
                  try {
                    editor.commands.focus();
                    const ext = getExtension(file.name);
                    const text = await file.text();
                    const contentType =
                      ext === "txt" ? "txt" : CONTENT_TYPE_MAP[ext];
                    if (contentType === "txt") {
                      editor.commands.insertContent(text);
                    } else if (contentType === "markdown") {
                      editor.commands.insertContent(text, {
                        contentType: "markdown",
                      });
                    } else if (contentType === "html") {
                      const safe = DOMPurify.sanitize(text, DOMPURIFY_CONFIG);
                      editor.commands.insertContent(safe, {
                        parseOptions: { preserveWhitespace: "full" },
                      });
                    } else if (contentType === "json") {
                      editor.commands.insertContent(JSON.parse(text));
                    }
                  } catch (error) {
                    console.error(
                      "[DropHandler]: Failed to process dropped file:",
                      error,
                    );
                  }
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
