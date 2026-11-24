/**
 * The asymmetric unit and the symmetry elements in the cell of the 17 plane groups against print
 * (fixture class (a), with checks derived from the group alone, class (b)): ITA (6th ed., 2016)
 * Chapter 2.2, pp. 176–192, re-parsed from references/itc/vol-a-2016-plane-groups.md.
 *
 * - Asymmetric unit: the printed vertices (hexagonal groups); the printed inequalities, evaluated
 *   here as text, hold exactly inside the polygon; its area is 1/|G|, and every general point has
 *   exactly one image inside it.
 * - Rotation centres: the points of the Wyckoff positions without a free parameter whose site
 *   symmetry contains a rotation, with its order, and their lattice translates in [0, 1]².
 * - Mirror lines: the lines of the Wyckoff positions with one free parameter and a mirror in their
 *   site symmetry, and their lattice translates.
 * - Glide lines: every printed glide of "Symmetry operations" with its lattice translates. As ITA
 *   prints no glide line of p4mm, p3m1, p31m, p6mm (nor the diagonal ones of p4gm), all mirror and
 *   glide lines are also derived here independently from the printed general position (class (b)),
 *   in floating point with a wider range of lattice shifts than the code. Every line is the element of
 *   an operation of the group, and the set of lines is mapped onto itself by the group.
 */

import { describe, expect, it } from 'vitest';
import { readReference } from '../testUtils/references.js';
import { applyToPoint, parseOperation, toPlain } from './affine.js';
import {
  parseAsymmetricUnit,
  planeAsymmetricUnit,
  planeElements,
  planeElementsInBox,
  type SymmetryLine,
} from './cell.js';
import { planeGroupOperations } from './planeGroups.js';
import { toNumber, type Rational } from './rational.js';

interface Printed {
  symbol: string;
  asymmetricUnit: string;
  vertices?: string[];
  centring: number[][];
  operations: string[];
  wyckoff: { site: string; coordinates: string[] }[];
}

