/**
 * Symmetry-reduced forms of property tensors: which Cartesian components of a tensor of rank 0 to 4
 * a point group allows, and how they depend on each other. Results are plain numbers (coefficient
 * matrices and index lists); formulas, LaTeX and diagrams stay in the applications (CLAUDE.md,
 * "Tensors").
 *
 * Components are numbered by their flat index: for indices (i₁, …, iₙ) with x, y, z = 0, 1, 2 the
 * flat index is i₁·3ⁿ⁻¹ + … + iₙ, so the first index varies slowest (row-major, the order of a
 * NumPy array of shape (3,)*n in C order). Moved from birss-app (`tensorForms.ts`,
 * `tensorProjection.ts`, `linalg.ts`, revision 2be5fe3).
 */

import { SETTING_KEYS, TOLERANCE_KEYS, checkNumbers, checkOptions, shown } from '../checks.js';
import { det, type Mat3 } from '../linalg.js';
import {
  checkCartesianOperations,
  checkOrthogonalWithin,
  checkTimeReversal,
  type CartesianOperation,
} from '../operations.js';
import { idealGroup, type IdealGroup } from '../closure.js';
import {
  operations,
  settingIndexOf,
  type MagneticPointGroupKey,
  type SettingOptions,
} from '../pointGroups/pointGroups.js';
import { specOf, type TensorPropertyName } from './propertyTable.js';
import { EPSILON, MAX_PIVOT_THRESHOLD, SNAP_EPSILON, toleranceOf, type ToleranceOptions } from '../tolerances.js';
import { PIVOT_EPSILON, rowEchelonWithPivots } from './rowEchelon.js';
import { deepFreeze } from '../freeze.js';

/** Rank of a tensor: 0 (scalar) to 4. */
export type TensorRank = 0 | 1 | 2 | 3 | 4;

/** `'polar'`: transforms with R; `'axial'`: with det(R)·R (pseudotensor). */
export type TensorParity = 'polar' | 'axial';

/** `'i'`: time-even (invariant under time reversal); `'c'`: time-odd (changes sign). */
export type TimeParity = 'i' | 'c';

/**
 * Symmetry of the tensor under permutation of its own indices, independent of the crystal:
 * `'none'`; `'ij'`: the first two indices are interchangeable; `'jk'`: the last two (for rank 3 the
 * index symmetry of second-harmonic generation and the piezoelectric effect); `'ij_kl'` (rank 4):
 * each of the two pairs symmetric, the pairs not interchangeable (e.g. electric-quadrupole SHG,
 * photoelasticity); `'voigt'` (rank 4): `'ij_kl'` and the pairs interchangeable (elastic
 * stiffness). At rank 2, `'ij'` and `'jk'` both mean a symmetric tensor.
 */
export type IntrinsicSymmetry = 'none' | 'ij' | 'jk' | 'ij_kl' | 'voigt';

/** The kind of tensor, as in birss-app. */
export interface TensorSpec {
  /** Number of indices, 0 to 4. */
  readonly rank: TensorRank;
  /** `'polar'` or `'axial'`: whether an improper operation changes the sign (factor det R). */
  readonly parity: TensorParity;
  /** `'i'` (time-even) or `'c'` (time-odd): whether time reversal changes the sign. */
  readonly timeParity: TimeParity;
  /** The index symmetry of the tensor. */
  readonly intrinsic: IntrinsicSymmetry;
}

/**
 * The form of a tensor under a point group: the subspace of tensors invariant under every
 * operation and with the requested index symmetry. Every entry is a plain number; a vector of
 * components has length 3^rank (flat index, see the module documentation).
 */
export interface TensorForm {
  /** The rank of the tensor. */
  readonly rank: TensorRank;
  /**
   * A basis of the allowed tensors in reduced row echelon form: one row per free parameter, with 1
   * at the parameter's own component and 0 at every other parameter's component. Every allowed
   * tensor is Σₖ pₖ·basis[k], where pₖ is the value of its component `parameters[k]`. Empty if the
   * tensor vanishes.
   */
  readonly basis: readonly (readonly number[])[];
  /**
   * The free parameters, as the index lists of their components (e.g. `[0, 1, 1]` for xyy), one per
   * basis row and in its order: each is the lowest component independent of those before it.
   */
  readonly parameters: readonly (readonly number[])[];
  /**
   * The constraints: one row r per component that is not a parameter, in ascending flat index,
   * with r·t = 0 for every allowed tensor t. Row c reads t_c − Σₖ basis[k][c]·t_{parameters[k]} = 0;
   * a row with a single 1 says that the component vanishes.
   */
  readonly relations: readonly (readonly number[])[];
}

