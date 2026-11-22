/**
 * The output of symcrys in the ITC convention against the baseline pins (behavioural pins, fixture
 * class (c)): the safety net of the ITC migration (#121, #137). The pins are captured by
 * audit/itc-baseline from a known-good revision; what is compared is collected in
 * testUtils/itcBaseline.ts, the same code the capture runs. A difference is either a change of
 * behaviour that its PR intends and lists, after which the pins are re-captured, or a bug. The pins
 * are regression detectors, not a print anchor: correctness stays with the reference tests.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  ITC_BASELINE_FILES,
  collectPlane,
  collectPointGroups,
  collectTensors,
  normalised,
} from './testUtils/itcBaseline.js';

type Pins = Record<string, unknown> & { readonly revision: string };

const read = (path: string): Pins => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8')) as Pins;

/** Compares every section of a pin file with the current output, an array entry by entry. */
function compare(name: string, path: string, collect: () => Record<string, unknown>): void {
  const pinned = read(`./${path}`);
  const current = normalised(collect()) as Record<string, unknown>;
  describe(`${name} (pins of ${pinned.revision})`, () => {
    it('has the same sections', () => {
      expect(Object.keys(current)).toEqual(Object.keys(pinned).filter((k) => k !== 'note' && k !== 'revision'));
    });
    for (const [section, value] of Object.entries(current)) {
      const expected = pinned[section];
      if (Array.isArray(value) && Array.isArray(expected)) {
        it(`${section}: the same number of entries`, () => expect(value).toHaveLength(expected.length));
        const label = (entry: unknown, i: number) =>
          entry !== null && typeof entry === 'object' && 'key' in entry ? String(entry.key) : String(i);
        it.each(value.map((entry, i) => [label(entry, i), entry, expected[i]] as const))(
          `${section}: %s`,
          (_, entry, pinnedEntry) => expect(entry).toEqual(pinnedEntry),
        );
      } else {
        it(section, () => expect(value).toEqual(expected));
      }
    }
  });
}

compare('point groups', ITC_BASELINE_FILES.pointGroups, collectPointGroups);
compare('tensors', ITC_BASELINE_FILES.tensors, collectTensors);
compare('plane groups', ITC_BASELINE_FILES.plane, collectPlane);
