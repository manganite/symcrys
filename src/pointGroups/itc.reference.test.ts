/**
 * ITC convention against its print sources (fixture class (b), calibrated against (a)).
 *
 * The expected ITC operations of every setting are derived independently of the library: the ITC
 * symbols of the setting (itcSettings.fixtures.ts, each printed row checked against the re-parsed
 * tables) are read position by position along the symmetry directions of ITA Table 2.1.3.1
 * (references/itc/vol-a-table-2.1.3.1.md), converted to Cartesian with the frame decided on #6
 * (x ∥ a, z ∥ c, y = z × x; typed here from the decision, not imported), and closed with the
 * independent algebra of testUtils. The library's symbols must equal the fixture's.
 */

import { describe, expect, it } from 'vitest';
import { hmTokens, groupOfSymbol } from '../testUtils/hermannMauguin.js';
import { mul, sameGroup, type M } from '../testUtils/independentGroups.js';
import { expectHeader, readReference, tableRows } from '../testUtils/references.js';
import { ITC_SETTINGS, type ItcSettingFixture, type Source } from './itcSettings.fixtures.js';
import { POINT_GROUP_KEYS, findPointGroup, operations, settings, type PointGroupKey } from './pointGroups.js';

// --- Lattice bases (the #6 decision, typed independently of src/lattice.ts) -------------------------

const ORTHONORMAL: M = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];
/** Columns a, b, c: a = x, b at 120° from a in the xy plane, c = z. */
const HEXAGONAL: M = [
  [1, -1 / 2, 0],
  [0, Math.sqrt(3) / 2, 0],
  [0, 0, 1],
];

// --- ITA Table 2.1.3.1 ------------------------------------------------------------------------------

const directionRows = tableRows(readReference('itc/vol-a-table-2.1.3.1.md'));
expectHeader(directionRows, ['Lattice', 'Primary', 'Secondary', 'Tertiary']);

/** First direction [uvw] in a cell, or undefined for an empty cell or "None". */
function firstDirection(cell: string): number[] | undefined {
  const m = /\[([-\d]+)\]/.exec(cell);
  if (!m) return undefined;
  return [...m[1].matchAll(/-?\d/g)].map((d) => Number(d[0]));
}

function latticeRow(name: string): string[] {
  const row = directionRows.find((r) => r[0] === name);
  if (!row) throw new Error(`Lattice ${name} not in Table 2.1.3.1`);
  return row;
}

/** Representative directions of the symbol positions, in lattice coordinates. */
function positions(lattice: string): number[][] {
  return latticeRow(lattice)
    .slice(1)
    .map(firstDirection)
    .filter((d): d is number[] => d !== undefined);
}

function monoclinicAxis(axis: 'b' | 'c'): number[] {
  const m = new RegExp(`(\\[[-\\d]+\\]) \\(unique axis ${axis}\\)`).exec(latticeRow('Monoclinic (a)')[1]);
  if (!m) throw new Error(`No unique axis ${axis} in Table 2.1.3.1`);
  return firstDirection(m[1])!;
}

const toCartesian = (basis: M, d: number[]): number[] =>
  mul(
    basis,
    d.map((v) => [v]),
  ).map((r) => r[0]);

/**
 * Cartesian directions of the symbol positions for a crystal system (ITA Table 2.1.3.1); a
 * monoclinic short symbol has the unique axis as its only position, a monoclinic full symbol the
 * three axes a, b, c (ITA 5th ed. § 2.2.4.1 (ii)).
 */
function directions(system: string, hm: string, uniqueAxis?: 'a' | 'b' | 'c'): number[][] {
  if (system === 'triclinic') return [[0, 0, 1]]; // only 1 or -1, which need no direction
  if (system === 'monoclinic' && hmTokens(hm).length === 1) return [monoclinicAxis(uniqueAxis as 'b' | 'c')];
  if (system === 'monoclinic' || system === 'orthorhombic') return positions('Orthorhombic');
  if (system === 'tetragonal') return positions('Tetragonal');
  if (system === 'trigonal' || system === 'hexagonal')
    return positions('Hexagonal').map((d) => toCartesian(HEXAGONAL, d));
  return positions('Cubic').map((d) => toCartesian(ORTHONORMAL, d));
}

// --- Print rows behind the fixture --------------------------------------------------------------

const rows2111 = tableRows(readReference('itc/vol-a-table-2.1.1.1.md'));
if (rows2111[0][3] !== 'Crystallographic point groups') throw new Error('Table 2.1.1.1 header changed');

/** Class symbols of ITA Table 2.1.1.1, without the box markers. */
const TABLE_2111 = rows2111
  .slice(1)
  .flatMap((r) => r[3].split(','))
  .map((s) => s.replace(/\((L|H)\)/, '').trim())
  .filter((s) => s !== '');

