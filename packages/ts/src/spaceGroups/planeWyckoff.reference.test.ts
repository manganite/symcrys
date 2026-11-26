/**
 * The convention data of planeWyckoff.ts against print: the symmetry directions of the plane
 * lattices (ITA 2016 Table 2.1.3.1, p. 151, "Two dimensions") and the first representatives that
 * the rule does not give (each must differ from the rule, so that none is kept without need). The
 * positions themselves are compared with print in planeGroups.reference.test.ts.
 */

import { describe, expect, it } from 'vitest';
import * as plane from '../plane.js';
import { readReference, tableRows } from '../testUtils/references.js';
import { FIRST_REPRESENTATIVE_EXCEPTIONS } from './planeWyckoff.js';
import { PLANE_SYMMETRY_DIRECTIONS } from './planeSymmetryDirections.js';

const parseDirection = (s: string): number[] => {
  const digits = [...s.replace(/[[\]]/g, '').matchAll(/-?\d/g)].map((m) => Number(m[0]));
  return digits;
};

describe('the convention data of the plane Wyckoff positions', () => {
  it('has the symmetry directions of ITA Table 2.1.3.1 (two dimensions), set by set', () => {
    const rows = tableRows(readReference('itc/vol-a-table-2.1.3.1-plane.md')).slice(1);
    expect(rows.map((r) => r[0].toLowerCase())).toEqual(Object.keys(PLANE_SYMMETRY_DIRECTIONS));
    for (const [lattice, primary, ...sets] of rows) {
      expect(primary).toBe('Rotation point in plane');
      const printed = sets.filter((c) => c !== '').map((c) => c.replace(/[{}]/g, '').split(', ').map(parseDirection));
      expect(
        PLANE_SYMMETRY_DIRECTIONS[lattice.toLowerCase() as keyof typeof PLANE_SYMMETRY_DIRECTIONS],
        lattice,
      ).toEqual(printed);
    }
  });

  it('lists only first representatives that the rule does not give (lowest by y, then x, in (−1/2, 1/2])', () => {
    const centred = (v: number) => (v - Math.floor(v) > 0.5 ? v - Math.floor(v) - 1 : v - Math.floor(v));
    for (const [key, points] of Object.entries(FIRST_REPRESENTATIVE_EXCEPTIONS)) {
      for (const text of points) {
        const point = text
          .split(',')
          .map((c) => (c.includes('/') ? Number(c.split('/')[0]) / Number(c.split('/')[1]) : Number(c)));
        const orbit = plane.orbit(key as plane.PlaneGroupKey, { point }).map((e) => e.point);
        const byRule = [...orbit].sort((a, b) => centred(a[1]) - centred(b[1]) || centred(a[0]) - centred(b[0]))[0];
        expect(byRule, `${key} ${text}`).not.toEqual(point);
      }
    }
  });
});
