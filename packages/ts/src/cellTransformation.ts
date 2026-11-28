/**
 * Changes between the cells of a lattice: the transformation matrix P from one named cell of a
 * Bravais lattice to another, for `changeOfCoordinates`. Each named cell has a basis in the
 * conventional cell of the standard setting, by a rule or as convention data (`basisOf`); the
 * change from one cell to another is the product of the one inverse and the other, exactly in
 * rationals. Every printed row of ITA (6th ed., 2016) Table 1.5.1.1, pp. 77–80, is compared with it
 * by cellTransformation.reference.test.ts.
 */

import { checkObject, shown } from './checks.js';
import type { CoordinateTransformation } from './coordinates.js';
import { rationalInverse as inverse, rationalProduct as product, type RMatrix } from './spaceGroups/affine.js';
import { deepFreeze } from './freeze.js';
import type { Mat3 } from './linalg.js';
import { negate, parseRational, rational, toNumber, ZERO } from './spaceGroups/rational.js';

/**
 * A Bravais type of lattice in three dimensions, in ITA's notation: the crystal family (a, m, o, t,
 * h, c) and the centring of the conventional cell (P, S, I, F, R).
 *
 * @remarks Source: ITA (2016), Table 1.3.4.1, p. 39.
 */
export type BravaisLattice =
  'aP' | 'mP' | 'mS' | 'oP' | 'oS' | 'oI' | 'oF' | 'tP' | 'tI' | 'hP' | 'hR' | 'cP' | 'cI' | 'cF';

/**
 * The six settings of an orthorhombic cell, named by ITA's symbols of the settings.
 *
 * @remarks Source: ITA (2016), Table 1.5.4.4.
 */
export type OrthorhombicSetting = 'abc' | 'ba-c' | 'cab' | '-cba' | 'bca' | 'a-cb';

/**
 * A cell of a lattice, named by the fields that apply to its Bravais lattice (listed with
 * `cellTransformation`); a field left out takes the value of the conventional cell in the standard
 * setting, so `{}` is that cell.
 */
export interface Cell {
  /** The unique axis of a monoclinic cell. */
  readonly uniqueAxis?: 'a' | 'b' | 'c';
  /** The cell choice of a monoclinic cell, 1, 2 or 3. */
  readonly cellChoice?: number;
  /** An orthorhombic setting, or for hexagonal axes of an `hR` lattice the obverse or reverse setting. */
  readonly setting?: OrthorhombicSetting | 'obverse' | 'reverse';
  /** The centring of the cell: `'P'` for a primitive cell, or the letter of a centred cell. */
  readonly centring?: 'P' | 'A' | 'C' | 'I' | 'F' | 'H' | 'D';
  /** The axes of an `hR` lattice: `'hexagonal'` (the triple hexagonal cell, standard) or `'rhombohedral'`. */
  readonly axes?: 'hexagonal' | 'rhombohedral';
  /** The index of a cell where several cells have the same centring: 1 for C₁. */
  readonly cell?: number;
}

const LATTICES: readonly BravaisLattice[] = [
  'aP',
  'mP',
  'mS',
  'oP',
  'oS',
  'oI',
  'oF',
  'tP',
  'tI',
  'hP',
  'hR',
  'cP',
  'cI',
  'cF',
];
/** The six orthorhombic settings in the column order of ITA 2016 Table 1.5.4.4. */
export const ORTHORHOMBIC_SETTINGS: readonly OrthorhombicSetting[] = Object.freeze([
  'abc',
  'ba-c',
  'cab',
  '-cba',
  'bca',
  'a-cb',
]);

const parse = (s: string): RMatrix => s.split(';').map((row) => row.trim().split(/\s+/).map(parseRational));
const power = (m: RMatrix, k: number): RMatrix =>
  k === 0 ? parse('1 0 0; 0 1 0; 0 0 1') : product(m, power(m, k - 1));

/**
 * Convention data: the definitions of the cells ITA names that no rule below gives, as the basis
 * (a′, b′, c′) = (a, b, c)·P of each in the conventional cell of the standard setting, the columns of
 * P (ITA 2016 Table 1.5.1.1, pp. 77–80, where the cells are defined). The further cells of each kind
 * are these turned by a rotation of the lattice (`basisOf`).
 */
