import { describe, expect, it } from 'vitest';
import { parseAsymmetricUnit } from './cell.js';

describe('parseAsymmetricUnit', () => {
  it('reads chains, min() and fractions of sums', () => {
    expect(parseAsymmetricUnit('0 <= x <= 1/2; y <= min(1 - x, (1 + x)/2); x <= 2y')).toEqual([
      [-1, 0, 0],
      [2, 0, 1],
      [1, 1, 1],
      [-1, 2, 1],
      [1, -2, 0],
    ]);
  });

  it('refuses what it cannot read', () => {
    expect(() => parseAsymmetricUnit('x < 1')).toThrow(RangeError);
    expect(() => parseAsymmetricUnit('0 <= 1')).toThrow(RangeError);
    expect(() => parseAsymmetricUnit('x <= z')).toThrow(RangeError);
    expect(() => parseAsymmetricUnit('x <= (1 + y')).toThrow(RangeError);
  });
});
