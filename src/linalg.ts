/**
 * 3×3 linear algebra on Cartesian vectors and matrices. Matrices are row-major: `m[i][j]` is row
 * i, column j, and a matrix acts on a column vector from the left.
 */

import { EPSILON, SNAP_EPSILON } from './tolerances.js';

/** A Cartesian vector. */
export type Vec3 = readonly [number, number, number];

/** A Cartesian 3×3 matrix, as three rows. */
export type Mat3 = readonly [Vec3, Vec3, Vec3];

export const IDENTITY: Mat3 = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];

export const INVERSION: Mat3 = [
  [-1, 0, 0],
  [0, -1, 0],
  [0, 0, -1],
];

/** Builds a matrix from a row accessor. */
function build(f: (i: number, j: number) => number): Mat3 {
  return [
    [f(0, 0), f(0, 1), f(0, 2)],
    [f(1, 0), f(1, 1), f(1, 2)],
    [f(2, 0), f(2, 1), f(2, 2)],
  ];
}

/** The product a·b. */
export function multiply(a: Mat3, b: Mat3): Mat3 {
  return build((i, j) => a[i][0] * b[0][j] + a[i][1] * b[1][j] + a[i][2] * b[2][j]);
}

/** The matrix applied to a vector, m·v. */
export function apply(m: Mat3, v: Vec3): Vec3 {
  return [
    m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
    m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
    m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2],
  ];
}

export function transpose(a: Mat3): Mat3 {
  return build((i, j) => a[j][i]);
}

export function det(a: Mat3): number {
  return (
    a[0][0] * (a[1][1] * a[2][2] - a[1][2] * a[2][1]) -
    a[0][1] * (a[1][0] * a[2][2] - a[1][2] * a[2][0]) +
    a[0][2] * (a[1][0] * a[2][1] - a[1][1] * a[2][0])
  );
}

export function trace(a: Mat3): number {
  return a[0][0] + a[1][1] + a[2][2];
}

/** Proper rotation by `angleDeg` degrees about the z axis (counter-clockwise seen from +z). */
export function rotationZ(angleDeg: number): Mat3 {
  const r = (angleDeg * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return snap([
    [c, -s, 0],
    [s, c, 0],
    [0, 0, 1],
  ]);
}

/** Proper rotation by `angleDeg` degrees about the x axis. */
export function rotationX(angleDeg: number): Mat3 {
  const r = (angleDeg * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return snap([
    [1, 0, 0],
    [0, c, -s],
    [0, s, c],
  ]);
}

/** Proper rotation by `angleDeg` degrees about the y axis. */
export function rotationY(angleDeg: number): Mat3 {
  const r = (angleDeg * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return snap([
    [c, 0, s],
    [0, 1, 0],
    [-s, 0, c],
  ]);
}

/**
 * Exact values for snapping: the entries of every point-group operation in the frames of symcrys
 * (0, ±1, and ±1/2, ±√3/2 in the trigonal and hexagonal groups), and ±√2/2, the entries of the
 * 45° setting frame (rotationZ(45), which is snapped as well).
 */
const SNAP_VALUES = [0, 1, -1, 0.5, -0.5, Math.SQRT1_2, -Math.SQRT1_2, Math.sqrt(3) / 2, -Math.sqrt(3) / 2];

/** Replaces each entry within SNAP_EPSILON of an exact value by that value (this also turns −0 into 0). */
export function snap(a: Mat3): Mat3 {
  return build((i, j) => {
    const v = a[i][j];
    for (const s of SNAP_VALUES) if (Math.abs(v - s) < SNAP_EPSILON) return s;
    return v;
  });
}

/** True if all entries agree within EPSILON. */
export function matricesEqual(a: Mat3, b: Mat3): boolean {
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) if (Math.abs(a[i][j] - b[i][j]) > EPSILON) return false;
  return true;
}

/** The transformed matrix s·a·sᵀ, for an orthogonal s. */
export function conjugate(a: Mat3, s: Mat3): Mat3 {
  return multiply(multiply(s, a), transpose(s));
}
