/**
 * Directions and edges of the plane under a plane point group or a list of operations, and the
 * plane point group and plane group of a list of operations (docs/conventions.md, "Plane groups").
 * Everything here is exact: matrices W are integer, translations rational, directions [uv] and
 * edges (hk) integer.
 */

import { safeDot } from '../integers.js';
import { shown, everyEntry } from '../checks.js';
import {
  closure,
  determinant,
  formatOperation,
  reduceModLattice,
  type ExactOperation,
  type IntMatrix,
} from './affine.js';
import { planeGroupOperations } from './planeGroups.js';
import { planePointGroupPositionRows } from './planePointGroupForms.js';
import { planePointGroupOperations, planePointGroupSettingCount, type PlanePointGroupKey } from './planePointGroups.js';
import { isInteger, add, multiply, rational, subtract, type Rational } from './rational.js';

/** Which kind of vector of the plane: a lattice direction [uv] or an edge (hk) by its Miller indices. */
export type VectorKind = 'uv' | 'hk';

/** Two integer matrices equal entry by entry. */
const sameMatrix = (a: IntMatrix, b: IntMatrix): boolean => a.every((row, i) => row.every((v, j) => v === b[i][j]));

const product = (a: IntMatrix, b: IntMatrix): number[][] =>
  [0, 1].map((i) => [0, 1].map((j) => a[i][0] * b[0][j] + a[i][1] * b[1][j] + 0));

const sameVector = (a: readonly number[], b: readonly number[]): boolean => a[0] === b[0] && a[1] === b[1];

const IDENTITY: IntMatrix = [
  [1, 0],
  [0, 1],
];

/**
 * The largest component of a direction or an edge: an image under an operation of a plane point
 * group has components up to twice as large (a hexagonal W has two entries ±1 in a row), which stay
 * safe integers.
 */
const MAX_INDEX = Math.floor(Number.MAX_SAFE_INTEGER / 2);

/**
 * A direction [uv] or an edge (hk) as a caller passes it, checked: two integers of at most
 * `MAX_INDEX` in magnitude, not both zero. `kind` is the field (`uv`, `hk`) the error names.
 */
export function checkVector(value: unknown, kind: VectorKind): number[] {
  const what = kind === 'uv' ? 'A lattice direction [uv]' : 'An edge (hk)';
  if (
    !Array.isArray(value) ||
    value.length !== 2 ||
    !everyEntry(value, (x) => typeof x === 'number' && Number.isSafeInteger(x)) ||
    (value[0] === 0 && value[1] === 0)
  ) {
    throw new RangeError(`${what} is two integers, not both zero, not ${shown(value)}`);
  }
  if (value.some((x) => Math.abs(x) > MAX_INDEX)) {
    throw new RangeError(
      `${what} has components of at most ${MAX_INDEX} in magnitude, so that its images are exact, not ${shown(value)}`,
    );
  }
  return [value[0] + 0, value[1] + 0];
}

/**
 * The image of a direction [uv] under W, W·u; of an edge (hk), h·W⁻¹: Miller indices transform as
 * the coefficients of a linear form, so that the edge h·x = 1 goes to the edge through the images
 * of its points.
 */
export function imageOf(kind: VectorKind, w: IntMatrix, v: readonly number[]): number[] {
  try {
    return checkedImageOf(kind, w, v);
  } catch (e) {
    if (!(e instanceof RangeError)) throw e;
    throw new RangeError(
      `The image of ${kind} ${shown(v)} under the matrix ${shown(w)} needs a value beyond the safe integers (2⁵³ − 1)`,
      { cause: e },
    );
  }
}

/** `imageOf` in checked arithmetic: a value outside the safe integers throws instead of rounding. */
function checkedImageOf(kind: VectorKind, w: IntMatrix, v: readonly number[]): number[] {
  if (kind === 'uv') return [safeDot(w[0], v) + 0, safeDot(w[1], v) + 0];
  // W⁻¹ = adj(W)/det W, det W = ±1.
  const d = determinant(w);
  const inv = [
    [w[1][1] * d, -w[0][1] * d],
    [-w[1][0] * d, w[0][0] * d],
  ];
  return [safeDot(v, [inv[0][0], inv[1][0]]) + 0, safeDot(v, [inv[0][1], inv[1][1]]) + 0];
}

/**
 * Checks that the linear parts of a list of operations are closed under products (a matrix may
 * occur more than once, as in a centred plane group), so that a site symmetry and an orbit of a
 * direction are those of a group. Throws a RangeError naming a missing product.
 */
export function checkLinearGroup(matrices: readonly IntMatrix[]): void {
  matrices.forEach((a, i) =>
    matrices.forEach((b, j) => {
      const p = product(a, b);
      if (!matrices.some((m) => sameMatrix(m, p))) {
        throw new RangeError(
          `The linear parts of the operations are not a group: the product of those of operations ${i} and ${j}, ${shown(p)}, is not among them (give all operations, not only generators)`,
        );
      }
    }),
  );
}

