/**
 * The symbols of ITC Vol. D (2013) Table 1.2.6.12 (p. 66), read by `findPointGroup`: every printed
 * symbol names a group of its row (crystal class) and of its column (type I, II, III), and the 122
 * symbols name the 122 groups. The table writes several groups otherwise than Table 1.5.2.3 and the
 * keys (`21'/m`, `1'`, `m'-3`, other orientations such as `2mm`, `m'mm`); its erratum `2'2'` is read
 * corrected (references/itc/vol-d-table-1.2.6.12.md). And every symbol symcrys writes, in every form
 * and setting, reads back as its group or is refused, never as another group.
 */

import { describe, expect, it } from 'vitest';
import * as classes from '../index.js';
import * as magnetic from '../magnetic.js';
import { expectHeader, readReference, tableRows } from '../testUtils/references.js';

const rows = tableRows(readReference('itc/vol-d-table-1.2.6.12.md'));
const ERRATA: Readonly<Record<string, string>> = { "2'2'": "2'2'2" };

describe('ITC Vol. D Table 1.2.6.12, read by findPointGroup', () => {
  it('has the printed columns and one row per crystal class', () => {
    expectHeader(rows, ['Type I', 'Type II', 'Type III']);
    expect(rows.slice(1)).toHaveLength(32);
  });

  it('reads every printed symbol as a group of its row and column, the 122 groups once each', () => {
    const seen = new Set<string>();
    for (const [typeI, typeII, typeIII] of rows.slice(1)) {
      const found = classes.findPointGroup(typeI);
      expect(found, typeI).toBeDefined();
      const crystalClass = found!.key;
      const printed: [string, string][] = [
        [typeI, 'I'],
        [typeII, 'II'],
        ...typeIII
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s !== '')
          .map((s) => [s, 'III'] as [string, string]),
      ];
      for (const [symbol, type] of printed) {
        const read = ERRATA[symbol] ?? symbol;
        const group = magnetic.findPointGroup(read);
        expect(group, `${symbol} (row ${typeI})`).toBeDefined();
        const record = magnetic.pointGroup(group!.key);
        expect([record.type, record.crystalClass], `${symbol} (row ${typeI})`).toEqual([type, crystalClass]);
        seen.add(group!.key);
      }
    }
    expect(seen.size).toBe(122);
  });

  it('does not read the erratum as printed', () => {
    expect(magnetic.findPointGroup("2'2'")).toBeUndefined();
  });
});

describe('every symbol symcrys writes reads back as its group or is refused', () => {
  it('in every form and setting of both entry points', () => {
    for (const [api, keys] of [
      [classes, classes.POINT_GROUP_KEYS],
      [magnetic, magnetic.POINT_GROUP_KEYS],
    ] as const) {
      for (const key of keys as readonly string[]) {
        for (const s of api.settings(key as never)) {
          for (const form of ['short', 'full', 'schoenflies', 'shubnikov'] as const) {
            const written = api.symbol(key as never, { setting: s.index, form });
            let read: string | undefined;
            try {
              read = api.findPointGroup(written)?.key;
            } catch (e) {
              expect(e, `${key} ${form} ${written}`).toBeInstanceOf(RangeError);
              continue;
            }
            expect(read, `${key} setting ${s.index} ${form} ${written}`).toBe(key);
          }
        }
      }
    }
  });

  it('refuses the Shubnikov symbols of -1 and -3, which read otherwise in Hermann–Mauguin', () => {
    for (const api of [classes, magnetic]) {
      expect(() => api.findPointGroup(api.symbol('-3', { form: 'shubnikov' }))).toThrow(/-3 in Shubnikov.*-6/);
      expect(() => api.findPointGroup(api.symbol('-1', { form: 'shubnikov' }))).toThrow(/-1 in Shubnikov/);
      // -4 is the same group in both notations; -6 written with a hyphen is Hermann–Mauguin.
      expect(api.findPointGroup(api.symbol('-4', { form: 'shubnikov' }))?.key).toBe('-4');
      expect(api.findPointGroup('-6')?.key).toBe('-6');
    }
  });
});
