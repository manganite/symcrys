import { defineConfig } from 'vitest/config';

// Runs the Wyckoff audit (npm run audit:wyckoff-2006). It reads stereography's
// catalogue at a fixed revision with git (../stereography-2006.ts).
export default defineConfig({
  root: import.meta.dirname,
  server: { fs: { allow: ['../..'] } },
  test: {
    include: ['compare.run.ts'],
  },
});
