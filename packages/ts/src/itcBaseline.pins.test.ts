/**
 * The output of symcrys in the ITC convention against the baseline pins (behavioural pins, fixture
 * class (c)): the safety net of the ITC migration (#121, #137). The pins are captured by
 * audit/itc-baseline from a known-good revision; what is compared is collected in
 * testUtils/itcBaseline.ts, the same code the capture runs. Pins are matched by their id (what was
 * asked), so that a difference names the call, setting and input it concerns. A difference is either
 * a change of behaviour that its PR intends and lists, after which the pins are re-captured, or a
 * bug. The pins are regression detectors, not a print anchor: correctness stays with the reference
 * tests.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  ITC_BASELINE_FILES,
  collectPlane,
  collectPointGroups,
  collectTensors,
  type Pin,
} from './testUtils/itcBaseline.js';

interface PinFile {
  readonly revision: string;
  readonly pins: readonly Pin[];
}

const read = (path: string): PinFile =>
  JSON.parse(readFileSync(new URL(`./${path}`, import.meta.url), 'utf8')) as PinFile;

/** Compares the pins of a file with the current output, pin by pin, by id. */
function compare(name: string, path: string, collect: () => readonly Pin[]): void {
  const pinned = read(path);
  const current = collect();
  const expected = new Map(pinned.pins.map((p) => [p.id, p.value]));
  const found = new Map(current.map((p) => [p.id, p.value]));
  describe(`${name} (pins of ${pinned.revision})`, () => {
    it('has unique ids', () => {
      expect(found.size).toBe(current.length);
      expect(expected.size).toBe(pinned.pins.length);
    });
    it('asks what the pins ask, no more and no less', () => {
      expect([...found.keys()].filter((id) => !expected.has(id))).toEqual([]);
      expect([...expected.keys()].filter((id) => !found.has(id))).toEqual([]);
    });
    it.each(current.filter((p) => expected.has(p.id)).map((p) => [p.id, p.value] as const))('%s', (id, value) =>
      expect(value).toEqual(expected.get(id)),
    );
  });
}

compare('point groups', ITC_BASELINE_FILES.pointGroups, collectPointGroups);
compare('tensors', ITC_BASELINE_FILES.tensors, collectTensors);
compare('plane groups', ITC_BASELINE_FILES.plane, collectPlane);
