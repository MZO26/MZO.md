import type { SaveState } from "../shared/types";
import { getElement } from "./helpers";
import { renderIcons } from "./icons";

function showSaveIndicator(state: SaveState) {
  const indicator = getElement(".save-indicator");
  const icon = getElement(".save-indicator-icon");
  const text = getElement(".save-indicator-text");
  const dragRegion = getElement(".drag-region");

  indicator.classList.remove(
    "hidden",
    "saving",
    "success",
    "error",
    "auto-hide",
  );
  icon.classList.add("hidden");
  const reset = () => {
    indicator.classList.add("hidden");
    indicator.classList.remove("auto-hide", "success");
    icon.classList.add("hidden");
    text.textContent = "";
    indicator.removeEventListener("animationend", reset);
  };
  indicator.removeEventListener("animationend", reset);
  switch (state) {
    case "hidden":
      indicator.classList.add("hidden");
      text.textContent = "";
      break;

    case "saving":
      indicator.classList.add("saving");
      text.textContent = "Saving...";
      break;

    case "success":
      indicator.classList.add("success");
      text.textContent = "Saved!";
      icon.classList.remove("hidden");
      renderIcons(dragRegion);
      indicator.addEventListener("animationend", reset, { once: true });
      indicator.classList.add("auto-hide");
      break;

    case "error":
      indicator.classList.add("error");
      text.textContent = "Could not save note";
      break;
  }
}

export { showSaveIndicator };
