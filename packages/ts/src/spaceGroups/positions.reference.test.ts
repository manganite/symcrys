/**
 * Orbits, site symmetry and Wyckoff positions of points of the 17 plane groups against print
 * (fixture class (a)): the "Positions" of ITA (6th ed., 2016) Chapter 2.2, pp. 176–192, re-parsed
 * from references/itc/vol-a-2016-plane-groups.md. Every printed point of every Wyckoff position,
 * the centring included, is evaluated here (exactly, for general parameter values) and handed to
 * the library slightly displaced; the library must name its printed letter, multiplicity and
 * site-symmetry symbol and give the printed points as its orbit.
 */

import { describe, expect, it } from 'vitest';
import { readReference } from '../testUtils/references.js';
import { applyToPoint, parseOperation } from './affine.js';
import { planeOrbit, planeSiteSymmetry, planeWyckoffPositionOf } from './positions.js';
import { rational, toNumber } from './rational.js';

/** General parameter values x = 13/97, y = 29/101, so that no point falls on a more special position by chance. */
const PARAMETERS = [rational(13, 97), rational(29, 101)];

interface Row {
  multiplicity: number;
  letter: string;
  site: string;
  points: number[][];
}

function printed(): { symbol: string; rows: Row[] }[] {
  const md = readReference('itc/vol-a-2016-plane-groups.md');
  return md
    .split('\n## ')
    .slice(1)
    .map((section) => {
      const symbol = /^\d+ — (\S+),/.exec(section)?.[1] ?? '';
      const centrings = section.includes('Centring:') ? ['0,0', '1/2,1/2'] : ['0,0'];
      const rows = section
        .split('\n')
        .filter((l) => /^\| \d/.test(l))
        .map((l) => {
          const [m, letter, site, coordinates] = l
            .split('|')
            .slice(1, -1)
            .map((c) => c.trim());
          const points = centrings.flatMap((c) => {
            const t = parseOperation(c).translation;
            return coordinates.split('; ').map((e) =>
              applyToPoint(parseOperation(e), PARAMETERS).map((v, i) => {
                const x = toNumber(v) + toNumber(t[i]);
                return x - Math.floor(x);
              }),
            );
          });
          return { multiplicity: Number(m), letter, site, points };
        });
      return { symbol, rows };
    });
}

const close = (p: readonly number[], q: readonly number[], tol = 1e-9) =>
  p.every((v, i) => {
    const d = v - q[i];
    return Math.abs(d - Math.round(d)) < tol;
  });

describe('plane groups: points of every printed Wyckoff position', () => {
  for (const { symbol, rows } of printed()) {
    for (const row of rows) {
      it(`${symbol} ${row.multiplicity}${row.letter}`, () => {
        for (const p of row.points) {
          // Displaced by much less than the default tolerance of 10⁻⁶.
          const q = [p[0] + 3e-8, p[1] - 2e-8];
          expect(planeWyckoffPositionOf(symbol, q)).toEqual({
            letter: row.letter,
            multiplicity: row.multiplicity,
            siteSymmetry: row.site,
          });
          const site = planeSiteSymmetry(symbol, q);
          expect(site.multiplicity).toBe(row.multiplicity);
          // Set onto the fixed space: within the displacement of the printed point (along the free
          // directions of the position the displacement stays) and fixed by every operation of the site symmetry.
          expect(close(site.point, p, 1e-7)).toBe(true);
          for (const op of site.fixing) {
            const image = op.matrix.map((r, i) => r[0] * site.point[0] + r[1] * site.point[1] + op.translation[i]);
            expect(image[0]).toBeCloseTo(site.point[0], 12);
            expect(image[1]).toBeCloseTo(site.point[1], 12);
          }
        }
        const orbit = planeOrbit(symbol, row.points[0]);
        expect(orbit).toHaveLength(row.multiplicity);
        for (const p of row.points) expect(orbit.some((q) => close(p, q))).toBe(true);
      });
    }
  }
});

describe('plane-group positions: tolerance and errors', () => {
  it('takes a larger tolerance for points with rounding errors', () => {
    // 1/3, 2/3 rounded to four decimals lies on 2b of p6mm only with a tolerance above 10⁻⁴.
    const p = [0.3333, 0.6667];
    expect(planeWyckoffPositionOf('p6mm', p).letter).not.toBe('b');
    expect(planeWyckoffPositionOf('p6mm', p, { tolerance: 1e-3 }).letter).toBe('b');
  });

  it('refuses bad points, tolerances and keys', () => {
    expect(() => planeOrbit('p2', [0.1])).toThrow(RangeError);
    expect(() => planeOrbit('p2', [0.1, Number.NaN])).toThrow(RangeError);
    expect(() => planeOrbit('p2', [0.1, 0.2], { tolerance: 0 })).toThrow(RangeError);
    expect(() => planeOrbit('p7', [0.1, 0.2])).toThrow(RangeError);
  });
});
