/**
 * Captures the output of symcrys in the ITC convention as behavioural pins (fixture class (c),
 * CLAUDE.md): the safety net of the ITC migration (#121, #137). What is collected is defined once,
 * in packages/ts/src/testUtils/itcBaseline.ts, which `itcBaseline.pins.test.ts` also uses. Writes
 * three JSON files, one entry per line:
 *
 * - packages/ts/src/pointGroups/itcBaseline.pins.json: every key of the magnetic API in every ITC
 *   setting (symbols, operations, generators, lattice operations, descriptions, symmetry directions,
 *   identification, site symmetry, orbits; Wyckoff positions and crystal forms of the 32 classes),
 *   the tables of both APIs, and the cell, index and lattice functions on fixed inputs.
 * - packages/ts/src/tensors/itcBaseline.pins.json: the tensor forms of every specification in every
 *   ITC setting, time-even for the 32 classes, time-odd for the 58 black-and-white groups.
 * - packages/ts/src/spaceGroups/itcBaseline.pins.json: the 17 plane groups and the 10 plane point
 *   groups.
 *
 * Run by hand from a clean checkout of a known-good revision: npm run audit:itc-baseline. Not part
 * of the build, the tests or CI. Regenerate the pins only by re-running this script, never by
 * editing them; a PR that does so lists every pin that changed and why.
 */
import { writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { it } from 'vitest';

import {
  ITC_BASELINE_FILES,
  collectPlane,
  collectPointGroups,
  collectTensors,
  normalised,
} from '../../packages/ts/src/testUtils/itcBaseline';

const root = fileURLToPath(new URL('../../', import.meta.url));
const src = `${root}packages/ts/src/`;

const NOTE =
  'Behavioural pins (fixture class (c), CLAUDE.md): the output of symcrys in the ITC convention, the safety net of the ITC migration (#121, #137). Captured by audit/itc-baseline/capture.run.ts (npm run audit:itc-baseline) from the revision below; regenerate only by re-capture, never edit. Numbers rounded to 12 decimals.';

/** Writes a pin file: the header, then each section, an array with one entry per line. */
function write(path: string, revision: string, data: Record<string, unknown>): void {
  const sections = Object.entries(normalised(data) as Record<string, unknown>).map(([k, v]) =>
    Array.isArray(v)
      ? `  ${JSON.stringify(k)}: [\n${v.map((x) => `    ${JSON.stringify(x)}`).join(',\n')}\n  ]`
      : `  ${JSON.stringify(k)}: ${JSON.stringify(v)}`,
  );
  const head = [`  "note": ${JSON.stringify(NOTE)}`, `  "revision": ${JSON.stringify(revision)}`];
  writeFileSync(path, `{\n${[...head, ...sections].join(',\n')}\n}\n`);
}

it('captures the ITC baseline pins', () => {
  const git = (...args: string[]) => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8' }).trim();
  if (git('status', '--porcelain', '--', 'packages/ts/src')) {
    throw new Error('packages/ts/src has local changes; capture only from a clean checkout');
  }
  const revision = git('log', '-1', '--format=%h %cs');
  write(`${src}${ITC_BASELINE_FILES.pointGroups}`, revision, collectPointGroups());
  write(`${src}${ITC_BASELINE_FILES.tensors}`, revision, collectTensors());
  write(`${src}${ITC_BASELINE_FILES.plane}`, revision, collectPlane());
});
