/**
 * Reading symbols (#96; docs/conventions.md, "Reading symbols"): every symbol `symbol()` writes is
 * read back, in both entry points, and the spellings of print and pasted text are read as the
 * symbols they are. The print anchors of the symbols themselves are in the *.reference.test.ts
 * files; here the round trip and the normalisation.
 */

import { describe, expect, it } from 'vitest';
import * as classes from '../index.js';
import * as magnetic from '../magnetic.js';
import { compactSymbol, normalizeSymbol } from '../notation.js';

describe('normalizeSymbol', () => {
  it('writes the overbar as -, the prime as an apostrophe, subscripts as plain characters, and one space', () => {
    expect(normalizeSymbol('m3̄m')).toBe('m-3m'); // combining overbar
    expect(normalizeSymbol('m3̅m')).toBe('m-3m'); // combining overline
    expect(normalizeSymbol('m−3m')).toBe('m-3m'); // minus sign
    expect(normalizeSymbol('mbar3m')).toBe('m-3m');
    expect(normalizeSymbol('m\\bar{3}m')).toBe('m-3m');
    expect(normalizeSymbol('m \\overline{3} m')).toBe('m -3 m');
    expect(normalizeSymbol('4′/mmm′')).toBe("4'/mmm'"); // prime
    expect(normalizeSymbol('4ʹ/mmmʹ')).toBe("4'/mmm'"); // modifier letter prime
    expect(normalizeSymbol('4’/mmm’')).toBe("4'/mmm'"); // right single quotation mark
    expect(normalizeSymbol('C₃ᵥ')).toBe('C3v');
    expect(normalizeSymbol('D₃d(S₆)')).toBe('D3d(S6)');
    expect(normalizeSymbol('  -3   2/m  1 ')).toBe('-3 2/m 1');
    expect(compactSymbol(' -3 2/m 1 ')).toBe('-32/m1');
  });
});

describe('findPointGroup reads every symbol symbol() writes', () => {
  // The setting a symbol gives back: a key, a Schoenflies symbol and a symbol several settings share
  // give the default; a full symbol written with spaces is read as a full symbol first.
  const roundTrip = (
    keys: readonly string[],
    settings: (key: never) => readonly { index: number; isDefault: boolean; symbol: string; fullSymbol: string }[],
    symbol: (key: never, options: object) => string,
    find: (hm: string) => { key: string; setting: number } | undefined,
  ) => {
    for (const key of keys) {
      const all = settings(key as never);
      const def = all.find((s) => s.isDefault)!.index;
      for (const s of all) {
        const short = symbol(key as never, { setting: s.index });
        const full = symbol(key as never, { setting: s.index, form: 'full' });
        const schoenflies = symbol(key as never, { setting: s.index, form: 'schoenflies' });
        const shortShared = short === key || all.filter((t) => t.symbol === short).length > 1;
        const fullShared = full.includes(' ')
          ? all.filter((t) => t.fullSymbol === full).length > 1
          : full === key || all.filter((t) => compactSymbol(t.fullSymbol) === full).length > 1;
        expect(find(short), `${key} ${short}`).toEqual({ key, setting: shortShared ? def : s.index });
        expect(find(full), `${key} ${full}`).toEqual({ key, setting: fullShared ? def : s.index });
        expect(find(schoenflies), `${key} ${schoenflies}`).toEqual({ key, setting: def });
      }
    }
  };

  it('in the crystallographic API (ITA symbols, C3i)', () => {
    roundTrip(classes.POINT_GROUP_KEYS, classes.settings as never, classes.symbol as never, classes.findPointGroup);
  });

  it('in the magnetic API (ITC Vol. D symbols, S6)', () => {
    roundTrip(magnetic.POINT_GROUP_KEYS, magnetic.settings as never, magnetic.symbol as never, magnetic.findPointGroup);
  });

  it('the Schoenflies symbols of the 122 groups are all different, in either volume', () => {
    const symbols = magnetic.POINT_GROUP_KEYS.map((k) => magnetic.symbol(k, { form: 'schoenflies' }));
    expect(new Set(symbols).size).toBe(122);
  });
});

