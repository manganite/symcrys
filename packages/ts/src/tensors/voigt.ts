/**
 * Voigt's two-index notation of tensors with symmetric index pairs, as ITC Vol. D (2013) writes it
 * (§ 1.1.4.10, pp. 24–27; eq. (1.5.7.4), p. 134): an index pair ij becomes one index α = 1…6 for
 * 11, 22, 33, 23, 31, 12 (eq. (1.1.4.6)), and the components with α = 4, 5, 6 carry a factor 1 or 2
 * per pair, as ITC defines the quantity.
 */

import { checkOptions, shown, everyEntry } from '../checks.js';
import { deepFreeze } from '../freeze.js';
import { toleranceOf, type ToleranceOptions } from '../tolerances.js';
import { type TensorPropertyName } from './propertyTable.js';
import { checkedSpec, type SignedPermutation, type TensorSpec } from './tensorForm.js';

/** The factor of the components of a Voigt index α = 4, 5, 6: 2 where ITC sums the two symmetric components (t_ij + t_ji), 1 where it takes one. */
export type VoigtFactor = 1 | 2;

/** The options of `toVoigt` and `fromVoigt`. */
export interface VoigtOptions extends ToleranceOptions {
  /**
   * The factor of each contracted index pair, in the order of the pairs: 2 where ITC defines the
   * Voigt component as the sum of the two symmetric components, 1 where it is the component itself.
   * So the strain (S₄ = 2S₂₃), the piezoelectric d (d_iα = d_ijk + d_ikj)
   * and the piezomagnetic Λ take `[2]`, the compliances s and the electrostriction Q `[2, 2]`; the
   * stress and the piezoelectric e take `[1]`, the stiffnesses c and the elasto-optic p `[1, 1]`;
   * the piezo-optic π takes `[1, 2]`; the susceptibility of second-harmonic generation, which has
   * the tensor of `'piezoelectric'`, takes `[1]`. Required, except for `'piezomagnetic'`, which
   * takes ITC's `[2]`; `'piezoelectric'` has none, since its tensor serves both d and second-harmonic
   * generation.
   *
   * @remarks Sources: ITC Vol. D (2013), § 1.1.4.10 (the factors); § 1.7.2.2.1.3, p. 185
   * (second-harmonic generation, `[1]`); eq. (1.5.7.4) (the piezomagnetic Λ, `[2]`).
   */
  readonly factors?: readonly VoigtFactor[];
  /**
   * The index symmetry of the tensor (or of the tensor of a Voigt array) is checked within this
   * tolerance, relative to its largest component; default `EPSILON` (10⁻⁵).
   */
  readonly tolerance?: number;
}

/** The index pair of α = 1…6, eq. (1.1.4.6): 11, 22, 33, 23, 31, 12. */
const PAIR: readonly (readonly [number, number])[] = [
  [0, 0],
  [1, 1],
  [2, 2],
  [1, 2],
  [2, 0],
  [0, 1],
];

/** α (0-based) of an index pair. */
const ALPHA = [
  [0, 5, 4],
  [5, 1, 3],
  [4, 3, 2],
];

/**
 * ITC's factors of the named properties that ITC writes in Voigt's notation with one convention
 * only; 'piezoelectric' has none, since its tensor is also that of second-harmonic generation, which
 * ITC contracts without the factor 2 (§ 1.7.2.2.1.3, p. 185).
 */
const PROPERTY_FACTORS: Partial<Readonly<Record<TensorPropertyName, readonly VoigtFactor[]>>> = {
  piezomagnetic: [2],
};

/** The contracted pairs of a specification: the positions of their first index, and the layout. */
interface Layout {
  readonly rank: number;
  /** The first index of each contracted pair, in order. */
  readonly pairs: readonly number[];
  /** The shape of the Voigt array: [6], [3, 6], [6, 3] or [6, 6]. */
  readonly shape: readonly number[];
}

function layoutOf(spec: TensorSpec, who: string): Layout {
  const { rank, intrinsic } = spec;
  const symmetric = ['symmetric-first-pair', 'symmetric-last-pair', 'totally-symmetric'];
  if (rank === 2 && symmetric.includes(intrinsic)) return { rank, pairs: [0], shape: [6] };
  if (rank === 3 && (intrinsic === 'symmetric-last-pair' || intrinsic === 'totally-symmetric')) {
    return { rank, pairs: [1], shape: [3, 6] };
  }
  if (rank === 3 && intrinsic === 'symmetric-first-pair') return { rank, pairs: [0], shape: [6, 3] };
  if (rank === 4 && ['symmetric-pairs', 'symmetric-pairs-exchangeable', 'totally-symmetric'].includes(intrinsic)) {
    return { rank, pairs: [0, 2], shape: [6, 6] };
  }
  throw new RangeError(
    `${who}: Voigt's notation needs a symmetric index pair (rank 2 'symmetric-first-pair', 'symmetric-last-pair' ` +
      `or 'totally-symmetric'; rank 3 'symmetric-last-pair', 'symmetric-first-pair' or 'totally-symmetric'; rank 4 ` +
      `'symmetric-pairs', 'symmetric-pairs-exchangeable' or 'totally-symmetric'), not rank ${rank} '${intrinsic}'`,
  );
}

