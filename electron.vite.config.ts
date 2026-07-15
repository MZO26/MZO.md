import { defineConfig } from "electron-vite";
import { resolve } from "node:path";

export default defineConfig({
  main: {
    resolve: {
      alias: {
        "@": resolve(__dirname, "src"),
        "@shared": resolve(__dirname, "shared"),
        "@electron": resolve(__dirname, "electron"),
      },
    },
    build: {
      outDir: "dist-electron/main",
      rollupOptions: {
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
    resolve: {
      alias: {
        "@": resolve(__dirname, "src"),
        "@shared": resolve(__dirname, "shared"),
        "@electron": resolve(__dirname, "electron"),
      },
    },
    build: {
      outDir: "dist-electron/preload",
      rollupOptions: {
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
    resolve: {
      alias: {
        "@": resolve(__dirname, "src"),
        "@shared": resolve(__dirname, "shared"),
        "@electron": resolve(__dirname, "electron"),
      },
    },
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
