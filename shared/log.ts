/**
 * Creates a logger with dev-gated and always-on methods.
 *
 * In development, all methods delegate to the corresponding `console` API
 * with a `[DEV]` prefix. In production, everything except `appError`
 * becomes a no-op.
 *
 * @param isDev - Whether the app is running in development mode.
 * @returns A logger object (see individual method docs below).
 */

function createLogger(isDev: boolean) {
  return {
    /**
     * Logs a message with a `[DEV]` prefix. No-op in production.
     *
     * @param args - Values to log.
     *
     * @example
     * logger.devLog("state updated", state); // [DEV] state updated {…}
     */

    devLog: isDev ? console.log.bind(console, "[DEV]") : () => {},

    /**
     * Logs a styled message with a `[DEV]` prefix. No-op in production.
     *
     * @param style - CSS string for the first `%c` placeholder (optional).
     * @param label - Text label (e.g. `"Update:"`, `"Next State:"`).
     * @param data - The value to inspect.
     *
     * @example
     * logger.stateLog("color: green; font-weight: bold", "Update:", { theme: "dark" });
     */

    stateLog: isDev ? console.log.bind(console, "%c[DEV] %s") : () => {},

    /**
     * Logs an application error. **Always active**, even in production.
     *
     * @param message - Error description.
     * @param error - The error object or additional context.
     *
     * @example
     * logger.appError("Failed to save", err); // [ERROR] Failed to save <err>
     */

    appError: console.error.bind(console, "[ERROR]"),

    /**
     * Starts a named timer. No-op in production.
     *
     * @param label - Timer name (e.g. `"Invoking function fetchItems"`).
     */

    time: isDev ? console.time.bind(console) : () => {},

    /**
     * Stops a previously started timer and logs elapsed time. No-op in production.
     *
     * @param label - Must match the name passed to `time`.
     */

    timeEnd: isDev ? console.timeEnd.bind(console) : () => {},

    /**
     * Opens a collapsed console group. No-op in production.
     *
     * @param label - Group title (e.g. `"[store update]"`).
     */

    groupCollapsed: isDev ? console.groupCollapsed.bind(console) : () => {},

    /**
     * Closes the most recent console group. No-op in production.
     */

    groupEnd: isDev ? console.groupEnd.bind(console) : () => {},
  };
}

export { createLogger };