/** The crystal system of a key, from ITA Table 2.1.1.1 (D3h is printed there as -62m, #17). */
function crystalSystemOf(key: PointGroupKey): string {
  let system = '';
  for (const r of rows2111.slice(1)) {
    if (r[2]) system = r[2].toLowerCase();
    const symbols = r[3].split(',').map((s) => s.replace(/\((L|H)\)/, '').trim());
    if (symbols.includes(key) || (key === '-6m2' && symbols.includes('-62m'))) return system;
  }
  throw new Error(`No crystal system for ${key} in Table 2.1.1.1`);
}

/** Class column of Table 3.2.2.2 as `symbol|axis` (axis only in the monoclinic rows; rhombohedral rows left out). */
const TABLE_3222: string[] = (() => {
  const rows = tableRows(readReference('itc/table-3.2.2.2.md'));
  expectHeader(rows, ['System', 'Class', 'Polar (symmetry) axes', 'Nonpolar directions']);
  let system = '';
  const out: string[] = [];
  for (const r of rows.slice(1)) {
    if (r[0]) system = r[0];
    if (system.startsWith('Trigonal (rhombohedral axes)')) continue;
    out.push(`${r[1]}|${/unique (b|c)/.exec(system)?.[1] ?? ''}`);
  }
  return out;
})();

const MONOCLINIC_SHORT = new Set(['2', 'm', '2/m']);
const id3222 = (symbol: string, axis?: string) =>
  `${hmTokens(symbol).join('')}|${MONOCLINIC_SHORT.has(symbol) ? (axis ?? '') : ''}`;

function printedIn(source: Source, symbol: string, axis?: string): boolean {
  if (source === 'table-3.2.2.2') return TABLE_3222.includes(id3222(symbol, axis));
  if (source === 'vol-a-table-2.1.1.1') return TABLE_2111.includes(symbol);
  throw new Error(`No transcription for ${source}`);
}

const FIXTURE: [PointGroupKey, ItcSettingFixture][] = Object.entries(ITC_SETTINGS).flatMap(([k, list]) =>
  list.map((f): [PointGroupKey, ItcSettingFixture] => [k as PointGroupKey, f]),
);

describe('ITC settings fixture against print', () => {
  it('has exactly the 32 keys', () => {
    expect(Object.keys(ITC_SETTINGS).sort()).toEqual([...POINT_GROUP_KEYS].sort());
  });

  it('every symbol sourced to a transcribed table is printed there', () => {
    for (const [, f] of FIXTURE) {
      for (const [source, symbol] of [
        [f.shortSource, f.short],
        [f.fullSource, f.full],
      ] as const) {
        if (source === 'table-3.2.2.2' || source === 'vol-a-table-2.1.1.1') {
          expect(printedIn(source, symbol, f.uniqueAxis), `${symbol} in ${source}`).toBe(true);
        }
      }
    }
  });

  it('every class of Table 3.2.2.2 is in the fixture', () => {
    const all = FIXTURE.map(([, f]) => id3222(f.short, f.uniqueAxis));
    for (const p of TABLE_3222) expect(all).toContain(p);
  });

  it('Table 2.1.1.1 lists the 32 keys, except that it prints D3h as -62m (#17)', () => {
    expect(TABLE_2111).toHaveLength(32);
    expect(TABLE_2111.map((s) => (s === '-62m' ? '-6m2' : s)).sort()).toEqual([...POINT_GROUP_KEYS].sort());
  });
});

describe('ITC symbols and operations of every setting', () => {
  for (const key of POINT_GROUP_KEYS) {
    describe(key, () => {
      const expected = ITC_SETTINGS[key];
      const actual = settings(key, 'itc');
      const system = crystalSystemOf(key);

      it('settings match the fixture one to one, with the standard setting as default', () => {
        expect(actual).toHaveLength(expected.length);
        for (const e of expected) {
          const match = actual.filter((s) => s.symbol === e.short && s.uniqueAxis === e.uniqueAxis);
          expect(match).toHaveLength(1);
          expect(match[0].isDefault).toBe(e.standard);
        }
      });

      for (const e of expected) {
        const label = `${e.short}${e.uniqueAxis ? ` (axis ${e.uniqueAxis})` : ''}`;
        const setting = () => actual.find((x) => x.symbol === e.short && x.uniqueAxis === e.uniqueAxis)!;

        it(`${label}: full symbol as in the fixture (${e.fullSource})`, () => {
          expect(hmTokens(setting().fullSymbol)).toEqual(hmTokens(e.full));
        });

        it(`${label}: operations = group of the short symbol along the ITA symmetry directions`, () => {
          const ops = operations(key, { convention: 'itc', setting: setting().index });
          expect(sameGroup(groupOfSymbol(e.short, directions(system, e.short, e.uniqueAxis)), ops)).toBe(true);
        });

        it(`${label}: operations = group of the full symbol along the ITA symmetry directions`, () => {
          const ops = operations(key, { convention: 'itc', setting: setting().index });
          expect(sameGroup(groupOfSymbol(e.full, directions(system, e.full, e.uniqueAxis)), ops)).toBe(true);
        });

        it(`${label}: findPointGroup finds this setting by its full symbol`, () => {
          expect(findPointGroup(setting().fullSymbol, 'itc')).toEqual({ key, setting: setting().index });
        });
      }
    });
  }
});