const RANKS: readonly number[] = [0, 1, 2, 3, 4];

/** Checks a specification and returns the index permutations that generate its intrinsic symmetry. */
function checkSpec(spec: TensorSpec): number[][] {
  const { rank, parity, timeParity, intrinsic } = spec;
  if (!RANKS.includes(rank)) throw new RangeError(`Tensor rank must be 0 to 4, not ${shown(rank)}`);
  if (parity !== 'polar' && parity !== 'axial') throw new RangeError(`Unknown tensor parity: ${shown(parity)}`);
  if (timeParity !== 'i' && timeParity !== 'c') throw new RangeError(`Unknown time parity: ${shown(timeParity)}`);
  const swap = (a: number, b: number) => {
    const p = Array.from({ length: rank }, (_, k) => k);
    [p[a], p[b]] = [p[b], p[a]];
    return p;
  };
  switch (intrinsic) {
    case 'none':
      return [];
    case 'ij':
    case 'jk':
      if (rank < 2) throw new RangeError(`Intrinsic symmetry '${intrinsic}' needs rank 2 or more, not ${rank}`);
      return [intrinsic === 'ij' ? swap(0, 1) : swap(rank - 2, rank - 1)];
    case 'ij_kl':
    case 'voigt':
      if (rank !== 4) throw new RangeError(`Intrinsic symmetry '${intrinsic}' needs rank 4, not ${rank}`);
      return intrinsic === 'ij_kl' ? [swap(0, 1), swap(2, 3)] : [swap(0, 1), swap(2, 3), [2, 3, 0, 1]];
    default:
      throw new RangeError(`Unknown intrinsic symmetry: ${shown(intrinsic)}`);
  }
}

/** The indices (x, y, z = 0, 1, 2) of every flat index at a rank, first index first. */
const digitTables = new Map<number, readonly (readonly number[])[]>();
function digits(rank: number): readonly (readonly number[])[] {
  let table = digitTables.get(rank);
  if (!table) {
    table = Array.from({ length: 3 ** rank }, (_, flat) =>
      Array.from({ length: rank }, (_, k) => Math.floor(flat / 3 ** (rank - 1 - k)) % 3),
    );
    digitTables.set(rank, table);
  }
  return table;
}

/** The flat indices reached from `flat` by the index permutations (`out[k] = in[perm[k]]`). */
function orbit(flat: number, rank: number, perms: readonly number[][]): number[] {
  const d = digits(rank);
  const seen = new Set([flat]);
  const stack = [flat];
  while (stack.length > 0) {
    const cur = stack.pop()!;
    for (const p of perms) {
      let next = 0;
      for (let k = 0; k < rank; k++) next = next * 3 + d[cur][p[k]];
      if (!seen.has(next)) {
        seen.add(next);
        stack.push(next);
      }
    }
  }
  return [...seen];
}

function freezeRows(rows: readonly (readonly number[])[]): readonly (readonly number[])[] {
  return Object.freeze(rows.map((r) => Object.freeze([...r])));
}

/**
 * The form for a group given as its full list of operations. The group average of each seed
 * (a unit tensor on one orbit of the intrinsic symmetry) projects it onto the invariant subspace;
 * the projections span it, and the reduced row echelon form makes the basis minimal and canonical.
 */
