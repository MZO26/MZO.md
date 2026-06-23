import { requireElement } from "@/utils/dom";
import type { SelectOption } from "@shared/types";

// blueprint for select items and their options for specified categories
function selectBuilder(
  id: string,
  options: SelectOption[],
  category: "Appearance" | "Editor" | "Export",
  labelText: string,
) {
  const settingsContainer = requireElement<HTMLDivElement>(".settings-content");
  const label = document.createElement("label");
  label.htmlFor = id;
  label.textContent = labelText ?? id;
  const select = document.createElement("select");
  select.id = id;
  const optionNodes = options.map((opt) => new Option(opt.label, opt.value));
  select.append(...optionNodes);
  const row = document.createElement("div");
  row.className = "settings-row";
  row.dataset["category"] = category;
  row.append(label, select);
  settingsContainer.append(row);
}

// builds the button palette and wraps it into the button container
function createSettingsMenu() {
  const createSettingsButton = (category: string, lucideIcon: string) => {
    const icon = document.createElement("i");
    icon.setAttribute("data-lucide", lucideIcon);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "selection-btn";
    btn.appendChild(icon);
    btn.setAttribute("data-category", category);
    btn.setAttribute("data-tippy-content", category);
    return btn;
  };
  const container = document.createElement("div");
  container.className = "settings-buttons";
  container.append(
    createSettingsButton("Appearance", "palette"),
    createSettingsButton("Editor", "pen-line"),
    createSettingsButton("Export", "database-backup"),
  );
  return container;
}

export { createSettingsMenu, selectBuilder };
