import { defineConfig } from 'vitest/config';

// Captures the Birss-mode pins from birss-app (npm run audit:birss-app). It imports source files
// from the sibling checkout ../birss-app, so the dev server may read outside this repository.
export default defineConfig({
  root: import.meta.dirname,
  server: { fs: { allow: ['../../..'] } },
  test: {
    include: ['capture.run.ts'],
  },
});
