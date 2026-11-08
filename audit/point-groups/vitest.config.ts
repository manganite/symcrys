import { defineConfig } from 'vitest/config';

// Runs the point-group audit (npm run audit:point-groups). It imports source files from the sibling
// checkouts ../birss-app and ../stereography, so the dev server may read outside this repository.
export default defineConfig({
  root: import.meta.dirname,
  server: { fs: { allow: ['../../..'] } },
  test: {
    include: ['compare.run.ts'],
  },
});
