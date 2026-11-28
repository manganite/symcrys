/**
 * The geometry of a point operation: its proper rotation part, its order and axis, what it is
 * (rotation, mirror, …), and which elements a list of operations has along a direction. Shared by
 * the description of the operations (elements.ts, identify.ts) and the symbols of the settings
 * (classSymbols.ts). Internal; at run time it imports no module of the point groups (only a type),
 * so that every one of them can use it.
 */

import { ANGLE_EPSILON, AXIS_EPSILON } from '../tolerances.js';
import { det, dot, normalize, trace, type Mat3, type Vec3 } from '../linalg.js';
import type { OperationKind } from './elements.js';

/** True if two unit vectors are parallel or antiparallel. */
export const parallel = (a: Vec3, b: Vec3): boolean => Math.abs(Math.abs(dot(a, b)) - 1) < AXIS_EPSILON;

/** The proper rotation part of a matrix and its order n (1 for the identity). */
function rotationPart(m: Mat3): { r: Mat3; n: number } {
  const r = det(m) > 0 ? m : (m.map((row) => row.map((v) => -v)) as unknown as Mat3);
  const cos = Math.max(-1, Math.min(1, (trace(r) - 1) / 2));
  const angle = Math.acos(cos);
  const n = angle < ANGLE_EPSILON ? 1 : Math.round((2 * Math.PI) / angle);
  if (![1, 2, 3, 4, 6].includes(n)) throw new Error(`Not a crystallographic operation (rotation order ${n})`);
  return { r, n };
}

/** The axis of a proper rotation of order n ≥ 2 (sign arbitrary for n = 2). */
export function rotationAxis(r: Mat3, n: number): Vec3 {
  if (n === 2) {
    // r + 1 has rank 1; its columns are parallel to the axis.
    let best: Vec3 = [0, 0, 0];
    let size = 0;
    for (let j = 0; j < 3; j++) {
      const col: Vec3 = [r[0][j] + (j === 0 ? 1 : 0), r[1][j] + (j === 1 ? 1 : 0), r[2][j] + (j === 2 ? 1 : 0)];
      const l = Math.hypot(col[0], col[1], col[2]);
      if (l > size) {
        size = l;
        best = col;
      }
    }
    return normalize(best);
  }
  return normalize(axialVector(r));
}

/** (r − rᵀ)/2 as a vector: sin θ times the unit axis for a rotation by θ. */
export const axialVector = (r: Mat3): Vec3 => [
  (r[2][1] - r[1][2]) / 2,
  (r[0][2] - r[2][0]) / 2,
  (r[1][0] - r[0][1]) / 2,
];

/** What a Cartesian point operation is, without time reversal. */
export interface Element {
  readonly kind: OperationKind;
  /** The n of the symbol n or n̄: 1 for the identity and the inversion, 2 for a reflection. */
  readonly n: number;
  /** The proper rotation part, the matrix or its negative, whichever has determinant +1. */
  readonly rotation: Mat3;
  /**
   * The unit axis of the rotation part (for a reflection the normal of the mirror), sign arbitrary
   * for n = 2; absent for the identity and the inversion.
   */
  readonly axis?: Vec3;
}

/** What a Cartesian point operation is: its kind, its n and its axis; a rotoinversion n̄ is the inversion times the rotation n. */
export function elementOf(m: Mat3): Element {
  const proper = det(m) > 0;
  const { r, n } = rotationPart(m);
  if (n === 1) return { kind: proper ? 'identity' : 'inversion', n: 1, rotation: r };
  const kind: OperationKind = proper ? 'rotation' : n === 2 ? 'reflection' : 'rotoinversion';
  return { kind, n, rotation: r, axis: rotationAxis(r, n) };
}

/** The symmetry elements along one direction. */
export interface ElementsAlong {
  /** Highest n of a rotation n about the direction; 1 if there is none. */
  readonly rotation: number;
  /** Highest n of a rotoinversion n̄ (n = 3, 4, 6) about the direction; 0 if there is none. */
  readonly rotoinversion: number;
  /** True if a mirror plane is perpendicular to the direction. */
  readonly mirror: boolean;
}

/** The elements along the unit vector `u` among `elements`, each with its kind, its n and its axis. */
export function elementsAlong(
  elements: readonly { readonly kind: OperationKind; readonly n: number; readonly axis?: Vec3 }[],
  u: Vec3,
): ElementsAlong {
  const on = elements.filter((e) => e.axis !== undefined && parallel(e.axis, u));
  const max = (kind: OperationKind, none: number) =>
    on.filter((e) => e.kind === kind).reduce((m, e) => Math.max(m, e.n), none);
  return {
    rotation: max('rotation', 1),
    rotoinversion: max('rotoinversion', 0),
    mirror: on.some((e) => e.kind === 'reflection'),
  };
}