const CELL_DEFINITIONS = {
  /** Monoclinic, unique axis b: cell choice 2 (choice 3 is the same step again, ITA's cycle 1 → 2 → 3 → 1). */
  monoclinicCellChoice2: parse('-1 0 1; 0 1 0; -1 0 0'),
  /** Tetragonal: the C-centred cell C₁ of a P lattice, the F-centred cell F₁ of an I lattice. */
  tetragonal1: parse('1 1 0; -1 1 0; 0 0 1'),
  /** Hexagonal P: the orthohexagonal cell C₁. */
  orthohexagonal1: parse('1 1 0; 0 2 0; 0 0 1'),
  /** Hexagonal P: the triple hexagonal cell H₁. */
  tripleHexagonal1: parse('1 1 0; -1 2 0; 0 0 1'),
  /** Hexagonal P: the triple rhombohedral cell D₁. */
  tripleRhombohedral1: parse('1 0 -1; 0 1 -1; 1 1 1'),
  /** hR: the C-centred monoclinic cell C₁ (unique axis b₁ along a twofold axis of the lattice). */
  monoclinicC1: parse('2/3 0 0; 1/3 1 0; -2/3 0 1'),
};

/**
 * The basis of an orthorhombic setting from its symbol, the integer matrix P whose columns are the
 * new basis vectors in the old: `ba-c` is a′ = b, b′ = a, c′ = −c (ITA 2016 Table 1.5.4.4, p. 98;
 * eq. (1.5.1.4), p. 76). The one definition of the orthorhombic settings; the point groups take it
 * for their settings `2mm`, `m2m` and unique axis a, and the magnetic groups for their orientations.
 */
export function orthorhombicSettingBasis(setting: string): number[][] {
  const columns = (setting.match(/-?[abc]/g) ?? []).map((t) => {
    const v = [0, 0, 0];
    // A regular expression, not the string '-': a lone '-' literal here changes the order in which
    // TypeScript prints the union '+' | '-' in the declarations, and so the generated Python types.
    v['abc'.indexOf(t.replace(/^-/, ''))] = /^-/.test(t) ? -1 : 1;
    return v;
  });
  return [0, 1, 2].map((i) => columns.map((col) => col[i]));
}

/** `orthorhombicSettingBasis` in rationals. */
const settingBasis = (setting: string): RMatrix =>
  orthorhombicSettingBasis(setting).map((row) => row.map((x) => rational(x)));

/** Rotations about c of a hexagonal basis: a → a + b (sixfold), a → b (threefold), a → −a (twofold); and the fourfold of a tetragonal one. */
const SIXFOLD = parse('1 -1 0; 1 0 0; 0 0 1');
const THREEFOLD = parse('0 -1 0; 1 -1 0; 0 0 1');
const TWOFOLD = parse('-1 0 0; 0 -1 0; 0 0 1');
const FOURFOLD = parse('0 -1 0; 1 0 0; 0 0 1');

/** The obverse rhombohedral centring vector of the triple hexagonal cell R₁, (2/3, 1/3, 1/3). */
const OBVERSE_CENTRING = parse('2/3; 1/3; 1/3');

/**
 * The primitive rhombohedral cell of the obverse setting in the triple hexagonal cell R₁, the
 * columns a_R, b_R, c_R of P: the obverse centring vector t = (2/3, 1/3, 1/3) and its turns by the
 * threefold rotation about c, a_R = (2a + b + c)/3, b_R = (−a + b + c)/3, c_R = (−a − 2b + c)/3
 * (ITA 2016 Table 1.5.1.1, p. 78, the matrix of R₁ obverse). The one definition of the rhombohedral
 * axes; the point groups take it as the basis of their settings with rhombohedral axes.
 */
export const OBVERSE_RHOMBOHEDRAL_BASIS: RMatrix = deepFreeze(
  (() => {
    const columns = [0, 1, 2].map((k) => product(power(THREEFOLD, k), OBVERSE_CENTRING));
    return [0, 1, 2].map((i) => columns.map((col) => col[i][0]));
  })(),
);

