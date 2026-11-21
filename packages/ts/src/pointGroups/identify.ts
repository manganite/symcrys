/**
 * The point group of a list of operations, and the operations described geometrically, for any
 * list (for instance the operations left after distorting a crystal; docs/conventions.md, "Point
 * group of a list of operations"). Shared by both entry points.
 */

import { det, multiply, trace, type Mat3, type Vec3 } from '../linalg.js';
import { checkOrthogonal, checkTimeReversal, type Operation } from '../operations.js';
import { EPSILON } from '../tolerances.js';
import { axialVector, rotationAxis, rotationPart, type OperationKind } from './elements.js';
import {
  MAGNETIC_POINT_GROUP_KEYS,
  operations as groupOperations,
  settings,
  type MagneticPointGroupKey,
} from './pointGroups.js';

/** Options of `pointGroupOf`. */
export interface PointGroupOfOptions {
  /**
   * Two matrices are the same operation if no entry differs by this much or more. Default
   * `EPSILON` (10⁻⁶); a caller whose matrices carry rounding errors passes a larger value.
   */
  readonly tolerance?: number;
}

/** The point group of a list of operations: its key, and the setting if the operations are exactly those of one. */
export interface IdentifiedPointGroup {
  /** The key of the point group the operations generate. */
  readonly key: MagneticPointGroupKey;
  /**
   * The 1-based index of the setting whose operations the group equals, in the Cartesian frame of
   * symcrys; absent if the group is the point group in another orientation.
   */
  readonly setting?: number;
}

/** An axis in the Cartesian frame only, for operations that are not tied to a lattice. */
export interface CartesianAxis {
  /** Unit vector; its first non-zero component, in the order x, y, z, is positive. */
  readonly cartesian: Vec3;
}

/** One operation of any list described geometrically (`describeOperationsOf`). */
export interface CartesianOperationDescription {
  /** What the operation is, without time reversal. */
  readonly kind: OperationKind;
  /**
   * The n of the symbol n or n̄: 1 for the identity and the inversion, 2 for a mirror (m = 2̄),
   * otherwise the order of the rotation part.
   */
  readonly order: number;
  /** Rotation axis, rotoinversion axis or mirror normal; absent for the identity and the inversion. */
  readonly axis?: CartesianAxis;
  /**
   * For n ≥ 3: `'+'` if the rotation part turns by +360°/n about `axis` (counter-clockwise seen
   * from the tip of `axis` looking towards the origin), `'-'` if by −360°/n.
   */
  readonly sense?: '+' | '-';
  /** True if the operation is combined with time reversal (a primed operation). */
  readonly timeReversal: boolean;
}

/** Throws unless mᵀm = 1 within the tolerance (a matrix with rounding errors passes with a larger one). */
function checkOrthogonalWithin(m: Mat3, what: string, tolerance: number): void {
  if (tolerance <= EPSILON) {
    checkOrthogonal(m, what);
    return;
  }
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const d = m[0][i] * m[0][j] + m[1][i] * m[1][j] + m[2][i] * m[2][j];
      if (!(Math.abs(d - (i === j ? 1 : 0)) < tolerance)) {
        throw new RangeError(`${what} is not an orthogonal (Cartesian) matrix: ${JSON.stringify(m)}`);
      }
    }
  }
}

/** No point group has more than 96 operations (m-3m1'). */
const MAX_ORDER = 96;

function toleranceOf(options?: PointGroupOfOptions): number {
  const t = options?.tolerance ?? EPSILON;
  if (!(typeof t === 'number' && t > 0 && t < 0.1)) throw new RangeError(`Invalid tolerance: ${String(t)}`);
  return t;
}

const same = (a: Operation, b: Operation, tolerance: number): boolean =>
  a.timeReversal === b.timeReversal &&
  a.matrix.every((row, i) => row.every((v, j) => Math.abs(v - b.matrix[i][j]) < tolerance));

/** The group the operations generate, or undefined if it is larger than any point group. */
function close(ops: readonly Operation[], tolerance: number): Operation[] | undefined {
  const identity: Operation = {
    matrix: [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ],
    timeReversal: false,
  };
  const group: Operation[] = [identity];
  const add = (op: Operation): boolean => {
    if (group.some((g) => same(g, op, tolerance))) return true;
    if (group.length >= MAX_ORDER) return false;
    group.push(op);
    return true;
  };
  for (const op of ops) if (!add(op)) return undefined;
  for (let i = 0; i < group.length; i++) {
    for (let j = 0; j <= i; j++) {
      for (const [a, b] of [
        [group[i], group[j]],
        [group[j], group[i]],
      ]) {
        if (!add({ matrix: multiply(a.matrix, b.matrix), timeReversal: a.timeReversal !== b.timeReversal })) {
          return undefined;
        }
      }
    }
  }
  return group;
}

