import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Environment APIs the library must not use (CLAUDE.md, "Hard constraints"). Most of them already
// fail the type check of the library code (no DOM, no Node types); this list also catches access
// through globalThis or self.
const RESTRICTED_GLOBALS = [
  'globalThis',
  'self',
  'window',
  'document',
  'navigator',
  'localStorage',
  'sessionStorage',
  'fetch',
  'console',
  'process',
  'Buffer',
  'require',
  '__dirname',
  '__filename',
].map((name) => ({ name, message: 'symcrys runs in browsers and in Node: no environment APIs in library code.' }));

// Test-only code (CLAUDE.md, "Tests"): not shipped, may use Node.
const TEST_ONLY = ['src/**/*.test.ts', 'src/**/*.fixtures.ts', 'src/**/testUtils/**'];

export default defineConfig([
  { ignores: ['dist/', 'coverage/', 'node_modules/', 'references/'] },
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
    ignores: TEST_ONLY,
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
    files: [...TEST_ONLY, 'scripts/**', 'audit/**', '*.config.{js,ts}'],
    languageOptions: { globals: globals.node },
  },
]);
