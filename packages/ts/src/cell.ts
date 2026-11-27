/**
 * Unit cell, metric and angles, for any cell (docs/conventions.md, "Cell, metric and indices").
 * Plain data in and out: a basis is a 3×3 matrix whose columns are a, b, c in Cartesian
 * coordinates, as `latticeBasis` gives it; lengths in any unit, angles in degrees.
 */

import { checkObject, checkOptions, shown, TOLERANCE_KEYS } from './checks.js';
import { apply, dot, inverse, isSingular, multiply, transpose, type Mat3, type Vec3 } from './linalg.js';
import { checkTimeReversal, type CartesianOperation as MagneticOperation } from './operations.js';
import { FLAT_CELL_RADICAND, INTEGER_EPSILON, toleranceOf, type ToleranceOptions } from './tolerances.js';
import { deepFreeze } from './freeze.js';

/** The lattice parameters of a cell: edge lengths and angles in degrees (α between b and c, β between a and c, γ between a and b). */
export interface LatticeParameters {
  /** Edge length a. */
  readonly a: number;
  /** Edge length b. */
  readonly b: number;
  /** Edge length c. */
  readonly c: number;
  /** Angle α between b and c, in degrees. */
  readonly alpha: number;
  /** Angle β between a and c, in degrees. */
  readonly beta: number;
  /** Angle γ between a and b, in degrees. */
  readonly gamma: number;
}

/** The three cell angles in degrees. */
export interface CellAngles {
  /** Angle α between b and c, in degrees. */
  readonly alpha: number;
  /** Angle β between a and c, in degrees. */
  readonly beta: number;
  /** Angle γ between a and b, in degrees. */
  readonly gamma: number;
}

/** An operation of a list given to `residualOperations`: at least its matrix W; other fields are kept. */
export interface CellOperation {
  /** The integer 3×3 matrix W acting on lattice coordinates (the `matrix` of an operation). */
  readonly matrix: Mat3;
}

/** Options of `isValidCell`. */
export interface IsValidCellOptions {
  /**
   * The smallest accepted ratio V/(abc) of the cell volume to the volume of the box of its edge
   * lengths, from 0 to 1 (1 only for orthogonal axes); default 0, which accepts every cell that
   * `isValidCell` otherwise accepts. A ratio near 0 is a nearly flat cell.
   */
  readonly minVolumeRatio?: number;
}

const DEG = Math.PI / 180;

/** Cosine of an angle in degrees, exact at the multiples of 30° that cells use (90°, 60°, 120°, 180°). */
function cosDeg(x: number): number {
  const r = x % 360;
  const exact: Record<number, number> = { 0: 1, 60: 0.5, 90: 0, 120: -0.5, 180: -1, 240: -0.5, 270: 0, 300: 0.5 };
  const k = r < 0 ? r + 360 : r;
  return k in exact ? exact[k] : Math.cos(x * DEG);
}

/** The radicand of the volume, 1 − cos²α − cos²β − cos²γ + 2 cos α cos β cos γ. */
function radicand({ alpha, beta, gamma }: CellAngles): number {
  const [ca, cb, cg] = [alpha, beta, gamma].map(cosDeg);
  return 1 - ca * ca - cb * cb - cg * cg + 2 * ca * cb * cg;
}

function anglesOk({ alpha, beta, gamma }: CellAngles): boolean {
  return [alpha, beta, gamma].every((x) => typeof x === 'number' && Number.isFinite(x) && x > 0 && x < 180);
}

/**
 * Whether three angles (degrees) belong to a cell: each between 0° and 180°, and the three axes not
 * in one plane (the volume radicand 1 − cos²α − cos²β − cos²γ + 2 cos α cos β cos γ exceeds 10⁻¹², i.e.
 * V/(abc) > 10⁻⁶: a cell that is flat within rounding is refused). With
 * `minVolumeRatio` (from 0 to 1, default 0) also refuses nearly flat cells, whose ratio V/(abc), the
 * square root of the radicand, is smaller. Throws a RangeError for a `minVolumeRatio` that is not a
 * number from 0 to 1.
 */
