import { el } from "@/utils/ui";
import "tippy.js/dist/tippy.css";

type SelectOption = { value: string; label: string };

// blueprint for select items and their options for specified categories
function selectBuilder(
  container: HTMLDivElement,
  id: string,
  options: SelectOption[],
  category: "appearance" | "typography" | "app" | "storage",
) {
  const optionNodes = options.map((opt) => new Option(opt.label, opt.value));
  const label = el("label", { htmlFor: id }, `${id}`);
  const select = el(
    "select",
    {
      className: "theme-select",
      id,
    },
    ...optionNodes,
  );
  const row = el("div", { className: "settings-row" }, label, select);
  select.setAttribute("data-tippy-content", `select ${id}`);
  row.dataset["category"] = category;
  container.append(row);
}

// builds the button palette and wraps it into the button container
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
    createSettingsButton("typography", "pen-line"),
    createSettingsButton("app", "app-window"),
    createSettingsButton("storage", "database-backup"),
  );
}

export { createSettingsMenu, selectBuilder };