/**
 * How many operations of each kind a group has: determinant, trace and time reversal of each. For
 * the 122 point groups these counts are all different (a test checks it), and since the 122 are
 * all point groups up to orientation, the counts identify the point group of any finite group of
 * crystallographic operations.
 */
const signature = (ops: readonly Operation[]): string =>
  ops
    .map((op) => {
      const t = trace(op.matrix);
      const rounded = Math.round(t);
      if (Math.abs(t - rounded) > 1e-3) return 'x'; // not a crystallographic operation
      return `${Math.round(det(op.matrix))}:${rounded}${op.timeReversal ? "'" : ''}`;
    })
    .sort()
    .join(' ');

let bySignature: Map<string, MagneticPointGroupKey> | undefined;

function keyOfSignature(s: string): MagneticPointGroupKey | undefined {
  if (!bySignature) {
    bySignature = new Map();
    for (const key of MAGNETIC_POINT_GROUP_KEYS) bySignature.set(signature(groupOperations(key)), key);
  }
  return bySignature.get(s);
}

/**
 * The point group generated by a list of Cartesian operations, for instance those left after
 * distorting a crystal: its key, and the setting whose operations it equals in the frame of symcrys
 * (absent if the group is the point group in another orientation). The list is closed into a group
 * first, two matrices being equal when no entry differs by `tolerance` (default `EPSILON`) or more.
 * Time reversal counts: a list with time reversal gives a magnetic point group. Returns undefined
 * if the operations generate no point group (an operation of order 5, a group larger than 96).
 * Throws a RangeError for a matrix that is not orthogonal (within `tolerance`, at least
 * `EPSILON`). The classes `1` and `-1` have one setting and no orientation, so they always have
 * setting 1.
 */
export function pointGroupOf(
  operations: readonly Operation[],
  options?: PointGroupOfOptions,
): IdentifiedPointGroup | undefined {
  const tolerance = toleranceOf(options);
  checkTimeReversal(operations);
  operations.forEach((op, i) => checkOrthogonalWithin(op.matrix, `Operation ${i}`, tolerance));
  const group = close(operations, tolerance);
  if (!group) return undefined;
  const key = keyOfSignature(signature(group));
  if (!key) return undefined;
  const setting = settings(key, 'itc').find((s) => {
    const ops = groupOperations(key, { convention: 'itc', setting: s.index });
    return ops.length === group.length && ops.every((op) => group.some((g) => same(g, op, tolerance)));
  });
  return Object.freeze(setting ? { key, setting: setting.index } : { key });
}

/** The axis signed so that its first non-zero component, in the order x, y, z, is positive. */
function signed(v: Vec3): { axis: Vec3; flip: boolean } {
  const first = v.find((x) => Math.abs(x) > 1e-9) ?? 0;
  return first < 0 ? { axis: [-v[0] + 0, -v[1] + 0, -v[2] + 0], flip: true } : { axis: v, flip: false };
}

const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

function describe(op: Operation, i: number): CartesianOperationDescription {
  checkOrthogonal(op.matrix, `Operation ${i}`);
  let part: { r: Mat3; n: number };
  try {
    part = rotationPart(op.matrix);
  } catch {
    throw new RangeError(`Operation ${i} is not a crystallographic point operation`);
  }
  const proper = det(op.matrix) > 0;
  const timeReversal = op.timeReversal;
  const { r, n } = part;
  if (n === 1) return Object.freeze({ kind: proper ? 'identity' : 'inversion', order: 1, timeReversal });
  const { axis } = signed(rotationAxis(r, n));
  const frozenAxis = Object.freeze({ cartesian: Object.freeze(axis) as unknown as Vec3 });
  const kind: OperationKind = proper ? 'rotation' : n === 2 ? 'mirror' : 'rotoinversion';
  if (n === 2) return Object.freeze({ kind, order: 2, axis: frozenAxis, timeReversal });
  const sense = dot(axialVector(r), axis) > 0 ? '+' : '-';
  return Object.freeze({ kind, order: n, axis: frozenAxis, sense, timeReversal });
}

/**
 * Each operation of a list described geometrically, in the order of the list: kind, n, the
 * Cartesian axis (rotation or rotoinversion axis, mirror normal) with its first non-zero component,
 * in the order x, y, z, positive, and for n ≥ 3 the sense about that axis. The axes are not named
 * by lattice directions, since the list need not belong to a setting; for a point group given by its
 * key, `describeOperations` names them. Throws a RangeError for a matrix that is not orthogonal or
 * not a crystallographic operation (an order other than 1, 2, 3, 4, 6).
 */
export function describeOperationsOf(operations: readonly Operation[]): readonly CartesianOperationDescription[] {
  checkTimeReversal(operations);
  return Object.freeze(operations.map((op, i) => describe(op, i)));
}
