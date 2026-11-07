import { createLogger } from "@shared/log";
import type { Id, NoteListItem } from "@shared/schemas/note-schema";

/** Application-wide logger for the renderer process (dev-aware via `import.meta.env.DEV`). */

export const rendererLogger = createLogger(import.meta.env.DEV);

type Debounced<A extends (...args: any[]) => void> = ((
  ...args: Parameters<A>
) => void) & {
  cancel: () => void;
  flush: () => void;
};

/**
 * Trailing-edge debounce wrapper.
 *
 * Delays invocation of `fn` until `wait` ms have elapsed since the last
 * call. Repeated calls within the window reset the timer, so `fn` only
 * fires once things go quiet.
 *
 * Exposes two additional methods on the returned function:
 * - `.cancel()` – discards any pending invocation.
 * - `.flush()` – immediately invokes the pending call (if any) and returns its result.
 *
 * @param fn - The function to debounce.
 * @param wait - Delay in milliseconds.
 * @returns A debounced version of `fn` with `.cancel` and `.flush`.
 *
 * @example
 * const save = debounce(() => api.save(), 300);
 * input.addEventListener("input", () => save());
 * // … user stops typing …
 * setTimeout(() => save.flush(), 500); // force-execute if pending
 */

function debounce<A extends (...args: any[]) => any>(
  fn: A,
  wait: number,
): Debounced<A> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<A> | null = null;
  function cancel() {
    if (timer !== null) clearTimeout(timer);
    timer = null;
    lastArgs = null;
  }
  function flush(): ReturnType<typeof fn> | undefined {
    if (timer === null || lastArgs === null) return undefined;
    const args = lastArgs;
    cancel();
    return fn(...args);
  }
  const debounced = ((...args: Parameters<A>) => {
    lastArgs = args;
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => {
      const argsToUse = lastArgs;
      timer = null;
      lastArgs = null;
      if (argsToUse !== null) {
        fn(...argsToUse);
      }
    }, wait);
  }) as Debounced<A>;
  debounced.cancel = cancel;
  debounced.flush = flush;
  return debounced;
}

/**
 * Wraps an event callback so that only one invocation runs at a time.
 *
 * While a previous call is still in flight, subsequent events are
 * silently dropped. Errors thrown by the callback are logged via
 * `rendererLogger` and do not propagate further.
 *
 * @param callback - The async or sync handler to protect.
 * @returns A single-flight event handler for type `T`.
 *
 * @example
 * const handler = createAsyncHandler<CustomEvent<Item>>((e) => process(e.detail));
 * emitter.on("item", handler);
 */

function createAsyncHandler<T extends Event>(
  callback: (e: T) => Promise<void> | void,
) {
  let isProcessing = false;
  return async (e: T) => {
    if (isProcessing) return;
    isProcessing = true;
    try {
      await callback(e);
    } catch (error) {
      rendererLogger.appError(
        "[createAsyncHandler]: Failed to invoke callback",
        error,
      );
    } finally {
      isProcessing = false;
    }
  };
}

/**
 * Returns a promise that resolves after the given delay.
 *
 * @param ms - Delay in milliseconds.
 * @returns A promise that fulfils with `undefined` after `ms`.
 *
 * @example
 * await sleep(500); // wait ~500 ms
 */

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Waits for the browser to complete a number of animation frames.
 *
 * Useful for deferring work (e.g. layout measurement, DOM buildup) until
 * after the compositor has actually painted. The default of two frames
 * ensures both the paint and the composite step have completed.
 *
 * @param frames - Number of `requestAnimationFrame` ticks to wait for. Defaults to `2`.
 * @returns Resolves once all frames have been painted.
 *
 * @example
 * element.style.transform = "scale(1)";
 * await waitForPaint();
 * const { width } = element.getBoundingClientRect(); // reliable after paint
 */

async function waitForPaint(frames = 2): Promise<void> {
  for (let i = 0; i < frames; i++) {
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve()),
    );
  }
}

/**
 * Wraps an async function with performance timing logs (dev-only).
 *
 * In production builds (`import.meta.env.DEV === false`) the original
 * function is returned as-is with zero overhead. In development, each
 * invocation is timed via `rendererLogger.time` / `timeEnd`. Errors are
 * logged and re-thrown.
 *
 * @param fn - The async function to instrument.
 * @returns The original function (prod) or a timed wrapper (dev).
 *
 * @example
 * const load = withPerformanceLog(fetchItems);
 * const items = await load("page-1"); // logs: "Invoking function fetchItems" 42ms
 */

function withPerformanceLog<A extends unknown[], T>(
  fn: (...args: A) => Promise<T>,
) {
  if (!import.meta.env.DEV) return fn;
  return async (...args: A): Promise<T> => {
    const timerLabel = `Invoking function ${fn.name}`;
    rendererLogger.time(timerLabel);
    try {
      const data = await fn(...args);
      rendererLogger.timeEnd(timerLabel);
      return data;
    } catch (error) {
      rendererLogger.timeEnd(timerLabel);
      rendererLogger.appError(`Error invoking function ${fn.name}`, error);
      throw error;
    }
  };
}

/** Registry of registered cache-invalidation callbacks. */
const activeCaches = new Set<() => void>();

/**
 * Invokes every registered cache-invalidation callback.
 *
 * Intended as a global reset (on editor state reset) to
 * clear all memoized state across modules in one call.
 *
 * @example
 * // In a module that uses memoization:
 * activeCaches.add(() => myCache.clear());
 *
 * // Later, on logout:
 * clearAllMemoizedCaches();
 */

function clearAllMemoizedCaches() {
  activeCaches.forEach((clear) => clear());
}