/**
 * The basis of a named cell in the conventional cell of the standard setting, P with
 * (a′, b′, c′) = (a, b, c)·P:
 *
 * - monoclinic: unique axis c and a are the settings cab and bca of the axes; cell choice k of
 *   unique axis b is `CELL_DEFINITIONS.monoclinicCellChoice2` applied k − 1 times, and of the other
 *   axes the same cell relabelled (P_b^(k−1)·S);
 * - orthorhombic: the setting from its symbol (`settingBasis`); the primitive cell of I is
 *   t − a, t − b, t − c with the centring vector t = (a + b + c)/2, that of F the three centring
 *   vectors (b + c)/2, (a + c)/2, (a + b)/2; the I rule also for tI and cI, the F rule for cF;
 * - tetragonal: C₂ (F₂) is C₁ (F₁) turned by the fourfold rotation about c;
 * - hP: C₂, C₃ and H₂, H₃ are C₁ and H₁ turned once and twice by the sixfold rotation, D₂ is D₁
 *   turned by the twofold rotation;
 * - hR: the primitive rhombohedral cell is the obverse centring vector t = (2/3, 1/3, 1/3) and its
 *   turns by the threefold rotation; the triple hexagonal cells R₁, R₂, R₃ are R₁ turned by the
 *   threefold rotation 0, 1, 2 times, the reverse ones these turned by the twofold rotation about c;
 *   the monoclinic cells C₂, C₃ are C₁ turned likewise, and A₁, A₂, A₃ are C₁, C₂, C₃ with the unique
 *   axis c (the setting cab);
 * - the first cell of each kind as `CELL_DEFINITIONS`.
 */
function basisOf(lattice: BravaisLattice, key: string): RMatrix {
  const identity = parse('1 0 0; 0 1 0; 0 0 1');
  const half = rational(1, 2);
  const iPrimitive = [0, 1, 2].map((i) => [0, 1, 2].map((j) => (i === j ? negate(half) : half)));
  const fPrimitive = [0, 1, 2].map((i) => [0, 1, 2].map((j) => (i === j ? ZERO : half)));
  if (lattice === 'mP' || lattice === 'mS') {
    const axis = key[0];
    const relabel = axis === 'b' ? identity : settingBasis(axis === 'c' ? 'cab' : 'bca');
    // The step of cell choice 1 → 2 in the frame of unique axis b, carried by the relabelling of the axes.
    return product(power(CELL_DEFINITIONS.monoclinicCellChoice2, Number(key[1]) - 1), relabel);
  }
  if (lattice[0] === 'o') return key === 'P' ? (lattice === 'oI' ? iPrimitive : fPrimitive) : settingBasis(key);
  if (lattice === 'tI' && key === 'P') return iPrimitive;
  if (lattice === 'cI' && key === 'P') return iPrimitive;
  if (lattice === 'cF' && key === 'P') return fPrimitive;
  if (lattice === 'tP' || lattice === 'tI') {
    return key === lattice[1] ? identity : product(power(FOURFOLD, Number(key[1]) - 1), CELL_DEFINITIONS.tetragonal1);
  }
  if (lattice === 'hP') {
    if (key === 'P') return identity;
    const k = Number(key[1]) - 1;
    if (key[0] === 'C') return product(power(SIXFOLD, k), CELL_DEFINITIONS.orthohexagonal1);
    if (key[0] === 'H') return product(power(SIXFOLD, k), CELL_DEFINITIONS.tripleHexagonal1);
    return product(power(TWOFOLD, k), CELL_DEFINITIONS.tripleRhombohedral1);
  }
  if (lattice === 'hR') {
    if (key === 'rhombohedral') return OBVERSE_RHOMBOHEDRAL_BASIS;
    const k = Number(key[1]) - 1;
    if (key[0] === 'R') {
      const obverse = power(THREEFOLD, k);
      return key.endsWith('reverse') ? product(TWOFOLD, obverse) : obverse;
    }
    const c = product(power(THREEFOLD, k), CELL_DEFINITIONS.monoclinicC1);
    return key[0] === 'C' ? c : product(c, settingBasis('cab'));
  }
  return identity; // aP, cP: the conventional cell only
}

/** The fields of a cell that each Bravais lattice takes. */
function fieldsOf(lattice: BravaisLattice): readonly (keyof Cell)[] {
  if (lattice === 'mP') return ['uniqueAxis', 'cellChoice', 'centring'];
  if (lattice === 'mS') return ['uniqueAxis', 'cellChoice'];
  if (lattice === 'oS') return ['setting'];
  if (lattice[0] === 'o') return ['setting', 'centring'];
  if (lattice === 'tP' || lattice === 'tI' || lattice === 'hP') return ['centring', 'cell'];
  if (lattice === 'hR') return ['axes', 'cell', 'setting', 'centring'];
  return ['centring'];
}

