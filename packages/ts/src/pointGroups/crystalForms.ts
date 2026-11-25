/**
 * Crystal forms of the crystal classes, as ITA gives them: for each Wyckoff position the basic
 * form and the limiting forms as ITA prints them, with the 47 forms of ITA Table 3.2.1.3
 * (docs/conventions.md, "Crystal forms").
 */

import { SETTING_KEYS, checkOptions } from '../checks.js';
import type { PointGroupKey, SettingOptions } from './pointGroups.js';
import { ITA_FORMS, ITA_FORM_TYPES, type FormRow } from './crystalFormsData.js';
import { tableSetting, permutationFromSetting1, permutePattern, printedEntry, wyckoffPositions } from './wyckoff.js';

/**
 * A kind of crystal form, one of the 47: the first of its usual English names in lower case, words
 * joined by `-` (`'pedion'`, `'tetragonal-prism'`, `'rhomb-dodecahedron'`).
 */
export type CrystalFormTypeKey =
  | 'pedion'
  | 'pinacoid'
  | 'sphenoid'
  | 'rhombic-disphenoid'
  | 'rhombic-pyramid'
  | 'rhombic-prism'
  | 'rhombic-dipyramid'
  | 'tetragonal-pyramid'
  | 'tetragonal-disphenoid'
  | 'tetragonal-prism'
  | 'tetragonal-trapezohedron'
  | 'ditetragonal-pyramid'
  | 'tetragonal-scalenohedron'
  | 'tetragonal-dipyramid'
  | 'ditetragonal-prism'
  | 'ditetragonal-dipyramid'
  | 'trigonal-pyramid'
  | 'trigonal-prism'
  | 'trigonal-trapezohedron'
  | 'ditrigonal-pyramid'
  | 'rhombohedron'
  | 'ditrigonal-prism'
  | 'hexagonal-pyramid'
  | 'trigonal-dipyramid'
  | 'hexagonal-prism'
  | 'ditrigonal-scalenohedron'
  | 'hexagonal-trapezohedron'
  | 'dihexagonal-pyramid'
  | 'ditrigonal-dipyramid'
  | 'dihexagonal-prism'
  | 'hexagonal-dipyramid'
  | 'dihexagonal-dipyramid'
  | 'tetrahedron'
  | 'cube'
  | 'octahedron'
  | 'pentagon-tritetrahedron'
  | 'pentagon-dodecahedron'
  | 'tetragon-tritetrahedron'
  | 'trigon-tritetrahedron'
  | 'rhomb-dodecahedron'
  | 'didodecahedron'
  | 'trigon-trioctahedron'
  | 'tetragon-trioctahedron'
  | 'pentagon-trioctahedron'
  | 'hexatetrahedron'
  | 'tetrahexahedron'
  | 'hexaoctahedron';

/** A kind of crystal form: its names, its number of faces and its eigensymmetry. */
export interface CrystalFormType {
  /** The usual English names of the form, e.g. `Tetragonal prism`, `Sphenoid, dome, or dihedron`. */
  readonly name: string;
  /** Number of faces. */
  readonly faces: number;
  /**
   * The eigensymmetry: the point group of the form as a polyhedron, e.g. `4/mmm`, `-62m`;
   * `∞m` for the pedion and `∞/mm` for the pinacoid.
   */
  readonly eigensymmetry: string;
}

/** One crystal form of a crystal class: a set of faces equivalent under the class. */
export interface CrystalForm {
  /** ITA's letter of the Wyckoff position the faces belong to. */
  readonly letter: string;
  /** Number of faces: the multiplicity of the Wyckoff position. */
  readonly multiplicity: number;
  /** Oriented site-symmetry symbol of the Wyckoff position, e.g. `..m` (the face symmetry). */
  readonly siteSymmetry: string;
  /**
   * `true` for a basic form, a form of lowest eigensymmetry of the position (two at the faces (hhl)
   * of -43m and m-3m), `false` for a limiting form: its faces have the face symmetry of the position,
   * but the form has a higher eigensymmetry (ITA 6th ed., § 3.2.1.2.2, p. 723).
   */
  readonly basic: boolean;
  /** The kind of the form, its key in `CRYSTAL_FORM_TYPES`. */
  readonly formType: CrystalFormTypeKey;
  /**
   * The first face of the form in the usual notation, components separated by commas, e.g. `h,0,l`,
   * or `h,h,-2h,l` (Bravais–Miller indices) for hexagonal axes; a leading `-` is an overbar.
   */
  readonly millerIndices: string;
  /** The condition ITA prints with the form, `|h|<|l|` or `|h|>|l|` (cubic forms (hhl)); absent otherwise. */
  readonly condition?: string;
}

