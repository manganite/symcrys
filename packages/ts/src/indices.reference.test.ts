/**
 * The conversions between three- and four-index symbols of hexagonal axes against print (fixture
 * class (a)): Frank, Acta Cryst. 18, 862 (1965), Eqs. (19)–(22), p. 864, for the conventional
 * hexagonal cell of Eq. (18), re-parsed from references/frank/eqs-18-22.md. The planes map index
 * to index (Eqs. (21), (22)), so they must agree exactly. For the directions Frank allows "a
 * constant multiplying factor"; by Eq. (18), Eq. (20) is √6/a times s a₁ + t a₂ + u c, a positive
 * factor, and Eq. (19) its inverse times 3, so the library's symbol, reduced to the smallest
 * integers, must be the printed one divided by the greatest common divisor of its components.
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

const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));

/** A symbol divided by the greatest common divisor of its components (a positive number). */
const reduced = (symbol: readonly number[]) => {
  const g = symbol.reduce(gcd, 0);
  return symbol.map((x) => x / g + 0);
};

const GRID: Vec3[] = [];
for (let u = -3; u <= 3; u++)
  for (let v = -3; v <= 3; v++) for (let w = -2; w <= 2; w++) if (u || v || w) GRID.push([u, v, w]);

describe('Frank (1965) Eqs. (19)–(22): three and four indices of hexagonal axes', () => {
  it('has the four printed equations', () => {
    expect([...EQUATIONS.keys()]).toEqual(['19', '20', '21', '22']);
  });

  it('Eq. (20): a direction [uvw] as four indices', () => {
    for (const uvw of GRID) expect(directionToFourIndices(uvw), `${uvw}`).toEqual(reduced(printed('20', uvw)));
  });

  it('Eq. (19): a direction [uvtw] as three indices, any u, v, w with t = −(u + v)', () => {
    for (const [u, v, w] of GRID) {
      const uvtw: FourIndices = [u, v, -(u + v) + 0, w];
      expect(directionFromFourIndices(uvtw), `${uvtw}`).toEqual(reduced(printed('19', uvtw)));
    }
  });

  it('Eq. (22): a plane (hkl) as four indices', () => {
    for (const hkl of GRID) expect(planeToFourIndices(hkl), `${hkl}`).toEqual(printed('22', hkl).map((x) => x + 0));
  });

  it('Eq. (21): a plane (hkil) as three indices, any h, k, l with i = −(h + k)', () => {
    for (const [h, k, l] of GRID) {
      const hkil: FourIndices = [h, k, -(h + k) + 0, l];
      expect(planeFromFourIndices(hkil), `${hkil}`).toEqual(printed('21', hkil).map((x) => x + 0));
    }
  });
});
