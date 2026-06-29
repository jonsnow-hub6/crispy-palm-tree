import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default [
  // Global ignores
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.nx/**',
      '**/coverage/**',

      // PocketBase
      'apps/backend/**',

      '**/splinter_cron_flow.json',
    ],
  },

  // JavaScript
  {
    files: ['**/*.{js,mjs,cjs}'],
    ...js.configs.recommended,
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
  },

  // TypeScript
  ...tseslint.config({
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,

      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',

      'react/react-in-jsx-scope': 'off',
      'react/jsx-uses-react': 'off',

      'prefer-const': 'warn',

      'no-empty': [
        'error',
        {
          allowEmptyCatch: true,
        },
      ],
    },
  }),

  // Config files
  {
    files: [
      '**/*.config.{js,cjs,mjs,ts}',
      'vite.config.ts',
      'tailwind.config.ts',
      'postcss.config.js',
    ],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
];
