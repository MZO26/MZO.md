function getSavedItemId(): string | null {
  try {
    const idString = sessionStorage.getItem("savedItemId");
    if (!idString) return null;
    return idString;
  } catch (err) {
    console.error("Error retrieving saved item ID:", err);
    return null;
  }
}

function setSavedItemId(id: string | null) {
  try {
    if (id === null) {
      clearSavedItemId();
      return;
    }
    sessionStorage.setItem("savedItemId", id);
  } catch (err) {
    console.error("Error setting saved item ID:", err);
    return;
  }
}

function clearSavedItemId(): void {
  try {
    sessionStorage.removeItem("savedItemId");
  } catch (err) {
    console.error("Error clearing saved item ID:", err);
    return;
  }
}

export { clearSavedItemId, getSavedItemId, setSavedItemId };
