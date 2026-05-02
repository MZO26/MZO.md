import {
  handleSearchInput,
  handleViews,
  searchByTag,
} from "@/components/sidebar/sidebar-filter";
import { createAsyncHandler, debounce, getElement } from "@/utils/helpers";

function initSearchHandlers() {
  const searchInput = getElement<HTMLInputElement>("#searchInput");
  const notesContainer = getElement<HTMLDivElement>(".notes-container");
  if (searchInput && notesContainer) {
    const debouncedSearch = debounce(() => {
      const value = searchInput.value.trim();
      void handleSearchInput(value, notesContainer);
    }, 500);
    searchInput.addEventListener("input", debouncedSearch);
  }

  const smartViewContainer = getElement(".smart-view-list");
  const infoSidebarTagContainer = getElement<HTMLDivElement>(".tag-container");

  smartViewContainer.addEventListener(
    "click",
    createAsyncHandler(async (event) => {
      const target = event.target as HTMLElement;
      if (target === smartViewContainer) return;
      const button = target.closest(
        "button[data-view]",
      ) as HTMLButtonElement | null;
      if (!button) return;
      const view = button.dataset["view"];
      if (!view) return;
      handleViews(view);
    }),
  );

  infoSidebarTagContainer.addEventListener(
    "click",
    createAsyncHandler(async (e: Event) => {
      const target = e.target as HTMLElement;
      if (target === infoSidebarTagContainer) return;
      const spanEl = target.closest(".tag") as HTMLSpanElement | null;
      if (!spanEl) return;
      const tag = spanEl.dataset["tag"];
      if (!tag) return;
      searchByTag(tag);
    }),
  );
}

export { initSearchHandlers };