/** The site symmetry of a direction or an edge under a list of matrices that form a group. */
export interface VectorSite {
  /** Indices of the matrices that fix it, ascending. */
  readonly operations: number[];
  /** The number of distinct images. */
  readonly multiplicity: number;
  /** True if only identity matrices fix it. */
  readonly general: boolean;
}

/** One image of a direction or an edge, with the indices of the matrices that give it. */
export interface VectorImage {
  readonly vector: number[];
  readonly operations: number[];
}

/** The orbit of a direction or an edge: its distinct images in the order the matrices reach them. */
export function vectorOrbit(matrices: readonly IntMatrix[], kind: VectorKind, v: readonly number[]): VectorImage[] {
  const out: VectorImage[] = [];
  matrices.forEach((w, i) => {
    const image = imageOf(kind, w, v);
    const entry = out.find((e) => sameVector(e.vector, image));
    if (entry) entry.operations.push(i);
    else out.push({ vector: image, operations: [i] });
  });
  // An empty list is the group 1.
  return out.length > 0 ? out : [{ vector: [...v], operations: [] }];
}

/** The site symmetry of a direction or an edge under a list of matrices that form a group. */
export function vectorSite(matrices: readonly IntMatrix[], kind: VectorKind, v: readonly number[]): VectorSite {
  const orbit = vectorOrbit(matrices, kind, v);
  const operations = orbit.find((e) => sameVector(e.vector, v))?.operations ?? [];
  return {
    operations,
    multiplicity: orbit.length,
    general: operations.every((i) => sameMatrix(matrices[i], IDENTITY)),
  };
}

/**
 * The Wyckoff position of a direction or an edge under a plane point group in a setting: the index
 * of the position (in the order of `planePointGroupPositionRows`) whose site symmetry is conjugate
 * to that of the vector, ITA's definition of a Wyckoff position.
 */
export function vectorPositionRow(
  key: PlanePointGroupKey,
  setting: number,
  kind: VectorKind,
  v: readonly number[],
): number {
  const matrices = planePointGroupOperations(key, setting).map((op) => op.matrix);
  const site = vectorSite(matrices, kind, v).operations.map((i) => matrices[i]);
  const rows = planePointGroupPositionRows(key, setting);
  const inverse = (w: IntMatrix): IntMatrix => matrices.find((m) => sameMatrix(product(m, w), IDENTITY))!;
  const row = rows.findIndex(([, , , , , siteOperations]) => {
    const fixed = siteOperations.map((i) => matrices[i]);
    if (fixed.length !== site.length) return false;
    return matrices.some((g) =>
      site.every((s) => fixed.some((f) => sameMatrix(f, product(product(g, s), inverse(g))))),
    );
  });
  if (row < 0) throw new Error(`No Wyckoff position of ${key} for ${kind} ${shown(v)}`);
  return row;
}

// --- the point group and the plane group of a list of operations ------------------------------------

/** The largest plane point group, 6mm, has 12 operations. */
const MAX_PLANE_POINT_GROUP_ORDER = 12;

/**
 * The group generated by integer matrices of determinant ±1, each once. Throws a RangeError if it
 * has more than 12 elements, so is no finite group (every finite group of integer 2 × 2 matrices is
 * a plane point group).
 */
export function linearClosure(matrices: readonly IntMatrix[]): IntMatrix[] {
  for (const m of matrices) {
    const d = determinant(m);
    if (d !== 1 && d !== -1) {
      throw new RangeError(`The matrix of an operation of the plane has determinant ±1, not ${d}: ${shown(m)}`);
    }
  }
  const group: IntMatrix[] = [IDENTITY];
  for (let i = 0; i < group.length; i++) {
    for (const g of matrices) {
      const p = product(g, group[i]);
      if (!group.some((m) => sameMatrix(m, p))) {
        if (group.length >= MAX_PLANE_POINT_GROUP_ORDER) {
          throw new RangeError(
            `The linear parts of the operations generate no finite group (more than ${MAX_PLANE_POINT_GROUP_ORDER} matrices): no plane point group`,
          );
        }
        group.push(p);
      }
    }
  }
  return group;
}

const sameSet = (a: readonly IntMatrix[], b: readonly IntMatrix[]): boolean =>
  a.length === b.length && a.every((m) => b.some((n) => sameMatrix(m, n)));

/**
 * The plane point group of a group of integer matrices (`linearClosure`): its key by its order and
 * whether it holds a reflection, and the setting whose operations the matrices are, if any.
 */
