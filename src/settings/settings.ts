import { getElement } from "../utils/helpers";

function openModal(): void {
  const overlay = getElement<HTMLDivElement>(".overlay");
  const modal = getElement<HTMLDivElement>(".modal");
  const items: HTMLCollection | undefined =
    getElement<HTMLDivElement>(".notes-container").children;
  overlay.classList.add("show");
  modal.classList.add("show");
  if (items) {
    Array.from(items).forEach((element) => {
      if (element.classList.contains("active"))
        element.classList.remove("active");
    });
  }
}

export { openModal };
