import { searchByTag } from "@/components/sidebar/sidebar-filter";
import { setSidebarState } from "@/components/sidebar/sidebar-state";
import { createAsyncHandler } from "@/utils/async";
import { findElement, requireElement } from "@/utils/dom";
import { getItem, registerAppEvents } from "@/utils/registry";
import tippy, { delegate } from "tippy.js";
import "tippy.js/dist/tippy.css";

async function initInfoSidebar(collapsed: boolean = true) {
  const editorWrapper = getItem("editorWrapper");
  const toggleBtn = findElement<HTMLButtonElement>(".info-sidebar-toggle");
  const infoSidebar = findElement<HTMLDivElement>(".info-sidebar");
  if (!toggleBtn || !infoSidebar) return;

  const tagContainer = requireElement<HTMLDivElement>(".tag-container");

  const tippyInstance = delegate(tagContainer, {
    target: "[tippy-content]",
    placement: "top",
    theme: "app-theme",
    trigger: "mouseenter",
    touch: false,
    hideOnClick: true,
    content: (reference) => reference.getAttribute("tippy-content") ?? "",
    onShow(instance) {
      return instance.reference.getAttribute("tippy-content")
        ? undefined
        : false;
    },
  });

  tippy(toggleBtn, {
    placement: "top",
    theme: "app-theme",
    content: "toggleInfobar",
  });

  const collapseInfoSidebar = () => {
    const collapsed = infoSidebar.classList.contains("collapsed");
    setSidebarState(infoSidebar, "info-sidebar-state", !collapsed);
  };

  setSidebarState(infoSidebar, "info-sidebar-state", collapsed);
  tagContainer.addEventListener(
    "click",
    createAsyncHandler(async (e: Event) => {
      const target = e.target as HTMLElement;
      if (target === tagContainer) return;
      const spanEl = target.closest(".tag") as HTMLSpanElement | null;
      if (!spanEl) return;
      const tag = spanEl.dataset["tag"];
      if (!tag) return;
      tippyInstance.show();
      searchByTag(tag);
    }),
  );
  toggleBtn.addEventListener("click", collapseInfoSidebar);
  editorWrapper.addEventListener("mousedown", () => {
    if (!infoSidebar.classList.contains("collapsed")) {
      setSidebarState(infoSidebar, "info-sidebar-state", true);
    }
  });
  registerAppEvents(document, {
    "app:toggle-info-sidebar": () => collapseInfoSidebar(),
  });
}

export { initInfoSidebar };
