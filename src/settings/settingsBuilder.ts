import tippy from "tippy.js";
import "tippy.js/dist/tippy.css";

type SelectOption = { value: string; label: string };

function selectBuilder(
  container: HTMLDivElement,
  id: string,
  options: SelectOption[],
  category: "appearance" | "editor" | "app",
) {
  const optionNodes = options.map((opt) => new Option(opt.label, opt.value));
  const label = el("label", { htmlFor: id }, `${id}`);
  const select = el(
    "select",
    { className: "theme-select", id },
    ...optionNodes,
  );
  tippy(select, {
    content: `select ${id}`,
    placement: "right",
    appendTo: "parent",
    theme: "app-theme",
  });
  const row = el("div", { className: "settings-row" }, label, select);
  row.dataset["category"] = category;
  container.append(row);
}
function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props?: Partial<HTMLElementTagNameMap[K]>,
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const element = Object.assign(document.createElement(tag), props);
  element.append(...children);
  return element;
}

export { selectBuilder };