export function isValidCell(angles: CellAngles, options?: IsValidCellOptions): boolean {
  checkOptions(options, ['minVolumeRatio'], 'isValidCell');
  checkObject(angles, 'isValidCell takes the angles { alpha, beta, gamma }');
  // Numbers out of range are no cell (false); anything else is wrong input.
  for (const name of ['alpha', 'beta', 'gamma'] as const) {
    const x = (angles as Partial<CellAngles>)[name];
    if (!(typeof x === 'number' && Number.isFinite(x))) {
      throw new RangeError(`The angle ${name} must be a finite number of degrees, not ${shown(x)}`);
    }
  }
  if (!anglesOk(angles)) return false;
  const min = options?.minVolumeRatio ?? 0;
  if (!(typeof min === 'number' && min >= 0 && min <= 1))
    throw new RangeError(`isValidCell: minVolumeRatio must be a number from 0 to 1, not ${String(min)}`);
  const r = radicand(angles);
  if (!(r > FLAT_CELL_RADICAND)) return false;
  return Math.sqrt(r) >= min;
}

function checkEdges(p: LatticeParameters): void {
  checkObject(p, 'latticeFromParameters takes the parameters { a, b, c, alpha, beta, gamma }');
  const { a, b, c } = p;
  for (const [name, x] of [
    ['a', a],
    ['b', b],
    ['c', c],
  ] as const) {
    if (typeof x !== 'number' || !Number.isFinite(x) || x <= 0) {
      throw new RangeError(`latticeFromParameters: edge ${name} must be a positive number, not ${shown(x)}`);
    }
  }
}

/**
 * The Cartesian basis of a cell as the columns of a 3×3 matrix, in the frame of this library for a
 * general cell: a along x, b in the xy plane (y > 0 for γ < 180°), c towards +z. It is the frame of
 * `latticeBasis` where that exists (hexagonal axes: x ∥ a, z ∥ c), so a cell with the angles of a
 * family has that family's basis scaled by the edge lengths. For the monoclinic family with unique
 * axis b, b lies along y (docs/conventions.md, "Cell, metric and indices"). The basis is
 * right-handed. Throws a RangeError for an edge that is not positive and for angles that give no cell.
 */
export function latticeFromParameters(parameters: LatticeParameters): Mat3 {
  checkEdges(parameters);
  if (!isValidCell(parameters)) {
    throw new RangeError(
      `latticeFromParameters: angles ${parameters.alpha}°, ${parameters.beta}°, ${parameters.gamma}° give no cell`,
    );
  }
  const ca = cosDeg(parameters.alpha);
  const cb = cosDeg(parameters.beta);
  const cg = cosDeg(parameters.gamma);
  const sg = Math.sqrt(1 - cg * cg);
  const volumeRatio = Math.sqrt(radicand(parameters));
  // columns: a = (a, 0, 0), b = (b cos γ, b sin γ, 0), c = (c cos β, c (cos α − cos β cos γ)/sin γ, c V/(abc sin γ))
  const cy = (parameters.c * (ca - cb * cg)) / sg;
  const cz = (parameters.c * volumeRatio) / sg;
  return deepFreeze([
    [parameters.a + 0, parameters.b * cg + 0, parameters.c * cb + 0],
    [0, parameters.b * sg + 0, cy + 0],
    [0, 0, cz + 0],
  ]);
}

function columns(basis: Mat3): [Vec3, Vec3, Vec3] {
  return [0, 1, 2].map((j) => [basis[0][j], basis[1][j], basis[2][j]] as const) as [Vec3, Vec3, Vec3];
}

const norm = (v: Vec3): number => Math.hypot(v[0], v[1], v[2]);

