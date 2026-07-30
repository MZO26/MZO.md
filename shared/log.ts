function createLogger(isDev: boolean) {
  return {
    devLog: isDev ? console.log.bind(console, "[DEV]") : () => {},
    stateLog: isDev ? console.log.bind(console, "%c[DEV] %s") : () => {},
    appError: console.error.bind(console, "[ERROR]"),
    time: isDev ? console.time.bind(console) : () => {},
    timeEnd: isDev ? console.timeEnd.bind(console) : () => {},
    groupCollapsed: isDev ? console.groupCollapsed.bind(console) : () => {},
    groupEnd: isDev ? console.groupEnd.bind(console) : () => {},
  };
}

export { createLogger };
