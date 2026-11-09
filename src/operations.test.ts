import { describe, expect, it } from 'vitest';
import { INVERSION, rotationZ } from './linalg.js';
import { closeGroup, compose, operation, operationsEqual, type Operation } from './operations.js';

describe('closeGroup', () => {
  it('returns the identity first, then the generators', () => {
    const g = closeGroup([operation(rotationZ(90))]);
    expect(g).toHaveLength(4);
    expect(g[0].matrix).toEqual([
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ]);
    expect(operationsEqual(g[1], operation(rotationZ(90)))).toBe(true);
  });

  it('gives a group closed under multiplication', () => {
    const g = closeGroup([operation(rotationZ(60)), operation(INVERSION)]);
    expect(g).toHaveLength(12);
    for (const a of g) for (const b of g) expect(g.some((x) => operationsEqual(x, compose(a, b)))).toBe(true);
  });

  it('keeps time reversal apart from the matrix', () => {
    const primed: Operation = { matrix: rotationZ(180), timeReversal: true };
    const g = closeGroup([primed]);
    expect(g).toHaveLength(2);
    expect(g[1].timeReversal).toBe(true);
    expect(closeGroup([primed, operation(rotationZ(180))])).toHaveLength(4);
  });

  it('throws when the closure does not terminate (a non-crystallographic angle)', () => {
    expect(() => closeGroup([operation(rotationZ(1.234))])).toThrow(/does not terminate/);
  });
});
