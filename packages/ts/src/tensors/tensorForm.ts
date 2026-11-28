/**
 * Symmetry-reduced forms of property tensors: which Cartesian components of a tensor of rank 0 to 4
 * a point group allows, and how they depend on each other. Results are plain numbers (coefficient
 * matrices and index lists); formulas, LaTeX and diagrams stay in the applications
 * (docs/conventions.md, "Tensors").
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
import {
  EPSILON,
  MAX_PIVOT_THRESHOLD,
  PIVOT_EPSILON,
  SNAP_EPSILON,
  toleranceOf,
  type ToleranceOptions,
} from '../tolerances.js';
import { rowEchelonWithPivots } from './rowEchelon.js';
import { deepFreeze } from '../freeze.js';

/** Rank of a tensor: 0 (scalar) to 4. */
export type TensorRank = 0 | 1 | 2 | 3 | 4;

/**
 * How the tensor behaves under an improper operation: `'polar'` transforms with R, `'axial'` with
 * det(R)·R (a pseudotensor; the prefix e of its Jahn symbol, e.g. eV for an axial vector). ITC calls the behaviour under inversion "parity", under which a polar
 * vector is odd, so the field is named `kind`.
 */
export type TensorKind = 'polar' | 'axial';

/**
 * How the tensor behaves under time reversal (in ITC's terms time-even, time-odd or
 * time-antisymmetric): `'even'` unchanged, `'odd'` changes sign (the prefix a, "magnetic", of its
 * Jahn symbol, e.g. aeV for the magnetization).
 *
 * @remarks Sources: ITC Vol. D (2013) for the terms; Gallego et al., Acta Cryst. A75, 438 (2019),
 * p. 439, for the prefix a.
 */
export type TimeParity = 'even' | 'odd';

/**
 * Symmetry of the tensor under permutation of its own indices, independent of the crystal, with its
 * Jahn symbol in the extended Jahn notation (square brackets for a symmetric, curly brackets for an
 * antisymmetric set of indices):
 * - `'none'`: no index symmetry, Vⁿ;
 * - `'symmetric-first-pair'` (rank 2 and above): the first two indices are interchangeable, [V²]V…;
 * - `'symmetric-last-pair'` (rank 2 and above): the last two, V…[V²] (at rank 3 second-harmonic
 *   generation and the piezoelectric effect); at rank 2 both mean a symmetric tensor, [V²];
 * - `'symmetric-pairs'` (rank 4): each of the two pairs symmetric, the pairs not interchangeable,
 *   [V²][V²] (e.g. electric-quadrupole SHG, photoelasticity; in Jahn's original notation [V²]²);
 * - `'symmetric-pairs-exchangeable'` (rank 4): in addition the pairs interchangeable, [[V²][V²]]
 *   (elastic stiffness, the symmetry Voigt's notation uses; in Jahn's original notation [[V²]²]);
 * - `'antisymmetric'` (rank 2): t_ij = −t_ji, {V²};
 * - `'totally-symmetric'` (rank 2 and above): every index interchangeable, [Vⁿ] (e.g. second-harmonic
 *   generation under Kleinman's condition).
 *
 * @remarks Source: the extended Jahn symbols of Gallego et al., Acta Cryst. A75, 438 (2019),
 * pp. 439–440, after Jahn (1949).
 */
export type IntrinsicSymmetry =
  | 'none'
  | 'symmetric-first-pair'
  | 'symmetric-last-pair'
  | 'symmetric-pairs'
  | 'symmetric-pairs-exchangeable'
  | 'antisymmetric'
  | 'totally-symmetric';

/** The kind of tensor. */
export interface TensorSpec {
  /** Number of indices, 0 to 4. */
  readonly rank: TensorRank;
  /** `'polar'` or `'axial'`: whether an improper operation changes the sign (factor det R). */
  readonly kind: TensorKind;
  /** `'even'` or `'odd'`: whether time reversal changes the sign. */
  readonly timeParity: TimeParity;
  /** The index symmetry of the tensor. */
  readonly intrinsic: IntrinsicSymmetry;
}

