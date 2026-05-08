import {
  createViews,
  handleSearchInput,
  handleViews,
  views,
} from "@/components/sidebar/sidebar-filter";
import { createAsyncHandler, debounce } from "@/utils/async";
import { findElement, requireElement } from "@/utils/dom";
import { registerAppEvents } from "@/utils/registry";
import tippy from "tippy.js";

const debouncedSearch = debounce((e: Event) => {
  const target = e.target as HTMLInputElement;
  const value = target.value.trim();
  void handleSearchInput(value);
}, 500); // funktioniert nicht

function initSearchHandlers() {
  const viewBtn = findElement(".sidebar-trigger-btn");
  const popoverEl = findElement<HTMLDivElement>("#smart-views-popover");
  if (!viewBtn || !popoverEl) return;
  const searchInput = requireElement<HTMLInputElement>("#searchInput");

  const tippyInstance = tippy(viewBtn as Element, {
    content: popoverEl,
    allowHTML: true,
    trigger: "click",
    placement: "top",
    appendTo: document.body,
    interactive: true,
    theme: "none",
    duration: [100, 200],
    onTrigger(instance) {
      const view = (instance.reference as HTMLButtonElement).dataset["view"];
      if (!view) return;
      handleViews(view);
    },
  });
  popoverEl.appendChild(createViews(views));
  applyFilterListeners(searchInput, popoverEl);
  registerAppEvents(document, {
    "app:toggle-view-filter": () =>
      tippyInstance.state.isVisible
        ? tippyInstance.hide()
        : tippyInstance.show(),
    "app:open-global-search": () => searchInput.focus(),
  });
}

function applyFilterListeners(
  searchInput: HTMLInputElement,
  popoverEl: HTMLDivElement,
) {
  searchInput.addEventListener("input", debouncedSearch);
  popoverEl.addEventListener(
    "click",
    createAsyncHandler(async (e) => {
      const target = e.target as HTMLElement;
      if (target === popoverEl) return;
      const button = target.closest(
        "button[data-view]",
      ) as HTMLButtonElement | null;
      if (!button) return;
      const view = button.dataset["view"];
      if (!view) return;
      handleViews(view);
    }),
  );
}

export { initSearchHandlers };
