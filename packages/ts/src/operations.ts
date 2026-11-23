/**
 * Point operations: the record the API gives (the matrix W in the lattice basis and the Cartesian
 * matrix, with time reversal), the Cartesian operation the calculations work with, and the closure
 * of a set of generators into a group.
 */

import { IDENTITY, matricesEqual, multiply, snap, type Mat3 } from './linalg.js';
import { EPSILON } from './tolerances.js';

/**
 * A point operation as the calculations use it: its orthogonal Cartesian matrix (rotation,
 * rotoinversion, mirror, inversion), combined with time reversal if `timeReversal` is true (a primed
 * operation). Every function that takes operations from a caller and computes with Cartesian
 * matrices reads these two fields (`residualOperations` reads `matrix` instead), so an `Operation`
 * of the API can be passed as it is.
 */
export interface CartesianOperation {
  /** The orthogonal Cartesian 3×3 matrix, rows first. */
  readonly cartesian: Mat3;
  /** True if the operation is combined with time reversal (a primed operation). */
  readonly timeReversal: boolean;
}

/**
 * A point operation of a magnetic point group in a setting: ITA's matrix W in the lattice basis of
 * the setting (`matrix`, integer, acting on the coordinates of a lattice direction [uvw]; the
 * coordinate triplets of ITA's general position are its rows) and the same operation as an
 * orthogonal Cartesian matrix (`cartesian`, R = B·W·B⁻¹ with the basis B of the setting), combined
 * with time reversal if `timeReversal` is true (a primed operation). docs/conventions.md,
 * "Operations".
 */
export interface Operation extends CartesianOperation {
  /** ITA's matrix W in the lattice basis of the setting, integer, rows first. */
  readonly matrix: Mat3;
}

/** No point group has more than 48 operations (96 with time reversal); a closure beyond this is a data error. */
const MAX_GROUP_ORDER = 200;

const IDENTITY_OPERATION: CartesianOperation = { cartesian: IDENTITY, timeReversal: false };

/** A unitary operation (no time reversal). */
export function operation(cartesian: Mat3): CartesianOperation {
  return { cartesian, timeReversal: false };
}

/** Throws unless `m` is orthogonal (mᵀm = 1 within `EPSILON`): the code assumes Cartesian matrices. */
export function checkOrthogonal(m: Mat3, what: string): void {
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const dot = m[0][i] * m[0][j] + m[1][i] * m[1][j] + m[2][i] * m[2][j];
      // A comparison that is false for NaN, so that a matrix with NaN is refused as well.
      if (!(Math.abs(dot - (i === j ? 1 : 0)) <= EPSILON)) {
        throw new RangeError(`${what} is not an orthogonal (Cartesian) matrix: ${JSON.stringify(m)}`);
      }
    }
  }
}

/**
 * Throws unless mᵀm = 1 within the tolerance: the check of `checkOrthogonal` for a function with a
 * `tolerance` option, so that a matrix with rounding errors (e.g. rounded to 4 decimals) passes
 * with a larger one. Never stricter than `checkOrthogonal`.
 */
export function checkOrthogonalWithin(m: Mat3, what: string, tolerance: number): void {
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

/** True for a 3×3 array of numbers (not checked for finiteness; the orthogonality check refuses NaN). */
function isMatrix3(m: unknown): m is Mat3 {
  return (
    Array.isArray(m) &&
    m.length === 3 &&
    m.every((row) => Array.isArray(row) && row.length === 3 && row.every((v) => typeof v === 'number'))
  );
}

/**
 * Checks the operations a caller passes in to a function that computes with Cartesian matrices:
 * each must have `cartesian`, an orthogonal 3×3 matrix (within `tolerance`, at least `EPSILON`). A
 * record without it is refused, so that the lattice matrix `matrix` cannot pass for a Cartesian one
 * (docs/conventions.md, "Operations").
 */
export function checkCartesianOperations(
  operations: readonly { readonly cartesian: Mat3 }[],
  tolerance = EPSILON,
): void {
  if (!Array.isArray(operations)) throw new RangeError('The operations must be an array');
  operations.forEach((op, i) => {
    const cartesian = (op as { readonly cartesian?: unknown } | null)?.cartesian;
    if (!isMatrix3(cartesian)) {
      const hasMatrix = (op as { readonly matrix?: unknown } | null)?.matrix !== undefined;
      throw new RangeError(
        `Operation ${i} has no Cartesian matrix (field cartesian, a 3×3 array of numbers)` +
          (hasMatrix
            ? '; its field matrix is the matrix W in the lattice basis since symcrys 0.11.0, so pass the operations as operations() gives them, or the Cartesian matrix as cartesian'
            : ''),
      );
    }
    checkOrthogonalWithin(cartesian, `Operation ${i}`, tolerance);
  });
}

/**
 * Checks operations that a caller passes in: each must say whether it is combined with time
 * reversal. Without this, an operation that lacks `timeReversal` (as the crystallographic API
 * returns them) would be composed as if it had it in every second product.
 */
export function checkTimeReversal(operations: readonly CartesianOperation[]): void {
  operations.forEach((op, i) => {
    if (typeof op.timeReversal !== 'boolean') {
      throw new RangeError(
        `Operation ${i}: timeReversal must be true or false, not ${JSON.stringify(op.timeReversal)}; an operation of the magnetic API says whether it is combined with time reversal`,
      );
    }
  });
}

/** The product a·b: first b, then a. */
export function compose(a: CartesianOperation, b: CartesianOperation): CartesianOperation {
  return { cartesian: snap(multiply(a.cartesian, b.cartesian)), timeReversal: a.timeReversal !== b.timeReversal };
}

export function operationsEqual(a: CartesianOperation, b: CartesianOperation): boolean {
  return a.timeReversal === b.timeReversal && matricesEqual(a.cartesian, b.cartesian);
}

/**
 * The group generated by `generators`: the identity first, then the generators, then products in
 * the order they are found. The order of the result is therefore fixed by the generators.
 * Throws if the closure exceeds the order of any point group (a sign of wrong input data).
 */
export function closeGroup(generators: readonly CartesianOperation[]): CartesianOperation[] {
  const group: CartesianOperation[] = [IDENTITY_OPERATION];
  const add = (op: CartesianOperation): boolean => {
    if (group.some((g) => operationsEqual(g, op))) return false;
    if (group.length >= MAX_GROUP_ORDER)
      throw new RangeError(
        `The operations generate no finite point group (more than ${MAX_GROUP_ORDER} elements): a rotation by an angle that is not 360°/n, or matrices too far from exact`,
      );
    group.push(op);
    return true;
  };
  for (const g of generators) add({ cartesian: snap(g.cartesian), timeReversal: g.timeReversal });
  for (let i = 0; i < group.length; i++) {
    for (let j = 0; j <= i; j++) {
      add(compose(group[i], group[j]));
      add(compose(group[j], group[i]));
    }
  }
  return group;
}