/** The cells named by a centring and an index, with the number of each, per lattice. */
const INDEXED: Readonly<Partial<Record<BravaisLattice, Readonly<Record<string, number>>>>> = {
  tP: { C: 2 },
  tI: { F: 2 },
  hP: { C: 3, H: 3, D: 2 },
  hR: { C: 3, A: 3 },
};

/** The internal key of a cell, or a RangeError that says what is wrong with it. */
function cellKey(lattice: BravaisLattice, cell: unknown, what: string): string {
  checkObject(cell, `${what} must be a plain object`);
  const allowed = fieldsOf(lattice);
  const wrong = Object.keys(cell).filter((k) => !(allowed as readonly string[]).includes(k));
  if (wrong.length > 0) {
    throw new RangeError(
      `${what}: a cell of the lattice ${lattice} takes the fields ${allowed.join(', ')}, not ${wrong.join(', ')}`,
    );
  }
  const nulls = Object.entries(cell).filter(([, v]) => v === null);
  if (nulls.length > 0) {
    throw new RangeError(`${what}: ${nulls.map(([k]) => k).join(', ')} is null; leave a field out for its default`);
  }
  const c = cell as Cell;
  const fail = (why: string): never => {
    throw new RangeError(`${what}: ${shown(cell)} names no cell of the lattice ${lattice}: ${why}`);
  };
  const index = (v: unknown, n: number, name: string): number =>
    Number.isInteger(v) && (v as number) >= 1 && (v as number) <= n
      ? (v as number)
      : fail(`${name} must be ${n === 2 ? '1 or 2' : '1, 2 or 3'}`);
  const own = lattice[1] === 'S' || lattice === 'hR' ? undefined : lattice[1];
  const indexed = INDEXED[lattice] ?? {};
  // A centring: the conventional cell's own, 'P' for the primitive cell of a centred lattice, or a
  // cell with an index.
  if (c.centring !== undefined && c.centring !== own) {
    const n = indexed[c.centring];
    if (n !== undefined) {
      if (c.axes !== undefined || c.setting !== undefined) fail(`centring ${c.centring} takes cell alone`);
      return `${c.centring}${index(c.cell, n, 'cell')}`;
    }
    const primitive = c.centring === 'P' && ['oI', 'oF', 'tI', 'cI', 'cF'].includes(lattice);
    if (!primitive) {
      const named = [own, own !== undefined && own !== 'P' ? 'P' : undefined, ...Object.keys(indexed)].filter(Boolean);
      return fail(`its centring is one of ${named.join(', ')}`);
    }
    if (c.setting !== undefined && c.setting !== 'abc') fail('the primitive cell is given for the setting abc only');
    return 'P';
  }
  if (c.cell !== undefined && lattice !== 'hR')
    fail(`cell is given with the centring ${Object.keys(indexed).join(' or ')}`);
  switch (lattice) {
    case 'mP':
    case 'mS': {
      const axis = c.uniqueAxis ?? 'b';
      if (!['a', 'b', 'c'].includes(axis)) fail('uniqueAxis must be a, b or c');
      return `${axis}${c.cellChoice === undefined ? 1 : index(c.cellChoice, 3, 'cellChoice')}`;
    }
    case 'oP':
    case 'oS':
    case 'oI':
    case 'oF': {
      const setting = c.setting ?? 'abc';
      return (ORTHORHOMBIC_SETTINGS as readonly string[]).includes(setting)
        ? setting
        : fail(`setting must be one of ${ORTHORHOMBIC_SETTINGS.join(', ')}`);
    }
    case 'hR': {
      if (c.axes === 'rhombohedral') {
        return c.cell === undefined && c.setting === undefined
          ? 'rhombohedral'
          : fail('rhombohedral axes have one cell');
      }
      if (c.axes !== undefined && c.axes !== 'hexagonal') fail('axes must be hexagonal or rhombohedral');
      const setting = c.setting ?? 'obverse';
      if (setting !== 'obverse' && setting !== 'reverse') fail('setting must be obverse or reverse');
      return `R${c.cell === undefined ? 1 : index(c.cell, 3, 'cell')}-${setting}`;
    }
    default:
      return own ?? fail('no such cell');
  }
}

