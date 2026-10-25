import {
  CODE_THEME_SETTINGS,
  FONT_FAMILY_SETTINGS,
  FONT_SIZE_SETTINGS,
  HIGHLIGHT_THEME_SETTINGS,
  LINE_HEIGHT_SETTINGS,
  NOTE_ITEM_DISPLAY_SETTINGS,
  SPELLCHECK_SETTINGS,
  THEME_SETTINGS,
} from "@/settings/setting";
import { QUICK_ACTIONS } from "@/utils/constants";
import { createIconButton, requireElement } from "@/utils/dom";
import { useUI } from "@/utils/registry";
import type { AppIcons, SelectOption, SettingsCategory } from "@/utils/types";
import type { AppSettings } from "@shared/schemas/store-schema";
import { APP_VERSION, GITHUB_LINK } from "@shared/shared-constants";

type ValidSelectKeys<T> = {
  [K in keyof T]: T[K] extends string | boolean ? K : never;
}[keyof T];

function selectBuilder<K extends ValidSelectKeys<Readonly<AppSettings>>>(
  id: K,
  options: readonly SelectOption<AppSettings[K]>[],
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

function createSettingsMenu() {
  const createSettingsButton = (category: SettingsCategory, icon: AppIcons) => {
    const btn = createIconButton(icon, category);
    btn.className = "selection-btn";
    btn.setAttribute("data-category", category);
    return btn;
  };
  const container = document.createElement("div");
  container.className = "settings-buttons";
  container.append(
    createSettingsButton("Appearance", "Palette"),
    createSettingsButton("Editor", "PenLine"),
    createSettingsButton("General", "AppWindow"),
  );
  return container;
}

function createGithubRef() {
  const settingsContainer = requireElement<HTMLDivElement>(".settings-content");
  const row = document.createElement("div");
  row.className = "settings-row settings-app-info";
  row.dataset["category"] = "General";
  const appVer = Object.assign(document.createElement("span"), {
    className: "info-span",
    textContent: `App Version: ${APP_VERSION}`,
  });
  const githubLink = Object.assign(document.createElement("a"), {
    href: GITHUB_LINK,
    textContent: "GitHub Repository ↗",
    target: "_blank",
    rel: "noopener noreferrer",
    className: "settings-link",
    title: "Visit the project's github site",
  });
  row.append(githubLink, appVer);
  settingsContainer.appendChild(row);
  return githubLink;
}

function createQuickActionContainer() {
  const { quickActionContainer } = useUI("quickActionContainer");
  const settingsContainer = requireElement<HTMLDivElement>(".settings-content");
  const row = document.createElement("div");
  row.className = "settings-row";
  row.dataset["category"] = "General";
  const frag = document.createDocumentFragment();
  for (const action of QUICK_ACTIONS) {
    const btn = createIconButton(action.icon, action.label);
    btn.className = `${action.id}-btn`;
    btn.setAttribute("data-action", action.id);
    frag.appendChild(btn);
  }
  quickActionContainer.appendChild(frag);
  row.appendChild(quickActionContainer);
  settingsContainer.append(row);
  return quickActionContainer;
}

function buildSelects() {
  selectBuilder("theme", THEME_SETTINGS, "Appearance", "App-Theme");
  selectBuilder("code_theme", CODE_THEME_SETTINGS, "Appearance", "Code-Theme");
  selectBuilder(
    "highlight",
    HIGHLIGHT_THEME_SETTINGS,
    "Appearance",
    "Highlight-Theme",
  );
  selectBuilder(
    "note_item_display",
    NOTE_ITEM_DISPLAY_SETTINGS,
    "Appearance",
    "Note-Item-Display",
  );
  selectBuilder("font_family", FONT_FAMILY_SETTINGS, "Editor", "Font-Family");
  selectBuilder("font_size", FONT_SIZE_SETTINGS, "Editor", "Font-Size");
  selectBuilder("line_height", LINE_HEIGHT_SETTINGS, "Editor", "Line-Height");
  selectBuilder("spellcheck", SPELLCHECK_SETTINGS, "Editor", "Spellcheck");
}

export {
  buildSelects,
  createGithubRef,
  createQuickActionContainer,
  createSettingsMenu,
};
