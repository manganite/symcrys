/**
 * The conversions between three- and four-index symbols of hexagonal axes against print (fixture
 * class (a)): Frank, Acta Cryst. 18, 862 (1965), Eqs. (19)–(22), p. 864, for the conventional
 * hexagonal cell of Eq. (18), re-parsed from references/frank/eqs-18-22.md. Frank's
 * correspondences hold up to a constant positive factor, so a symbol of the library, reduced to the
 * smallest integers, must be a positive multiple of the printed one, for every vector of a grid.
 */

import { describe, expect, it } from 'vitest';
import {
  directionFromFourIndices,
  directionToFourIndices,
  planeFromFourIndices,
  planeToFourIndices,
  type FourIndices,
  type Vec3,
} from './index.js';
import { expectHeader, readReference, tableRows } from './testUtils/references.js';

const rows = tableRows(readReference('frank/eqs-18-22.md'));
expectHeader(rows, ['Eq.', 'Kind', 'From', 'To']);
const EQUATIONS = new Map(rows.slice(1).map(([eq, kind, from, to]) => [eq, { kind, from, to }]));

/** The value of a printed linear expression such as `-s+2t` for the given letters. */
function evaluate(expression: string, values: Record<string, number>): number {
  const terms = expression.replace(/-/g, '+-').split('+').filter(Boolean);
  return terms.reduce((sum, term) => {
    const m = /^(-?)(\d*)([a-z])$/.exec(term);
    if (!m || !(m[3] in values)) throw new Error(`Frank: unreadable term ${term}`);
    return sum + (m[1] ? -1 : 1) * Number(m[2] || 1) * values[m[3]];
  }, 0);
}

/** The printed symbol that equation `eq` gives for `symbol`. */
function printed(eq: string, symbol: readonly number[]): number[] {
  const { from, to } = EQUATIONS.get(eq)!;
  const letters = from.split(' ');
  expect(symbol).toHaveLength(letters.length);
  const values = Object.fromEntries(letters.map((l, j) => [l, symbol[j]]));
  return to.split(';').map((e) => evaluate(e.trim(), values));
}

/** True if `a` is a positive multiple of `b`. */
function positiveMultiple(a: readonly number[], b: readonly number[]): boolean {
  if (a.length !== b.length) return false;
  const j = b.findIndex((x) => x !== 0);
  if (j < 0 || a[j] === 0 || Math.sign(a[j]) !== Math.sign(b[j])) return false;
  const f = a[j] / b[j];
  return a.every((x, k) => Math.abs(x - f * b[k]) < 1e-12);
}

const GRID: Vec3[] = [];
for (let u = -3; u <= 3; u++)
  for (let v = -3; v <= 3; v++) for (let w = -2; w <= 2; w++) if (u || v || w) GRID.push([u, v, w]);

describe('Frank (1965) Eqs. (19)–(22): three and four indices of hexagonal axes', () => {
  it('has the four printed equations', () => {
    expect([...EQUATIONS.keys()]).toEqual(['19', '20', '21', '22']);
  });

  it('Eq. (20): a direction [uvw] as four indices', () => {
    for (const uvw of GRID)
      expect(positiveMultiple(directionToFourIndices(uvw), printed('20', uvw)), `${uvw}`).toBe(true);
  });

  it('Eq. (19): a direction [uvtw] as three indices', () => {
    for (const uvw of GRID) {
      const uvtw = printed('20', uvw) as unknown as FourIndices;
      expect(positiveMultiple(directionFromFourIndices(uvtw), printed('19', uvtw)), `${uvtw}`).toBe(true);
    }
  });

  it('Eq. (22): a plane (hkl) as four indices', () => {
    for (const hkl of GRID) expect(positiveMultiple(planeToFourIndices(hkl), printed('22', hkl)), `${hkl}`).toBe(true);
  });

  it('Eq. (21): a plane (hkil) as three indices', () => {
    for (const hkl of GRID) {
      const hkil = printed('22', hkl) as unknown as FourIndices;
      expect(positiveMultiple(planeFromFourIndices(hkil), printed('21', hkil)), `${hkil}`).toBe(true);
    }
  });
});