/**
 * Single-entry memoization wrapper.
 *
 * Caches only the most recent call's result. On subsequent invocations,
 * arguments are compared via `equalFn` (shallow identity by default); if
 * they match, the cached result is returned without re-executing `fn`.
 *
 * A `.clear()` method is attached to the memoized function and also
 * registered globally in {@link activeCaches}.
 *
 * @param fn - The function to memoize.
 * @param equalFn - Custom argument-equality check; defaults to per-element `===` with length comparison.
 * @returns A memoized version of `fn` with an attached `.clear()` method.
 *
 * @example
 * const parse = memoize((json: string) => JSON.parse(json));
 * parse('{"a":1}'); // executes fn
 * parse('{"a":1}'); // cache hit – returns stored result
 * parse.clear();    // invalidate
 */

function memoize<A extends unknown[], R>(
  fn: (...args: A) => R,
  equalFn: (prev: A, next: A) => boolean = (prev, next) =>
    prev.length === next.length && next.every((val, i) => val === prev[i]),
) {
  let lastArgs: A | null = null;
  let lastResult: R | undefined;
  const clear = () => {
    lastArgs = null;
    lastResult = undefined;
  };
  activeCaches.add(clear);
  const memoized = (...args: A): R => {
    if (lastArgs && equalFn(lastArgs, args)) {
      rendererLogger.devLog("Returning old result");
      return lastResult as R;
    }
    lastArgs = args;
    lastResult = fn(...args);
    return lastResult;
  };
  memoized.clear = clear;
  return memoized;
}

/**
 * Returns a shallow copy of a record with specified keys removed.
 *
 * Also drops any entries whose value is `undefined`. The original object
 * is not mutated.
 *
 * @param record - The source record.
 * @param keysToRemove - A single key or a set of keys to exclude.
 * @returns A new record without the removed (and undefined) entries.
 *
 * @example
 * omitKeys({ a: 1, b: 2, c: 3 }, "b");        // { a: 1, c: 3 }
 * omitKeys({ a: 1, b: 2, c: 3 }, new Set(["a", "c"])); // { b: 2 }
 */

function omitKeys<K extends Id, V>(
  record: Record<K, V>,
  keysToRemove: Set<Id> | Id,
): Record<K, V> {
  const next = {} as Record<K, V>;
  const isSet = keysToRemove instanceof Set;
  for (const key in record) {
    const shouldRemove = isSet ? keysToRemove.has(key) : key === keysToRemove;
    if (!shouldRemove) {
      const val = record[key];
      if (val !== undefined) next[key] = val;
    }
  }
  return next;
}

/**
 * Sort comparator for note list items.
 *
 * Order: pinned first → newest `created_at` first → title A→Z
 * (accent-sensitive, natural numeric ordering).
 *
 * @param a - First note.
 * @param b - Second note.
 * @returns Negative if `a` precedes `b`, positive if after, zero if equal.
 *
 * @example
 * notes.sort(compareNotes);
 */

function compareNotes(a: NoteListItem, b: NoteListItem) {
  if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
  if (a.created_at > b.created_at) return -1;
  if (a.created_at < b.created_at) return 1;
  return a.title.localeCompare(b.title, undefined, {
    sensitivity: "accent",
    numeric: true,
  });
}

/**
 * Extracts the file extension from a file name (lowercased).
 *
 * @param name - File name, e.g. `"report.FINAL.PDF"`.
 * @returns The extension without the dot, or `""` if none is present.
 *
 * @example
 * getExtension("report.pdf");   // "pdf"
 * getExtension("notes.md");     // "md"
 * getExtension("draft.TXT");    // "txt"
 * getExtension("index.html");   // "html"
 * getExtension("README");       // ""
 */

function getExtension(name: string) {
  const index = name.lastIndexOf(".");
  return index > 0 ? name.slice(index + 1).toLowerCase() : "";
}

/**
 * Opens a `<dialog>` modally and resolves when it is closed.
 *
 * @param dialog - The dialog element to show.
 * @returns The dialog's `returnValue` at the time of closing (default `""`).
 *
 * @example
 * const result = await showDialog(myDialog);
 * if (result === "confirm") save();
 */

function showDialog(dialog: HTMLDialogElement) {
  return new Promise((resolve) => {
    dialog.addEventListener("close", () => resolve(dialog.returnValue), {
      once: true,
    });
    dialog.showModal();
  });
}

/**
 * Shows a confirm dialog and resolves to a boolean.
 *
 * Sets the dialog title, resets `returnValue` to `""` (so dismissing via
 * Escape or backdrop click yields `false`, not a stale value), awaits
 * {@link showDialog}, clears the title, and returns whether the user
 * explicitly confirmed.
 *
 * @param dialog The `<dialog>` element to show.
 * @param titleEl Element inside the dialog that receives the title text.
 * @param title Confirmation prompt text.
 * @returns `true` if the user clicked confirm, `false` for cancel or dismiss.
 *
 * @example
 * const ok = await confirmWithDialog(
 *   requireElement<HTMLDialogElement>("#confirm-dialog"),
 *   requireElement<HTMLElement>("#confirm-title"),
 *   "Delete this note?",
 * );
 * if (ok) await handleDeleteNote("note-abc123");
 */

async function confirmWithDialog(
  dialog: HTMLDialogElement,
  titleEl: HTMLElement,
  title: string,
) {
  titleEl.textContent = title;
  dialog.returnValue = "";
  const result = await showDialog(dialog);
  titleEl.textContent = "";
  return result === "confirm";
}

export {
  clearAllMemoizedCaches,
  compareNotes,
  confirmWithDialog,
  createAsyncHandler,
  debounce,
  getExtension,
  memoize,
  omitKeys,
  showDialog,
  sleep,
  waitForPaint,
  withPerformanceLog,
};
