import { defineConfig } from 'vitest/config';

// Runs the Wyckoff audit (npm run audit:wyckoff-2006). It imports stereography's form catalogue from
// the sibling checkout ../stereography, so the dev server may read outside this repository.
export default defineConfig({
  root: import.meta.dirname,
  server: { fs: { allow: ['../../..'] } },
  test: {
    include: ['compare.run.ts'],
  },
});
