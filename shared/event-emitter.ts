import type { AppEvent } from "@shared/shared-types";
import type { CallbackFunction } from "node:ffi";

type Listener<T> = T extends void ? () => void : (payload: T) => void;

class EventManager<
  T extends Record<string, unknown> = Partial<
    Record<AppEvent, Listener<unknown>>
  >,
> {
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
    if (!listeners) return;
    for (const cb of new Set(listeners)) {
      cb(...args);
    }
  }

  public async emitAsync<K extends keyof T>(
    event: K,
    ...args: [T[K]] extends [void] ? [] : [payload: T[K]]
  ) {
    const listeners = this.store.get(event);
    if (!listeners || listeners.size === 0) return [];
    return Promise.allSettled(
      Array.from(listeners, (cb) => Promise.try(cb, ...args)),
    );
  }
}

export const appEvents = new EventManager<Record<AppEvent, void>>();
