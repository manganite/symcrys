/**
 * The change of the coordinate system against print (fixture class (a)): the worked examples of
 * ITA (6th ed., 2016) Chapter 1.5 and selected rows of its Table 1.5.1.1, re-parsed from
 * references/itc/vol-a-2016-1.5-transformations.md. Every expected value is printed; the test
 * computes only products of printed matrices (P = P₁P₂) and the normalization 0 ≤ xᵢ < 1 that the
 * text applies.
 */

import { describe, expect, it } from 'vitest';
import * as classes from './index.js';
import * as plane from './plane.js';
import { readReference, section } from './testUtils/references.js';
import type { Mat3, Vec3 } from './linalg.js';

const FILE = readReference('itc/vol-a-2016-1.5-transformations.md');

const num = (t: string): number => {
  const m = /^(-?\d+(?:\.\d+)?)(?:\/(\d+))?$/.exec(t);
  if (!m) throw new Error(`Not a number: ${t}`);
  return m[2] ? Number(m[1]) / Number(m[2]) : Number(m[1]);
};
const vector = (t: string): number[] => t.trim().split(/\s+/).map(num);
const matrix = (t: string): number[][] => t.split(';').map(vector);

/** The value of a line `Name: …` of a section. */
function field(text: string, name: string): string {
  const m = new RegExp(`^${name}: (.*?)\\s*$`, 'm').exec(text);
  if (!m) throw new Error(`No line ${name}`);
  return m[1];
}

/** The rows of the tables of a section, header and separator rows dropped. */
function rows(text: string): string[][] {
  return text
    .split('\n')
    .filter((l) => l.startsWith('|') && !/^\|[-| ]+\|$/.test(l))
    .map((l) =>
      l
        .slice(1, -1)
        .split(/(?<!\\)\|/)
        .map((c) => c.replace(/\\\|/g, '|').trim()),
    )
    .filter((r) => !['Old', 'Atom', 'No.', 'Generator', 'Transformation'].includes(r[0]));
}

const close = (
  x: readonly number[] | readonly (readonly number[])[],
  y: readonly number[] | readonly (readonly number[])[],
) => expect(x.flat() as number[]).toEqual((y.flat() as number[]).map((v) => expect.closeTo(v, 12)));

const product = (a: number[][], b: number[][]): number[][] =>
  a.map((row) => b[0].map((_, j) => row.reduce((s, x, k) => s + x * b[k][j], 0)));

const normalized = (v: readonly number[]) =>
  v.map((x) => {
    const r = x - Math.floor(x + 1e-12);
    return Math.abs(r) < 1e-12 ? 0 : r;
  });

const change = (P: number[][], p: number[] | undefined, q: classes.CoordinateQuantities) =>
  classes.changeOfCoordinates(
    { linearPart: P as unknown as Mat3, ...(p ? { originShift: p as unknown as Vec3 } : {}) },
    q,
  );

const operation = (cell: string) => {
  const [W, w] = cell.split('|');
  return { matrix: matrix(W) as unknown as Mat3, translation: vector(w) as unknown as Vec3 };
};