/**
 * The change of the coordinate system from one cell of a lattice to another: P with
 * (a′, b′, c′) = (a, b, c)·P, where (a, b, c) is the basis of `fromCell` and (a′, b′, c′) that of
 * `toCell`, to be passed to `changeOfCoordinates` (the origin stays). The change back is
 * `cellTransformation(bravaisLattice, toCell, fromCell)`.
 *
 * A cell is named by its fields; a field left out takes the value of the conventional cell in the
 * standard setting, so an empty cell is that cell. Where a lattice takes `centring`, the centring of
 * its conventional cell names that cell. The fields by Bravais lattice:
 *
 * mP and mS: `uniqueAxis` (`'a'`, `'b'`, `'c'`; standard `'b'`) and `cellChoice` (1, 2, 3; standard
 * 1); in mS the cell choices of one unique axis are centred C, A, I (unique axis b), A, B, I (c) and
 * B, C, I (a).
 *
 * oP, oS, oI and oF: `setting`, `'abc'` (standard), `'ba-c'`, `'cab'`, `'-cba'`, `'bca'` or `'a-cb'`,
 * the basis of the cell in the standard one; oI and oF also `centring` `'P'`, the primitive cell of
 * the standard setting.
 *
 * tP: `centring` `'C'` and `cell` 1 or 2, the C-centred cells C₁, C₂. tI: `centring` `'F'` and `cell`
 * 1 or 2, the F-centred cells F₁, F₂, and `centring` `'P'`, the primitive cell.
 *
 * hP: `centring` and `cell`, `'C'` for the orthohexagonal cells C₁, C₂, C₃, `'H'` for the triple
 * hexagonal cells H₁, H₂, H₃, `'D'` for the triple rhombohedral cells D₁, D₂.
 *
 * hR: `axes` `'hexagonal'` (standard) with `cell` 1, 2, 3 and `setting` `'obverse'` or `'reverse'`, the
 * triple hexagonal cells R₁, R₂, R₃ (standard R₁ obverse); `axes` `'rhombohedral'`, the primitive
 * cell; `centring` `'C'` and `cell` 1, 2, 3, the C-centred monoclinic cells C₁, C₂, C₃, whose unique
 * axes b₁, b₂, b₃ are the three twofold axes of the lattice, and `centring` `'A'` with `cell`, the
 * A-centred ones A₁, A₂, A₃, with unique axes c₁, c₂, c₃.
 *
 * cI and cF: `centring` `'P'`, the primitive cell, the one ITA gives for the conventional cell.
 *
 * Fractions such as 1/3 are the nearest numbers, which `changeOfCoordinates` reads back as the
 * same fractions at any tolerance.
 *
 * @example
 * ```ts
 * // The operations of -3m with rhombohedral axes, from those with hexagonal axes:
 * const t = cellTransformation('hR', {}, { axes: 'rhombohedral' });
 * changeOfCoordinates(t, { operations: operations('-3m') }).operations;
 * ```
 *
 * @throws RangeError for a Bravais lattice that is not one of the 14 types, or a cell the lattice
 * does not have.
 *
 * @remarks The cells are those ITA (6th ed., 2016) Table 1.5.1.1, pp. 77–80, defines, and every
 * printed change of the table is the one computed here, exactly.
 * The 14 Bravais types are those of ITA (2016), Table 1.3.4.1, p. 39.
 */
export function cellTransformation(
  bravaisLattice: BravaisLattice,
  fromCell: Cell,
  toCell: Cell,
): CoordinateTransformation {
  if (!(LATTICES as readonly unknown[]).includes(bravaisLattice)) {
    throw new RangeError(
      `cellTransformation: the Bravais lattice must be one of ${LATTICES.join(', ')}, not ${shown(bravaisLattice)}`,
    );
  }
  const from = basisOf(bravaisLattice, cellKey(bravaisLattice, fromCell, 'cellTransformation: the cell fromCell'));
  const to = basisOf(bravaisLattice, cellKey(bravaisLattice, toCell, 'cellTransformation: the cell toCell'));
  const p = product(inverse(from), to);
  return deepFreeze({ linearPart: p.map((row) => row.map((x) => toNumber(x) + 0)) as unknown as Mat3 });
}