/** The keys of the form types, in the order of the stored rows (ITA 2016 Table 3.2.1.3, pp. 724–726). */
export const FORM_TYPE_KEYS: readonly CrystalFormTypeKey[] = Object.freeze([
  'pedion',
  'pinacoid',
  'sphenoid',
  'rhombic-disphenoid',
  'rhombic-pyramid',
  'rhombic-prism',
  'rhombic-dipyramid',
  'tetragonal-pyramid',
  'tetragonal-disphenoid',
  'tetragonal-prism',
  'tetragonal-trapezohedron',
  'ditetragonal-pyramid',
  'tetragonal-scalenohedron',
  'tetragonal-dipyramid',
  'ditetragonal-prism',
  'ditetragonal-dipyramid',
  'trigonal-pyramid',
  'trigonal-prism',
  'trigonal-trapezohedron',
  'ditrigonal-pyramid',
  'rhombohedron',
  'ditrigonal-prism',
  'hexagonal-pyramid',
  'trigonal-dipyramid',
  'hexagonal-prism',
  'ditrigonal-scalenohedron',
  'hexagonal-trapezohedron',
  'dihexagonal-pyramid',
  'ditrigonal-dipyramid',
  'dihexagonal-prism',
  'hexagonal-dipyramid',
  'dihexagonal-dipyramid',
  'tetrahedron',
  'cube',
  'octahedron',
  'pentagon-tritetrahedron',
  'pentagon-dodecahedron',
  'tetragon-tritetrahedron',
  'trigon-tritetrahedron',
  'rhomb-dodecahedron',
  'didodecahedron',
  'trigon-trioctahedron',
  'tetragon-trioctahedron',
  'pentagon-trioctahedron',
  'hexatetrahedron',
  'tetrahexahedron',
  'hexaoctahedron',
]);

/** The 47 kinds of crystal forms, by key. */
export const CRYSTAL_FORM_TYPES: Readonly<Record<CrystalFormTypeKey, CrystalFormType>> = Object.freeze(
  Object.fromEntries(
    ITA_FORM_TYPES.map(([number, name, faces, eigensymmetry]) => [
      FORM_TYPE_KEYS[number - 1],
      Object.freeze({ name, faces, eigensymmetry }),
    ]),
  ) as Record<CrystalFormTypeKey, CrystalFormType>,
);

const HKL = 'hkl';

/** The printed rows of a setting; for a setting ITA does not print, those of setting 1 carried into its frame. */
function printedRows(key: PointGroupKey, setting: number): readonly FormRow[] {
  const entry = printedEntry(ITA_FORMS, key, setting);
  if (entry) return entry.rows;
  if (setting === 1) throw new Error(`Point group ${key}: no printed crystal forms for setting 1`);
  const r = permutationFromSetting1(key, setting);
  return printedRows(key, 1).map(([letter, basic, type, miller, condition]) => {
    if (condition !== undefined) throw new Error(`Cannot carry the condition ${condition} into another setting`);
    return [letter, basic, type, permutePattern(miller, r, HKL)];
  });
}

const cache = new Map<string, readonly CrystalForm[]>();

/**
 * The crystal forms of a crystal class in ITA's order: by Wyckoff position (general position
 * first), each position's basic forms before its limiting forms, as ITA 6th ed. Table 3.2.3.2
 * prints them. Crystal classes only (throws a RangeError for a magnetic point group with time
 * reversal), like the Wyckoff positions. For the settings ITA does not print (`mm2` settings 2 and 3, monoclinic unique axis a), the forms of
 * setting 1 carried into their frame.
 */
export function crystalForms(key: PointGroupKey, options?: SettingOptions): readonly CrystalForm[] {
  checkOptions(options, SETTING_KEYS, 'crystalForms');
  const setting = tableSetting(key, options, 'Crystal forms');
  const cacheKey = `${key}#${setting}`;
  let result = cache.get(cacheKey);
  if (!result) {
    const positions = wyckoffPositions(key, { setting });
    result = Object.freeze(
      printedRows(key, setting).map(([letter, basic, formType, millerIndices, condition]) => {
        const position = positions.find((p) => p.letter === letter);
        if (!position) throw new Error(`Point group ${key}, setting ${setting}: no Wyckoff position ${letter}`);
        const type = FORM_TYPE_KEYS[formType - 1];
        if (CRYSTAL_FORM_TYPES[type].faces !== position.multiplicity) {
          throw new Error(
            `Point group ${key}, setting ${setting}: form ${formType} does not have the multiplicity of position ${letter}`,
          );
        }
        return Object.freeze({
          letter,
          multiplicity: position.multiplicity,
          siteSymmetry: position.siteSymmetry,
          basic,
          formType: type,
          millerIndices,
          ...(condition === undefined ? {} : { condition }),
        });
      }),
    );
    cache.set(cacheKey, result);
  }
  return result;
}
