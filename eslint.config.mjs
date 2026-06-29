import js from "@eslint/js";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

export default [
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.nx/**",
      "**/coverage/**",
      "**/.husky/**",

      // PocketBase backend
      "apps/backend/**"
    ]
  },

  js.configs.recommended,

  ...tseslint.configs.recommended,

  {
    files: ["**/*.{ts,tsx}"],

    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module"
      },
      globals: {
        ...globals.browser,
        ...globals.node
      }
    },

    plugins: {
      react,
      "react-hooks": reactHooks
    },

    settings: {
      react: {
        version: "detect"
      }
    },

    rules: {
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/ban-ts-comment": "off",

      "no-empty": [
        "error",
        {
          allowEmptyCatch: true
        }
      ],

      "prefer-const": "warn",

      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules
    }
  },

  {
    files: [
      "**/*.config.js",
      "**/*.config.cjs",
      "**/*.config.mjs",
      "tailwind.config.js",
      "tailwind.config.ts",
      "postcss.config.js",
      "vite.config.ts"
    ],

    rules: {
      "@typescript-eslint/no-require-imports": "off"
    }
  }
];