function factorsOf(
  specOrName: TensorSpec | TensorPropertyName,
  layout: Layout,
  options: VoigtOptions | undefined,
  who: string,
): readonly VoigtFactor[] {
  const given: unknown = options?.factors;
  const factors =
    given !== undefined ? given : typeof specOrName === 'string' ? PROPERTY_FACTORS[specOrName] : undefined;
  if (factors === undefined) {
    const piezoelectric =
      specOrName === 'piezoelectric'
        ? ': [2] for the piezoelectric d (ITC Vol. D § 1.1.4.10.3), [1] for second-harmonic generation (§ 1.7.2.2.1.3)'
        : ', 2 where ITC sums the two symmetric components (strain, d, s), 1 where it takes one (stress, e, c)';
    throw new RangeError(
      `${who}: give the factors of the ${layout.pairs.length === 1 ? 'index pair' : 'index pairs'} ` +
        `({ factors: [${layout.pairs.map(() => '1 or 2').join(', ')}] })${piezoelectric}`,
    );
  }
  if (
    !Array.isArray(factors) ||
    factors.length !== layout.pairs.length ||
    !everyEntry(factors, (f) => f === 1 || f === 2)
  ) {
    throw new RangeError(
      `${who}: factors must be ${layout.pairs.length} of 1 or 2, one per contracted index pair, not ${shown(factors)}`,
    );
  }
  return factors as readonly VoigtFactor[];
}

const flatOf = (digits: readonly number[]): number => digits.reduce((s, d) => s * 3 + d, 0);
const digitsOf = (flat: number, rank: number): number[] =>
  Array.from({ length: rank }, (_, k) => Math.floor(flat / 3 ** (rank - 1 - k)) % 3);

/** Checks that a tensor has its intrinsic symmetry, within the tolerance relative to its largest component. */
function checkSymmetry(
  t: readonly number[],
  rank: number,
  perms: readonly SignedPermutation[],
  tolerance: number,
  who: string,
): void {
  const scale = Math.max(...t.map(Math.abs));
  for (let o = 0; o < t.length; o++) {
    const d = digitsOf(o, rank);
    for (const { perm, sign } of perms) {
      const other = flatOf(perm.map((k) => d[k]));
      // Equal when they differ by less than the tolerance (a difference of exactly it is refused),
      // or not at all (the zero tensor).
      const difference = Math.abs(t[o] - sign * t[other]);
      if (difference !== 0 && !(difference < tolerance * scale)) {
        throw new RangeError(
          `${who}: the tensor lacks the index symmetry of its specification (component ${o} is ${t[o]}, ` +
            `its partner ${other} ${t[other]})`,
        );
      }
    }
  }
}

/** The Voigt indices (0-based) of a flat tensor index, and the product of the factors of its pairs. */
function voigtIndex(
  flat: number,
  layout: Layout,
  factors: readonly VoigtFactor[],
): { index: number[]; factor: number } {
  const d = digitsOf(flat, layout.rank);
  const index: number[] = [];
  let factor = 1;
  let k = 0;
  layout.pairs.forEach((first, p) => {
    while (k < first) index.push(d[k++]);
    const alpha = ALPHA[d[first]][d[first + 1]];
    index.push(alpha);
    if (alpha >= 3) factor *= factors[p];
    k = first + 2;
  });
  while (k < layout.rank) index.push(d[k++]);
  return { index, factor };
}

function resolve(specOrName: TensorSpec | TensorPropertyName, options: VoigtOptions | undefined, who: string) {
  checkOptions(options, ['factors', 'tolerance'], who);
  const { spec, perms } = checkedSpec(specOrName);
  const layout = layoutOf(spec, who);
  const factors = factorsOf(specOrName, layout, options, who);
  const tolerance = toleranceOf(options, 'metric');
  return { spec, perms, layout, factors, tolerance };
}

