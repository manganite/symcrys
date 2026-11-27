/**
 * The computed Shubnikov symbols against print (fixture class (a)): ITC Vol. D (2013) Table 1.5.2.3,
 * column 3 (pp. 111–112), re-parsed from references/itc/vol-d-table-1.5.2.3.md and written with
 * combining characters by this test's own reading of the transcription's notation (`_` underline,
 * `-` overbar, `.` centred dot). The grey groups, which ITC does not print, follow symcrys's rule
 * (the class's symbol and an underlined 1).
 */

import { describe, expect, it } from 'vitest';
import * as classes from '../index.js';
import * as magnetic from '../magnetic.js';
import { readReference, tableRows } from '../testUtils/references.js';
import { shubnikovSymbol } from './shubnikov.js';

const rows = tableRows(readReference('itc/vol-d-table-1.5.2.3.md')).slice(1);

/** The transcription's notation as print shows it: underline U+0332, overbar U+0305, centred dot. */
const asPrinted = (t: string) =>
  t
    .replace(/(_?)(-?)([0-9m])/g, (_, u: string, o: string, c: string) => c + (u ? '\u0332' : '') + (o ? '\u0305' : ''))
    .replace(/\./g, '\u00b7');

const keyOf = (short: string) => magnetic.findPointGroup(short)!.key;

describe('ITC Vol. D Table 1.5.2.3: Shubnikov symbols', () => {
  it('90 printed groups, each found by its short symbol', () => {
    expect(rows).toHaveLength(90);
    expect(new Set(rows.map((r) => keyOf(r[3]))).size).toBe(90);
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

  it('the rule gives the printed symbol from the operations of every setting, not only the default', () => {
    // symbol() computes from the default setting; the rule itself must not depend on the orientation.
    for (const r of rows) {
      const key = keyOf(r[3]);
      for (const s of magnetic.settings(key)) {
        const ops = magnetic
          .operations(key, { setting: s.index })
          .map((op) => ({ cartesian: op.cartesian, timeReversal: op.timeReversal === true }));
        expect(shubnikovSymbol(ops), `${r[3]} setting ${s.index}`).toBe(r[2]);
      }
    }
  });

  it('every symbol is in Unicode normal form (the low line before the overbar), so normalizing keeps it', () => {
    for (const key of magnetic.POINT_GROUP_KEYS) {
      const s = magnetic.symbol(key, { form: 'shubnikov' });
      expect(s.normalize('NFC'), key).toBe(s);
      expect(s.normalize('NFD'), key).toBe(s);
    }
  });

  it('the crystallographic API gives the 32 classes the symbols of their rows (type I)', () => {
    for (const key of classes.POINT_GROUP_KEYS) {
      expect(classes.symbol(key, { form: 'shubnikov' }), key).toBe(magnetic.symbol(key, { form: 'shubnikov' }));
    }
    expect(classes.symbol('m-3m', { form: 'shubnikov' })).toBe('6̅/4');
  });

  it('a grey group (not printed by ITC): as Shubnikov & Belov (1964, pp. 113–114) write it, the class, · and 1̲', () => {
    const rows = tableRows(readReference('shubnikov-belov/neutral-groups.md')).slice(1);
    expect(rows).toHaveLength(2);
    for (const [polar, neutral] of rows) {
      const [, symbol, international] = /^(\S+) \[(.+)\]$/.exec(neutral)!;
      const key = keyOf(international);
      expect(magnetic.symbol(key, { form: 'shubnikov' }), neutral).toBe(asPrinted(symbol));
      expect(asPrinted(symbol).startsWith(asPrinted(polar.split(' ')[0]))).toBe(true);
    }
    // The rule for every grey group: the symbol of the polar group (its class), ·, 1̲.
    for (const key of classes.POINT_GROUP_KEYS) {
      const grey = magnetic.POINT_GROUP_KEYS.find((k) => k === `${key}1'`)!;
      expect(magnetic.symbol(grey, { form: 'shubnikov' })).toBe(
        `${magnetic.symbol(key, { form: 'shubnikov' })}\u00b71\u0332`,
      );
    }
  });

  it('findPointGroup refuses a symbol with characters only Shubnikov writes (underline, :, ·)', () => {
    for (const s of ['2\u22C5m', '3\u22192']) expect(() => magnetic.findPointGroup(s), s).toThrow(/Shubnikov/);
    for (const key of ["2'/m'", '2/m', "6'/m'mm'"] as const) {
      const s = magnetic.symbol(key, { form: 'shubnikov' });
      expect(() => magnetic.findPointGroup(s), s).toThrow(/Shubnikov/);
      expect(() => classes.findPointGroup(s), s).toThrow(/Shubnikov/);
    }
  });
});
