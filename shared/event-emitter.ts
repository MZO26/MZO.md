import type { editorCommands } from "@/components/editor/editor-commands";
import type { Id, Note } from "@shared/schemas/note-schema";
import type { APP_EVENTS } from "@shared/shared-constants";
import type { CallbackFunction } from "node:ffi";

type Listener<T> = T extends void ? () => void : (payload: T) => void;

export type ListenerMap<T> = {
  [K in keyof T]?: Listener<T[K]> | Listener<T[K]>[];
};

type EditorEventMap = Record<keyof typeof editorCommands, void>;

type AppEventStrings = (typeof APP_EVENTS)[keyof typeof APP_EVENTS];

type PayloadOverrides = {
  [APP_EVENTS.APPLY_VIEW]: string;
  [APP_EVENTS.HANDLE_WIKILINK_CLICK]: { id: Id | null; title: Note["title"] };
};

type AppEventMap = EditorEventMap &
  Omit<Record<AppEventStrings, void>, keyof PayloadOverrides> &
  PayloadOverrides;

class EventManager<T extends Record<string, unknown>> {
  private store = new Map<keyof T, Set<CallbackFunction>>();
  public on<K extends keyof T>(event: K, cb: Listener<T[K]>) {
    let listeners = this.store.get(event);
    if (!listeners) {
      listeners = new Set();
      this.store.set(event, listeners);
    }
    listeners.add(cb);
    return () => this.off(event, cb);
  }

  public onMany(map: ListenerMap<T>) {
    const unsubs: (() => void)[] = [];
    const add = <K extends keyof T>(
      key: K,
      value: NonNullable<ListenerMap<T>[K]>,
    ) => {
      const callbacks = Array.isArray(value) ? value : [value];
      for (const cb of callbacks) {
        unsubs.push(this.on(key, cb));
      }
    };
    for (const key of Object.keys(map) as (keyof T)[]) {
      const value = map[key];
      if (value) add(key, value);
    }
    return () => {
      for (const unsub of unsubs) unsub();
      unsubs.length = 0;
    };
  }

  public once<K extends keyof T>(event: K, cb: Listener<T[K]>) {
    const wrapper = ((...args: unknown[]) => {
      unsub();
      (cb as CallbackFunction)(...args);
    }) as Listener<T[K]>;
    const unsub = this.on(event, wrapper);
    return unsub;
  }

  public off<K extends keyof T>(event: K, cb: Listener<T[K]>) {
    const listeners = this.store.get(event);
    if (!listeners) return;
    listeners.delete(cb);
    if (listeners.size === 0) {
      this.store.delete(event);
    }
  }

  public emit<K extends keyof T>(
    event: K,
    ...args: [T[K]] extends [void] ? [] : [payload: T[K]]
  ) {
    const listeners = this.store.get(event);
    if (!listeners || listeners.size === 0) return;
    for (const cb of new Set(listeners)) {
      cb(...args);
    }
  }

  public async emitAsync<K extends keyof T>(
    event: K,
    ...args: [T[K]] extends [void] ? [] : [payload: T[K]]
  ): Promise<void> {
    const listeners = this.store.get(event);
    if (!listeners || listeners.size === 0) return;
    await Promise.allSettled(
      Array.from(listeners, (cb) => Promise.try(cb, ...args)),
    );
  }
}

export const appEvents = new EventManager<AppEventMap>();
