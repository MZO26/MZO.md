import emptyEditor from "../../assets/emptyEditor.svg?raw";

function showEditorEmptyState() {
  const emptyStateContainer = document.createElement("div");
  const p = document.createElement("p");
  p.innerHTML =
    "Create a new note by clicking + <br/> To view a note select an item in the sidebar";
  emptyStateContainer.className = "editor-empty-state";
  emptyStateContainer.innerHTML = emptyEditor;
  emptyStateContainer.appendChild(p);
  return emptyStateContainer;
}

export { showEditorEmptyState };
