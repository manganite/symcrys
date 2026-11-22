import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['packages/ts/src/**/*.test.ts'],
    // Several exhaustive tests take one to two seconds alone and four times that when every test
    // file runs in parallel on a slower machine (WSL with 12 workers), beyond vitest's default of
    // 5 s; CI, with fewer workers, stays well below.
    testTimeout: 30_000,
  },
});