function project(group: readonly CartesianOperation[], spec: TensorSpec, perms: number[][], deviation = 0): TensorForm {
  const { rank } = spec;
  const dim = 3 ** rank;
  const d = digits(rank);
  const ops = group.map((op) => ({
    m: op.cartesian.flat(),
    sign:
      (spec.parity === 'axial' ? Math.sign(det(op.cartesian)) : 1) *
      (spec.timeParity === 'c' && op.timeReversal ? -1 : 1),
  }));

  const spanning: number[][] = [];
  // The trace of the group average on the tensors of this index symmetry: the dimension of the
  // invariant subspace, since the average is an orthogonal projector for orthogonal operations. The
  // sums over the orbits of the index symmetry are an orthogonal basis of those tensors.
  let trace = 0;
  for (let seed = 0; seed < dim; seed++) {
    const members = orbit(seed, rank, perms);
    if (seed !== Math.min(...members)) continue;
    const averaged = new Array<number>(dim).fill(0);
    for (const { m, sign } of ops) {
      for (let out = 0; out < dim; out++) {
        const o = d[out];
        let acc = 0;
        for (const s of members) {
          const i = d[s];
          let p = 1;
          for (let r = 0; r < rank; r++) p *= m[o[r] * 3 + i[r]];
          acc += p;
        }
        averaged[out] += sign * acc;
      }
    }
    for (let k = 0; k < dim; k++) averaged[k] /= ops.length;
    trace += members.reduce((sum, s) => sum + averaged[s], 0) / members.length;
    if (averaged.some((x) => Math.abs(x) >= EPSILON)) spanning.push(averaged);
  }

  const reduced = reduce(spanning, dim, deviation, Math.round(trace));
  const basis = reduced.rows.map((row) => row.map(snapEntry));
  const { pivots } = reduced;
  const relations: number[][] = [];
  for (let c = 0; c < dim; c++) {
    if (pivots.includes(c)) continue;
    const row = new Array<number>(dim).fill(0);
    row[c] = 1;
    basis.forEach((b, k) => {
      if (b[c] !== 0) row[pivots[k]] = -b[c];
    });
    relations.push(row);
  }
  return Object.freeze({
    rank,
    basis: freezeRows(basis),
    parameters: freezeRows(pivots.map((p) => d[p])),
    relations: freezeRows(relations),
  });
}

/**
 * The reduced row echelon form of the projections, with as many pivots as the invariant subspace
 * has dimensions (`rank`, the trace of the group average, exact for an exact group in any frame).
 * For a group made exact from operations of a caller (`idealGroup`), which lies `deviation` from
 * them, a component smaller than about that is not known to be independent: the pivots are first
 * sought at 10 × `deviation` (at least `PIVOT_EPSILON`) and the threshold is lowered tenfold until
 * the pivots reach the rank, so that the free parameters are those of the exact form unless one of
 * its pivots is itself of the order of the deviation (#89). Should the pivots exceed the rank even
 * at `PIVOT_EPSILON` (a component of the order of 10⁻⁷ in a general orientation), the threshold is
 * raised instead until they reach it.
 */
function reduce(spanning: readonly number[][], dim: number, deviation: number, rank: number) {
  const start = Math.max(10 * deviation, PIVOT_EPSILON);
  for (let threshold = start; threshold >= PIVOT_EPSILON * 0.999; threshold /= 10) {
    const reduced = rowEchelonWithPivots(spanning, dim, threshold);
    if (reduced.pivots.length === rank) return reduced;
  }
  for (let threshold = start * 10; threshold <= MAX_PIVOT_THRESHOLD; threshold *= 10) {
    const reduced = rowEchelonWithPivots(spanning, dim, threshold);
    if (reduced.pivots.length === rank) return reduced;
  }
  throw new Error(`The projections of a tensor form give no ${rank} independent components`);
}

/**
 * An entry within 10⁻⁹ of a multiple of 1/12 is set to it, so that the exact values of the
 * crystallographic forms (0, ±1/2, ±1, ±2 for the 32 classes in all settings) come out exact instead
 * of with rounding errors of the order of 10⁻¹⁵; other values (e.g. for a rotated frame) are kept.
 */
function snapEntry(x: number): number {
  const r = Math.round(x * 12) / 12;
  return Math.abs(x - r) < SNAP_EPSILON ? r + 0 : x;
}

function specKey(spec: TensorSpec): string {
  return `${spec.rank}:${spec.parity}:${spec.timeParity}:${spec.intrinsic}`;
}

const formCache = new Map<string, TensorForm>();

/**
 * The form of a tensor under a point group, a crystal class or a magnetic point group, in the
 * requested setting (default: the ITC default setting). The tensor is given by its specification
 * or by the name of a property in `TENSOR_PROPERTIES` (`'piezoelectric'`; docs/conventions.md,
 * "Tensors").
 */
export function tensorForm(
  key: MagneticPointGroupKey,
  spec: TensorSpec | TensorPropertyName,
  options?: SettingOptions,
): TensorForm {
  checkOptions(options, SETTING_KEYS, 'tensorForm');
  const resolved = specOf(spec);
  const perms = checkSpec(resolved);
  const ops = operations(key, options); // checks key and setting
  const index = settingIndexOf(key, options);
  const cacheKey = `${key}#${index}#${specKey(resolved)}`;
  let form = formCache.get(cacheKey);
  if (!form) {
    form = project(ops, resolved, perms);
    formCache.set(cacheKey, form);
  }
  return form;
}