function checkBasis(basis: Mat3, who: string): void {
  const ok =
    Array.isArray(basis) &&
    basis.length === 3 &&
    basis.every(
      (r) => Array.isArray(r) && r.length === 3 && r.every((x) => typeof x === 'number' && Number.isFinite(x)),
    );
  if (!ok) throw new RangeError(`${who}: the basis must be a 3×3 matrix of finite numbers`);
  if (isSingular(basis)) throw new RangeError(`${who}: singular basis`);
}

/**
 * The lattice parameters of a basis given as the columns of a Cartesian matrix: the edge lengths and
 * the angles in degrees. Independent of the orientation of the basis in the Cartesian frame (and
 * of its handedness). Throws a RangeError for a singular matrix.
 */
export function latticeParameters(basis: Mat3): LatticeParameters {
  checkBasis(basis, 'latticeParameters');
  const [a, b, c] = columns(basis);
  const angle = (u: Vec3, v: Vec3): number => {
    const cross: Vec3 = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    return Math.atan2(norm(cross), dot(u, v)) / DEG + 0;
  };
  return deepFreeze({ a: norm(a), b: norm(b), c: norm(c), alpha: angle(b, c), beta: angle(a, c), gamma: angle(a, b) });
}

/** The metric tensor G = AᵀA of a basis A (columns a, b, c): g_ij = a_i · a_j, in the unit of the edge lengths squared. */
export function metricTensor(basis: Mat3): Mat3 {
  checkBasis(basis, 'metricTensor');
  return deepFreeze(multiply(transpose(basis), basis));
}

/**
 * The reciprocal basis B = A⁻ᵀ of a basis A (columns a, b, c) as the columns a*, b*, c*, with
 * a_i · a*_j = δ_ij (no factor 2π), in the inverse unit of the edge lengths.
 */
export function reciprocalBasis(basis: Mat3): Mat3 {
  checkBasis(basis, 'reciprocalBasis');
  return deepFreeze(transpose(inverse(basis)));
}

function vector(v: Vec3, name: string): Vec3 {
  if (!Array.isArray(v) || v.length !== 3 || !v.every((x) => typeof x === 'number' && Number.isFinite(x))) {
    throw new RangeError(`${name} must be three finite numbers`);
  }
  if (v.every((x) => x === 0)) throw new RangeError(`${name} must not be the zero vector`);
  return v;
}

function angleOf(u: Vec3, v: Vec3): number {
  const cross: Vec3 = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  return Math.atan2(norm(cross), dot(u, v)) / DEG + 0;
}

/** The angle in degrees between two lattice directions [uvw] (coordinates in the basis, columns a, b, c), 0° to 180°. Throws a RangeError for a zero vector. */
export function angleBetweenDirections(basis: Mat3, direction1: Vec3, direction2: Vec3): number {
  checkBasis(basis, 'angleBetweenDirections');
  return angleOf(apply(basis, vector(direction1, 'direction1')), apply(basis, vector(direction2, 'direction2')));
}

/**
 * The angle in degrees between the normals of two planes (hkl), 0° to 180°: the angle between the
 * reciprocal vectors h·a* + k·b* + l·c*. For two faces this is 180° minus the interior dihedral
 * angle. Throws a RangeError for a zero vector.
 */
export function angleBetweenPlanes(basis: Mat3, plane1: Vec3, plane2: Vec3): number {
  checkBasis(basis, 'angleBetweenPlanes');
  const b = reciprocalBasis(basis);
  return angleOf(apply(b, vector(plane1, 'plane1')), apply(b, vector(plane2, 'plane2')));
}

/**
 * The unit normal of a plane (hkl) in a cell, a Cartesian vector: h·a* + k·b* + l·c* normalised, the
 * pole of the face. With `latticeBasis` of a point group whose family has fixed
 * cell angles, or `latticeFromParameters` for a real cell; Miller indices of hexagonal axes are three, without i.
 * Throws a RangeError for a basis that is not a regular 3 × 3 matrix and for a zero vector.
 */
