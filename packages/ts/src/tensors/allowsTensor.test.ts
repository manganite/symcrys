/**
 * The yes/no question of the named properties (#100): `allowsTensor`, which reads the dimension of
 * the invariant space from the trace of the group average without the row reduction, agrees with
 * the full form (`tensorForm`, checked against print in the reference tests) for every point group
 * in every setting and every kind of tensor, also with the group turned into a general orientation.
 * And the cache of `tensorFormOf` gives the form of a fresh computation, kept apart by operations,
 * tolerance and specification.
 */

import { describe, expect, it } from 'vitest';
import { type Mat3 } from '../linalg.js';
import { operations, settings } from '../pointGroups/pointGroups.js';
import { MAGNETIC_POINT_GROUP_KEYS } from '../pointGroups/keys.js';
import type { CartesianOperation } from '../operations.js';
import { allowsTensor, checkedSpec, tensorForm, tensorFormOf, type TensorSpec } from './tensorForm.js';

const KINDS = ['polar', 'axial'] as const;
const PARITIES = ['even', 'odd'] as const;
const INTRINSIC: Record<number, TensorSpec['intrinsic'][]> = {
  0: ['none'],
  1: ['none'],
  2: ['none', 'symmetric-first-pair', 'antisymmetric', 'totally-symmetric'],
  3: ['none', 'symmetric-last-pair', 'symmetric-first-pair', 'totally-symmetric'],
  4: ['symmetric-pairs', 'symmetric-pairs-exchangeable', 'totally-symmetric'],
};
const SPECS: TensorSpec[] = Object.entries(INTRINSIC).flatMap(([rank, intrinsics]) =>
  intrinsics.flatMap((intrinsic) =>
    KINDS.flatMap((kind) =>
      PARITIES.map((timeParity) => ({ rank: Number(rank), kind, timeParity, intrinsic }) as TensorSpec),
    ),
  ),
);

const mul = (a: Mat3, b: Mat3): Mat3 =>
  a.map((row) => [0, 1, 2].map((j) => row[0] * b[0][j] + row[1] * b[1][j] + row[2] * b[2][j])) as unknown as Mat3;
const transpose = (a: Mat3): Mat3 => [0, 1, 2].map((i) => [0, 1, 2].map((j) => a[j][i])) as unknown as Mat3;
/** A rotation into a general orientation (no axis along a symmetry direction of any group). */
const TURN: Mat3 = (() => {
  const [a, b, c] = [0.3, 0.7, 1.1];
  const rx: Mat3 = [
    [1, 0, 0],
    [0, Math.cos(a), -Math.sin(a)],
    [0, Math.sin(a), Math.cos(a)],
  ];
  const ry: Mat3 = [
    [Math.cos(b), 0, Math.sin(b)],
    [0, 1, 0],
    [-Math.sin(b), 0, Math.cos(b)],
  ];
  const rz: Mat3 = [
    [Math.cos(c), -Math.sin(c), 0],
    [Math.sin(c), Math.cos(c), 0],
    [0, 0, 1],
  ];
  return mul(rz, mul(ry, rx));
})();
const turned = (ops: readonly CartesianOperation[]): CartesianOperation[] =>
  ops.map((op) => ({ cartesian: mul(TURN, mul(op.cartesian, transpose(TURN))), timeReversal: op.timeReversal }));

describe('allowsTensor: the trace of the group average', () => {
  for (const key of MAGNETIC_POINT_GROUP_KEYS) {
    it(key, () => {
      for (const { index } of settings(key)) {
        const ops = operations(key, { setting: index });
        for (const s of SPECS) {
          const { spec, perms } = checkedSpec(s);
          const allowed = tensorForm(key, spec, { setting: index }).basis.length > 0;
          const label = `${key} setting ${index}, rank ${s.rank} ${s.kind} ${s.timeParity} ${s.intrinsic}`;
          expect(allowsTensor(ops, spec, perms), label).toBe(allowed);
          if (index === 1) expect(allowsTensor(turned(ops), spec, perms), `${label}, turned`).toBe(allowed);
        }
      }
    });
  }
});

describe('the cache of tensorFormOf', () => {
  const ops = turned(operations('6/mmm'));
  const rounded = ops.map((op) => ({
    ...op,
    cartesian: op.cartesian.map((row) => row.map((x) => Math.round(x * 1e5) / 1e5)) as unknown as Mat3,
  }));

  it('gives the same frozen form for the same operations, and the form of a fresh computation', () => {
    const first = tensorFormOf(ops, 'piezoelectric');
    const again = tensorFormOf(
      ops.map((op) => ({ cartesian: op.cartesian.map((row) => [...row]) as unknown as Mat3, timeReversal: false })),
      'piezoelectric',
    );
    expect(again).toBe(first);
    expect(Object.isFrozen(first)).toBe(true);
    // Another specification, other operations and another tolerance are other entries.
    expect(tensorFormOf(ops, 'gyrotropic')).not.toBe(first);
    expect(tensorFormOf(rounded, 'piezoelectric', { tolerance: 1e-4 })).not.toBe(first);
    expect(tensorFormOf(ops, 'piezoelectric', { tolerance: 1e-5 })).not.toBe(first);
    expect(tensorFormOf(rounded, 'piezoelectric', { tolerance: 1e-4 }).basis.length).toBe(first.basis.length);
  });

  it('refuses wrong operations also when the same list was seen before', () => {
    tensorFormOf(ops, 'piezoelectric');
    const broken = ops.map((op, i) =>
      i === 3
        ? {
            ...op,
            cartesian: [
              [2, 0, 0],
              [0, 1, 0],
              [0, 0, 1],
            ] as Mat3,
          }
        : op,
    );
    expect(() => tensorFormOf(broken, 'piezoelectric')).toThrow(RangeError);
  });
});
