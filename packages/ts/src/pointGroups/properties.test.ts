/**
 * Centrosymmetric and chiral for a list of operations: consistency with the fields of
 * `pointGroup()`, which are anchored in print (properties.reference.test.ts), and what the
 * functions ask of a list.
 */

import { describe, expect, it } from 'vitest';
import { det } from '../linalg.js';
import type { Operation } from '../operations.js';
import { tensorFormOf } from '../tensors/tensorForm.js';
import { MAGNETIC_POINT_GROUP_KEYS, generators, operations, pointGroup } from './pointGroups.js';
import { isCentrosymmetricOf, isChiralOf } from './properties.js';

describe('centrosymmetric and chiral for a list of operations', () => {
  // Exhaustive (122 groups, two conventions, closure of the generators): about 1–2 s alone, more under the load of the
  // full suite, so it gets a limit of its own instead of the default 5 s.
  it('agree with the fields for every group, from all operations and from the generators', { timeout: 30_000 }, () => {
    for (const key of MAGNETIC_POINT_GROUP_KEYS) {
      const g = pointGroup(key);
      for (const convention of ['itc', 'birss'] as const) {
        for (const list of [operations(key, { convention }), generators(key, { convention })]) {
          expect(isCentrosymmetricOf(list), `${key} ${convention}`).toBe(g.centrosymmetric);
          expect(isChiralOf(list), `${key} ${convention}`).toBe(g.chiral);
        }
      }
    }
  });

  it('the inversion with time reversal alone does not make a group centrosymmetric', () => {
    expect(pointGroup("-1'").centrosymmetric).toBe(false);
    expect(pointGroup("-11'").centrosymmetric).toBe(true);
    expect(isCentrosymmetricOf(operations("-1'"))).toBe(false);
    expect(isCentrosymmetricOf(operations("-11'"))).toBe(true);
    // 2/m from a twofold axis and the mirror plane normal to it: the inversion is their product.
    const [, two, , mirror] = operations('2/m', { setting: 1 });
    expect(isCentrosymmetricOf([two])).toBe(false);
    expect(isCentrosymmetricOf([two, mirror])).toBe(true);
    expect(isChiralOf([two])).toBe(true);
    expect(isChiralOf([two, mirror])).toBe(false);
  });

  it('an empty list is the group 1; a list need not be closed', () => {
    expect(isCentrosymmetricOf([])).toBe(false);
    expect(isChiralOf([])).toBe(true);
    const fourBar = operations('-4').find((op) => det(op.matrix) < 0)!;
    expect(isChiralOf([fourBar])).toBe(false);
    expect(isCentrosymmetricOf([fourBar])).toBe(false);
  });

  it('an operation that does not say whether it has time reversal is refused by both', () => {
    const inversion = { matrix: operations('-1')[1].matrix } as unknown as Operation;
    expect(() => isCentrosymmetricOf([inversion])).toThrow(/Operation 0: timeReversal must be true or false/);
    expect(() => isChiralOf([inversion])).toThrow(/Operation 0: timeReversal must be true or false/);
  });

  it('a matrix that is not orthogonal is refused by both, as by tensorFormOf', () => {
    const stretched: Operation = { matrix: [[2, 0, 0], [0, 1, 0], [0, 0, 1]], timeReversal: false }; // prettier-ignore
    const nearly: Operation = { matrix: [[-1, 0, 0], [0, -1, 0], [0, 0, -1.0001]], timeReversal: false }; // prettier-ignore
    const nan: Operation = { matrix: [[NaN, 0, 0], [0, 1, 0], [0, 0, 1]], timeReversal: false }; // prettier-ignore
    for (const op of [stretched, nearly, nan]) {
      const list = [operations('2')[1], op];
      expect(() => isCentrosymmetricOf(list)).toThrow(/Operation 1 is not an orthogonal \(Cartesian\) matrix/);
      expect(() => isChiralOf(list)).toThrow(/Operation 1 is not an orthogonal \(Cartesian\) matrix/);
      expect(() => tensorFormOf(list, 'pyroelectric')).toThrow(/Operation 1 is not an orthogonal \(Cartesian\) matrix/);
    }
  });
});