/**
 * A tensor in Voigt's two-index notation: each contracted index pair ij becomes α = 1…6 for 11, 22,
 * 33, 23, 31, 12, and a component with
 * α = 4, 5, 6 is the tensor component times the factor of its pair (`factors`). A symmetric tensor of
 * rank 2 gives 6 components, one of rank 3 symmetric in its last pair a 3 × 6 matrix (d_iα), in its
 * first pair a 6 × 3 matrix (e_αk), one of rank 4 a 6 × 6 matrix (s_αβ, c_αβ). Throws a RangeError for a specification
 * without a symmetric index pair, factors that are missing or not one 1 or 2 per pair, and a tensor
 * that lacks the index symmetry of its specification (within the tolerance, relative to its largest
 * component).
 *
 * @remarks The tensor is flat, 3^rank components, as `tensorForm` gives a basis tensor. Source:
 * ITC Vol. D (2013), § 1.1.4.10, pp. 24–27; the index pairs, eq. (1.1.4.6).
 */
export function toVoigt(
  tensor: readonly number[],
  spec: TensorSpec | TensorPropertyName,
  options?: VoigtOptions,
): readonly number[] | readonly (readonly number[])[] {
  const who = 'toVoigt';
  const resolved = resolve(spec, options, who);
  const { perms, layout, factors, tolerance } = resolved;
  const rank = resolved.spec.rank;
  const dim = 3 ** rank;
  if (
    !Array.isArray(tensor) ||
    tensor.length !== dim ||
    !everyEntry(tensor, (x) => typeof x === 'number' && Number.isFinite(x))
  ) {
    throw new RangeError(`${who}: a tensor of rank ${rank} is ${dim} finite numbers, not ${shown(tensor)}`);
  }
  checkSymmetry(tensor, rank, perms, tolerance, who);
  const out =
    layout.shape.length === 1
      ? new Array<number>(6).fill(0)
      : Array.from({ length: layout.shape[0] }, () => new Array<number>(layout.shape[1]).fill(0));
  for (let o = 0; o < dim; o++) {
    const { index, factor } = voigtIndex(o, layout, factors);
    // The representative index of each Voigt cell: the pair in the order of PAIR.
    const d = digitsOf(o, rank);
    const canonical = layout.pairs.every((first) => {
      const alpha = ALPHA[d[first]][d[first + 1]];
      return PAIR[alpha][0] === d[first] && PAIR[alpha][1] === d[first + 1];
    });
    if (!canonical) continue;
    const value = factor * tensor[o] + 0;
    if (index.length === 1) (out as number[])[index[0]] = value;
    else (out as number[][])[index[0]][index[1]] = value;
  }
  return deepFreeze(out);
}

/**
 * The tensor of a Voigt array (`toVoigt` in reverse): each tensor component is the Voigt component
 * of its index pairs over the factors of the pairs, so that the tensor has the index symmetry of its
 * specification. Throws a RangeError for a Voigt array of
 * the wrong shape, and for one that is no tensor of the specification (for rank 4 with interchangeable
 * pairs a 6 × 6 matrix that is not symmetric, for a totally symmetric tensor one whose
 * components do not agree), within the tolerance relative to its largest component.
 *
 * @remarks The tensor is flat, 3^rank components, as `tensorForm` gives a basis tensor.
 */
export function fromVoigt(
  voigt: readonly number[] | readonly (readonly number[])[],
  spec: TensorSpec | TensorPropertyName,
  options?: VoigtOptions,
): readonly number[] {
  const who = 'fromVoigt';
  const resolved = resolve(spec, options, who);
  const { perms, layout, factors, tolerance } = resolved;
  const rank = resolved.spec.rank;
  const shapeOk =
    layout.shape.length === 1
      ? Array.isArray(voigt) &&
        voigt.length === 6 &&
        everyEntry(voigt, (x) => typeof x === 'number' && Number.isFinite(x))
      : Array.isArray(voigt) &&
        voigt.length === layout.shape[0] &&
        everyEntry(
          voigt,
          (row) =>
            Array.isArray(row) &&
            row.length === layout.shape[1] &&
            everyEntry(row, (x: unknown) => typeof x === 'number' && Number.isFinite(x)),
        );
  if (!shapeOk) {
    throw new RangeError(
      `${who}: a Voigt array of shape ${layout.shape.join(' × ')} of finite numbers, not ${shown(voigt)}`,
    );
  }
  const dim = 3 ** rank;
  const out = new Array<number>(dim);
  for (let o = 0; o < dim; o++) {
    const { index, factor } = voigtIndex(o, layout, factors);
    const v =
      index.length === 1
        ? (voigt as readonly number[])[index[0]]
        : (voigt as readonly (readonly number[])[])[index[0]][index[1]];
    out[o] = v / factor + 0;
  }
  checkSymmetry(out, rank, perms, tolerance, who);
  return deepFreeze(out);
}
