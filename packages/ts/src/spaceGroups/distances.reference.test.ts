/**
 * The distance of a point to a Wyckoff position, and the position a point lies on within the
 * tolerance, against print (fixture class (a)): the "Positions" of ITA (6th ed.,
 * 2016) Chapter 2.2, pp. 176–192, re-parsed from references/itc/vol-a-2016-plane-groups.md. Every
 * printed point of every Wyckoff position, the centring included, is evaluated here for general
 * parameter values; it has distance 0 to its position, and displaced by less than the tolerance it
 * lies on the printed letter, a position without a free parameter exactly at the printed point, a
 * line at a point that the printed position holds (checked at 10⁻⁹).
 */

import { describe, expect, it } from 'vitest';
import { readReference } from '../testUtils/references.js';
import { applyToPoint, parseOperation } from './affine.js';
import { planePosition, planeSiteOfPosition, planeWyckoffDistances, planeWyckoffPositionOf } from './positions.js';
import { rational, toNumber } from './rational.js';
import { planeMetricTensor } from './planeLattice.js';
import { planeWyckoffRows } from './planeWyckoff.js';
import { seededRandom } from '../testUtils/noise.js';
import * as plane from '../plane.js';

/** General parameter values x = 13/97, y = 29/101, so that no point falls on a more special position by chance. */
const PARAMETERS = [rational(13, 97), rational(29, 101)];

interface Row {
  multiplicity: number;
  letter: string;
  site: string;
  /** True if the printed coordinates have no free parameter: a point position. */
  fixed: boolean;
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
          return { multiplicity: Number(m), letter, site, fixed: !/[xy]/.test(coordinates), points };
        });
      return { symbol, rows };
    });
}

const close = (p: readonly number[], q: readonly number[], tol = 1e-9) =>
  p.every((v, i) => {
    const d = v - q[i];
    return Math.abs(d - Math.round(d)) < tol;
  });

/** The tolerance and the displacements handed to the library (lattice basis, per coordinate). */
const TOLERANCE = 2e-3;
const SHIFTS = [
  [7e-4, -6e-4],
  [-9e-4, 0],
  [0, 1.5e-3],
];