/**
 * The form of a tensor under a point group: the subspace of tensors invariant under every
 * operation and with the requested index symmetry. Every entry is a plain number; a component is
 * named by its flat index, the first index slowest (see the module documentation).
 */
export interface TensorForm {
  /** The rank of the tensor. */
  readonly rank: TensorRank;
  /**
   * A basis of the allowed tensors in reduced row echelon form: one tensor per free parameter, with
   * 1 at the parameter's own component and 0 at every other parameter's component. Every allowed
   * tensor is Σₖ pₖ·basis[k], where pₖ is the value of its component `parameters[k]`. Empty if the
   * tensor vanishes.
   */
  readonly basis: readonly (readonly number[])[];
  /**
   * The free parameters, as the index lists of their components (e.g. `[0, 1, 1]` for xyy), one per
   * basis tensor and in its order: each is the lowest component independent of those before it.
   */
  readonly parameters: readonly (readonly number[])[];
  /**
   * The constraints: one per component c that is not a parameter, in ascending order of the
   * components, each a tensor r in the shape of the basis tensors with Σ r·t = 0, summed over all
   * components, for every allowed tensor t. The constraint of c reads
   * t_c − Σₖ b_{k,c}·t_{parameters[k]} = 0, with b_{k,c} the component c of basis[k]; one with a
   * single 1 says that the component vanishes.
   *
   * @remarks In TypeScript the basis tensors and the constraints are flat, 3^rank components.
   */
  readonly relations: readonly (readonly number[])[];
  /**
   * The largest magnitude of a coefficient of the basis, 0 if the tensor vanishes: how much the basis
   * amplifies an error of the parameters. It is 1 or 2 for the form of a point group in a setting,
   * and large for operations in a frame that is nearly, but not exactly, aligned with a symmetry
   * element, the more the higher the rank (the polar axis of 4mm tilted by 10⁻⁶ gives about 10⁶,
   * its piezoelectric tensor tilted by 0.1 about cot³ 0.1 ≈ 10³). For a crystal in another frame,
   * the form computed in the frame of its setting (`tensorForm`) and rotated into the other frame
   * (`rotateTensor`) keeps the coefficients small.
   */
  readonly largestCoefficient: number;
}

const RANKS: readonly number[] = [0, 1, 2, 3, 4];

/** A permutation of the indices of a tensor (`out[k] = in[perm[k]]`) with the sign it gives. */
export interface SignedPermutation {
  readonly perm: readonly number[];
  readonly sign: 1 | -1;
}

/** The names of the fields and values up to 0.10, with those that replace them. */
const RENAMED_INTRINSIC: Readonly<Record<string, IntrinsicSymmetry>> = {
  ij: 'symmetric-first-pair',
  jk: 'symmetric-last-pair',
  ij_kl: 'symmetric-pairs',
  voigt: 'symmetric-pairs-exchangeable',
};
const RENAMED_TIME_PARITY: Readonly<Record<string, TimeParity>> = { i: 'even', c: 'odd' };

/** The fields of a tensor specification; another is a mistake (a misspelt `timeParity` would read as even). */
const SPEC_FIELDS: readonly string[] = ['rank', 'kind', 'timeParity', 'intrinsic'];

