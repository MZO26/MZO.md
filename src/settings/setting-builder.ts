import { el } from "@/utils/ui";
import tippy from "tippy.js";
import "tippy.js/dist/tippy.css";

type SelectOption = { value: string; label: string };

function selectBuilder(
  container: HTMLDivElement,
  id: string,
  options: SelectOption[],
  category: "appearance" | "editor" | "app" | "info",
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

function createSettingsMenu(): HTMLDivElement {
  const createSettingsButton = (category: string, lucideIcon: string) => {
    const icon = el("i");
    icon.setAttribute("data-lucide", lucideIcon);
    const btn = el("button", { className: "selection-btn" }, icon);
    btn.setAttribute("data-category", category);
    btn.setAttribute("data-tippy-content", category);
    return btn;
  };
  return el(
    "div",
    { className: "settings-buttons" },
    createSettingsButton("appearance", "palette"),
    createSettingsButton("editor", "pen-line"),
    createSettingsButton("app", "app-window"),
    createSettingsButton("info", "info"),
  );
}

export { createSettingsMenu, selectBuilder };
