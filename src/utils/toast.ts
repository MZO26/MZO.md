import { findElement } from "./dom";

let container: HTMLDivElement | null = null;

function showToast(value: string, duration = 2000): void {
  if (!container) {
    container = findElement<HTMLDivElement>(".toast-container");
  }
  if (!container) {
    console.warn("Toast container not found.");
    return;
  }
  const toast = document.createElement("div");
  toast.className = "toast";
  value = value.length > 50 ? value.slice(0, 50) + "..." : value;
  toast.textContent = value;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add("show");
  }, 10);

  setTimeout(() => {
    toast.classList.remove("show");
    toast.classList.add("hide");
    toast.addEventListener(
      "animationend",
      () => {
        toast.remove();
      },
      { once: true },
    );
  }, duration);
}

export { showToast };
