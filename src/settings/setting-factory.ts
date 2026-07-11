import { createIconButton } from "@/components/sidebar/sidebar-features";
import { requireElement } from "@/utils/dom";
import { getUIItem } from "@/utils/registry";
import { QUICK_ACTIONS } from "@shared/constants";
import type { SelectOption, SettingsCategory } from "@shared/types";

// blueprint for select items and their options for specified categories
function selectBuilder<T extends string | boolean>(
  id: string,
  options: readonly SelectOption<T>[],
  category: SettingsCategory,
  labelText: string,
) {
  const settingsContainer = requireElement<HTMLDivElement>(".settings-content");
  const label = document.createElement("label");
  label.htmlFor = id;
  label.textContent = labelText ?? id;
  const select = document.createElement("select");
  select.id = id;
  const optionNodes = options.map(
    (opt) => new Option(opt.label, String(opt.value)),
  );
  select.append(...optionNodes);
  const row = document.createElement("div");
  row.className = "settings-row";
  row.dataset["category"] = category;
  row.append(label, select);
  settingsContainer.appendChild(row);
}

// builds the button palette and wraps it into the button container
function createSettingsMenu() {
  const createSettingsButton = (category: SettingsCategory, icon: string) => {
    const btn = createIconButton(icon, category);
    btn.className = "selection-btn";
    btn.setAttribute("data-category", category);
    return btn;
  };
  const container = document.createElement("div");
  container.className = "settings-buttons";
  container.append(
    createSettingsButton("Appearance", "palette"),
    createSettingsButton("Editor", "pen-line"),
    createSettingsButton("General", "app-window"),
  );
  return container;
}

function initQuickActionContainer() {
  const quickActionContainer = getUIItem("quickActionContainer");
  const settingsContainer = requireElement<HTMLDivElement>(".settings-content");
  const row = document.createElement("div");
  row.className = "settings-row";
  row.dataset["category"] = "General" as SettingsCategory;
  const frag = document.createDocumentFragment();
  for (const action of QUICK_ACTIONS) {
    const btn = createIconButton(action.icon, action.label);
    btn.className = `${action.id}-btn`;
    btn.setAttribute("data-action", action.id);
    frag.appendChild(btn);
  }
  quickActionContainer.appendChild(frag);
  row.appendChild(quickActionContainer);
  settingsContainer.appendChild(row);
  return quickActionContainer;
}

export { createSettingsMenu, initQuickActionContainer, selectBuilder };
