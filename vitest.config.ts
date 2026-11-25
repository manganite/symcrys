import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['packages/ts/src/**/*.test.ts'],
    // Several exhaustive tests take one to two seconds alone and four times that when every test
    // file runs in parallel on a slower machine (WSL with 12 workers), beyond vitest's default of
    // 5 s. Per-test timeouts were tried first, but which tests cross 5 s depends on the load.
    testTimeout: 30_000,
    // npm run test:coverage (#69): which lines of the library no test reaches. A report to look at
    // (CI keeps it as the artefact "coverage"), not a gate and no percentage to reach. The
    // instrumentation makes the slowest tests about twice as slow, so the script doubles the timeout.
    coverage: {
      provider: 'v8',
      include: ['packages/ts/src/**/*.ts'],
      exclude: ['packages/ts/src/**/*.test.ts', 'packages/ts/src/**/*.fixtures.ts', 'packages/ts/src/testUtils/**'],
      reporter: ['text-summary', 'html', 'json-summary'],
      reportsDirectory: 'build/coverage',
    },
  },
});
