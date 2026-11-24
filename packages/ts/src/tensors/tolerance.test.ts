/**
 * Operations with rounding errors (#89): rounded to 4, 5 or 6 decimals, as files and other programs
 * give them, the operations of every crystal class in every setting give the form of the exact
 * group, with its free parameters; in a general orientation, its number of free parameters. The
 * expected forms are those of `tensorForm`, which computes with the exact operations of the class
 * and is checked against print in the reference tests.
 */

import { describe, expect, it } from 'vitest';
import { type Mat3 } from '../linalg.js';
import { POINT_GROUP_KEYS, operations, settings } from '../pointGroups/pointGroups.js';
import { MAGNETIC_POINT_GROUP_KEYS } from '../pointGroups/keys.js';
import { TENSOR_PROPERTY_NAMES } from './propertyTable.js';
import { tensorForm, tensorFormOf, type TensorSpec } from './tensorForm.js';
import { allowedPropertiesOf, allowedProperties } from './tensorProperties.js';

const round = (m: Mat3, decimals: number): Mat3 =>
  m.map((row) => row.map((x) => Math.round(x * 10 ** decimals) / 10 ** decimals)) as unknown as Mat3;
const mul = (a: Mat3, b: Mat3): Mat3 =>
  a.map((row) => [0, 1, 2].map((j) => row[0] * b[0][j] + row[1] * b[1][j] + row[2] * b[2][j])) as unknown as Mat3;

const SPECS: readonly (TensorSpec | (typeof TENSOR_PROPERTY_NAMES)[number])[] = [
  ...TENSOR_PROPERTY_NAMES,
  { rank: 2, kind: 'polar', timeParity: 'even', intrinsic: 'none' },
  { rank: 3, kind: 'axial', timeParity: 'even', intrinsic: 'none' },
  { rank: 4, kind: 'polar', timeParity: 'even', intrinsic: 'none' },
  { rank: 4, kind: 'polar', timeParity: 'even', intrinsic: 'symmetric-pairs-exchangeable' },
];
const label = (s: (typeof SPECS)[number]) => (typeof s === 'string' ? s : `rank ${s.rank} ${s.kind} ${s.intrinsic}`);

describe('rounded operations give the form of the exact group (#89)', () => {
  for (const key of POINT_GROUP_KEYS) {
    for (const s of settings(key)) {
      it(`${key}, setting ${s.index}: rounded to 4, 5 and 6 decimals`, () => {
        for (const decimals of [4, 5, 6]) {
          const ops = operations(key, { setting: s.index }).map((op) => ({
            cartesian: round(op.cartesian, decimals),
            timeReversal: false,
          }));
          // A tolerance ten times the rounding unit: errors add up in the products of the closure.
          const options = { tolerance: 10 ** (1 - decimals) };
          for (const spec of SPECS) {
            const exact = tensorForm(key, spec, { setting: s.index });
            const form = tensorFormOf(ops, spec, options);
            const what = `${decimals} decimals, ${label(spec)}`;
            expect(form.parameters, what).toEqual(exact.parameters);
            expect(form.relations.length, what).toBe(exact.relations.length);
            form.basis.forEach((row, i) =>
              row.forEach((v, j) => expect(Math.abs(v - exact.basis[i][j]), what).toBeLessThan(10 ** (2 - decimals))),
            );
          }
          expect(allowedPropertiesOf(ops, options)).toEqual(allowedProperties(key));
        }
      });
    }
  }
});

describe('rounded operations of the 122 groups in a general orientation give the number of free parameters (#89)', () => {
  const c = Math.cos(0.7);
  const s = Math.sin(0.7);
  const r: Mat3 = [
    [c, -s, 0],
    [s * 0.6, c * 0.6, -0.8],
    [s * 0.8, c * 0.8, 0.6],
  ];
  const rt = r.map((_, i) => r.map((row) => row[i])) as unknown as Mat3;
  // Every setting: the review of #89 found wrong counts for mm2 settings 2 and 3 at 5 decimals,
  // when the rank was read off the pivots instead of the trace of the projection.
  for (const key of MAGNETIC_POINT_GROUP_KEYS) {
    for (const s of settings(key)) {
      it(`${key}, setting ${s.index}: rounded to 4, 5 and 6 decimals after a rotation`, () => {
        for (const decimals of [4, 5, 6]) {
          const ops = operations(key, { setting: s.index }).map((op) => ({
            cartesian: round(mul(mul(r, op.cartesian), rt), decimals),
            timeReversal: op.timeReversal,
          }));
          for (const spec of SPECS) {
            expect(
              tensorFormOf(ops, spec, { tolerance: 10 ** (1 - decimals) }).parameters.length,
              `${decimals} decimals, ${label(spec)}`,
            ).toBe(tensorForm(key, spec, { setting: s.index }).parameters.length);
          }
        }
      });
    }
  }
});
