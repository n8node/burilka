// @ts-check
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

/** Чистая часть пакета (simulation, operations, telemetry, exams …) не должна зависеть от браузера и UI-фреймворков. */
const PURE = ["src/**/*.ts"];
const RENDERER = ["src/renderer/**/*.ts"];

export default tseslint.config(
  { ignores: ["dist/**", "node_modules/**", "coverage/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.node } },
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/consistent-type-imports": "error",
    },
  },
  {
    files: PURE,
    ignores: RENDERER,
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: ["three", "react", "react-dom", "next"].map((name) => ({ name, message: "Симуляция не зависит от рендера/UI — только src/renderer." })),
          patterns: [
            { group: ["three/*", "next/*", "react/*"], message: "Симуляция не зависит от рендера/UI — только src/renderer." },
            { group: ["**/renderer", "**/renderer/*"], message: "Чистая часть не импортирует renderer." },
          ],
        },
      ],
      "no-restricted-globals": [
        "error",
        ...["window", "document", "navigator", "requestAnimationFrame", "localStorage", "performance"].map((name) => ({ name, message: "Симуляция должна работать в Node без DOM." })),
      ],
    },
  },
  {
    files: [...RENDERER, "examples/**/*.{ts,tsx}"],
    languageOptions: { globals: { ...globals.browser } },
  },
);
