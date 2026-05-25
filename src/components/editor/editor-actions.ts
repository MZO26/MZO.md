import { getAppItem } from "@/utils/registry";
import { Editor } from "@tiptap/core";
import { EditorState } from "@tiptap/pm/state";

function getContent() {
  const editor = getAppItem("editor");
  const plainText = editor.getText();
  const content = editor.getJSON();
  return { content, plainText };
}

function resetEditorHistory(editor: Editor) {
  const newState = EditorState.create({
    doc: editor.state.doc,
    plugins: editor.state.plugins,
    schema: editor.state.schema,
  });
  editor.view.updateState(newState);
}

export { getContent, resetEditorHistory };