export function faceNormal(basis: Mat3, hkl: Vec3): Vec3 {
  checkBasis(basis, 'faceNormal');
  const v = apply(reciprocalBasis(basis), vector(hkl, 'hkl'));
  const n = norm(v);
  return Object.freeze(v.map((x) => x / n + 0)) as unknown as Vec3;
}

/**
 * The operations that leave the metric of a cell unchanged: those W (`matrix`, the integer matrices
 * on the coordinates of a lattice direction, as `operations` gives them) with WᵀGW = G, G the metric
 * tensor of `basis`. It is the point symmetry of a distorted lattice among the operations of a group;
 * the list is taken as it is, not closed into a group, and the kept operations are the ones of the
 * list, in its order. The deviation counts relative to the largest entry of G (`tolerance`, default
 * `EPSILON`), so the result does not depend on the unit of the edge lengths.
 */
export function residualOperations<T extends CellOperation>(
  operations: readonly T[],
  basis: Mat3,
  options?: ToleranceOptions,
): readonly T[] {
  checkOptions(options, TOLERANCE_KEYS, 'residualOperations');
  checkBasis(basis, 'residualOperations');
  const g = metricTensor(basis);
  const tolerance = toleranceOf(options, 'metric');
  if (!Array.isArray(operations)) throw new RangeError('residualOperations: operations must be a list');
  operations.forEach((op, i) => {
    const m = (op as { readonly matrix?: unknown } | null)?.matrix;
    const ok =
      Array.isArray(m) &&
      m.length === 3 &&
      m.every((r) => Array.isArray(r) && r.length === 3 && r.every((x) => typeof x === 'number' && Number.isFinite(x)));
    if (!ok) throw new RangeError(`residualOperations: operation ${i} has no 3×3 matrix of finite numbers`);
    // W is an integer matrix; a Cartesian matrix (±√3/2) passed as `matrix` would give a wrong answer.
    if (!(m as number[][]).every((r) => r.every((x) => Math.abs(x - Math.round(x)) < INTEGER_EPSILON))) {
      throw new RangeError(
        `residualOperations: the matrix of operation ${i} is not an integer matrix in the lattice basis (the field matrix of an operation, not cartesian): ${shown(m)}`,
      );
    }
  });
  const scale = Math.max(...g.flat().map(Math.abs));
  // The list is frozen, not the operations in it, which are the caller's.
  return Object.freeze(
    operations.filter((op) => {
      const m = multiply(multiply(transpose(op.matrix), g), op.matrix);
      return m.every((row, i) => row.every((x, j) => Math.abs(x - g[i][j]) < tolerance * scale));
    }),
  );
}

/** An operation of the magnetic API passed to `residualOperations`: its matrix and whether it is combined with time reversal. */
export interface MagneticCellOperation extends CellOperation {
  /** Whether the operation is combined with time reversal. */
  readonly timeReversal: boolean;
}

/**
 * The operations of a list that keep the metric of a cell: W with WᵀGW = G, G the metric tensor
 * of `basis`. The operations are read by `matrix`, the integer matrix W on lattice coordinates, as
 * `operations` gives them; the list is taken as it is and the kept operations are the ones of the list, in its
 * order. The deviation counts relative to the largest entry of G (`tolerance`, default `EPSILON`).
 * Every operation must say whether it is combined with time reversal (`timeReversal`), which is
 * kept; one that does not (an operation of the crystallographic API) is a RangeError.
 */
export function residualMagneticOperations<T extends MagneticCellOperation>(
  operations: readonly T[],
  basis: Mat3,
  options?: ToleranceOptions,
): readonly T[] {
  if (Array.isArray(operations)) checkTimeReversal(operations as unknown as readonly MagneticOperation[]);
  return residualOperations(operations, basis, options);
}
