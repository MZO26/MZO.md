import { defineConfig } from "electron-vite";
import { resolve } from "node:path";

export default defineConfig({
  main: {
    build: {
      outDir: "dist-electron/main",
      rollupOptions: {
        external: ["better-sqlite3"],
        input: {
          main: resolve(__dirname, "electron/main.ts"),
        },
        output: {
          format: "cjs",
        },
      },
    },
  },
  preload: {
    build: {
      outDir: "dist-electron/preload",
      rollupOptions: {
        external: ["better-sqlite3"],
        input: {
          preload: resolve(__dirname, "electron/preload.ts"),
        },
        output: {
          format: "cjs",
          inlineDynamicImports: true,
        },
      },
    },
  },
  renderer: {
    root: resolve(__dirname, "."),
    build: {
      outDir: "dist",
      emptyOutDir: true,
      rollupOptions: {
        input: {
          index: resolve(__dirname, "index.html"),
        },
      },
    },
    server: {
      port: 5173,
      strictPort: true,
    },
  },
});
