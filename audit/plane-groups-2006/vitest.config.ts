import { defineConfig } from 'vitest/config';

// Runs the plane-group audit (npm run audit:plane-groups-2006). It imports plane-groups' data from
// the sibling checkout ../plane-groups, so the dev server may read outside this repository.
export default defineConfig({
  root: import.meta.dirname,
  server: { fs: { allow: ['../../..'] } },
  test: {
    include: ['compare.run.ts'],
  },
});