export function identifyLinearGroup(group: readonly IntMatrix[]): { key: PlanePointGroupKey; setting?: number } {
  const reflection = group.some((m) => determinant(m) === -1);
  const byOrder: Record<number, PlanePointGroupKey> = reflection
    ? { 2: 'm', 4: '2mm', 6: '3m', 8: '4mm', 12: '6mm' }
    : { 1: '1', 2: '2', 3: '3', 4: '4', 6: '6' };
  const key = byOrder[group.length];
  if (!key) throw new Error(`No plane point group of order ${group.length}`);
  for (let s = 1; s <= planePointGroupSettingCount(key); s++) {
    if (
      sameSet(
        group,
        planePointGroupOperations(key, s).map((op) => op.matrix),
      )
    )
      return { key, setting: s };
  }
  return { key };
}

const HALF = rational(1, 2);
const isHalfHalf = (t: readonly Rational[]): boolean => t.every((c) => isInteger(subtract(c, HALF)));

/** The glide vector of a reflection or glide reflection (W, w): (W·w + w)/2. */
function glideOf(op: ExactOperation): Rational[] {
  return op.matrix.map((row, i) => {
    const ww = add(multiply(rational(row[0]), op.translation[0]), multiply(rational(row[1]), op.translation[1]));
    return multiply(add(ww, op.translation[i]), HALF);
  });
}

const MIRROR_NORMAL_A: IntMatrix = [
  [-1, 0],
  [0, 1],
];
const MIRROR_NORMAL_B: IntMatrix = [
  [1, 0],
  [0, -1],
];

/**
 * The plane group of a list of operations of the plane in a conventional cell of their lattice, and
 * whether they are exactly its operations (setting 1). The list is closed modulo the lattice first.
 * The type follows from the point group, the centring and, per mirror direction, whether a
 * reflection (glide vector zero modulo the lattice) is among the operations; it does not depend on
 * the origin. Throws a RangeError for operations that are not in a conventional cell: a translation
 * besides the lattice translations other than the centring (1/2, 1/2) of a rectangular lattice, or
 * linear parts that no conventional cell gives (a mirror along a diagonal of a rectangular cell, a
 * square or hexagonal group in another basis).
 */
export function identifyPlaneGroup(operations: readonly ExactOperation[]): { key: string; setting?: number } {
  const group = closure(operations, { dimension: 2 });
  const linear = linearClosure(group.map((op) => op.matrix));
  const point = identifyLinearGroup(linear);
  const pure = group.filter((op) => sameMatrix(op.matrix, IDENTITY) && !op.translation.every(isInteger));
  const rectangular = point.key === 'm' || point.key === '2mm';
  const centred = pure.length === 1 && rectangular && isHalfHalf(pure[0].translation);
  if (pure.length > 0 && !centred) {
    throw new RangeError(
      `The operations hold the translation ${formatOperation(reduceModLattice(pure[0]))} besides the lattice translations: give them in a conventional cell of their lattice`,
    );
  }
  const orientationOk =
    point.setting !== undefined ||
    (point.key === 'm' && linear.some((m) => sameMatrix(m, MIRROR_NORMAL_B))) ||
    point.key === '1' ||
    point.key === '2';
  if (!orientationOk) {
    throw new RangeError(
      `The linear parts of the operations are those of the plane point group ${point.key}, but in no conventional cell: give the operations in a conventional cell of their lattice`,
    );
  }
  const reflectionAlong = (w: IntMatrix): boolean =>
    group.some((op) => sameMatrix(op.matrix, w) && glideOf(op).every(isInteger));
  let key: string;
  switch (point.key) {
    case 'm':
      key = centred
        ? 'cm'
        : group.some((op) => determinant(op.matrix) === -1 && glideOf(op).every(isInteger))
          ? 'pm'
          : 'pg';
      break;
    case '2mm': {
      const a = reflectionAlong(MIRROR_NORMAL_A);
      const b = reflectionAlong(MIRROR_NORMAL_B);
      key = centred ? 'c2mm' : a && b ? 'p2mm' : a || b ? 'p2mg' : 'p2gg';
      break;
    }
    case '4mm':
      key = reflectionAlong(MIRROR_NORMAL_A) ? 'p4mm' : 'p4gm';
      break;
    case '3m':
      key = point.setting === 1 ? 'p3m1' : 'p31m';
      break;
    default:
      key = `p${point.key}`;
  }
  const own = planeGroupOperations(key);
  const exact = own.length === group.length && own.every((op) => group.some((g) => sameCoset(g, op)));
  return exact ? { key, setting: 1 } : { key };
}

function sameCoset(a: ExactOperation, b: ExactOperation): boolean {
  return sameMatrix(a.matrix, b.matrix) && a.translation.every((t, i) => isInteger(subtract(t, b.translation[i])));
}
