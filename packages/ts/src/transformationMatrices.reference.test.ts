/**
 * ITA Table 1.5.1.1 (6th ed., 2016, pp. 77–80) as data (#120), against print (fixture class (a)):
 * every row of references/itc/vol-a-2016-table-1.5.1.1.md, re-parsed, equals its record of
 * `TRANSFORMATION_MATRICES` in order, statements, P, Q, crystal system and page; Q = P⁻¹ holds
 * exactly in rationals for every printed row (a check of the transcription that does not use
 * symcrys); and `changeOfCoordinates` reads each P back as fractions and gives Q as its inverse.
 */

import { describe, expect, it } from 'vitest';
import { changeOfCoordinates, TRANSFORMATION_MATRICES, type Mat3 } from './index.js';
import * as magnetic from './magnetic.js';
import { expectHeader, readReference, tableRows } from './testUtils/references.js';

const rows = tableRows(readReference('itc/vol-a-2016-table-1.5.1.1.md'));
expectHeader(rows, ['No.', 'Page', 'Transformation', 'P', 'Q', 'Crystal system']);
const printed = rows.slice(1);

/** A rational as [numerator, denominator] (bigint), reduced. */
type Q = [bigint, bigint];
const gcd = (a: bigint, b: bigint): bigint => (b === 0n ? (a < 0n ? -a : a) : gcd(b, a % b));
const q = (n: bigint, d: bigint): Q => {
  const g = gcd(n, d) * (d < 0n ? -1n : 1n);
  return [n / g, d / g];
};
const parse = (s: string): Q => {
  const [n, d] = s.split('/');
  return q(BigInt(n), BigInt(d ?? '1'));
};
const matrix = (s: string): Q[][] => s.split(';').map((r) => r.trim().split(/\s+/).map(parse));
const product = (a: Q[][], b: Q[][]): Q[][] =>
  a.map((row) =>
    [0, 1, 2].map((j) =>
      row.reduce<Q>(
        (sum, x, k) => q(sum[0] * x[1] * b[k][j][1] + x[0] * b[k][j][0] * sum[1], sum[1] * x[1] * b[k][j][1]),
        [0n, 1n],
      ),
    ),
  );
const value = ([n, d]: Q) => Number(n) / Number(d);

describe('ITA Table 1.5.1.1', () => {
  it('has the 41 printed rows, in order, in both point-group entry points', () => {
    expect(printed.map((r) => Number(r[0]))).toEqual(Array.from({ length: 41 }, (_, i) => i + 1));
    expect(TRANSFORMATION_MATRICES).toHaveLength(41);
    expect(magnetic.TRANSFORMATION_MATRICES).toBe(TRANSFORMATION_MATRICES);
    expect(Object.isFrozen(TRANSFORMATION_MATRICES[0].linearPart[0])).toBe(true);
  });

  for (const [no, page, transformation, p, inverse, system] of printed) {
    it(`row ${no}: ${transformation.slice(0, 60)}`, () => {
      const P = matrix(p);
      const Qm = matrix(inverse);
      // Q = P⁻¹ in print, exactly.
      expect(product(P, Qm)).toEqual([0, 1, 2].map((i) => [0, 1, 2].map((j) => (i === j ? [1n, 1n] : [0n, 1n]))));
      const record = TRANSFORMATION_MATRICES[Number(no) - 1];
      expect(record.statements).toEqual(transformation.split(';').map((s) => s.trim()));
      expect(record.page).toBe(Number(page));
      expect(record.crystalSystem).toBe(system);
      expect(record.linearPart).toEqual(P.map((row) => row.map(value)));
      expect(record.inverseLinearPart).toEqual(Qm.map((row) => row.map(value)));
      // changeOfCoordinates reads P as fractions and gives Q as the inverse.
      const change = changeOfCoordinates({ linearPart: record.linearPart }, {});
      const back = change.inverse.linearPart as unknown as number[][];
      back.forEach((row, i) => row.forEach((x, j) => expect(x).toBeCloseTo(record.inverseLinearPart[i][j], 12)));
    });
  }

  it('a row used as printed: hexagonal P → triple hexagonal cell H₁ triples the cell volume', () => {
    const h1 = TRANSFORMATION_MATRICES.find((r) =>
      r.statements[0].startsWith('Hexagonal cell P → triple hexagonal cell H₁'),
    );
    expect(h1).toBeDefined();
    const g: Mat3 = [
      [1, -0.5, 0],
      [-0.5, 1, 0],
      [0, 0, 2],
    ];
    const metric = changeOfCoordinates({ linearPart: h1!.linearPart }, { metric: g }).metric!;
    const det = (m: readonly (readonly number[])[]) =>
      m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
      m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
      m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
    expect(det(metric) / det(g)).toBeCloseTo(9, 12);
  });
});