describe('every printed Wyckoff position', () => {
  for (const { symbol, rows } of printed()) {
    const wyckoff = planeWyckoffRows(symbol);
    for (const row of rows) {
      const index = wyckoff.findIndex(([, letter]) => letter === row.letter);
      const fixed = row.fixed;
      it(`${symbol} ${row.multiplicity}${row.letter}`, () => {
        expect(index, 'the printed letter is a position of symcrys').toBeGreaterThanOrEqual(0);
        for (const p of row.points) {
          // Distance 0 to its own position, the point itself the nearest point of it.
          const own = planeWyckoffDistances(symbol, p)[index];
          expect(own.distance).toBeLessThan(1e-12);
          expect(close(own.point, p, 1e-12)).toBe(true);
          for (const s of SHIFTS) {
            const snapped = planePosition(symbol, [p[0] + s[0], p[1] + s[1]], { tolerance: TOLERANCE });
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

describe('the position of a point within the tolerance: order, metric and errors', () => {
  it('the most special position within the tolerance: here a point, a line, the general position', () => {
    // Near 1/2,1/2 of p4mm (1b, 4mm), also within reach of the mirror lines x,1/2 and x,x.
    const at = (p: number[], t: number) => wyckoffLetter('p4mm', planePosition('p4mm', p, { tolerance: t }).row);
    expect(at([0.49, 0.505], 0.02)).toBe('b');
    expect(at([0.3, 0.305], 0.01)).toBe('f'); // x,x
    expect(at([0.3, 0.305], 0.002)).toBe('g'); // general
    expect(planePosition('p4mm', [0.3, 0.305], { tolerance: 0.002 }).point).toEqual([0.3, 0.305]);
  });

  it('measures the distance to the position, not to the images; the site symmetry is that of the position', () => {
    // 0.012 from the mirror line x = 0 of pm: its image -x,y is 0.024 away, beyond 0.02, but the
    // distance to the line is 0.012, so the point lies on it (#108: one criterion).
    expect(planeWyckoffPositionOf('pm', [0.012, 0.3], { tolerance: 0.02 }).letter).toBe('a');
    const site = planeSiteOfPosition('pm', [0.012, 0.3], { tolerance: 0.02 });
    expect(site.multiplicity).toBe(1);
    expect(close(site.point, [0, 0.3], 1e-12)).toBe(true);
    expect(planeWyckoffPositionOf('pm', [0.0007, 0.3], { tolerance: 1e-3 }).letter).toBe('a');
  });

  it('measures per lattice coordinate without a basis, Euclidean with one', () => {
    // #108: the point on x,2x of p6mm nearest to (0.2, 0.35). Per coordinate: max(|0.2 − t|,
    // |0.35 − 2t|) is least at t = 0.55/3, where both are 1/60. Euclidean in the hexagonal basis:
    // G = [[1, −1/2], [−1/2, 1]], the projection t = rᵀGv / vᵀGv = 0.525/3 = 0.175 (vᵀGv = 3).
    const hexagonal = [
      [1, -0.5],
      [0, Math.sqrt(3) / 2],
    ];
    const e = planeWyckoffDistances('p6mm', [0.2, 0.35]).find((d) => planeWyckoffRows('p6mm')[d.row][1] === 'e')!;
    expect(e.distance).toBeCloseTo(1 / 60, 12);
    expect(e.point[0]).toBeCloseTo(0.55 / 3, 12);
    const euclid = planeWyckoffDistances('p6mm', [0.2, 0.35], hexagonal).find(
      (d) => planeWyckoffRows('p6mm')[d.row][1] === 'e',
    )!;
    expect(euclid.point[0]).toBeCloseTo(0.175, 12);
    expect(euclid.point[1]).toBeCloseTo(0.35, 12);
    // The residual (0.025, 0) has the length 0.025 in G (G₁₁ = 1).
    expect(euclid.distance).toBeCloseTo(0.025, 12);
    expect(() =>
      planeMetricTensor(
        [
          [1, 0],
          [2, 0],
        ],
        'test',
      ),
    ).toThrow(RangeError);
  });

  it('takes the nearest of two lines within reach, not the first printed', () => {
    // Near the crossing at the origin of p4mm: 0.0004 from x,0 (4d) and 0.0047 from x,x (4f, printed
    // first), both within 0.005, but 0.0098 from the point 0,0 (1a), beyond it.
    expect(wyckoffLetter('p4mm', planePosition('p4mm', [0.0098, 0.0004], { tolerance: 0.005 }).row)).toBe('d');
  });

  it('finds the fixed points at the tolerance of an application (10⁻²)', () => {
    for (const { symbol, rows } of printed()) {
      for (const row of rows) {
        if (!row.fixed) continue;
        for (const p of row.points) {
          for (const s of [
            [9e-3, -8e-3],
            [-9.5e-3, 0],
          ]) {
            const snapped = planePosition(symbol, [p[0] + s[0], p[1] + s[1]], { tolerance: 1e-2 });
            expect(wyckoffLetter(symbol, snapped.row)).toBe(row.letter);
            expect(close(snapped.point, p, 1e-12)).toBe(true);
          }
        }
      }
    }
  });

  it('reduces modulo the lattice', () => {
    const snapped = planePosition('p2', [-1.001, 2.4999], { tolerance: 0.01 });
    expect(wyckoffLetter('p2', snapped.row)).toBe('b');
    expect(close(snapped.point, [0, 0.5], 1e-12)).toBe(true);
  });

  it('refuses a bad point or tolerance', () => {
    expect(() => planePosition('p2', [0.1], { tolerance: 0.01 })).toThrow(RangeError);
    expect(() => planePosition('p2', [0.1, Number.NaN], { tolerance: 0.01 })).toThrow(RangeError);
    expect(() => planePosition('p2', [0.1, 0.2], { tolerance: 0.5 })).toThrow(RangeError);
    expect(() => planePosition('p2', [0.1, 0.2], { tolerance: 0 })).toThrow(RangeError);
    expect(() => planePosition('p7', [0.1, 0.2], { tolerance: 0.01 })).toThrow(RangeError);
  });
});

function wyckoffLetter(symbol: string, row: number): string {
  return planeWyckoffRows(symbol)[row][1];
}

describe('the distances of a full search, in every group and in bases of its cell (#238)', () => {
  /** The printed coordinates of every row as affine maps (W, w), with the centrings added. */
  const affineRows = (symbol: string) => {
    const md = readReference('itc/vol-a-2016-plane-groups.md');
    const section = md.split('\n## ').find((s) => /^\d+ — (\S+),/.exec(s)?.[1] === symbol)!;
    const centrings = section.includes('Centring:') ? [[0, 0], [0.5, 0.5]] : [[0, 0]]; // prettier-ignore
    return section
      .split('\n')
      .filter((l) => /^\| \d/.test(l))
      .map((l) => {
        const [, letter, , coordinates] = l
          .split('|')
          .slice(1, -1)
          .map((c) => c.trim());
        const maps = coordinates.split('; ').flatMap((e) => {
          const op = parseOperation(e);
          const w = op.matrix.map((row) => row.map(Number));
          const t = op.translation.map(toNumber);
          return centrings.map((c) => ({ w, t: [t[0] + c[0], t[1] + c[1]] }));
        });
        return { letter, maps };
      });
  };
  /** The length of r: per coordinate without a metric, in G with one. */
  const length = (r: number[], g?: number[][]) =>
    g
      ? Math.sqrt(Math.max(0, r[0] * (g[0][0] * r[0] + g[0][1] * r[1]) + r[1] * (g[1][0] * r[0] + g[1][1] * r[1])))
      : Math.max(Math.abs(r[0]), Math.abs(r[1]));
  /** min over t of length(r − t·v): by golden-section search, the function being convex in t. */
  const toLine = (r: number[], v: number[], g?: number[][]) => {
    const f = (t: number) => length([r[0] - t * v[0], r[1] - t * v[1]], g);
    let [lo, hi] = [-60, 60];
    for (let k = 0; k < 200; k++) {
      const m1 = lo + (hi - lo) * 0.381966;
      const m2 = lo + (hi - lo) * 0.618034;
      if (f(m1) < f(m2)) hi = m2;
      else lo = m1;
    }
    return f((lo + hi) / 2);
  };
  /** The distance of x to the point set of a row: every map and translate within ±window cells. */
  const fullSearch = (
    x: number[],
    maps: { w: number[][]; t: number[] }[],
    g: number[][] | undefined,
    window: number,
  ) => {
    let best = Infinity;
    for (const { w, t } of maps) {
      const cols = [0, 1].map((k) => [w[0][k], w[1][k]]).filter((v) => v[0] !== 0 || v[1] !== 0);
      const rank = cols.length === 0 ? 0 : cols.length === 2 && cols[0][0] * cols[1][1] - cols[0][1] * cols[1][0] !== 0 ? 2 : 1; // prettier-ignore
      if (rank === 2) return 0;
      for (let i = -window; i <= window; i++)
        for (let j = -window; j <= window; j++) {
          const r = [x[0] - t[0] - i, x[1] - t[1] - j];
          best = Math.min(best, rank === 0 ? length(r, g) : toLine(r, cols[0], g));
        }
    }
    return best;
  };
  const metric = (B: number[][]) => [
    [B[0][0] ** 2 + B[1][0] ** 2, B[0][0] * B[0][1] + B[1][0] * B[1][1]],
    [B[0][0] * B[0][1] + B[1][0] * B[1][1], B[0][1] ** 2 + B[1][1] ** 2],
  ];
  const random = seededRandom(238);
  const uniform = (lo: number, hi: number) => lo + (hi - lo) * random();
  /** A basis of the cell of the system (ITA 2016 Table 2.1.1.1, p. 143), oblique ones sheared. */
  const basisOf = (system: string): { basis: number[][]; window: number } => {
    const a = uniform(0.3, 3);
    const b = uniform(0.3, 3);
    if (system === 'rectangular') return { basis: [[a, 0], [0, b]], window: 3 }; // prettier-ignore
    if (system === 'square') return { basis: [[a, 0], [0, a]], window: 3 }; // prettier-ignore
    if (system === 'hexagonal') return { basis: [[a, -a / 2], [0, (a * Math.sqrt(3)) / 2]], window: 3 }; // prettier-ignore
    const gamma = (uniform(95, 140) * Math.PI) / 180;
    const B0 = [[a, b * Math.cos(gamma)], [0, b * Math.sin(gamma)]]; // prettier-ignore
    // A unimodular shear of up to ±8 in either direction: the same lattice in another basis.
    const k = Math.round(uniform(-8, 8));
    const U = random() < 0.5 ? [[1, k], [0, 1]] : [[1, 0], [k, 1]]; // prettier-ignore
    const basis = B0.map((row) => [row[0] * U[0][0] + row[1] * U[1][0], row[0] * U[0][1] + row[1] * U[1][1]]);
    return { basis, window: 4 + 3 * Math.abs(k) };
  };

  for (const key of plane.PLANE_GROUP_KEYS) {
    it(key, () => {
      const rows = affineRows(key);
      const system = plane.planeGroup(key).crystalSystem;
      const wrong: string[] = [];
      for (let n = 0; n < 12; n++) {
        const { basis, window } = basisOf(system);
        // A random point, and one near a printed point of a position.
        const near = rows[Math.floor(random() * rows.length)].maps[0];
        const base = [
          near.w[0][0] * 0.3 + near.w[0][1] * 0.6 + near.t[0],
          near.w[1][0] * 0.3 + near.w[1][1] * 0.6 + near.t[1],
        ];
        for (const x of [
          [random(), random()],
          [base[0] + uniform(-0.05, 0.05), base[1] + uniform(-0.05, 0.05)],
        ]) {
          // prettier-ignore
          const point = x.map((v) => v - Math.floor(v));
          for (const g of [undefined, metric(basis)]) {
            const got = plane.wyckoffDistances(key, { point }, g ? { basis } : undefined);
            rows.forEach((row) => {
              const want = fullSearch(point, row.maps, g, g ? window : 3);
              const d = got.find((p) => p.letter === row.letter)!.distance;
              if (!(Math.abs(d - want) < 1e-9))
                wrong.push(`${row.letter} ${JSON.stringify({ point, basis: g && basis })}: ${d} ≠ ${want}`);
            });
          }
        }
      }
      expect(wrong.slice(0, 3)).toEqual([]);
    });
  }
});
