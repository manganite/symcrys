/**
 * The Shubnikov symbol of a point group of type I or III, computed from its Cartesian operations
 * and their time reversal (docs/conventions.md, "Symbols"), in the notation of the transcription of
 * ITC Vol. D Table 1.5.2.3: a leading `_` is the underline (time reversal), a leading `-` the
 * overbar (a rotoreflection axis), `.` the centred dot, `:` and `/` as printed.
 */

import { det, dot, normalize, trace, type Mat3, type Vec3 } from '../linalg.js';
import { ANGLE_EPSILON, AXIS_EPSILON } from '../tolerances.js';

/** A Cartesian operation and whether it carries time reversal. */
export interface ShubnikovOperation {
  readonly cartesian: Mat3;
  readonly timeReversal: boolean;
}

interface Element {
  readonly proper: boolean;
  /** The order of the proper part (1 for the identity and the inversion). */
  readonly n: number;
  /** The axis of the proper part (the normal of a reflection); undefined for n = 1. */
  readonly axis?: Vec3;
  readonly timeReversal: boolean;
}

const parallel = (a: Vec3, b: Vec3): boolean => Math.abs(Math.abs(dot(a, b)) - 1) < AXIS_EPSILON;
const perpendicular = (a: Vec3, b: Vec3): boolean => Math.abs(dot(a, b)) < AXIS_EPSILON;

function element(op: ShubnikovOperation): Element {
  const proper = det(op.cartesian) > 0;
  const r = proper ? op.cartesian : (op.cartesian.map((row) => row.map((x) => -x)) as unknown as Mat3);
  const cos = Math.max(-1, Math.min(1, (trace(r) - 1) / 2));
  const angle = Math.acos(cos);
  const n = angle < ANGLE_EPSILON ? 1 : Math.round((2 * Math.PI) / angle);
  if (n === 1) return { proper, n, timeReversal: op.timeReversal };
  // The axis: a nonzero column of r + 1 for a twofold part, the axial vector otherwise.
  let axis: Vec3;
  if (n === 2) {
    const columns = [0, 1, 2].map((j) => [0, 1, 2].map((i) => r[i][j] + (i === j ? 1 : 0)) as unknown as Vec3);
    axis = normalize(columns.reduce((a, b) => (Math.hypot(...b) > Math.hypot(...a) ? b : a)));
  } else {
    axis = normalize([r[2][1] - r[1][2], r[0][2] - r[2][0], r[1][0] - r[0][1]]);
  }
  return { proper, n, axis, timeReversal: op.timeReversal };
}

/** `_` if every element of a role carries time reversal (the role's element is underlined), '' otherwise. */
const mark = (role: readonly Element[]): string => (role.length > 0 && role.every((e) => e.timeReversal) ? '_' : '');

/**
 * The Shubnikov symbol (Shubnikov & Belov 1964; ITC Vol. D § 1.5.2.1, Table 1.5.2.3, column 3):
 *
 * - Cubic groups: the threefold axes (`3`, or `-6` for 3̄, the rotoreflection 6̃), `/`, the element
 *   along the cube axes (`4`, `-4` or `2`).
 * - Otherwise along the main axis: the axis of the highest order of a proper part (−W for an
 *   improper operation, so that a mirror normal counts as a twofold axis), and of several, the axis
 *   of a rotation without time reversal, else of a rotation, else of a rotoinversion. On it `n` for
 *   a rotation, `-4` for 4̄, `-6` for 3̄, `3` with `:m` for 6̄ (= 3/m), `-2` for 1̄, `m` for a group of
 *   one reflection; then `m.n:m` with a mirror normal to the axis and mirrors containing it, `n:m`
 *   with the first only, `n.m` with the second only, `n:2` with twofold axes normal to it.
 * - An element is underlined where every operation of its role carries time reversal: the rotations
 *   (or rotoinversions) of its order about the main axis, the mirrors normal to or containing it,
 *   the twofold axes normal to it. So of two kinds of mirrors or twofold axes, one without time
 *   reversal is written.
 */
export function shubnikovSymbol(operations: readonly ShubnikovOperation[]): string {
  const all = operations.map(element);
  const rotations = all.filter((e) => e.proper && e.n > 1);
  const threefold = rotations.filter((e) => e.n === 3);
  const threefoldAxes = threefold.filter((e, i) => threefold.findIndex((f) => parallel(f.axis!, e.axis!)) === i);
  const inversion = all.filter((e) => !e.proper && e.n === 1);
  if (threefoldAxes.length === 4) {
    // The fourfold rotations and rotoinversions, and in 23 and m-3 the twofold rotations, lie on the
    // cube axes only.
    const along = (n: number, proper: boolean): Element[] => all.filter((e) => e.proper === proper && e.n === n);
    const a = inversion.length > 0 ? `${mark(all.filter((e) => !e.proper && e.n === 3))}-6` : `${mark(threefold)}3`;
    const four = along(4, true);
    const roto = along(4, false);
    const b = four.length > 0 ? `${mark(four)}4` : roto.length > 0 ? `${mark(roto)}-4` : `${mark(along(2, true))}2`;
    return `${a}/${b}`;
  }
  if (rotations.length === 0) {
    if (inversion.length > 0) return `${mark(inversion)}-2`;
    const mirrors = all.filter((e) => !e.proper && e.n === 2);
    return mirrors.length > 0 ? `${mark(mirrors)}m` : '1';
  }
  // The main axis: the highest order of a proper part; among twofold rotation axes one without time reversal.
  const top = Math.max(...all.map((e) => e.n));
  const candidates = all.filter((e) => e.n === top && e.axis);
  const preferred =
    candidates.find((e) => e.proper && !e.timeReversal) ?? candidates.find((e) => e.proper) ?? candidates[0];
  const c = preferred.axis!;
  const about = (proper: boolean, n: number): Element[] =>
    all.filter((e) => e.proper === proper && e.n === n && e.axis && parallel(e.axis, c));
  const horizontalMirror = all.filter((e) => !e.proper && e.n === 2 && parallel(e.axis!, c));
  const verticalMirrors = all.filter((e) => !e.proper && e.n === 2 && perpendicular(e.axis!, c));
  const horizontalTwofold = all.filter((e) => e.proper && e.n === 2 && perpendicular(e.axis!, c));
  const nRotation = Math.max(1, ...all.filter((e) => e.proper && e.axis && parallel(e.axis, c)).map((e) => e.n));
  let main: string;
  if (nRotation === 3 && about(false, 6).length > 0) {
    // 6̄ = 3/m: the threefold rotation and the mirror normal to it.
    main = `${mark(about(true, 3))}3`;
  } else if (nRotation === 3 && inversion.length > 0) {
    main = `${mark(about(false, 3))}-6`;
  } else if (nRotation === 2 && about(false, 4).length > 0) {
    // 4̄ with a mirror normal to it would generate a fourfold rotation: no such mirror here.
    main = `${mark(about(false, 4))}-4`;
  } else {
    main = `${mark(about(true, nRotation))}${nRotation}`;
  }
  const vertical = verticalMirrors.length > 0 ? `${mark(verticalMirrors)}m` : '';
  const normal = horizontalMirror.length > 0 ? `${mark(horizontalMirror)}m` : '';
  if (normal && vertical) return `${vertical}.${main}:${normal}`;
  if (normal) return `${main}:${normal}`;
  if (vertical) return `${main}.${vertical}`;
  if (horizontalTwofold.length > 0) return `${main}:${mark(horizontalTwofold)}2`;
  return main;
}
