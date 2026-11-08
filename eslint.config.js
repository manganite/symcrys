import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Environment APIs the library must not use (CLAUDE.md, "Hard constraints"). The type check catches
// most of them already (no DOM, no Node types); this also covers what test-only types might leak.
const RESTRICTED_GLOBALS = [
  'window',
  'document',
  'navigator',
  'localStorage',
  'sessionStorage',
  'fetch',
  'process',
  'Buffer',
  'require',
  '__dirname',
  '__filename',
].map((name) => ({ name, message: 'symcrys runs in browsers and in Node: no environment APIs in src/.' }));

export default defineConfig([
  { ignores: ['dist/', 'coverage/', 'node_modules/'] },
  { linterOptions: { reportUnusedDisableDirectives: 'error' } },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
      ],
    },
  },
  {
    // Library code: relative imports only (no runtime dependencies), no environment APIs.
    files: ['src/**/*.ts'],
    ignores: ['src/**/*.test.ts'],
    rules: {
      'no-restricted-globals': ['error', ...RESTRICTED_GLOBALS],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^(?!\\.{1,2}/)',
              message: 'symcrys has no runtime dependencies: import only relative modules.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['scripts/**', '*.config.{js,ts}'],
    languageOptions: { globals: globals.node },
  },
]);
