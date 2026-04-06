import eslint from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // 1. Global Ignores (Must be the very first standalone object)
  {
    // Ignore Vite and Electron build outputs, and node_modules
    ignores: [
      "node_modules/**",
      "dist/**",
      "dist-electron/**",
      "release/**",
      ".vite/**",
      "out/**",
    ],
  },

  // 2. Core Recommended Rules
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked, // Thorough strict rules
  ...tseslint.configs.stylisticTypeChecked, // Enforces consistent TS styling

  // 3. Global Language Options for Type Checking
  {
    languageOptions: {
      parserOptions: {
        // 'projectService' is the modern, faster way TS-ESLint resolves your tsconfig files
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // 4. Electron Main Process & Preload (Node.js Environment)
  {
    // Adjust these paths to match where your Electron main/preload scripts live
    files: ["electron/**/*.ts", "vite.config.ts"],
    languageOptions: {
      globals: {
        ...globals.node, // Allows 'process', '__dirname', 'require', etc.
      },
    },
    rules: {
      // Add any specific rules for your Node backend here
      "no-console": "off", // Usually fine to log in the main process
    },
  },

  // 5. Vite Renderer Process (Browser Environment)
  {
    // Adjust this path to match where your Vanilla TS Vite frontend lives
    files: ["src/**/*.ts"],
    languageOptions: {
      globals: {
        ...globals.browser, // Allows 'window', 'document', 'fetch', etc.
      },
    },
    rules: {
      // Add any specific rules for your frontend here
    },
  },

  // 6. Project-Wide Custom Overrides
  {
    files: ["**/*.ts"],
    rules: {
      // Downgrade some ultra-strict TS rules to warnings so they don't block development
      "@typescript-eslint/no-explicit-any": "warn",

      // Allow unused variables ONLY if they start with an underscore (e.g., _event)
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],

      // Enforce modern JS/TS practices
      "prefer-const": "error",
      eqeqeq: ["error", "always"],

      // If you are writing Vanilla TS DOM manipulation, you might occasionally
      // need non-null assertions (!). This makes it a warning instead of an error.
      "@typescript-eslint/no-non-null-assertion": "warn",
    },
  },
);
