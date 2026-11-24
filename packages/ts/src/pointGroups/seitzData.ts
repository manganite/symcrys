/**
 * The linear parts of ITA's Seitz symbols for the point operations (ITA 6th ed. 2016, § 1.4.2.2,
 * Tables 1.4.2.1–1.4.2.3, p. 52; transcribed in references/itc/vol-a-2016-tables-1.4.2-seitz.md):
 * for each matrix W, as its coordinate triplet, the characteristic direction of its Seitz symbol
 * (the axis of a rotation or rotoinversion, the normal of a reflection) and the sense of a rotation
 * of order 3 or more. The axis of an operation in `describeOperations` takes this direction, with
 * its sign ("Pure ITC", #114; docs/conventions.md, "Symmetry directions and elements"). Table
 * 1.4.2.1 serves the cubic, tetragonal, orthorhombic, monoclinic and triclinic systems, 1.4.2.2 the
 * hexagonal family in hexagonal axes, 1.4.2.3 rhombohedral axes.
 */

import type { IntMat3 } from './itaOrder.js';

/** A coordinate triplet, the direction [uvw] of its Seitz symbol (none for 1 and -1), its sense (n ≥ 3). */
type SeitzRow = readonly [string, readonly [number, number, number] | null, '+' | '-' | null];

/** ITA Table 1.4.2.1. No. 32 read with the overbar the type gives it (erratum in the transcription). */
const SEITZ_TABLE_1_4_2_1: readonly SeitzRow[] = [
  ['x,y,z', null, null], // 1: 1
  ['-x,-y,z', [0, 0, 1], null], // 2: 2_{001}
  ['-x,y,-z', [0, 1, 0], null], // 3: 2_{010}
  ['x,-y,-z', [1, 0, 0], null], // 4: 2_{100}
  ['z,x,y', [1, 1, 1], '+'], // 5: 3^+_{111}
  ['z,-x,-y', [-1, 1, -1], '+'], // 6: 3^+_{-11-1}
  ['-z,-x,y', [1, -1, -1], '+'], // 7: 3^+_{1-1-1}
  ['-z,x,-y', [-1, -1, 1], '+'], // 8: 3^+_{-1-11}
  ['y,z,x', [1, 1, 1], '-'], // 9: 3^-_{111}
  ['-y,z,-x', [1, -1, -1], '-'], // 10: 3^-_{1-1-1}
  ['y,-z,-x', [-1, -1, 1], '-'], // 11: 3^-_{-1-11}
  ['-y,-z,x', [-1, 1, -1], '-'], // 12: 3^-_{-11-1}
  ['y,x,-z', [1, 1, 0], null], // 13: 2_{110}
  ['-y,-x,-z', [1, -1, 0], null], // 14: 2_{1-10}
  ['y,-x,z', [0, 0, 1], '-'], // 15: 4^-_{001}
  ['-y,x,z', [0, 0, 1], '+'], // 16: 4^+_{001}
  ['x,z,-y', [1, 0, 0], '-'], // 17: 4^-_{100}
  ['-x,z,y', [0, 1, 1], null], // 18: 2_{011}
  ['-x,-z,-y', [0, 1, -1], null], // 19: 2_{01-1}
  ['x,-z,y', [1, 0, 0], '+'], // 20: 4^+_{100}
  ['z,y,-x', [0, 1, 0], '+'], // 21: 4^+_{010}
  ['z,-y,x', [1, 0, 1], null], // 22: 2_{101}
  ['-z,y,x', [0, 1, 0], '-'], // 23: 4^-_{010}
  ['-z,-y,-x', [-1, 0, 1], null], // 24: 2_{-101}
  ['-x,-y,-z', null, null], // 25: -1
  ['x,y,-z', [0, 0, 1], null], // 26: m_{001}
  ['x,-y,z', [0, 1, 0], null], // 27: m_{010}
  ['-x,y,z', [1, 0, 0], null], // 28: m_{100}
  ['-z,-x,-y', [1, 1, 1], '+'], // 29: -3^+_{111}
  ['-z,x,y', [-1, 1, -1], '+'], // 30: -3^+_{-11-1}
  ['z,x,-y', [1, -1, -1], '+'], // 31: -3^+_{1-1-1}
  ['z,-x,y', [-1, -1, 1], '+'], // 32: -3^+_{-1-11}
  ['-y,-z,-x', [1, 1, 1], '-'], // 33: -3^-_{111}
  ['y,-z,x', [1, -1, -1], '-'], // 34: -3^-_{1-1-1}
  ['-y,z,x', [-1, -1, 1], '-'], // 35: -3^-_{-1-11}
  ['y,z,-x', [-1, 1, -1], '-'], // 36: -3^-_{-11-1}
  ['-y,-x,z', [1, 1, 0], null], // 37: m_{110}
  ['y,x,z', [1, -1, 0], null], // 38: m_{1-10}
  ['-y,x,-z', [0, 0, 1], '-'], // 39: -4^-_{001}
  ['y,-x,-z', [0, 0, 1], '+'], // 40: -4^+_{001}
  ['-x,-z,y', [1, 0, 0], '-'], // 41: -4^-_{100}
  ['x,-z,-y', [0, 1, 1], null], // 42: m_{011}
  ['x,z,y', [0, 1, -1], null], // 43: m_{01-1}
  ['-x,z,-y', [1, 0, 0], '+'], // 44: -4^+_{100}
  ['-z,-y,x', [0, 1, 0], '+'], // 45: -4^+_{010}
  ['-z,y,-x', [1, 0, 1], null], // 46: m_{101}
  ['z,-y,-x', [0, 1, 0], '-'], // 47: -4^-_{010}
  ['z,y,x', [-1, 0, 1], null], // 48: m_{-101}
];

