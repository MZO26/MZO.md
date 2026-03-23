import { getElement } from "../utils/helpers";

const openModal = (): void => {
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
};

const settingItems =
  document.querySelectorAll<HTMLButtonElement>(".settings-nav-item");
const panels = document.querySelectorAll<HTMLDivElement>(".settings-panel");

settingItems.forEach((item) => {
  item.addEventListener("click", () => {
    const target = item.dataset["section"];

    settingItems.forEach((i) => i.classList.remove("active"));
    panels.forEach((p) => p.classList.remove("active"));

    item.classList.add("active");
    getElement<HTMLDivElement>(`#${target}`)?.classList.add("active");
  });
});

export { openModal };