describe('findPointGroup reads the spellings of print and pasted text', () => {
  it('overbars, primes and Schoenflies subscripts', () => {
    for (const hm of ['m3̄m', 'm−3m', 'mbar3m', 'm\\bar{3}m', 'm-3m', ' m -3 m ', 'Oh', 'Oₕ']) {
      expect(classes.findPointGroup(hm), hm).toEqual({ key: 'm-3m', setting: 1 });
    }
    expect(classes.findPointGroup('C₃ᵥ')).toEqual({ key: '3m', setting: 1 });
    for (const hm of ['4′/mmm′', '4ʹ/mmmʹ', '4’/mmm’', "4'/m 2/m 2'/m'", 'D4h(D2h)']) {
      expect(magnetic.findPointGroup(hm), hm).toEqual({ key: "4'/mmm'", setting: 1 });
    }
    expect(magnetic.findPointGroup('D₃d(S₆)')).toEqual({ key: "-3m'", setting: 1 });
  });

  it('both Schoenflies symbols of -3 in both entry points, and the grey groups as GR', () => {
    for (const s of ['C3i', 'S6', 'S₆']) {
      expect(classes.findPointGroup(s), s).toEqual({ key: '-3', setting: 1 });
      expect(magnetic.findPointGroup(s), s).toEqual({ key: '-3', setting: 1 });
    }
    expect(magnetic.findPointGroup('D4R')).toEqual({ key: "4221'", setting: 1 });
    expect(magnetic.findPointGroup('C3iR')).toEqual({ key: "-31'", setting: 1 });
    expect(magnetic.findPointGroup('S6(C3)')).toEqual({ key: "-3'", setting: 1 });
    expect(magnetic.findPointGroup('C3i(C3)')).toEqual({ key: "-3'", setting: 1 });
  });

  it("Birss's cubic symbols without the overbar on the 3", () => {
    expect(classes.findPointGroup('m3')).toEqual({ key: 'm-3', setting: 1 });
    expect(classes.findPointGroup('m3m')).toEqual({ key: 'm-3m', setting: 1 });
    expect(magnetic.findPointGroup("m'3m")).toEqual({ key: "m'-3'm", setting: 1 });
    expect(magnetic.findPointGroup("m3m'")).toEqual({ key: "m-3m'", setting: 1 });
    expect(magnetic.findPointGroup("m3m1'")).toEqual({ key: "m-3m1'", setting: 1 });
  });

  it('a symbol with spaces is read as a full symbol first; without spaces the key gives the default (#96)', () => {
    expect(classes.findPointGroup('3 2')).toEqual({ key: '32', setting: 3 });
    expect(classes.findPointGroup('32')).toEqual({ key: '32', setting: 1 });
    expect(classes.findPointGroup('-3 2/m')).toEqual({ key: '-3m', setting: 3 });
    expect(magnetic.findPointGroup("3 2'")).toEqual({ key: "32'", setting: 3 });
    expect(magnetic.findPointGroup("32'")).toEqual({ key: "32'", setting: 1 });
  });

  it('the crystallographic API finds no magnetic group, in any spelling; unknown symbols give undefined', () => {
    for (const hm of ["4'/mmm'", '4′/mmm′', 'D4h(D2d)', 'D4R', "m'3m"]) {
      expect(classes.findPointGroup(hm), hm).toBeUndefined();
    }
    for (const hm of ['', '   ', 'm3m3', 'P4mm', 'C5v', 'bar', '\\bar{}']) {
      expect(classes.findPointGroup(hm), hm).toBeUndefined();
      expect(magnetic.findPointGroup(hm), hm).toBeUndefined();
    }
  });

  it('a setting is chosen by its symbol in any spelling', () => {
    expect(classes.operations('-6m2', { setting: '−6 2 m' })).toBe(classes.operations('-6m2', { setting: 2 }));
    expect(magnetic.operations("32'", { setting: '3 2′' })).toBe(magnetic.operations("32'", { setting: 3 }));
    expect(magnetic.operations("-3m'", { setting: '3̄ 1 2′/m′' })).toBe(magnetic.operations("-3m'", { setting: 2 }));
  });
});