/** Checks a specification and returns the signed index permutations that generate its intrinsic symmetry. */
function checkSpec(spec: TensorSpec): SignedPermutation[] {
  const { rank, kind, timeParity, intrinsic } = spec;
  if ('parity' in spec) {
    throw new RangeError(
      `The field parity of a tensor specification is named kind since symcrys 0.11 ('polar' or 'axial')`,
    );
  }
  const unknown = Object.keys(spec).filter((k) => !SPEC_FIELDS.includes(k));
  if (unknown.length > 0) {
    throw new RangeError(`Unknown field ${shown(unknown[0])} of a tensor specification (${SPEC_FIELDS.join(', ')})`);
  }
  if (!RANKS.includes(rank)) throw new RangeError(`Tensor rank must be 0 to 4, not ${shown(rank)}`);
  if (kind !== 'polar' && kind !== 'axial') {
    throw new RangeError(`The kind of a tensor is 'polar' or 'axial', not ${shown(kind)}`);
  }
  if (timeParity !== 'even' && timeParity !== 'odd') {
    const renamed = typeof timeParity === 'string' ? RENAMED_TIME_PARITY[timeParity] : undefined;
    throw new RangeError(
      `The time parity of a tensor is 'even' or 'odd', not ${shown(timeParity)}` +
        (renamed ? ` ('${timeParity}' up to symcrys 0.10 is '${renamed}')` : ''),
    );
  }
  const swap = (a: number, b: number, sign: 1 | -1 = 1): SignedPermutation => {
    const perm = Array.from({ length: rank }, (_, k) => k);
    [perm[a], perm[b]] = [perm[b], perm[a]];
    return { perm, sign };
  };
  const needs = (condition: boolean, what: string) => {
    if (!condition) throw new RangeError(`Intrinsic symmetry '${intrinsic}' needs ${what}, not rank ${rank}`);
  };
  switch (intrinsic) {
    case 'none':
      return [];
    case 'symmetric-first-pair':
      needs(rank >= 2, 'rank 2 or more');
      return [swap(0, 1)];
    case 'symmetric-last-pair':
      needs(rank >= 2, 'rank 2 or more');
      return [swap(rank - 2, rank - 1)];
    case 'symmetric-pairs':
      needs(rank === 4, 'rank 4');
      return [swap(0, 1), swap(2, 3)];
    case 'symmetric-pairs-exchangeable':
      needs(rank === 4, 'rank 4');
      return [swap(0, 1), swap(2, 3), { perm: [2, 3, 0, 1], sign: 1 }];
    case 'antisymmetric':
      needs(rank === 2, 'rank 2');
      return [swap(0, 1, -1)];
    case 'totally-symmetric':
      needs(rank >= 2, 'rank 2 or more');
      return Array.from({ length: rank - 1 }, (_, k) => swap(k, k + 1));
    default: {
      const renamed = typeof intrinsic === 'string' ? RENAMED_INTRINSIC[intrinsic] : undefined;
      throw new RangeError(
        `Unknown intrinsic symmetry: ${shown(intrinsic)}` +
          (renamed ? ` ('${intrinsic as string}' up to symcrys 0.10 is '${renamed}')` : ''),
      );
    }
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

/**
 * The flat indices reached from `flat` by the signed index permutations (`out[k] = in[perm[k]]`),
 * each with the product of the signs on the way; undefined if one is reached with both signs (the
 * seed of an antisymmetric tensor with two equal indices, which vanishes).
 */
function orbit(
  flat: number,
  rank: number,
  perms: readonly SignedPermutation[],
): { flat: number; sign: 1 | -1 }[] | undefined {
  const d = digits(rank);
  const seen = new Map<number, 1 | -1>([[flat, 1]]);
  const stack = [flat];
  while (stack.length > 0) {
    const cur = stack.pop()!;
    const curSign = seen.get(cur)!;
    for (const { perm, sign } of perms) {
      let next = 0;
      for (let k = 0; k < rank; k++) next = next * 3 + d[cur][perm[k]];
      const nextSign = (curSign * sign) as 1 | -1;
      const known = seen.get(next);
      if (known === undefined) {
        seen.set(next, nextSign);
        stack.push(next);
      } else if (known !== nextSign) {
        return undefined;
      }
    }
  }
  return [...seen].map(([f, sign]) => ({ flat: f, sign }));
}

function freezeRows(rows: readonly (readonly number[])[]): readonly (readonly number[])[] {
  return Object.freeze(rows.map((r) => Object.freeze([...r])));
}

/**
 * Whether the group allows a non-zero tensor of the specification: the dimension of the invariant
 * subspace is the trace of the group average, the same trace `project` computes, but without the
 * averaged vectors and their row reduction. Each orbit of the index symmetry adds a diagonal
 * element of the average, which is an orthogonal projector, so each adds a number from 0 to 1; the
 * sum is the dimension, a whole number up to rounding, and it is at least 1 as soon as a partial sum
 * reaches 1/2. For the yes/no questions of the named properties.
 */
export function allowsTensor(
  group: readonly CartesianOperation[],
  spec: TensorSpec,
  perms: readonly SignedPermutation[],
): boolean {
  const { rank } = spec;
  const dim = 3 ** rank;
  const d = digits(rank);
  const ops = signedOperations(group, spec);
  let trace = 0;
  for (let seed = 0; seed < dim; seed++) {
    const members = orbit(seed, rank, perms);
    if (!members || seed !== Math.min(...members.map((m) => m.flat))) continue;
    // The diagonal element of the average on the normalised orbit sum: only its own components.
    let diagonal = 0;
    for (const { m, sign } of ops) {
      for (const t of members) {
        const o = d[t.flat];
        let acc = 0;
        for (const s of members) {
          const i = d[s.flat];
          let p = s.sign;
          for (let r = 0; r < rank; r++) p *= m[o[r] * 3 + i[r]];
          acc += p;
        }
        diagonal += t.sign * sign * acc;
      }
    }
    trace += diagonal / ops.length / members.length;
    if (trace >= 0.5) return true;
  }
  return false;
}

/** The flat matrices of the operations with the sign each gives a tensor of the specification. */
function signedOperations(group: readonly CartesianOperation[], spec: TensorSpec): { m: number[]; sign: number }[] {
  return group.map((op) => ({
    m: op.cartesian.flat(),
    sign:
      (spec.kind === 'axial' ? Math.sign(det(op.cartesian)) : 1) *
      (spec.timeParity === 'odd' && op.timeReversal ? -1 : 1),
  }));
}

/**
 * The form for a group given as its full list of operations. The group average of each seed
 * (a unit tensor on one orbit of the intrinsic symmetry) projects it onto the invariant subspace;
 * the projections span it, and the reduced row echelon form makes the basis minimal and canonical.
 */
function project(
  group: readonly CartesianOperation[],
  spec: TensorSpec,
  perms: readonly SignedPermutation[],
  deviation = 0,
): TensorForm {
  const { rank } = spec;
  const dim = 3 ** rank;
  const d = digits(rank);
  const ops = signedOperations(group, spec);

  const spanning: number[][] = [];
  // The trace of the group average on the tensors of this index symmetry: the dimension of the
  // invariant subspace, since the average is an orthogonal projector for orthogonal operations. The
  // sums over the orbits of the index symmetry are an orthogonal basis of those tensors.
  let trace = 0;
  for (let seed = 0; seed < dim; seed++) {
    const members = orbit(seed, rank, perms);
    if (!members || seed !== Math.min(...members.map((m) => m.flat))) continue;
    const averaged = new Array<number>(dim).fill(0);
    for (const { m, sign } of ops) {
      for (let out = 0; out < dim; out++) {
        const o = d[out];
        let acc = 0;
        for (const s of members) {
          const i = d[s.flat];
          let p = s.sign;
          for (let r = 0; r < rank; r++) p *= m[o[r] * 3 + i[r]];
          acc += p;
        }
        averaged[out] += sign * acc;
      }
    }
    for (let k = 0; k < dim; k++) averaged[k] /= ops.length;
    trace += members.reduce((sum, s) => sum + s.sign * averaged[s.flat], 0) / members.length;
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
    largestCoefficient: basis.reduce((m, row) => row.reduce((n, x) => Math.max(n, Math.abs(x)), m), 0),
  });
}

/**
 * The reduced row echelon form of the projections, with as many pivots as the invariant subspace
 * has dimensions (`rank`, the trace of the group average, exact for an exact group in any frame).
 * For a group made exact from operations of a caller (`idealGroup`), which lies `deviation` from
 * them, a component smaller than about that is not known to be independent: the pivots are first
 * sought at 10 × `deviation` (at least `PIVOT_EPSILON`) and the threshold is lowered tenfold until
 * the pivots reach the rank, so that the free parameters are those of the exact form unless one of
 * its pivots is itself of the order of the deviation. Should the pivots exceed the rank even
 * at `PIVOT_EPSILON` (a component of the order of 10⁻⁷ in a general orientation), the threshold is
 * raised instead until they reach it.
 */
function reduce(spanning: readonly number[][], dim: number, deviation: number, rank: number) {
  const start = Math.max(10 * deviation, PIVOT_EPSILON);
  // 0.999: the tenfold steps from a power of ten reach PIVOT_EPSILON itself despite rounding.
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
  return `${spec.rank}:${spec.kind}:${spec.timeParity}:${spec.intrinsic}`;
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
 * generate no finite group within the tolerance. The groups and forms of the last 64 lists of
 * operations are kept, so a list passed again (as in a loop) is answered without closing the group and projecting again.
 */
export function tensorFormOf(
  operations: readonly CartesianOperation[],
  spec: TensorSpec | TensorPropertyName,
  options?: ToleranceOptions,
): TensorForm {
  checkOptions(options, TOLERANCE_KEYS, 'tensorFormOf');
  const resolved = specOf(spec);
  const perms = checkSpec(resolved);
  const { group } = callerGroupWithKey(operations, options);
  let forms = callerForms.get(group);
  if (!forms) {
    forms = new Map();
    callerForms.set(group, forms);
  }
  const formKey = specKey(resolved);
  let form = forms.get(formKey);
  if (!form) {
    form = formOfGroup(group, resolved, perms);
    forms.set(formKey, form);
  }
  return form;
}

/**
 * The groups of the last `CALLER_CACHE_SIZE` lists of operations a caller passed in, keyed by the
 * numbers the functions read (`cartesian`, `timeReversal`, in the order given) and the tolerance,
 * and the forms computed for each group: a list passed again, as a Python loop does, costs no
 * closure and no projection. The checks of the input run on every call, before the lookup.
 * Groups and forms are frozen, so sharing them is safe; the groups are dropped oldest first, and
 * their forms with them. The key is the list as given, so the same group in another order or with
 * other rounding is computed anew (correct, just not shared).
 */
const CALLER_CACHE_SIZE = 64;
const callerGroups = new Map<string, IdealGroup>();
const callerForms = new WeakMap<IdealGroup, Map<string, TensorForm>>();

function remember<T>(cache: Map<string, T>, key: string, value: T): T {
  cache.delete(key);
  cache.set(key, value);
  if (cache.size > CALLER_CACHE_SIZE) cache.delete(cache.keys().next().value as string);
  return value;
}

/** The group of `callerGroup` with the key of the caller's list, from the cache when the list was seen. */
function callerGroupWithKey(
  operations: readonly CartesianOperation[],
  options?: ToleranceOptions,
): { group: IdealGroup; key: string } {
  const tolerance = toleranceOf(options, 'operations');
  checkCartesianOperations(operations, tolerance);
  checkTimeReversal(operations);
  const key = `${tolerance}#${JSON.stringify(operations.map((op) => [op.cartesian, op.timeReversal === true]))}`;
  const cached = callerGroups.get(key);
  const group = remember(callerGroups, key, cached ?? deepFreeze(idealGroup(operations, tolerance)));
  return { group, key };
}

/**
 * The operations of a caller, checked (orthogonal within the tolerance, time reversal given),
 * closed within the tolerance and made exact: the group the functions for a list of operations
 * compute with.
 */
export function callerGroup(operations: readonly CartesianOperation[], options?: ToleranceOptions): IdealGroup {
  return callerGroupWithKey(operations, options).group;
}

/** The form of a tensor (checked specification and its permutations) under a group made exact. */
export function formOfGroup(group: IdealGroup, spec: TensorSpec, perms: readonly SignedPermutation[]): TensorForm {
  return project(group.operations, spec, perms, group.deviation);
}

/** The specification of a tensor given by its specification or name, checked, with its permutations. */
export function checkedSpec(spec: TensorSpec | TensorPropertyName): {
  spec: TensorSpec;
  perms: readonly SignedPermutation[];
} {
  const resolved = specOf(spec);
  return { spec: resolved, perms: checkSpec(resolved) };
}

/**
 * A rotation of a caller, checked: a 3 × 3 matrix of finite numbers, orthogonal within the
 * tolerance. `what` names it in a message ("The rotation", "Rotation 2"), `of` in the message on a
 * row ("the rotation", "rotation 2").
 */
function checkRotation(rotation: unknown, what: string, of: string, tolerance: number): Mat3 {
  if (!Array.isArray(rotation) || rotation.length !== 3) {
    throw new RangeError(`${what} must be a 3 × 3 matrix, not ${shown(rotation)}`);
  }
  // Array.from: a hole is undefined, and refused, not skipped.
  Array.from(rotation as unknown[]).forEach((row, i) => checkNumbers(row, 3, `Row ${i} of ${of}`));
  checkOrthogonalWithin(rotation as unknown as Mat3, what, tolerance);
  return rotation as unknown as Mat3;
}

/** A tensor of a caller, checked: `3^rank` finite numbers; `index` is its place in a list. */
function checkTensor(tensor: unknown, rank: number, index?: number): readonly number[] {
  const dim = 3 ** rank;
  if (!Array.isArray(tensor) || tensor.length !== dim) {
    throw new RangeError(
      index === undefined
        ? `A tensor of rank ${rank} has ${dim} components, not ${shown(tensor)}`
        : `Tensor ${index} must have ${dim} components (rank ${rank}), not ${shown(tensor)}`,
    );
  }
  checkNumbers(tensor, dim, index === undefined ? 'The tensor' : `Tensor ${index}`);
  return tensor as readonly number[];
}

/** "1 tensor", "2 tensors". */
function count(n: number, noun: string): string {
  return `${n} ${noun}${n === 1 ? '' : 's'}`;
}

/**
 * Whether a rotation argument is a list of rotations: an empty list, or one with an entry that is a
 * matrix (a non-empty list of lists). A rotation has rows of numbers, so a row that is wrong is
 * reported as a row of the rotation.
 */
function isRotationList(rotation: unknown): boolean {
  if (!Array.isArray(rotation)) return false;
  if (rotation.length === 0) return true;
  return Array.from(rotation as unknown[]).some(
    (r) => Array.isArray(r) && r.length > 0 && Array.from(r as unknown[]).every(Array.isArray),
  );
}

/**
 * The kernel of the rotation, for checked input: t′ = f·R along index 1, then along index 2, …,
 * rank·3^(rank+1) products instead of rank·9^rank; index k of the flat position has the stride
 * 3^(rank−1−k). `m` is the rotation by rows, flat.
 */
function rotated(tensor: readonly number[], m: readonly number[], f: number, rank: number): number[] {
  const dim = 3 ** rank;
  let current: number[] = tensor.map((x) => x + 0);
  for (let k = 0; k < rank; k++) {
    const stride = 3 ** (rank - 1 - k);
    const next = new Array<number>(dim);
    for (let flat = 0; flat < dim; flat++) {
      const a = Math.floor(flat / stride) % 3;
      const base = flat - a * stride;
      next[flat] =
        m[a * 3] * current[base] + m[a * 3 + 1] * current[base + stride] + m[a * 3 + 2] * current[base + 2 * stride];
    }
    current = next;
  }
  return current.map((x) => f * x + 0);
}

/** The factor of a rotation for a tensor of the kind: det(R) for an axial tensor, 1 for a polar one. */
function kindFactor(kind: TensorKind, rotation: Mat3): number {
  return kind === 'axial' ? Math.sign(det(rotation)) : 1;
}

/**
 * The tensor `tensor` in a frame rotated by the orthogonal
 * matrix `rotation`: t′_{i…} = f·Σ R_{ia}…R_{…}·t_{a…}, with f = det(R) for an axial tensor and 1
 * for a polar one. To express a tensor in the frame of a surface, pass the matrix whose rows are
 * the new axes in the old frame. Time parity plays no part. The kind of tensor is given by its
 * specification or by the name of a property in `TENSOR_PROPERTIES`. Throws a RangeError for a
 * rotation that is not orthogonal within the tolerance (per matrix entry of RᵀR). For many tensors,
 * `rotateTensors` checks the rotation and the specification once.
 */
export function rotateTensor(
  tensor: readonly number[],
  rotation: Mat3,
  spec: TensorSpec | TensorPropertyName,
  options?: ToleranceOptions,
): readonly number[] {
  checkOptions(options, TOLERANCE_KEYS, 'rotateTensor');
  const resolved = specOf(spec);
  checkSpec(resolved);
  const r = checkRotation(rotation, 'The rotation', 'the rotation', toleranceOf(options, 'operations'));
  const checked = checkTensor(tensor, resolved.rank);
  return deepFreeze(rotated(checked, r.flat(), kindFactor(resolved.kind, r), resolved.rank));
}

/**
 * A list of tensors, each in a frame rotated by `rotation`, one orthogonal matrix for all or a list
 * of them, one per tensor: entry i is `rotateTensor(tensors[i], R, spec)` with R the rotation or
 * the i-th rotation. The specification and the rotations are checked once, not per tensor. Throws a
 * RangeError for a list of rotations of another length than the list of tensors, and as
 * `rotateTensor` does.
 *
 * @remarks A list of rotations is told from one rotation by its entries: a rotation has rows of
 * numbers, a list of rotations has matrices. An empty list is a list of rotations.
 */
export function rotateTensors(
  tensors: readonly (readonly number[])[],
  rotation: Mat3 | readonly Mat3[],
  spec: TensorSpec | TensorPropertyName,
  options?: ToleranceOptions,
): readonly (readonly number[])[] {
  checkOptions(options, TOLERANCE_KEYS, 'rotateTensors');
  const resolved = specOf(spec);
  checkSpec(resolved);
  const tolerance = toleranceOf(options, 'operations');
  if (!Array.isArray(tensors)) throw new RangeError(`The tensors are a list of tensors, not ${shown(tensors)}`);
  const list = isRotationList(rotation);
  const rotations: { m: readonly number[]; f: number }[] = [];
  if (list) {
    const given = Array.from(rotation as unknown[]);
    if (given.length !== tensors.length) {
      throw new RangeError(
        `${count(tensors.length, 'tensor')} and ${count(given.length, 'rotation')}: pass one rotation for all, or one per tensor`,
      );
    }
    given.forEach((r, i) => {
      const m = checkRotation(r, `Rotation ${i}`, `rotation ${i}`, tolerance);
      rotations.push({ m: m.flat(), f: kindFactor(resolved.kind, m) });
    });
  } else {
    const m = checkRotation(rotation, 'The rotation', 'the rotation', tolerance);
    rotations.push({ m: m.flat(), f: kindFactor(resolved.kind, m) });
  }
  // Array.from: a hole is undefined, and refused, not skipped.
  const checked = Array.from(tensors as unknown[]).map((t, i) => checkTensor(t, resolved.rank, i));
  return deepFreeze(
    checked.map((t, i) => {
      const { m, f } = rotations[list ? i : 0];
      return rotated(t, m, f, resolved.rank);
    }),
  );
}
