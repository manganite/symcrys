/**
 * Captures the output of symcrys in the ITC convention as behavioural pins (fixture class (c),
 * GUIDE.md, "Correctness and tests"): the safety net of the ITC migration (#121, #137). What is
 * collected is defined once, in packages/ts/src/testUtils/itcBaseline.ts, which `itcBaseline.pins.test.ts` also uses. Writes
 * three JSON files, one entry per line:
 *
 * - packages/ts/src/pointGroups/itcBaseline.pins.json: every key of the magnetic API in every ITC
 *   setting, and the crystallographic API for the 32 classes (symbols, searches, operations,
 *   generators, lattice operations, descriptions, symmetry directions, identification, site
 *   symmetry and orbits with and without a tolerance, Wyckoff positions, crystal forms), the tables,
 *   tolerant and wrong inputs, and the cell, index and lattice functions on fixed inputs.
 * - packages/ts/src/tensors/itcBaseline.pins.json: the tensor forms (parameters, basis, relations)
 *   of every specification in every ITC setting, time-even for the 32 classes, time-odd for the 58
 *   black-and-white groups, and the tensor functions on lists of operations.
 * - packages/ts/src/spaceGroups/itcBaseline.pins.json: the 17 plane groups (with snapping and
 *   tolerances near special positions) and the 10 plane point groups.
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
  type Pin,
} from '../../packages/ts/src/testUtils/itcBaseline';

const root = fileURLToPath(new URL('../../', import.meta.url));
const src = `${root}packages/ts/src/`;

const NOTE =
  'Behavioural pins (fixture class (c), GUIDE.md): the output of symcrys in the ITC convention, the safety net of the ITC migration (#121, #137). Captured by audit/itc-baseline/capture.run.ts (npm run audit:itc-baseline) from the revision below; regenerate only by re-capture, never edit. One pin per line: what was asked (id) and the answer or the error (value); numbers rounded to 12 decimals.';

/** Writes a pin file: the header, then the pins, one `{ id, value }` per line. */
function write(path: string, revision: string, pins: readonly Pin[]): void {
  const head = [`  "note": ${JSON.stringify(NOTE)}`, `  "revision": ${JSON.stringify(revision)}`];
  const body = `  "pins": [\n${pins.map((p) => `    ${JSON.stringify(p)}`).join(',\n')}\n  ]`;
  writeFileSync(path, `{\n${[...head, body].join(',\n')}\n}\n`);
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
