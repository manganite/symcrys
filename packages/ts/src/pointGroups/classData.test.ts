/**
 * The exact ITC class data (classData.ts, #122) against the ITC output of the API. Since PR 2b the
 * API reads the settings, symbols, defaults, operations, generators and lattice operations of the
 * classes in the ITC convention from these data, so this test checks the wiring (every setting, the
 * same order, no copy that drifts); that the output did not change is checked by the ITC baseline
 * pins (#121, itcBaseline.pins.test.ts), and its correctness by classData.reference.test.ts. Also the
 * change of basis that gives `2mm` and `m2m` (ITA 2016 Table 1.5.4.4, cab and bca).
 */

import { describe, expect, it } from 'vitest';
import { matricesEqual, type Mat3 } from '../linalg.js';
import { CLASSES, itcCartesianGenerators, itcCartesianOperations, itcLatticeOperations } from './classData.js';
import { POINT_GROUP_KEYS, generators, operations, settings } from './pointGroups.js';

const SETTINGS = CLASSES.flatMap((c) => c.settings.map((s) => [`${c.key} #${s.index} ${s.short}`, c, s] as const));

const sameMatrices = (a: readonly Mat3[], b: readonly Mat3[]) =>
  a.length === b.length && a.every((m, i) => matricesEqual(m, b[i]));

describe('the API gives the exact ITC class data', () => {
  it('has the 32 classes in the order of POINT_GROUP_KEYS', () => {
    expect(CLASSES.map((c) => c.key)).toEqual([...POINT_GROUP_KEYS]);
  });

  it.each(CLASSES.map((c) => [c.key, c] as const))('%s: the same settings', (key, c) => {
    expect(
      c.settings.map((s) => ({
        index: s.index,
        symbol: s.short,
        fullSymbol: s.full,
        ...(s.uniqueAxis ? { uniqueAxis: s.uniqueAxis } : {}),
        ...(s.axes ? { axes: s.axes } : {}),
        isDefault: s.isDefault,
      })),
    ).toEqual(settings(key));
  });

  it.each(SETTINGS)('%s: the same operations, in the same order', (_, c, s) => {
    const current = operations(c.key, { setting: s.index }).map((o) => o.cartesian);
    expect(sameMatrices(itcCartesianOperations(c.key, s.index), current)).toBe(true);
  });

  it.each(SETTINGS)('%s: the same generators', (_, c, s) => {
    const current = generators(c.key, { setting: s.index }).map((o) => o.cartesian);
    expect(sameMatrices(itcCartesianGenerators(c.key, s.index), current)).toBe(true);
  });

  it.each(SETTINGS)('%s: the same lattice operations', (_, c, s) => {
    const current = operations(c.key, { setting: s.index }).map((o) => o.matrix);
    expect(itcLatticeOperations(c.key, s.index).map((w) => w.map((row) => [...row]))).toEqual(
      current.map((m) => m.map((row) => row.map((x) => x + 0))),
    );
  });
});

describe('settings by a change of basis (ITA 2016 Table 1.5.4.4)', () => {
  it('2mm and m2m have the twofold axis along a and b', () => {
    const twofold = (ops: readonly (readonly (readonly number[])[])[]) =>
      ops.find((w) => w[0][0] + w[1][1] + w[2][2] === -1 && w[0][0] * w[1][1] * w[2][2] === 1);
    expect(twofold(itcLatticeOperations('mm2', 1))).toEqual([
      [-1, 0, 0],
      [0, -1, 0],
      [0, 0, 1],
    ]);
    expect(twofold(itcLatticeOperations('mm2', 2))).toEqual([
      [1, 0, 0],
      [0, -1, 0],
      [0, 0, -1],
    ]);
    expect(twofold(itcLatticeOperations('mm2', 3))).toEqual([
      [-1, 0, 0],
      [0, 1, 0],
      [0, 0, -1],
    ]);
  });
});
