/**
 * The Shubnikov symbols against print (fixture class (a)): ITC Vol. D (2013) Table 1.5.2.3,
 * column 3 (pp. 111–112), re-parsed from references/itc/vol-d-table-1.5.2.3.md and written with
 * combining characters by this test's own reading of the transcription's notation (`_` underline,
 * `-` overbar, `.` centred dot). The grey groups, which ITC does not print, follow symcrys's rule
 * (the class's symbol and an underlined 1, Thomas 2026-11-25).
 */

import { describe, expect, it } from 'vitest';
import * as classes from '../index.js';
import * as magnetic from '../magnetic.js';
import { readReference, tableRows } from '../testUtils/references.js';
import { SHUBNIKOV } from './shubnikovData.js';

const rows = tableRows(readReference('itc/vol-d-table-1.5.2.3.md')).slice(1);

/** The transcription's notation as print shows it: underline U+0332, overbar U+0305, centred dot. */
const asPrinted = (t: string) =>
  t
    .replace(/(_?)(-?)([0-9m])/g, (_, u: string, o: string, c: string) => c + (o ? '̅' : '') + (u ? '̲' : ''))
    .replace(/\./g, '·');

const keyOf = (short: string) => magnetic.findPointGroup(short)!.key;

describe('ITC Vol. D Table 1.5.2.3: Shubnikov symbols', () => {
  it('90 printed groups, each found by its short symbol; the data are the transcription', () => {
    expect(rows).toHaveLength(90);
    expect(Object.fromEntries(rows.map((r) => [keyOf(r[3]), r[2]]))).toEqual(SHUBNIKOV);
  });

  it("symbol(key, { form: 'shubnikov' }) writes the printed symbol, in every setting", () => {
    for (const r of rows) {
      const key = keyOf(r[3]);
      for (const s of magnetic.settings(key)) {
        expect(magnetic.symbol(key, { form: 'shubnikov', setting: s.index }), `${r[3]} setting ${s.index}`).toBe(
          asPrinted(r[2]),
        );
      }
    }
  });

  it('the crystallographic API gives the 32 classes the symbols of their rows (type I)', () => {
    for (const key of classes.POINT_GROUP_KEYS) {
      expect(classes.symbol(key, { form: 'shubnikov' }), key).toBe(magnetic.symbol(key, { form: 'shubnikov' }));
    }
    expect(classes.symbol('m-3m', { form: 'shubnikov' })).toBe('6̅/4');
  });

  it('a grey group: the symbol of its class and an underlined 1 (not printed by ITC)', () => {
    for (const key of classes.POINT_GROUP_KEYS) {
      const grey = magnetic.POINT_GROUP_KEYS.find((k) => k === `${key}1'`)!;
      expect(magnetic.symbol(grey, { form: 'shubnikov' })).toBe(`${magnetic.symbol(key, { form: 'shubnikov' })}1̲`);
    }
  });

  it('findPointGroup refuses a symbol with characters only Shubnikov writes (underline, :, ·)', () => {
    for (const key of ["2'/m'", '2/m', "6'/m'mm'"] as const) {
      const s = magnetic.symbol(key, { form: 'shubnikov' });
      expect(() => magnetic.findPointGroup(s), s).toThrow(/Shubnikov/);
      expect(() => classes.findPointGroup(s), s).toThrow(/Shubnikov/);
    }
  });
});
