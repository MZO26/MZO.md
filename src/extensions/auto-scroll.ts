import type { AutoScrollOptions } from "@shared/types";
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

export const DragAutoScroll = Extension.create<AutoScrollOptions>({
  name: "dragAutoScroll",
  addOptions() {
    return {
      getScrollContainer: (editorRoot: HTMLElement) => editorRoot,
      edge: 60,
      maxSpeed: 12,
    };
  },
  addProseMirrorPlugins() {
    const options = this.options;

    return [
      new Plugin({
        key: new PluginKey("dragAutoScroll"),
        view(view) {
          const editorRoot = view.dom as HTMLElement;
          const container = options.getScrollContainer(editorRoot);

          const edge = options.edge ?? 60;
          const maxSpeed = options.maxSpeed ?? 12;

          let speed = 0;
          let rafId = 0;

          const tick = () => {
            if (speed !== 0) {
              container.scrollTop += speed;
              rafId = requestAnimationFrame(tick);
            } else {
              rafId = 0;
            }
          };

          const start = () => {
            if (!rafId) rafId = requestAnimationFrame(tick);
          };

          const stop = () => {
            speed = 0;
            if (rafId) {
              cancelAnimationFrame(rafId);
              rafId = 0;
            }
          };

          const onDragOver = (event: DragEvent) => {
            const rect = container.getBoundingClientRect();
            const y = event.clientY;

            if (y < rect.top + edge) {
              const distance = Math.max(0, y - rect.top);
              speed = -maxSpeed * (1 - distance / edge);
              start();
            } else if (y > rect.bottom - edge) {
              const distance = Math.max(0, rect.bottom - y);
              speed = maxSpeed * (1 - distance / edge);
              start();
            } else {
              stop();
            }
          };
          container.addEventListener("dragover", onDragOver);
          window.addEventListener("drop", stop);
          window.addEventListener("dragend", stop);
          return {
            destroy() {
              stop();
              container.removeEventListener("dragover", onDragOver);
              window.removeEventListener("drop", stop);
              window.removeEventListener("dragend", stop);
            },
          };
        },
      }),
    ];
  },
});
