import type { Editor } from "@tiptap/core";

async function exportFile(editor: Editor) {
  let path: string | null = null;
  const content = editor.getHTML();
  const result = await window.api.saveFile({
    path,
    content,
  });

  if (typeof result === "string") {
    path = result;
    alert("Saved under " + result);
  } else if (result === true) {
    console.log("Changes saved successfully.");
  }
}

export { exportFile };
