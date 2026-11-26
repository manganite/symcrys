/**
 * Birss's frame and the ITC frame (test-only code, fixture class (b)): the rotation R that carries
 * a group as Birss prints it (Tables 3, 6 and 7, with the generating matrices σ(N) of eq. (2.17),
 * pp. 48–49) onto the same group in the ITC default setting of symcrys, W_ITC = R·W_Birss·Rᵀ, so
 * that Birss's print stays an independent second check of the ITC output after the Birss
 * convention is gone (GUIDE.md, "ITC as the standard").
 *
 * Both frames put x along a and z along c. They differ where the two print the same group in
 * another orientation, which their symbols show:
 *
 * - **monoclinic:** Birss takes the twofold axis or the mirror normal along z (Table 4a, p. 56:
 *   `2//z`; Table 3 generates `2` by σ(3), a rotation about z), ITC's default has unique axis b,
 *   along y: R carries z to y;
 * - **the hexagonal family with two orientations** (`32`, `3m`, `-3m`, `-6m2` and the magnetic groups
 *   with these classes whose ITC default is the orientation with the lateral elements along a):
 *   Birss reads position 2 of the symbol along y (Table 4a, pp. 56–57: `32: 2//y`, `3m: -2//y`), ITC
 *   along a = x: R is a quarter turn about z, carrying y to x;
 * - **`mm'm'`:** Birss prints `m'm'm` (Table 6), the mirror without time reversal normal to z, ITC
 *   Vol. D prints `mm'm'` (Table 1.5.2.3), that mirror normal to x: R carries z to x.
 *
 * Everywhere else R is the identity. Which groups have which R is not assumed here: the tests
 * check, for every one of the 90 groups Birss prints (Tables 3 and 6; he prints no grey groups, so
 * the fixture has none), that R carries the closure of Birss's printed generators onto the ITC
 * operations. The quarter turns of the monoclinic and hexagonal groups cannot be told from their
 * inverses there (the groups are invariant under a half turn about the axis); the direction of R,
 * and so of Q = Rᵀ in `tensorToBirssFrame`, is fixed by `mm'm'` and by the rotated frames of
 * Birss's Table 7.
 */

import type { M } from './independentGroups.js';

const IDENTITY: M = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];
/** Rows are the new coordinates: x′ = x, y′ = z, z′ = −y (a quarter turn about x; z goes to y). */
const Z_TO_Y: M = [
  [1, 0, 0],
  [0, 0, 1],
  [0, -1, 0],
];
/** x′ = −y, y′ = x, z′ = z (a quarter turn about z; y goes to −x, an axis along x). */
const Y_TO_X: M = [
  [0, -1, 0],
  [1, 0, 0],
  [0, 0, 1],
];
/** x′ = z, y′ = x, z′ = y (a cyclic permutation; z goes to x). */
const Z_TO_X: M = [
  [0, 0, 1],
  [1, 0, 0],
  [0, 1, 0],
];

/** The monoclinic groups Birss prints: the classes `2`, `m`, `2/m` and their black-and-white groups. */
const MONOCLINIC = new Set(['2', 'm', '2/m', "2'", "m'", "2'/m'", "2/m'", "2'/m"]);

/** The groups of the hexagonal family whose ITC default turns the lateral elements from y to x. */
const HEXAGONAL_TURNED = new Set([
  '32',
  '3m',
  '-3m',
  '-6m2',
  "32'",
  "3m'",
  "-3m'",
  "-3'm'",
  "-3'm",
  "6'22'",
  "6'mm'",
  "-6'2m'",
  "-6'm2'",
  "-6m'2'",
  "6'/m'mm'",
]);

/**
 * Birss's directions of the positions of a symbol, by crystal system: as ITC, except that a
 * monoclinic symbol has one position, along z (Table 4a, p. 56: `2//z`), and that in the hexagonal
 * family position 2 is y (Table 4a, pp. 56–57: `32: 2//y`, `3m: -2//y`, `-6m2: -2//y`) and position
 * 3 is x (not printed; checked by the tests against the printed generators).
 */
export const BIRSS_DIRECTIONS: Readonly<Record<string, number[][]>> = {
  triclinic: [[0, 0, 1]],
  monoclinic: [[0, 0, 1]],
  orthorhombic: [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ],
  tetragonal: [
    [0, 0, 1],
    [1, 0, 0],
    [1, -1, 0],
  ],
  trigonal: [
    [0, 0, 1],
    [0, 1, 0],
    [1, 0, 0],
  ],
  hexagonal: [
    [0, 0, 1],
    [0, 1, 0],
    [1, 0, 0],
  ],
  cubic: [
    [1, 0, 0],
    [1, 1, 1],
    [1, -1, 0],
  ],
};

/** R for a group Birss prints (its symcrys key): W_ITC = R·W_Birss·Rᵀ. */
export function birssToItc(key: string): M {
  if (MONOCLINIC.has(key)) return Z_TO_Y;
  if (HEXAGONAL_TURNED.has(key)) return Y_TO_X;
  if (key === "mm'm'") return Z_TO_X;
  return IDENTITY;
}

const transpose = (a: M): M => a[0].map((_, i) => a.map((row) => row[i]));
const product = (a: M, b: readonly (readonly number[])[]): M =>
  a.map((row) => b[0].map((_, j) => row.reduce((s, v, k) => s + v * b[k][j], 0)));

/** A matrix of the ITC frame in Birss's frame: Rᵀ·W·R. */
export function toBirssFrame(key: string, w: readonly (readonly number[])[]): M {
  const r = birssToItc(key);
  return product(product(transpose(r), w), r);
}

/** A matrix of Birss's frame in the ITC frame: R·W·Rᵀ. */
export function toItcFrame(key: string, w: readonly (readonly number[])[]): M {
  const r = birssToItc(key);
  return product(product(r, w), transpose(r));
}

/**
 * The components of a tensor (flat index, length 3^rank) in a frame rotated by the proper rotation
 * Q (rows: the new axes in the old frame): T′_{i…} = Σ Q_{ia}… T_{a…}. Polar and axial tensors
 * transform alike under a proper rotation.
 */
export function rotateComponents(tensor: readonly number[], rank: number, q: M): number[] {
  let t = [...tensor];
  // Transform one index at a time: index k (0 = first) of every component.
  for (let k = 0; k < rank; k++) {
    const stride = 3 ** (rank - 1 - k);
    const next = new Array<number>(t.length).fill(0);
    for (let flat = 0; flat < t.length; flat++) {
      const i = Math.floor(flat / stride) % 3;
      for (let a = 0; a < 3; a++) next[flat] += q[i][a] * t[flat + (a - i) * stride];
    }
    t = next;
  }
  return t.map((v) => v + 0);
}

/** The components of a tensor given in the ITC frame, in Birss's frame (Q = Rᵀ). */
export function tensorToBirssFrame(key: string, tensor: readonly number[], rank: number): number[] {
  return rotateComponents(tensor, rank, transpose(birssToItc(key)));
}
