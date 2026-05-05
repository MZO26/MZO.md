import { el } from "@/utils/helpers";
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

export { selectBuilder };
