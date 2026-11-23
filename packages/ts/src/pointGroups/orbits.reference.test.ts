/**
 * Operations in the lattice basis and orbits against print (fixture class (a)): ITA (6th ed.)
 * Table 3.2.3.2, pp. 745–769.
 *
 * The lattice operations of every printed ITC setting must be, in order, the matrices of the printed
 * general position (vol-a-table-3.2.3.2-general-positions.md: the coordinate triplets are the rows
 * of W); the orbit of a lattice direction [uvw] must be the printed general position with x, y, z =
 * u, v, w; and for the 16 entries with hexagonal axes, where the lattice basis is not orthonormal,
 * the orbit of a face (hkl) must be the printed faces of the general form, in the order of the
 * general position (vol-a-table-3.2.3.2-general-faces.md; 6/m and 6mm print two rows of faces in
 * the other order, which the test reproduces).
 */

import { describe, expect, it } from 'vitest';
import { expectHeader, readReference, tableRows, sameAxes } from '../testUtils/references.js';
import { latticeOperations, orbit } from './orbits.js';
import { POINT_GROUP_KEYS, settings, type PointGroupKey } from './pointGroups.js';

const generalRows = tableRows(readReference('itc/vol-a-table-3.2.3.2-general-positions.md'));
expectHeader(generalRows, ['Short', 'Axes', 'Page', 'Multiplicity', 'General position']);
const faceRows = tableRows(readReference('itc/vol-a-table-3.2.3.2-general-faces.md'));
expectHeader(faceRows, ['Short', 'Axes', 'Page', 'Faces']);

/** One coordinate (`-x+y`, `2x`) as the coefficients of x, y, z. */
function coefficients(expr: string): number[] {
  const row = [0, 0, 0];
  const terms = expr.match(/[+-]?\d*[xyz]/g) ?? [];
  if (terms.join('').replace(/^\+/, '') !== expr) throw new Error(`Unreadable coordinate: ${expr}`);
  for (const t of terms) {
    const m = /^([+-]?)(\d*)([xyz])$/.exec(t);
    if (!m) throw new Error(`Unreadable term: ${t}`);
    row['xyz'.indexOf(m[3])] += (m[1] === '-' ? -1 : 1) * (m[2] === '' ? 1 : Number(m[2]));
  }
  return row;
}

/** The ITC setting of symcrys for a printed entry (same short symbol; same unique axis if monoclinic). */
function settingOf(short: string, axes: string): { key: PointGroupKey; setting: number } {
  const axis = /^unique axis (b|c)$/.exec(axes)?.[1];
  const found = POINT_GROUP_KEYS.flatMap((key) =>
    settings(key)
      .filter((s) => s.symbol === short && (axis === undefined || s.uniqueAxis === axis) && sameAxes(axes, s))
      .map((s) => ({ key, setting: s.index })),
  );
  if (found.length !== 1) throw new Error(`No unique setting for ${short} ${axes}`);
  return found[0];
}

describe('ITA Table 3.2.3.2: operations in the lattice basis', () => {
  it('covers the 45 printed entries', () => {
    expect(generalRows.length - 1).toBe(45);
  });

  for (const [short, axes, page, , general] of generalRows.slice(1)) {
    const label = `${short}${axes ? ` (${axes})` : ''}, p. ${page}`;
    const printed = general.split(/\s+/).map((t) => t.split(',').map(coefficients));

    it(`${label}: the lattice operations are the printed general position, in order`, () => {
      const { key, setting } = settingOf(short, axes);
      expect(latticeOperations(key, { setting }).map((op) => op.matrix)).toEqual(printed);
    });

    it(`${label}: the orbit of [321] is the printed general position at x, y, z = 3, 2, 1`, () => {
      const { key, setting } = settingOf(short, axes);
      const expected = printed.map((w) => w.map((row) => row[0] * 3 + row[1] * 2 + row[2]));
      expect(orbit(key, { uvw: [3, 2, 1] }, { setting }).map((e) => e.uvw)).toEqual(expected);
    });
  }
});

describe('ITA Table 3.2.3.2: faces of the general form, hexagonal and rhombohedral axes', () => {
  it('covers the 16 entries with hexagonal axes and the 5 with rhombohedral axes', () => {
    expect(faceRows.slice(1).filter((r) => r[1] === 'rhombohedral axes')).toHaveLength(5);
    expect(faceRows.length - 1).toBe(21);
  });

  const VALUE: Record<string, number> = { h: 3, k: 2, i: -5, l: 1 };
  for (const [short, axes, page, faces] of faceRows.slice(1)) {
    const rhombohedral = axes === 'rhombohedral axes';
    it(`${short}${rhombohedral ? ' (rhombohedral axes)' : ''}, p. ${page}: the orbit of (321) is the printed general form`, () => {
      const expected = faces.split(/\s+/).map((face) => {
        const v = face.split(',').map((c) => {
          const m = /^(-?)([hkil])$/.exec(c);
          if (!m) throw new Error(`Unreadable index: ${c}`);
          return (m[1] ? -1 : 1) * VALUE[m[2]];
        });
        if (rhombohedral) return v;
        expect(v[2], `i = -(h+k) in ${face}`).toBe(-(v[0] + v[1]));
        return [v[0], v[1], v[3]];
      });
      const { key, setting } = settingOf(short, axes);
      const computed = orbit(key, { hkl: [3, 2, 1] }, { setting }).map((e) => e.hkl);
      // 6/m and 6mm print their third and fourth rows of faces in the other order than the general
      // position; 32, 3m and -3m with rhombohedral axes print the row of the coset of the twofold
      // rotations or reflections shifted by one (references/itc/vol-a-table-3.2.3.2-general-faces.md,
      // "Order").
      let printedOrder = computed;
      if (['6/m', '6mm'].includes(short)) {
        printedOrder = [...computed.slice(0, 6), ...computed.slice(9), ...computed.slice(6, 9)];
      } else if (rhombohedral && ['32', '3m', '-3m'].includes(short)) {
        const shift = (row: number) => [computed[row + 1], computed[row + 2], computed[row]];
        printedOrder = [...computed.slice(0, 3), ...shift(3)];
        if (short === '-3m') printedOrder = [...printedOrder, ...computed.slice(6, 9), ...shift(9)];
      }
      expect(printedOrder).toEqual(expected);
    });
  }
});
