/**
 * Snapping onto the nearest Wyckoff position (#85) against print (fixture class (a)): the
 * "Positions" of ITA (6th ed., 2016) Chapter 2.2, pp. 176–192, re-parsed from
 * references/itc/vol-a-2016-plane-groups.md. Every printed point of every Wyckoff position, the
 * centring included, is evaluated here for general parameter values and handed to the library
 * displaced by less than the tolerance; it must snap onto the printed letter, a position without a
 * free parameter exactly onto the printed point, a line onto a point that the printed position holds
 * (checked by `planeWyckoffPositionOf` at 10⁻⁹).
 */

import { describe, expect, it } from 'vitest';
import { readReference } from '../testUtils/references.js';
import { applyToPoint, parseOperation } from './affine.js';
import { planeWyckoffPositionOf } from './positions.js';
import { rational, toNumber } from './rational.js';
import { planeSnapToWyckoffPosition } from './snap.js';
import { planeGroupEntry } from './planeGroups.js';

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

/** Tolerance of the snapping and the displacements handed to it (lattice basis, per coordinate). */
const TOLERANCE = 2e-3;
const SHIFTS = [
  [7e-4, -6e-4],
  [-9e-4, 0],
  [0, 1.5e-3],
];

describe('snapping every printed Wyckoff position', () => {
  for (const { symbol, rows } of printed()) {
    const wyckoff = planeGroupEntry(symbol).wyckoff;
    for (const row of rows) {
      const index = wyckoff.findIndex(([, letter]) => letter === row.letter);
      const fixed = !/[xy]/.test(wyckoff[index][3][0]);
      it(`${symbol} ${row.multiplicity}${row.letter}`, () => {
        for (const p of row.points) {
          for (const s of SHIFTS) {
            const snapped = planeSnapToWyckoffPosition(symbol, [p[0] + s[0], p[1] + s[1]], TOLERANCE);
            expect(wyckoff[snapped.row][1]).toBe(row.letter);
            expect(close(snapped.point, [p[0] + s[0], p[1] + s[1]], TOLERANCE)).toBe(true);
            if (fixed) expect(close(snapped.point, p, 1e-12)).toBe(true);
            expect(planeWyckoffPositionOf(symbol, snapped.point, { tolerance: 1e-9 }).letter).toBe(row.letter);
          }
        }
      });
    }
  }
});

describe('snapping: order, tolerance and errors', () => {
  it('a point before a line before the general position', () => {
    // Near 1/2,1/2 of p4mm (1b, 4mm), also within reach of the mirror lines x,1/2 and x,x.
    const at = (p: number[], t: number) => wyckoffLetter('p4mm', planeSnapToWyckoffPosition('p4mm', p, t).row);
    expect(at([0.49, 0.505], 0.02)).toBe('b');
    expect(at([0.3, 0.305], 0.01)).toBe('f'); // x,x
    expect(at([0.3, 0.305], 0.002)).toBe('g'); // general
    expect(planeSnapToWyckoffPosition('p4mm', [0.3, 0.305], 0.002).point).toEqual([0.3, 0.305]);
  });

  it('measures the distance to the position, not to the images (half the radius of the site symmetry)', () => {
    // 0.012 from the mirror line x = 0 of pm: its image -x,y is 0.024 away, beyond 0.02, so the
    // site symmetry does not see the line; the distance to the line is 0.012, so snapping does.
    expect(wyckoffLetter('pm', planeSnapToWyckoffPosition('pm', [0.012, 0.3], 0.02).row)).toBe('a');
    expect(planeWyckoffPositionOf('pm', [0.012, 0.3], { tolerance: 0.02 }).letter).toBe('c');
  });

  it('reduces modulo the lattice', () => {
    const snapped = planeSnapToWyckoffPosition('p2', [-1.001, 2.4999], 0.01);
    expect(wyckoffLetter('p2', snapped.row)).toBe('b');
    expect(close(snapped.point, [0, 0.5], 1e-12)).toBe(true);
  });

  it('refuses a bad point or tolerance', () => {
    expect(() => planeSnapToWyckoffPosition('p2', [0.1], 0.01)).toThrow(RangeError);
    expect(() => planeSnapToWyckoffPosition('p2', [0.1, Number.NaN], 0.01)).toThrow(RangeError);
    expect(() => planeSnapToWyckoffPosition('p2', [0.1, 0.2], 0.5)).toThrow(RangeError);
    expect(() => planeSnapToWyckoffPosition('p2', [0.1, 0.2], 0)).toThrow(RangeError);
    expect(() => planeSnapToWyckoffPosition('p7', [0.1, 0.2], 0.01)).toThrow(RangeError);
  });
});

function wyckoffLetter(symbol: string, row: number): string {
  return planeGroupEntry(symbol).wyckoff[row][1];
}
