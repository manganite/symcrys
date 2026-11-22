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
 * - Glide lines: every printed glide of "Symmetry operations" with its lattice translates; every line
 *   is the element of an operation of the group, and the set of lines is mapped onto itself by the
 *   group.
 */

import { describe, expect, it } from 'vitest';
import { readReference } from '../testUtils/references.js';
import { applyToPoint, parseOperation, toPlain } from './affine.js';
import { planeAsymmetricUnit, planeCellElements, type SymmetryLine } from './cell.js';
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
        expect(new Set(vertices.map(key))).toEqual(
          new Set(g.vertices.map((v) => key(v.split(',').map((c) => toNumber(parseRationalText(c)))))),
        );
      }
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
    l.segment.map(num),
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

describe('symmetry elements in the cell', () => {
  for (const g of PRINT) {
    it(g.symbol, () => {
      const elements = planeCellElements(g.symbol);
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
      expect(new Set(elements.rotations.map((r) => `${r.order}@${key(num(r.point))}`))).toEqual(expectedRotations);

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

      // Every line is the element of an operation of the group, and the group maps the lines onto themselves.
      const ops = planeGroupOperations(g.symbol).map(toPlain);
      for (const line of elements.lines) {
        const d = line.direction;
        const p = num(line.segment[0]);
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