/** ITA Table 1.4.2.2. */
const SEITZ_TABLE_1_4_2_2: readonly SeitzRow[] = [
  ['x,y,z', null, null], // 1: 1
  ['-y,x-y,z', [0, 0, 1], '+'], // 2: 3^+_{001}
  ['-x+y,-x,z', [0, 0, 1], '-'], // 3: 3^-_{001}
  ['-x,-y,z', [0, 0, 1], null], // 4: 2_{001}
  ['y,-x+y,z', [0, 0, 1], '-'], // 5: 6^-_{001}
  ['x-y,x,z', [0, 0, 1], '+'], // 6: 6^+_{001}
  ['y,x,-z', [1, 1, 0], null], // 7: 2_{110}
  ['x-y,-y,-z', [1, 0, 0], null], // 8: 2_{100}
  ['-x,-x+y,-z', [0, 1, 0], null], // 9: 2_{010}
  ['-y,-x,-z', [1, -1, 0], null], // 10: 2_{1-10}
  ['-x+y,y,-z', [1, 2, 0], null], // 11: 2_{120}
  ['x,x-y,-z', [2, 1, 0], null], // 12: 2_{210}
  ['-x,-y,-z', null, null], // 13: -1
  ['y,-x+y,-z', [0, 0, 1], '+'], // 14: -3^+_{001}
  ['x-y,x,-z', [0, 0, 1], '-'], // 15: -3^-_{001}
  ['x,y,-z', [0, 0, 1], null], // 16: m_{001}
  ['-y,x-y,-z', [0, 0, 1], '-'], // 17: -6^-_{001}
  ['-x+y,-x,-z', [0, 0, 1], '+'], // 18: -6^+_{001}
  ['-y,-x,z', [1, 1, 0], null], // 19: m_{110}
  ['-x+y,y,z', [1, 0, 0], null], // 20: m_{100}
  ['x,x-y,z', [0, 1, 0], null], // 21: m_{010}
  ['y,x,z', [1, -1, 0], null], // 22: m_{1-10}
  ['x-y,-y,z', [1, 2, 0], null], // 23: m_{120}
  ['-x,-x+y,z', [2, 1, 0], null], // 24: m_{210}
];

/** ITA Table 1.4.2.3. */
const SEITZ_TABLE_1_4_2_3: readonly SeitzRow[] = [
  ['x,y,z', null, null], // 1: 1
  ['z,x,y', [1, 1, 1], '+'], // 2: 3^+_{111}
  ['y,z,x', [1, 1, 1], '-'], // 3: 3^-_{111}
  ['-z,-y,-x', [-1, 0, 1], null], // 4: 2_{-101}
  ['-y,-x,-z', [1, -1, 0], null], // 5: 2_{1-10}
  ['-x,-z,-y', [0, 1, -1], null], // 6: 2_{01-1}
  ['-x,-y,-z', null, null], // 7: -1
  ['-z,-x,-y', [1, 1, 1], '+'], // 8: -3^+_{111}
  ['-y,-z,-x', [1, 1, 1], '-'], // 9: -3^-_{111}
  ['z,y,x', [-1, 0, 1], null], // 10: m_{-101}
  ['y,x,z', [1, -1, 0], null], // 11: m_{1-10}
  ['x,z,y', [0, 1, -1], null], // 12: m_{01-1}
];

/** A printed coordinate triplet (integer coefficients 0 or ±1, e.g. `-x+y,y,z`) as the matrix W. */
export function tripletMatrix(triplet: string): IntMat3 {
  const rows = triplet.split(',').map((part) => {
    const row: [number, number, number] = [0, 0, 0];
    const terms = part.match(/[+-]?[xyz]/g) ?? [];
    if (terms.join('').replace(/^\+/, '') !== part.replace(/^\+/, '')) throw new Error(`Unreadable triplet ${triplet}`);
    for (const t of terms) row['xyz'.indexOf(t[t.length - 1])] += t.startsWith('-') ? -1 : 1;
    return row;
  });
  if (rows.length !== 3) throw new Error(`Unreadable triplet ${triplet}`);
  return [rows[0], rows[1], rows[2]];
}

/** The tables by the axes of the setting. */
export type SeitzTable = 'cubic' | 'hexagonal' | 'rhombohedral';

const TABLES: Readonly<Record<SeitzTable, readonly SeitzRow[]>> = {
  cubic: SEITZ_TABLE_1_4_2_1,
  hexagonal: SEITZ_TABLE_1_4_2_2,
  rhombohedral: SEITZ_TABLE_1_4_2_3,
};

const parsed = new Map<SeitzTable, readonly { w: IntMat3; axis: SeitzRow[1]; sense: SeitzRow[2] }[]>();

/**
 * The Seitz direction and sense of the matrix W in a table, or undefined if the table has no such W.
 */
export function seitzOf(
  table: SeitzTable,
  w: IntMat3,
): { readonly axis: SeitzRow[1]; readonly sense: SeitzRow[2] } | undefined {
  let rows = parsed.get(table);
  if (!rows) {
    rows = TABLES[table].map(([t, axis, sense]) => ({ w: tripletMatrix(t), axis, sense }));
    parsed.set(table, rows);
  }
  return rows.find((r) => r.w.every((row, i) => row.every((v, j) => v === w[i][j])));
}

/** The rows of a table, for the tests. */
export function seitzRows(table: SeitzTable): readonly SeitzRow[] {
  return TABLES[table];
}