describe('ITA 2016 Chapter 1.5, worked examples', () => {
  it('F → P (p. 76, p. 83): Q, and the end point of a_F and the centring point', () => {
    const s = section(FILE, '## 1 ');
    const r = rows(s);
    const result = change(matrix(field(s, 'P')), vector(field(s, 'p')), {
      points: r.map((x) => vector(x[0]) as unknown as Vec3),
    });
    close(result.inverse.linearPart, matrix(field(s, 'Q')));
    r.forEach((x, i) => close(result.points![i], vector(x[1])));
  });

  it('zircon (pp. 75–76): an origin shift alone; the transformed coordinates, normalized, as printed', () => {
    const s = section(FILE, '## 2 ');
    const [old, transformed] = [rows(s).slice(0, 3), rows(s).slice(3)];
    const centring = [0.5, 0.5, 0.5];
    for (let i = 0; i < 3; i++) {
      const points = old[i][1].split(';').map(vector);
      // "[and the same with (1/2,1/2,1/2)+]" for every list.
      const all = [...points, ...points.map((x) => x.map((v, k) => v + centring[k]))];
      const result = change(matrix(field(s, 'P')), vector(field(s, 'p')), { points: all as unknown as Vec3[] });
      const got = result.points!.map(normalized);
      const printed = transformed[i][1].split(';').map(vector);
      // Every printed point is among the transformed ones (the oxygen line prints only the first).
      for (const x of printed) {
        expect(
          got.some((y) => y.every((v, k) => Math.abs(v - x[k]) < 1e-9)),
          `${transformed[i][0]} ${x}`,
        ).toBe(true);
      }
      if (i < 2) expect(got).toHaveLength(printed.length);
    }
  });

  it('GeTe (pp. 86–87): P = P₁P₂, Q, q, the metric G′ and the atoms', () => {
    const s = section(FILE, '## 3 ');
    const P = matrix(field(s, 'P'));
    close(product(matrix(field(s, 'P1')), matrix(field(s, 'P2'))), P);
    const metric = /G_c = (.*?) \(times a_c²\) gives G′_c = (.*?) \(times a_c²\)/.exec(field(s, 'Metric'))!;
    const result = change(P, vector(field(s, 'p')), {
      metric: matrix(metric[1]) as unknown as Mat3,
      points: rows(s).map((x) => vector(x[1]) as unknown as Vec3),
    });
    close(result.inverse.linearPart, matrix(field(s, 'Q')));
    close(result.inverse.originShift, vector(field(s, 'q')));
    close(result.metric!, matrix(metric[2]));
    rows(s).forEach((x, i) => close(result.points![i], vector(x[2])));
  });

  it('P2₁/c, unique axis b → c (p. 89): Q, points, indices (h k l) → (l h k), and the operations (2) and (4)', () => {
    const s = section(FILE, '## 4 ');
    const P = matrix(field(s, 'P'));
    const r = rows(s);
    const points = r.filter((x) => x.length === 2);
    const ops = r.filter((x) => x.length === 3);
    const hkl: Vec3[] = [
      [1, 2, 3],
      [-1, 0, 4],
    ];
    const result = change(P, vector(field(s, 'p')), {
      points: points.map((x) => vector(x[0]) as unknown as Vec3),
      planes: hkl,
      operations: ops.map((x) => operation(x[1])),
    });
    close(result.inverse.linearPart, matrix(field(s, 'Q')));
    points.forEach((x, i) => close(result.points![i], vector(x[1])));
    expect(field(s, 'Planes')).toBe('(h_b k_b l_b) becomes (l_b h_b k_b).');
    hkl.forEach((h, i) => close(result.planes![i], [h[2], h[0], h[1]]));
    ops.forEach((x, i) => {
      const printed = operation(x[2]);
      close(result.operations![i].matrix, printed.matrix);
      close(result.operations![i].translation, printed.translation);
    });
  });

  it('P2₁/c, unique axis c cell choice 3 → unique axis b cell choice 1 (p. 90): P = P₁P₂ and Q', () => {
    const s = section(FILE, '## 5 ');
    const P = matrix(field(s, 'P'));
    close(product(matrix(field(s, 'P1')), matrix(field(s, 'P2'))), P);
    close(change(P, undefined, {}).inverse.linearPart, matrix(field(s, 'Q')));
  });

  it('I4₁/amd, origin choice 1 → 2 (p. 90): the generators, w′ not normalized, and x₂ = (x₁, y₁ + 1/4, z₁ − 1/8)', () => {
    const s = section(FILE, '## 6 ');
    const ops = rows(s);
    const result = change(matrix(field(s, 'P')), vector(field(s, 'p')), {
      operations: ops.map((x) => operation(x[1])),
      points: [[0.1, 0.2, 0.3]],
    });
    ops.forEach((x, i) => {
      const printed = operation(x[2]);
      close(result.operations![i].matrix, printed.matrix);
      close(result.operations![i].translation, printed.translation);
    });
    expect(field(s, 'Points')).toBe('x₂ = (x₁, y₁ + 1/4, z₁ − 1/8) (eq. (1.5.3.3)).');
    close(result.points![0], [0.1, 0.2 + 0.25, 0.3 - 0.125]);
  });
});

describe('ITA 2016 Table 1.5.1.1, selected rows (pp. 77, 79)', () => {
  const table = rows(section(FILE, '## 7 '));

  it('Q is the inverse of P for each row', () => {
    expect(table).toHaveLength(6);
    for (const [name, P, Q] of table) {
      const result = change(matrix(P), undefined, {});
      expect(result.inverse.linearPart.flat(), name).toEqual(
        matrix(Q)
          .flat()
          .map((v) => expect.closeTo(v, 12)),
      );
    }
  });

  // The four hexagonal rows leave c unchanged (the last row and column of P are those of the unit
  // matrix, checked), so their upper left 2 × 2 blocks are changes of the plane hexagonal cell.
  it('the upper left 2 × 2 blocks of the hexagonal rows, which leave c unchanged, in the plane', () => {
    for (const [name, P, Q] of table.filter((r) => r[0].startsWith('Hexagonal'))) {
      const block = (m: number[][]) => [m[0].slice(0, 2), m[1].slice(0, 2)];
      expect(matrix(P)[2]).toEqual([0, 0, 1]);
      expect(matrix(P).map((row) => row[2])).toEqual([0, 0, 1]);
      const result = plane.changeOfCoordinates({ linearPart: block(matrix(P)) as unknown as plane.Mat2 }, {});
      expect(result.inverse.linearPart.flat(), name).toEqual(
        block(matrix(Q))
          .flat()
          .map((v) => expect.closeTo(v, 12)),
      );
    }
  });
});