function printed(): Printed[] {
  return readReference('itc/vol-a-2016-plane-groups.md')
    .split('\n## ')
    .slice(1)
    .map((section) => {
      const field = (name: string) =>
        section
          .split('\n')
          .filter((l) => l.startsWith(`${name}`))
          .map((l) => l.slice(l.indexOf(':') + 1).trim());
      return {
        symbol: /^\d+ — (\S+),/.exec(section)?.[1] ?? '',
        asymmetricUnit: field('Asymmetric unit:')[0],
        vertices: field('Vertices:')[0]?.split('; '),
        centring: section.includes('Centring:')
          ? [
              [0, 0],
              [0.5, 0.5],
            ]
          : [[0, 0]],
        operations: field('Symmetry operations').flatMap((l) => l.split(/; (?=\()/)),
        wyckoff: section
          .split('\n')
          .filter((l) => /^\| \d/.test(l))
          .map((l) => {
            const cells = l.split('|').map((c) => c.trim());
            return { site: cells[3], coordinates: cells[4].split('; ') };
          }),
      };
    });
}

const PRINT = printed();
const num = (p: readonly Rational[]) => p.map(toNumber);
const key = (p: readonly number[]) => p.map((v) => v.toFixed(9)).join(',');

/** The printed block "Asymmetric unit" evaluated at a point, read here as text (`min`, `2x`, `(1 + y)/2`). */
function printedHolds(text: string, x: number, y: number): boolean {
  const js = text
    .replace(/min\(/g, 'Math.min(')
    .replace(/(\d)([xy(])/g, '$1*$2')
    .replace(/\)\(/g, ')*(');
  return js.split(';').every((clause) => {
    const sides = clause.split('<=').map((s) => s.trim());
    const values = sides.map((s) => (new Function('x', 'y', `return ${s};`) as (x: number, y: number) => number)(x, y));
    return values.every((v, i) => i === 0 || values[i - 1] <= v + 1e-12);
  });
}

describe('asymmetric unit', () => {
  for (const g of PRINT) {
    it(g.symbol, () => {
      const unit = planeAsymmetricUnit(g.symbol);
      const vertices = unit.vertices.map(num);
      if (g.vertices) {
        // In the printed order, which is counter-clockwise from the lowest vertex.
        expect(vertices.map(key)).toEqual(
          g.vertices.map((v) => key(v.split(',').map((c) => toNumber(parseRationalText(c))))),
        );
      }
      const lowest = [...vertices].sort((p, q) => p[1] - q[1] || p[0] - q[0])[0];
      expect(key(vertices[0])).toBe(key(lowest));
      // The inequalities are all printed ones, in printed order (#137 F3); edges[i] holds the edge
      // from vertex i to vertex i + 1.
      expect(unit.inequalities).toEqual(parseAsymmetricUnit(g.asymmetricUnit));
      expect(unit.edges).toHaveLength(vertices.length);
      unit.edges.forEach((e, i) => {
        const [a, b, c] = unit.inequalities[e];
        for (const v of [vertices[i], vertices[(i + 1) % vertices.length]])
          expect(a * v[0] + b * v[1]).toBeCloseTo(c, 12);
      });
      // Inside the polygon ⇔ the printed inequalities hold (on a grid that avoids the boundary).
      const inside = (x: number, y: number) => unit.inequalities.every(([a, b, c]) => a * x + b * y <= c + 1e-12);
      for (let i = 0; i <= 40; i++) {
        for (let j = 0; j <= 40; j++) {
          const x = i / 40 + 0.0013;
          const y = j / 40 + 0.0007;
          expect(inside(x, y)).toBe(printedHolds(g.asymmetricUnit, x, y));
        }
      }
      // Area = 1/|G| (the conventional cell has area 1 in the lattice basis).
      const area =
        vertices.reduce((s, p, k) => {
          const q = vertices[(k + 1) % vertices.length];
          return s + p[0] * q[1] - q[0] * p[1];
        }, 0) / 2;
      const ops = planeGroupOperations(g.symbol).map(toPlain);
      expect(area).toBeCloseTo(1 / ops.length, 12);
      // Every general point has exactly one image inside.
      const strictlyInside = (x: number, y: number) => unit.inequalities.every(([a, b, c]) => a * x + b * y < c - 1e-9);
      for (let i = 0; i < 13; i++) {
        for (let j = 0; j < 11; j++) {
          const p = [(i + 0.31) / 13, (j + 0.17) / 11];
          let hits = 0;
          for (const op of ops) {
            const q = op.matrix.map((row, k) => row[0] * p[0] + row[1] * p[1] + op.translation[k]);
            for (let s = -3; s <= 3; s++) for (let t = -3; t <= 3; t++) if (strictlyInside(q[0] + s, q[1] + t)) hits++;
          }
          expect(hits).toBe(1);
        }
      }
    });
  }
});

function parseRationalText(text: string): Rational {
  const [n, d] = text.split('/').map(Number);
  return [n, d ?? 1];
}

/** All copies p + t of a point (given mod 1) in [0, 1]². */
function copiesInCell(p: readonly number[]): number[][] {
  const q = p.map((v) => v - Math.floor(v + 1e-12));
  const xs = Math.abs(q[0]) < 1e-12 ? [0, 1] : [q[0]];
  const ys = Math.abs(q[1]) < 1e-12 ? [0, 1] : [q[1]];
  return xs.flatMap((x) => ys.map((y) => [x, y]));
}

/** The segment of the line p + λd in [0, 1]², in floating point, or undefined. */
function clip(p: readonly number[], d: readonly number[]): number[][] | undefined {
  let lo = -Infinity;
  let hi = Infinity;
  for (let k = 0; k < 2; k++) {
    if (d[k] === 0) {
      if (p[k] < -1e-12 || p[k] > 1 + 1e-12) return undefined;
      continue;
    }
    const a = -p[k] / d[k];
    const b = (1 - p[k]) / d[k];
    lo = Math.max(lo, Math.min(a, b));
    hi = Math.min(hi, Math.max(a, b));
  }
  if (hi - lo <= 1e-12) return undefined;
  return [lo, hi].map((l) => [p[0] + l * d[0], p[1] + l * d[1]]);
}

const primitive = (d: readonly number[]) => {
  const g = (a: number, b: number): number => (b === 0 ? Math.abs(a) : g(b, a % b));
  const k = g(d[0], d[1]);
  const s = d[0] < 0 || (d[0] === 0 && d[1] < 0) ? -1 : 1;
  return [(s * d[0]) / k + 0, (s * d[1]) / k + 0];
};

/** A line as a string: its direction, the ends of its segment (as a set) and the glide parameter s mod 1. */
function lineKey(d: readonly number[], segment: number[][], s: number): string {
  const ends = segment.map(key).sort().join(' ');
  const frac = (((Math.round(s * 1e9) / 1e9) % 1) + 1) % 1;
  return `${primitive(d).join(',')} ${ends} s=${frac.toFixed(6)}`;
}

const computedKey = (l: SymmetryLine) =>
  lineKey(
    l.direction,
    clip(num(l.point), l.direction)!,
    l.kind === 'mirror'
      ? 0
      : toNumber(l.glide[l.direction[0] !== 0 ? 0 : 1]) / (l.direction[0] !== 0 ? l.direction[0] : l.direction[1]),
  );

/** The lattice translates of the line through p along d that cross [0, 1]², as keys. */
function translates(p: readonly number[], d: readonly number[], s: number): string[] {
  const out = new Set<string>();
  for (let a = -3; a <= 3; a++) {
    for (let b = -3; b <= 3; b++) {
      const seg = clip([p[0] + a, p[1] + b], d);
      if (seg) out.add(lineKey(d, seg, s));
    }
  }
  return [...out];
}

const ROTATION_ORDER = /^([2346])/;

describe('symmetry elements in the cell (the translates that meet the box [0, 1]²)', () => {
  for (const g of PRINT) {
    it(g.symbol, () => {
      const all = planeElementsInBox(g.symbol, [
        [0, 0],
        [1, 1],
      ]);
      // The lines with a segment of non-zero length in the cell, as they were compared before the
      // segments went (#137 F2): clipped here.
      const elements = {
        rotationPoints: all.rotationPoints,
        lines: all.lines.filter((l) => clip(num(l.point), l.direction)),
      };
      // Rotation centres from the Wyckoff positions without a free parameter.
      const expectedRotations = new Set<string>();
      for (const row of g.wyckoff) {
        const order = ROTATION_ORDER.exec(row.site)?.[1];
        if (!order || /[xy]/.test(row.coordinates.join())) continue;
        for (const c of g.centring) {
          for (const text of row.coordinates) {
            const p = text.split(',').map((v) => toNumber(parseRationalText(v)));
            for (const q of copiesInCell([p[0] + c[0], p[1] + c[1]])) expectedRotations.add(`${order}@${key(q)}`);
          }
        }
      }
      expect(new Set(elements.rotationPoints.map((r) => `${r.n}@${key(num(r.point))}`))).toEqual(expectedRotations);

      // Mirror lines from the Wyckoff positions with one free parameter and a mirror.
      const expectedMirrors = new Set<string>();
      for (const row of g.wyckoff) {
        const free = /[xy]/.test(row.coordinates.join());
        if (!row.site.includes('m') || !free || row.coordinates[0] === 'x,y') continue;
        for (const c of g.centring) {
          for (const text of row.coordinates) {
            const op = toPlain(parseOperation(text));
            const d = [op.matrix[0][0] + op.matrix[0][1], op.matrix[1][0] + op.matrix[1][1]];
            const p = [op.translation[0] + c[0], op.translation[1] + c[1]];
            for (const k of translates(p, d, 0)) expectedMirrors.add(k);
          }
        }
      }
      const computed = elements.lines.map(computedKey);
      expect(new Set(elements.lines.filter((l) => l.kind === 'mirror').map(computedKey))).toEqual(expectedMirrors);

      // Every printed glide and its lattice translates.
      for (const text of g.operations) {
        const m = /^\(\d+\) (a|b|g\(([^)]*)\)) (.+)$/.exec(text);
        if (!m) continue;
        const glide =
          m[1] === 'a'
            ? [0.5, 0]
            : m[1] === 'b'
              ? [0, 0.5]
              : m[2].split(',').map((v) => toNumber(parseRationalText(v)));
        const loc = parseOperation(m[3]);
        const p0 = num(
          applyToPoint(loc, [
            [0, 1],
            [0, 1],
          ]),
        );
        const p1 = num(
          applyToPoint(loc, [
            [1, 1],
            [1, 1],
          ]),
        );
        const d = primitive([Math.round(p1[0] - p0[0]), Math.round(p1[1] - p0[1])]);
        const s = d[0] !== 0 ? glide[0] / d[0] : glide[1] / d[1];
        for (const k of translates(p0, d, s)) expect(computed).toContain(k);
      }

      // Derived independently (class (b)): every operation with det −1 of the printed general position (the
      // first Wyckoff row, with the centring), shifted
      // by lattice vectors |t_i| ≤ 6, gives a line with glide g = (w + Ww)/2 through (w − g)/2, along the
      // fixed direction of W; reduced modulo the lattice vector along it. All those that cross the cell.
      const derived = new Set<string>();
      const general = g.centring.flatMap((c) =>
        g.wyckoff[0].coordinates.map((text) => {
          const op = toPlain(parseOperation(text));
          return { matrix: op.matrix, translation: [op.translation[0] + c[0], op.translation[1] + c[1]] };
        }),
      );
      for (const op of general) {
        const det = op.matrix[0][0] * op.matrix[1][1] - op.matrix[0][1] * op.matrix[1][0];
        if (det !== -1) continue;
        const ipw = [
          [1 + op.matrix[0][0], op.matrix[0][1]],
          [op.matrix[1][0], 1 + op.matrix[1][1]],
        ];
        const d = primitive(ipw[0][0] !== 0 || ipw[1][0] !== 0 ? [ipw[0][0], ipw[1][0]] : [ipw[0][1], ipw[1][1]]);
        for (let a = -6; a <= 6; a++) {
          for (let b = -6; b <= 6; b++) {
            const w = [op.translation[0] + a, op.translation[1] + b];
            const gl = [0, 1].map((k) => (w[k] + op.matrix[k][0] * w[0] + op.matrix[k][1] * w[1]) / 2);
            const seg = clip([(w[0] - gl[0]) / 2, (w[1] - gl[1]) / 2], d);
            if (seg) derived.add(lineKey(d, seg, d[0] !== 0 ? gl[0] / d[0] : gl[1] / d[1]));
          }
        }
      }
      expect(new Set(computed)).toEqual(derived);

      // No duplicates, and the documented order.
      expect(new Set(computed).size).toBe(computed.length);
      const rotationKeys = elements.rotationPoints.map((r) => key(num(r.point)));
      expect(new Set(rotationKeys).size).toBe(rotationKeys.length);
      for (let k = 1; k < elements.rotationPoints.length; k++) {
        const [a, b] = [elements.rotationPoints[k - 1], elements.rotationPoints[k]];
        const [pa, pb] = [num(a.point), num(b.point)];
        expect(a.n > b.n || (a.n === b.n && (pa[1] < pb[1] || (pa[1] === pb[1] && pa[0] < pb[0])))).toBe(true);
      }
      for (let k = 1; k < all.lines.length; k++) {
        const [a, b] = [all.lines[k - 1], all.lines[k]];
        // By direction, then by the point (x on y = 0, or y on x = 0), mirror before glide.
        const c = (l: SymmetryLine) => toNumber(l.direction[1] !== 0 ? l.point[0] : l.point[1]);
        const order =
          a.direction[0] - b.direction[0] ||
          a.direction[1] - b.direction[1] ||
          c(a) - c(b) ||
          (a.kind === 'mirror' ? -1 : 1);
        expect(order).toBeLessThan(0);
      }

      // Every line is the element of an operation of the group, and the group maps the lines onto themselves.
      const ops = planeGroupOperations(g.symbol).map(toPlain);
      for (const line of elements.lines) {
        const d = line.direction;
        const p = num(line.point);
        const gl = num(line.glide);
        const genuine = ops.some((op) => {
          const det = op.matrix[0][0] * op.matrix[1][1] - op.matrix[0][1] * op.matrix[1][0];
          const wd = [op.matrix[0][0] * d[0] + op.matrix[0][1] * d[1], op.matrix[1][0] * d[0] + op.matrix[1][1] * d[1]];
          if (det !== -1 || wd[0] !== d[0] || wd[1] !== d[1]) return false;
          const q = [0, 1].map(
            (k) => op.matrix[k][0] * p[0] + op.matrix[k][1] * p[1] + op.translation[k] - p[k] - gl[k],
          );
          return q.every((v) => Math.abs(v - Math.round(v)) < 1e-12);
        });
        expect(genuine).toBe(true);
        for (const op of ops) {
          const img = (v: readonly number[], lin = false) =>
            [0, 1].map((k) => op.matrix[k][0] * v[0] + op.matrix[k][1] * v[1] + (lin ? 0 : op.translation[k]));
          const d2 = primitive(img(d, true));
          const q = img(p);
          const g2 = img(gl, true);
          const s2 = d2[0] !== 0 ? g2[0] / d2[0] : g2[1] / d2[1];
          expect(translates(q, d2, s2).every((k) => computed.includes(k))).toBe(true);
        }
      }
    });
  }
});

describe('symmetry elements modulo the lattice, centring included (#137 F2)', () => {
  for (const g of PRINT) {
    it(`${g.symbol}: each element once, and the translates of these are exactly those that meet a box`, () => {
      const classes = planeElements(g.symbol);
      const offset = (l: SymmetryLine) =>
        -l.direction[1] * toNumber(l.point[0]) + l.direction[0] * toNumber(l.point[1]);
      // Rotation points and the points of the lines in [0, 1)²; no two equal modulo the lattice
      // with its centring (cm: m 0,y and b 1/4,y, as ITA lists them).
      for (const r of classes.rotationPoints) expect(num(r.point).every((v) => v >= 0 && v < 1)).toBe(true);
      for (const l of classes.lines) expect(num(l.point).every((v) => v >= 0 && v < 1)).toBe(true);
      const shiftsOf = (p: readonly number[]) =>
        g.centring.map((c) => key([(((p[0] + c[0]) % 1) + 1) % 1, (((p[1] + c[1]) % 1) + 1) % 1]));
      const seen = new Set<string>();
      for (const r of classes.rotationPoints) {
        const images = shiftsOf(num(r.point));
        expect(
          images.some((k) => seen.has(k)),
          `${g.symbol} ${num(r.point)}`,
        ).toBe(false);
        for (const k of images) seen.add(k);
      }

      // A box [−1.3, 2.2] × [−0.7, 1.9]. Rotation points: the translates of the classes by the lattice
      // and the centring that lie in it.
      const box = [
        [-1.3, -0.7],
        [2.2, 1.9],
      ] as const;
      const within = (p: readonly number[]) =>
        p[0] >= box[0][0] && p[0] <= box[1][0] && p[1] >= box[0][1] && p[1] <= box[1][1];
      const inBox = planeElementsInBox(g.symbol, box);
      const expected = new Set<string>();
      for (const r of classes.rotationPoints) {
        for (const c of g.centring) {
          for (let i = -3; i <= 3; i++) {
            for (let j = -3; j <= 3; j++) {
              const p = [toNumber(r.point[0]) + c[0] + i, toNumber(r.point[1]) + c[1] + j];
              if (within(p)) expected.add(`${r.n}@${key(p)}`);
            }
          }
        }
      }
      const listed = inBox.rotationPoints.map((r) => `${r.n}@${key(num(r.point))}`);
      expect(new Set(listed).size).toBe(listed.length);
      expect(new Set(listed)).toEqual(expected);

      // Lines, derived independently from the printed general position (with the centring): every
      // operation with det −1, shifted by |t_i| ≤ 8, gives a line along the fixed direction of W with
      // glide g = (w + Ww)/2 through (w − g)/2; those that meet the box (touching included) are
      // exactly the lines listed, each once.
      const derived = new Set<string>();
      const lineId = (d: readonly number[], c: number, s: number) =>
        `${primitive(d).join(',')} c=${c.toFixed(9)} s=${((((Math.round(s * 1e9) / 1e9) % 1) + 1) % 1).toFixed(6)}`;
      const corners = [box[0][0], box[1][0]].flatMap((x) => [box[0][1], box[1][1]].map((y) => [x, y]));
      for (const c of g.centring) {
        for (const text of g.wyckoff[0].coordinates) {
          const op = toPlain(parseOperation(text));
          const w0 = [op.translation[0] + c[0], op.translation[1] + c[1]];
          const det = op.matrix[0][0] * op.matrix[1][1] - op.matrix[0][1] * op.matrix[1][0];
          if (det !== -1) continue;
          const ipw = [
            [1 + op.matrix[0][0], op.matrix[0][1]],
            [op.matrix[1][0], 1 + op.matrix[1][1]],
          ];
          const d = primitive(ipw[0][0] !== 0 || ipw[1][0] !== 0 ? [ipw[0][0], ipw[1][0]] : [ipw[0][1], ipw[1][1]]);
          for (let a = -8; a <= 8; a++) {
            for (let b = -8; b <= 8; b++) {
              const w = [w0[0] + a, w0[1] + b];
              const gl = [0, 1].map((k) => (w[k] + op.matrix[k][0] * w[0] + op.matrix[k][1] * w[1]) / 2);
              const p = [(w[0] - gl[0]) / 2, (w[1] - gl[1]) / 2];
              const cc = -d[1] * p[0] + d[0] * p[1];
              const values = corners.map(([x, y]) => -d[1] * x + d[0] * y);
              if (cc < Math.min(...values) - 1e-9 || cc > Math.max(...values) + 1e-9) continue;
              derived.add(lineId(d, cc, d[0] !== 0 ? gl[0] / d[0] : gl[1] / d[1]));
            }
          }
        }
      }
      const listedLines = inBox.lines.map((l) =>
        lineId(
          l.direction,
          offset(l),
          l.kind === 'mirror'
            ? 0
            : toNumber(l.glide[l.direction[0] !== 0 ? 0 : 1]) /
                (l.direction[0] !== 0 ? l.direction[0] : l.direction[1]),
        ),
      );
      expect(new Set(listedLines).size).toBe(listedLines.length);
      expect(new Set(listedLines)).toEqual(derived);
    });
  }
});
