import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['packages/ts/src/**/*.test.ts'],
  },
});
