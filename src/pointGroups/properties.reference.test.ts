/**
 * Operation-based properties against print (fixture class (a)): ITA Table 2.1.1.1 (Laue groups
 * marked by boxes) and ITC Table 3.2.2.1 (Laue class, pyroelectricity, enantiomorphism of the 21
 * noncentrosymmetric classes), re-parsed from references/itc/.
 */

import { describe, expect, it } from 'vitest';
import { expectHeader, readReference, tableRows } from '../testUtils/references.js';
import { POINT_GROUP_KEYS, isPointGroupKey, type PointGroupKey } from './pointGroups.js';
import { isCentrosymmetric, isChiral, isPolar, laueClass } from './properties.js';

/** ITA Table 2.1.1.1 prints D3h as -62m; the key is -6m2 (docs/conventions.md, "Keys"). */
const keyOf = (printed: string): PointGroupKey => {
  const key = printed === '-62m' ? '-6m2' : printed;
  if (!isPointGroupKey(key)) throw new Error(`Not a key: ${printed}`);
  return key;
};

// --- Table 2.1.1.1: Laue groups ------------------------------------------------------------------

const rows2111 = tableRows(readReference('itc/vol-a-table-2.1.1.1.md'));
if (rows2111[0][3] !== 'Crystallographic point groups') throw new Error('Table 2.1.1.1 header changed');
const LAUE_GROUPS = new Set<PointGroupKey>(
  rows2111
    .slice(1)
    .flatMap((r) => r[3].split(','))
    .map((s) => s.trim())
    .filter((s) => /\((L|H)\)$/.test(s))
    .map((s) => keyOf(s.replace(/\s*\((L|H)\)$/, ''))),
);

// --- Table 3.2.2.1 --------------------------------------------------------------------------------

const rows3221 = tableRows(readReference('itc/table-3.2.2.1.md'));
expectHeader(rows3221, [
  'System',
  'Laue class',
  'Group',
  'Rank-1 (pyroelectricity)',
  'Rank-3 (piezo/SHG)',
  'Enantiomorphism',
  'Axial rank-2 (optical activity)',
]);

/**
 * The Laue class column prints full symbols; the trigonal one in the form without the trailing 1
 * (`-32/m`). Each maps to the key of that Laue class.
 */
const LAUE_KEY: Record<string, PointGroupKey> = {
  '-1': '-1',
  '2/m': '2/m',
  '2/m2/m2/m': 'mmm',
  '4/m': '4/m',
  '4/m2/m2/m': '4/mmm',
  '-3': '-3',
  '-32/m': '-3m',
  '6/m': '6/m',
  '6/m2/m2/m': '6/mmm',
  '2/m-3': 'm-3',
  '4/m-32/m': 'm-3m',
};

interface Row3221 {
  key: PointGroupKey;
  laue: PointGroupKey;
  pyroelectric: boolean;
  enantiomorphic: boolean;
}

const TABLE3221: Row3221[] = [];
{
  let laue = '';
  for (const r of rows3221.slice(1)) {
    if (r[1]) laue = r[1];
    if (!isPointGroupKey(r[2]) && r[2] !== '-62m') continue; // icosahedral and spherical rows
    const laueKey = LAUE_KEY[laue];
    if (!laueKey) throw new Error(`Unknown Laue class ${laue}`);
    TABLE3221.push({
      key: keyOf(r[2]),
      laue: laueKey,
      pyroelectric: r[3].startsWith('+'),
      enantiomorphic: r[5] === '+',
    });
  }
}

describe('ITA Table 2.1.1.1: centrosymmetric classes are the 11 Laue groups', () => {
  it('marks 11 classes', () => expect(LAUE_GROUPS.size).toBe(11));

  for (const key of POINT_GROUP_KEYS) {
    it(`${key}: centrosymmetric = ${LAUE_GROUPS.has(key)}`, () => {
      expect(isCentrosymmetric(key)).toBe(LAUE_GROUPS.has(key));
    });
  }
});

describe('ITC Table 3.2.2.1: the 21 noncentrosymmetric classes', () => {
  it('lists 21 classes with the printed totals: 10 pyroelectric, 11 enantiomorphic', () => {
    expect(TABLE3221).toHaveLength(21);
    expect(new Set(TABLE3221.map((r) => r.key)).size).toBe(21);
    expect(TABLE3221.filter((r) => r.pyroelectric)).toHaveLength(10);
    expect(TABLE3221.filter((r) => r.enantiomorphic)).toHaveLength(11);
  });

  it('together with the 11 Laue groups covers all 32 classes', () => {
    expect([...TABLE3221.map((r) => r.key), ...LAUE_GROUPS].sort()).toEqual([...POINT_GROUP_KEYS].sort());
  });

  for (const row of TABLE3221) {
    it(`${row.key}: polar ${row.pyroelectric}, chiral ${row.enantiomorphic}, Laue class ${row.laue}`, () => {
      expect(isCentrosymmetric(row.key)).toBe(false);
      expect(isPolar(row.key)).toBe(row.pyroelectric);
      expect(isChiral(row.key)).toBe(row.enantiomorphic);
      expect(laueClass(row.key)).toBe(row.laue);
    });
  }

  for (const key of LAUE_GROUPS) {
    it(`${key} (Laue group): its own Laue class, neither polar nor chiral`, () => {
      expect(laueClass(key)).toBe(key);
      expect(isPolar(key)).toBe(false);
      expect(isChiral(key)).toBe(false);
    });
  }
});
