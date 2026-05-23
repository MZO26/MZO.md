import { searchByTag } from "@/components/sidebar/sidebar-filter";
import { setSidebarState } from "@/components/sidebar/sidebar-state";
import { handleSelectNote } from "@/features/note-actions";
import { createAsyncHandler } from "@/utils/async";
import { findElement, requireElement } from "@/utils/dom";
import { registerAppEvents } from "@/utils/registry";

const collapseInfoSidebar = (infoSidebar: HTMLDivElement) => {
  const collapsed = infoSidebar.classList.contains("collapsed");
  setSidebarState(infoSidebar, !collapsed);
};

async function initInfoSidebar() {
  const toggleBtn = findElement<HTMLButtonElement>(".info-sidebar-toggle");
  const infoSidebar = findElement<HTMLDivElement>(".info-sidebar");
  const tagContainer = findElement<HTMLDivElement>(".tag-container");
  const linkContainer = findElement<HTMLDivElement>(".link-container");
  if (!toggleBtn || !infoSidebar || !tagContainer || !linkContainer) return;
  setSidebarState(infoSidebar, true);
  applyInfoSidebarListeners(
    tagContainer,
    linkContainer,
    toggleBtn,
    infoSidebar,
  );
  registerAppEvents(document, {
    "app:toggle-info-sidebar": () => collapseInfoSidebar(infoSidebar),
  });
}

function applyInfoSidebarListeners(
  tagContainer: HTMLDivElement,
  linkContainer: HTMLDivElement,
  toggleBtn: HTMLButtonElement,
  infoSidebar: HTMLDivElement,
) {
  tagContainer.addEventListener(
    "click",
    createAsyncHandler(async (e: Event) => {
      const searchInput = requireElement<HTMLInputElement>(".search-input");
      const target = e.target as HTMLElement;
      if (target === tagContainer) return;
      const spanEl = target.closest(".tag") as HTMLSpanElement | null;
      if (!spanEl) return;
      const tag = spanEl.dataset["tag"];
      if (!tag) return;
      await searchByTag(tag);
      searchInput.focus();
      searchInput.value = `#${tag}`;
    }),
  );
  linkContainer.addEventListener(
    "click",
    createAsyncHandler(async (e: Event) => {
      const target = e.target as HTMLElement;
      if (target === linkContainer) return;
      const spanEl = target.closest(".link") as HTMLSpanElement | null;
      if (!spanEl) return;
      const link = spanEl.dataset["link"];
      const noteElement = findElement<HTMLDivElement>(`div[data-id="${link}"]`);
      if (!link || !noteElement) return;
      await handleSelectNote(noteElement);
    }),
  );
  toggleBtn.addEventListener("click", () => collapseInfoSidebar(infoSidebar));
}

export { initInfoSidebar };
