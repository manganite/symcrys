import { defineConfig } from 'vitest/config';

// Captures the ITC baseline pins from symcrys itself (npm run audit:itc-baseline).
export default defineConfig({
  root: import.meta.dirname,
  server: { fs: { allow: ['../..'] } },
  test: {
    include: ['capture.run.ts'],
    testTimeout: 600_000,
  },
});
