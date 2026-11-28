/**
 * The symmetry directions of the library against ITA Table 2.1.3.1 (fixture class (a)): every
 * direction of every cell, in the printed order and with the printed sign.
 */

import { describe, expect, it } from 'vitest';
import { expectHeader, readReference, tableRows } from './testUtils/references.js';
import { LATTICE_SYMMETRY_DIRECTIONS } from './symmetryDirections.js';
import { classData, settingSymmetryDirections } from './pointGroups/classData.js';

const rows = tableRows(readReference('itc/vol-a-table-2.1.3.1.md'));
expectHeader(rows, ['Lattice', 'Primary', 'Secondary', 'Tertiary']);

/** All directions [uvw] of a cell, in printed order. */
function cellDirections(cell: string): number[][] {
  return [...cell.matchAll(/\[([-\d]+)\]/g)].map((m) => [...m[1].matchAll(/-?\d/g)].map((d) => Number(d[0])));
}

function row(name: string): number[][][] {
  const r = rows.find((x) => x[0] === name);
  if (!r) throw new Error(`Lattice ${name} not in Table 2.1.3.1`);
  return r
    .slice(1)
    .map(cellDirections)
    .filter((d) => d.length > 0);
}

const plain = (dirs: readonly (readonly (readonly number[])[])[]): number[][][] =>
  dirs.map((p) => p.map((d) => [...d]));

describe('LATTICE_SYMMETRY_DIRECTIONS (ITA Table 2.1.3.1)', () => {
  it.each([
    ['orthorhombic', 'Orthorhombic'],
    ['tetragonal', 'Tetragonal'],
    ['hexagonal', 'Hexagonal'],
    ['cubic', 'Cubic'],
  ] as const)('%s: the row %s, position by position', (family, lattice) => {
    expect(plain(LATTICE_SYMMETRY_DIRECTIONS[family])).toEqual(row(lattice));
  });

  it('monoclinic: the axes a, b, c of the full symbol, the two unique axes among them', () => {
    // The full symbol reads along a, b, c (ITA 6th ed. § 2.1.3.15, p. 171), as orthorhombic.
    expect(plain(LATTICE_SYMMETRY_DIRECTIONS.monoclinic)).toEqual(row('Orthorhombic'));
    const unique = row('Monoclinic (a)').flat();
    expect(unique).toEqual([
      [0, 1, 0],
      [0, 0, 1],
    ]);
    for (const d of unique) expect(LATTICE_SYMMETRY_DIRECTIONS.monoclinic.flat()).toContainEqual(d);
  });

  it('rhombohedral axes: the row Rhombohedral (rhombohedral axes), computed from the hexagonal directions', () => {
    for (const key of ['3', '-3', '32', '3m', '-3m'] as const) {
      for (const s of classData(key).settings.filter((x) => x.axes === 'rhombohedral')) {
        expect(plain(settingSymmetryDirections(key, s.index)), key).toEqual(row('Rhombohedral (rhombohedral axes)'));
      }
    }
    // With hexagonal axes the rhombohedral lattice has the first two positions of the hexagonal one.
    expect(plain(LATTICE_SYMMETRY_DIRECTIONS.hexagonal).slice(0, 2)).toEqual(row('Rhombohedral (hexagonal axes)'));
  });

  it('triclinic: none', () => {
    expect(row('Triclinic')).toEqual([]);
    expect(LATTICE_SYMMETRY_DIRECTIONS.triclinic).toEqual([]);
  });

  it('is frozen', () => {
    expect(Object.isFrozen(LATTICE_SYMMETRY_DIRECTIONS.cubic[1][0])).toBe(true);
  });
});