/**
 * The form of a tensor under the group generated by `operations`, e.g. the site symmetry of a
 * surface normal (`siteSymmetry`) or the operations of a distorted crystal. The tensor is given by
 * its specification or by the name of a property in `TENSOR_PROPERTIES`. Each operation is read by
 * its Cartesian matrix (`cartesian`), which must be orthogonal, and each says whether it is
 * combined with time reversal (`timeReversal`, `true` or `false`). The list is closed into a group
 * within the tolerance, and that group is made exact before the form is computed, so that matrices
 * with rounding errors (e.g. rounded to 6 decimals) give the form of the exact group, with its
 * number of free parameters (docs/conventions.md, "Tolerances"). Throws a RangeError for an
 * operation without an orthogonal Cartesian matrix (`cartesian`; within the tolerance), for an
 * operation that does not say whether it is combined with time reversal, and for operations that
 * generate no finite group within the tolerance.
 */
export function tensorFormOf(
  operations: readonly CartesianOperation[],
  spec: TensorSpec | TensorPropertyName,
  options?: ToleranceOptions,
): TensorForm {
  checkOptions(options, TOLERANCE_KEYS, 'tensorFormOf');
  const resolved = specOf(spec);
  const perms = checkSpec(resolved);
  return formOfGroup(callerGroup(operations, options), resolved, perms);
}

/**
 * The operations of a caller, checked (orthogonal within the tolerance, time reversal given),
 * closed within the tolerance and made exact: the group the functions for a list of operations
 * compute with.
 */
export function callerGroup(operations: readonly CartesianOperation[], options?: ToleranceOptions): IdealGroup {
  const tolerance = toleranceOf(options, 'operations');
  checkCartesianOperations(operations, tolerance);
  checkTimeReversal(operations);
  return idealGroup(operations, tolerance);
}

/** The form of a tensor (checked specification and its permutations) under a group made exact. */
export function formOfGroup(group: IdealGroup, spec: TensorSpec, perms: number[][]): TensorForm {
  return project(group.operations, spec, perms, group.deviation);
}

/** The specification of a tensor given by its specification or name, checked, with its permutations. */
export function checkedSpec(spec: TensorSpec | TensorPropertyName): { spec: TensorSpec; perms: number[][] } {
  const resolved = specOf(spec);
  return { spec: resolved, perms: checkSpec(resolved) };
}

/**
 * The components of `tensor` (length 3^rank, flat index) in a frame rotated by the orthogonal
 * matrix `rotation`: t′_{i…} = f·Σ R_{ia}…R_{…}·t_{a…}, with f = det(R) for an axial tensor and 1
 * for a polar one. To express a tensor in the frame of a surface, pass the matrix whose rows are
 * the new axes in the old frame. Time parity plays no part. The kind of tensor is given by its
 * specification or by the name of a property in `TENSOR_PROPERTIES`. Throws a RangeError for a
 * rotation that is not orthogonal within the tolerance (per matrix entry of RᵀR).
 */
export function rotateTensor(
  tensor: readonly number[],
  rotation: Mat3,
  specOrName: TensorSpec | TensorPropertyName,
  options?: ToleranceOptions,
): readonly number[] {
  checkOptions(options, TOLERANCE_KEYS, 'rotateTensor');
  const spec = specOf(specOrName);
  checkSpec(spec);
  if (!Array.isArray(rotation) || rotation.length !== 3) {
    throw new RangeError(`The rotation must be a 3 × 3 matrix, not ${shown(rotation)}`);
  }
  rotation.forEach((row, i) => checkNumbers(row, 3, `Row ${i} of the rotation`));
  checkOrthogonalWithin(rotation, 'The rotation', toleranceOf(options, 'operations'));
  const { rank } = spec;
  const dim = 3 ** rank;
  if (!Array.isArray(tensor) || tensor.length !== dim)
    throw new RangeError(`A tensor of rank ${rank} has ${dim} components, not ${shown(tensor)}`);
  checkNumbers(tensor, dim, 'The tensor');
  const d = digits(rank);
  const m = rotation.flat();
  const f = spec.parity === 'axial' ? Math.sign(det(rotation)) : 1;
  const out = new Array<number>(dim).fill(0);
  for (let o = 0; o < dim; o++) {
    let acc = 0;
    for (let s = 0; s < dim; s++) {
      if (tensor[s] === 0) continue;
      let p = tensor[s];
      for (let r = 0; r < rank; r++) p *= m[d[o][r] * 3 + d[s][r]];
      acc += p;
    }
    out[o] = f * acc;
  }
  return deepFreeze(out);
}
