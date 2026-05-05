import {
  handleSearchInput,
  handleViews,
} from "@/components/sidebar/sidebar-filter";
import {
  createAsyncHandler,
  debounce,
  getElement,
  registerAppEvents,
} from "@/utils/helpers";
import tippy from "tippy.js";

function initSearchHandlers() {
  const viewBtn = getElement(".sidebar-trigger-btn");
  const popoverEl = getElement<HTMLDivElement>("#smart-views-popover");
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
  const searchInput = getElement<HTMLInputElement>("#searchInput");
  const debouncedSearch = debounce(() => {
    const value = searchInput.value.trim();
    void handleSearchInput(value);
  }, 500);
  searchInput.addEventListener("input", debouncedSearch);
  popoverEl.addEventListener(
    "click",
    createAsyncHandler(async (event) => {
      const target = event.target as HTMLElement;
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
  registerAppEvents(document, {
    "app:toggle-view-filter": () =>
      tippyInstance.state.isVisible
        ? tippyInstance.hide()
        : tippyInstance.show(),
    "app:open-global-search": () => searchInput.focus(),
  });
}

export { initSearchHandlers };
