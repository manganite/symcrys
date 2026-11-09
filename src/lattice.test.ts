/**
 * The Cartesian frame per crystal family. Expected values are the decision on #6 (x ∥ a, z ∥ c,
 * y = z × x for the hexagonal family), not library output.
 */

import { describe, expect, it } from 'vitest';
import { crystalFamily, latticeBasis, type FixedAngleFamily } from './lattice.js';

const column = (m: readonly (readonly number[])[], j: number) => [m[0][j], m[1][j], m[2][j]];
const dot = (u: number[], v: number[]) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];

describe('latticeBasis', () => {
  it('hexagonal: a ∥ x, c ∥ z, |a| = |b| = 1, angle(a, b) = 120°', () => {
    const m = latticeBasis('hexagonal');
    const [a, b, c] = [0, 1, 2].map((j) => column(m, j));
    expect(a).toEqual([1, 0, 0]);
    expect(c).toEqual([0, 0, 1]);
    expect(dot(b, b)).toBeCloseTo(1, 12);
    expect(dot(a, b)).toBeCloseTo(-0.5, 12);
    expect(b[1]).toBeGreaterThan(0); // b on the side of +y: y = z × x
    expect(b[2]).toBe(0);
  });

  it.each<FixedAngleFamily>(['orthorhombic', 'tetragonal', 'cubic'])('%s: a ∥ x, b ∥ y, c ∥ z', (family) => {
    expect(latticeBasis(family)).toEqual([
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ]);
  });

  it('refuses families with free cell angles', () => {
    expect(() => latticeBasis('monoclinic' as FixedAngleFamily)).toThrow(RangeError);
  });
});

describe('crystalFamily', () => {
  it('puts trigonal into the hexagonal family', () => {
    expect(crystalFamily('trigonal')).toBe('hexagonal');
    expect(crystalFamily('cubic')).toBe('cubic');
  });
});
