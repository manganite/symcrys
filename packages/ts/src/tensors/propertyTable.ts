/**
 * Named tensor properties: physical properties of a crystal that a point group allows if and only
 * if it allows a non-zero tensor of a given kind. The table is data: a name, the kind of tensor
 * (`TensorSpec`) and what it describes; the source of each definition is given with its entry. `allowsProperty` and `tensorForm` look a
 * name up here (docs/conventions.md, "Tensors", "Named properties").
 */

import { shown } from '../checks.js';
import type { TensorSpec } from './tensorForm.js';

/** A named property: the tensor that describes it and what it is. */
export interface TensorProperty {
  /** The kind of tensor whose non-zero form means that the property is allowed. */
  readonly spec: TensorSpec;
  /** The physical quantity the tensor relates. */
  readonly description: string;
}

const property = (spec: TensorSpec, description: string): TensorProperty =>
  Object.freeze({ spec: Object.freeze(spec), description });

/**
 * The named tensor properties. For each name, the tensor that describes the property and what it
 * is. `'gyrotropic'` is optical activity.
 *
 * @remarks Names are adjectives, one lower-case word each.
 */
export const TENSOR_PROPERTIES = Object.freeze({
  /**
   * Spontaneous polarization: a time-even polar vector.
   *
   * @remarks Source: ITC Vol. D (2013), § 1.1.4.4.2, p. 12; classes: ITA (2016) Table 3.2.2.1, p. 738.
   */
  pyroelectric: property(
    { rank: 1, kind: 'polar', timeParity: 'even', intrinsic: 'none' },
    'Spontaneous electric polarization, which changes with temperature: a polar vector p_i.',
  ),
  /**
   * Ferroaxial order: a time-even axial vector (not a term of ITC).
   *
   * @remarks Source: Hlinka, Privratska, Ondrejkovic & Janovec, Phys. Rev. Lett. 116, 177602
   * (2016); Gallego et al., Acta Cryst. A75, 438 (2019), p. 440 (axial toroidal moment, type eV);
   * classes: Birss (1966), Tables 4a and 4c, pp. 56–58.
   */
  ferroaxial: property(
    { rank: 1, kind: 'axial', timeParity: 'even', intrinsic: 'none' },
    'Ferroaxial (ferro-rotational) order, e.g. a net rotation of structural units about an axis: an axial vector A_i, the axial toroidal moment (Jahn symbol eV).',
  ),
  /**
   * The piezoelectric effect (and second-harmonic generation, which has the same tensor): polar, rank 3, symmetric in j, k.
   *
   * @remarks Source: ITC Vol. D (2013), § 1.1.4.4.3, p. 12, and § 1.1.4.10.1, eqs. (1.1.4.5), (1.1.4.7),
   * p. 24; classes: ITA (2016) Table 3.2.2.1, p. 738.
   */
  piezoelectric: property(
    { rank: 3, kind: 'polar', timeParity: 'even', intrinsic: 'symmetric-last-pair' },
    'Electric polarization linear in stress, P_i = d_ijk T_jk: a polar tensor of rank 3, symmetric in j, k.',
  ),
  /**
   * Optical activity: the symmetric axial tensor of rank 2.
   *
   * @remarks Source: ITC Vol. D (2013), § 1.1.4.10.7.2, p. 30; classes: ITA (2016) Table 3.2.2.1, p. 738.
   */
  gyrotropic: property(
    { rank: 2, kind: 'axial', timeParity: 'even', intrinsic: 'symmetric-first-pair' },
    'Optical activity (optical rotation), G = g_ij α_i α_j: the symmetric part of the axial gyration tensor of rank 2.',
  ),
  /**
   * Spontaneous magnetization: a time-odd axial vector (magnetic API only).
   *
   * @remarks Source: ITC Vol. D (2013), § 1.5.2.1 with Table 1.5.2.4, p. 113.
   */
  ferromagnetic: property(
    { rank: 1, kind: 'axial', timeParity: 'odd', intrinsic: 'none' },
    'Spontaneous magnetization M_s (ferromagnets, ferrimagnets, weak ferromagnets): an axial vector that changes sign under time reversal.',
  ),
  /**
   * A spontaneous toroidal moment: a time-odd polar vector (magnetic API only).
   *
   * @remarks Source: ITC Vol. D (2013), § 1.5.4.3, p. 128 (the term), and § 1.5.8.1, footnote 3, p. 140 (the
   * 31 groups of Table 1.5.8.1 whose magnetoelectric tensor need not be symmetric); Gallego et al.,
   * Acta Cryst. A75, 438 (2019), p. 440 (polar toroidal moment, type aV).
   */
  ferrotoroidic: property(
    { rank: 1, kind: 'polar', timeParity: 'odd', intrinsic: 'none' },
    'Spontaneous toroidal moment T_i (ferrotoroidic order): a polar vector that changes sign under time reversal (Jahn symbol aV); allowed exactly where the magnetoelectric tensor need not be symmetric.',
  ),
  /**
   * The linear magnetoelectric effect: a time-odd axial tensor of rank 2 (magnetic API only).
   *
   * @remarks Source: ITC Vol. D (2013), § 1.5.8, eqs. (1.5.8.2), (1.5.8.3), p. 139, and § 1.5.8.1 with Table
   * 1.5.8.1, pp. 139–140.
   */
  magnetoelectric: property(
    { rank: 2, kind: 'axial', timeParity: 'odd', intrinsic: 'none' },
    'Linear magnetoelectric effect, P_i = α_ij H_j: an axial tensor of rank 2 that changes sign under time reversal.',
  ),
  /**
   * The piezomagnetic effect: a time-odd axial tensor of rank 3, symmetric in j, k (magnetic API only).
   *
   * @remarks Source: ITC Vol. D (2013), § 1.5.7, eq. (1.5.7.2), and § 1.5.7.1 with Table 1.5.7.1, pp.
   * 134–135.
   */
  piezomagnetic: property(
    { rank: 3, kind: 'axial', timeParity: 'odd', intrinsic: 'symmetric-last-pair' },
    'Magnetization linear in stress, M_i = Λ_ijk T_jk: an axial tensor of rank 3, symmetric in j, k, that changes sign under time reversal.',
  ),
} satisfies Record<string, TensorProperty>);

/** Name of a tensor property in `TENSOR_PROPERTIES`. */
export type TensorPropertyName = keyof typeof TENSOR_PROPERTIES;

/** The names of the tensor properties, in the order of `TENSOR_PROPERTIES`. */
export const TENSOR_PROPERTY_NAMES = Object.freeze(Object.keys(TENSOR_PROPERTIES)) as readonly TensorPropertyName[];

/** The specification behind a property name; a specification is returned as it is. */
export function specOf(specOrName: TensorSpec | TensorPropertyName): TensorSpec {
  if (typeof specOrName !== 'string') {
    if (typeof specOrName !== 'object' || specOrName === null || Array.isArray(specOrName)) {
      throw new RangeError(
        `A tensor is given by its specification { rank, kind, timeParity, intrinsic } or the name of a property, not ${shown(specOrName)}`,
      );
    }
    return specOrName;
  }
  if (!Object.hasOwn(TENSOR_PROPERTIES, specOrName)) {
    throw new RangeError(`Unknown tensor property: ${shown(specOrName)} (known: ${TENSOR_PROPERTY_NAMES.join(', ')})`);
  }
  return TENSOR_PROPERTIES[specOrName].spec;
}
