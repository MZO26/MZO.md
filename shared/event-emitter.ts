import type { Id, Note, SearchQuery } from "@shared/schemas/note-schema";
import type { APP_EVENTS, EDITOR_EVENTS } from "@shared/shared-constants";
import type { CallbackFunction } from "node:ffi";

/**
 * Maps event names to one or more listeners, enabling batch registration.
 */

export type ListenerMap<T> = {
  [K in keyof T]?: Listener<T[K]> | Listener<T[K]>[];
};

/**
 * The full application event map: editor commands, generic app events,
 * and events with typed payloads.
 */

export type AppEventMap = CommandEventMap &
  Omit<Record<AppEventStrings, void>, keyof PayloadOverrides> &
  PayloadOverrides;

/**
 * Maps each editor command event to a `boolean` payload (fired / not fired).
 */

export type CommandEventMap = Record<EditorEventStrings, boolean>;

/**
 * Union of all editor command event name strings.
 */

export type EditorEventStrings =
  (typeof EDITOR_EVENTS)[keyof typeof EDITOR_EVENTS];

/**
 * A listener callback: no-arg if the event carries no payload,
 * otherwise receives the typed payload.
 */

type Listener<T> = T extends void ? () => void : (payload: T) => void;

/**
 * Union of all application event name strings.
 */

type AppEventStrings = (typeof APP_EVENTS)[keyof typeof APP_EVENTS];

/**
 * Events that carry a typed payload (as opposed to `void`).
 */

type PayloadOverrides = {
  [APP_EVENTS.APPLY_VIEW]: string;
  [APP_EVENTS.HANDLE_WIKILINK_CLICK]: { id: Id | null; title: Note["title"] };
  [APP_EVENTS.SYNC_EDITOR_SEARCH]: { query: SearchQuery };
};

/**
 * A typed pub/sub event emitter.
 *
 * Listeners are stored per-event in a `Set`, so duplicate registration
 * of the same function reference is a no-op. `emit` iterates over a copy
 * of the set to allow safe unsubscribe during dispatch.
 */

class EventManager<T extends Record<string, unknown>> {
  private store = new Map<keyof T, Set<CallbackFunction>>();

  /**
   * Registers a listener for an event.
   *
   * @param event - The event name.
   * @param cb - Callback invoked when the event is emitted.
   * @returns An unsubscribe function.
   *
   * @example
   * const off = appEvents.on(APP_EVENTS.SYNC_EDITOR_SEARCH, ({ query }) => runSearch(query));
   */

  public on<K extends keyof T>(event: K, cb: Listener<T[K]>) {
    let listeners = this.store.get(event);
    if (!listeners) {
      listeners = new Set();
      this.store.set(event, listeners);
    }
    listeners.add(cb);
    return () => this.off(event, cb);
  }

  /**
   * Registers multiple listeners at once.
   *
   * @param map - Object mapping event names to a listener or array of listeners.
   * @returns A single function that unsubscribes all registered listeners.
   *
   * @example
   * const offAll = appEvents.onMany({
   *   [APP_EVENTS.APPLY_VIEW]: (view) => apply(view),
   *   [EDITOR_EVENTS.CURSOR_MOVE]: [handlerA, handlerB],
   * });
   */

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

  /**
   * Registers a listener that is automatically removed after its first invocation.
   *
   * @param event - The event name.
   * @param cb - Callback invoked exactly once.
   * @returns An unsubscribe function (no-op if the event already fired).
   *
   * @example
   * appEvents.once(APP_EVENTS.APPLY_VIEW, (view) => console.log(view));
   */

  public once<K extends keyof T>(event: K, cb: Listener<T[K]>) {
    const wrapper = ((...args: unknown[]) => {
      unsub();
      (cb as CallbackFunction)(...args);
    }) as Listener<T[K]>;
    const unsub = this.on(event, wrapper);
    return unsub;
  }

  /**
   * Removes a previously registered listener.
   *
   * @param event - The event name.
   * @param cb - The exact function reference that was passed to `on`.
   */

  public off<K extends keyof T>(event: K, cb: Listener<T[K]>) {
    const listeners = this.store.get(event);
    if (!listeners) return;
    listeners.delete(cb);
    if (listeners.size === 0) {
      this.store.delete(event);
    }
  }

  /**
   * Synchronously emits an event to all registered listeners.
   *
   * @param event - The event name.
   * @param payload - Event payload (only for events with a non-`void` type).
   */

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

  /**
   * Emits an event and waits for all async listeners to settle.
   *
   * Listener rejections are caught (via `Promise.try`) and do not
   * propagate; the method always resolves.
   *
   * @param event - The event name.
   * @param payload - Event payload (only for events with a non-`void` type).
   * @returns Resolves once all listeners have settled.
   */

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
