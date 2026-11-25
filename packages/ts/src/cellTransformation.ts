/**
 * Changes between the cells of a lattice (#120; decided by Thomas on 2026-11-25): the transformation
 * matrix P from one named cell of a Bravais lattice to another, for `changeOfCoordinates`. The data
 * are the matrices of ITA (6th ed., 2016) Table 1.5.1.1, pp. 77–80, transcribed in
 * references/itc/vol-a-2016-table-1.5.1.1.md and compared with it by
 * cellTransformation.reference.test.ts; a pair of cells that the table does not join directly is
 * joined by a product of its matrices, exactly in rationals.
 */

import { checkObject, isPlainObject, shown } from './checks.js';
import type { CoordinateTransformation } from './coordinates.js';
import { deepFreeze } from './freeze.js';
import type { Mat3 } from './linalg.js';
import { add, multiply, parseRational, toNumber, ZERO, type Rational } from './spaceGroups/rational.js';

/**
 * A Bravais type of lattice in three dimensions, as ITA (6th ed., 2016) Table 1.3.4.1 (p. 39) writes
 * it: the crystal family (a, m, o, t, h, c) and the centring of the conventional cell (P, S, I, F, R).
 */
export type BravaisLattice =
  'aP' | 'mP' | 'mS' | 'oP' | 'oS' | 'oI' | 'oF' | 'tP' | 'tI' | 'hP' | 'hR' | 'cP' | 'cI' | 'cF';

/** The six settings of an orthorhombic cell, named as ITA 2016 Table 1.5.4.4 names them. */
export type OrthorhombicSetting = 'abc' | 'ba-c' | 'cab' | '-cba' | 'bca' | 'a-cb';

/**
 * A cell of a lattice, named by the fields that apply to its Bravais lattice; a field left out takes
 * the value of the conventional cell in the standard setting, so `{}` is that cell.
 *
 * - `mP`, `mS`: `uniqueAxis` (a, b or c) and `cellChoice` (1, 2 or 3; the
 *   standard is b and 1).
 * - `oP`, `oS`, `oI`, `oF`: `setting`, one of the six settings (standard `'abc'`); `oI` and `oF`
 *   also `{ centring: 'P' }`, the primitive cell of the standard setting.
 * - `tP`: `{ centring: 'C', cell }`, the C-centred cells C₁ (`cell: 1`) and C₂ (`cell: 2`).
 * - `tI`: `{ centring: 'F', cell }`, the F-centred cells F₁ and F₂, and `{ centring: 'P' }`, the
 *   primitive cell.
 * - `hP`: `centring` and `cell`, with centring `'C'` (the orthohexagonal cells C₁, C₂, C₃), `'H'` (the
 *   triple hexagonal cells H₁, H₂, H₃) or `'D'` (the triple rhombohedral cells D₁, D₂).
 * - `hR`: `{ axes: 'rhombohedral' }`, the primitive rhombohedral cell; `{ axes: 'hexagonal', cell,
 *   setting }`, the triple hexagonal cells R₁, R₂, R₃ in the obverse or reverse setting (standard: R₁,
 *   obverse); `uniqueAxis` and `cellChoice`, the C-centred monoclinic cells of unique axis b or the
 *   A-centred ones of unique axis c, cell choice 1, 2 or 3.
 * - `cI`, `cF`: `{ centring: 'P' }`, the primitive cell.
 *
 * A `centring` equal to that of the conventional cell names the conventional cell.
 */
export interface Cell {
  /** The unique axis of a monoclinic cell. */
  readonly uniqueAxis?: 'a' | 'b' | 'c';
  /** The cell choice of a monoclinic cell, 1, 2 or 3. */
  readonly cellChoice?: number;
  /** An orthorhombic setting, or for hexagonal axes of an `hR` lattice the obverse or reverse setting. */
  readonly setting?: OrthorhombicSetting | 'obverse' | 'reverse';
  /** The centring of the cell: `'P'` for a primitive cell, or the letter of a centred cell. */
  readonly centring?: 'P' | 'C' | 'I' | 'F' | 'H' | 'D';
  /** The axes of an `hR` lattice: `'hexagonal'` (the triple hexagonal cell, standard) or `'rhombohedral'`. */
  readonly axes?: 'hexagonal' | 'rhombohedral';
  /** The index of a cell where several cells have the same centring: C₁ is `cell: 1`. */
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
const SETTINGS: readonly OrthorhombicSetting[] = ['abc', 'ba-c', 'cab', '-cba', 'bca', 'a-cb'];

type Edge = readonly [lattice: BravaisLattice, from: string, to: string];

/** A change of cell: P and Q = P⁻¹ by rows, and the pairs of cells it joins, per lattice. */
interface CellChange {
  readonly p: string;
  readonly q: string;
  readonly edges: readonly Edge[];
}

const MONOCLINIC: readonly BravaisLattice[] = ['mP', 'mS'];
const ORTHORHOMBIC: readonly BravaisLattice[] = ['oP', 'oS', 'oI', 'oF'];
const each = (lattices: readonly BravaisLattice[], from: string, to: string): Edge[] =>
  lattices.map((l) => [l, from, to] as const);
const cycle = (axis: string): Edge[] =>
  [1, 2, 3].flatMap((k) => each(MONOCLINIC, `${axis}${k}`, `${axis}${(k % 3) + 1}`));
const invariant = (from: string, to: string): Edge[] =>
  [1, 2, 3].flatMap((k) => each(MONOCLINIC, `${from}${k}`, `${to}${k}`));

/**
 * The changes of cell from which every other is composed, each joining the cells named by the keys of
 * `cellKey`. Source: ITA (6th ed., 2016), Table 1.5.1.1, pp. 77–80, its 41 rows in printed order.
 */
export const CELL_CHANGES: readonly CellChange[] = [
  // p. 77: monoclinic cell choices 1 → 2 → 3 → 1 for unique axis b, c, a; unique axis b → c, b → a, c → a.
  { p: '-1 0 1; 0 1 0; -1 0 0', q: '0 0 -1; 0 1 0; 1 0 -1', edges: cycle('b') },
  { p: '0 -1 0; 1 -1 0; 0 0 1', q: '-1 1 0; -1 0 0; 0 0 1', edges: cycle('c') },
  { p: '1 0 0; 0 0 -1; 0 1 -1', q: '1 0 0; 0 -1 1; 0 -1 0', edges: cycle('a') },
  { p: '0 1 0; 0 0 1; 1 0 0', q: '0 0 1; 1 0 0; 0 1 0', edges: invariant('b', 'c') },
  { p: '0 0 1; 1 0 0; 0 1 0', q: '0 1 0; 0 0 1; 1 0 0', edges: invariant('b', 'a') },
  { p: '0 1 0; 0 0 1; 1 0 0', q: '0 0 1; 1 0 0; 0 1 0', edges: invariant('c', 'a') },
  // p. 77: I → P and F → P.
  {
    p: '-1/2 1/2 1/2; 1/2 -1/2 1/2; 1/2 1/2 -1/2',
    q: '0 1 1; 1 0 1; 1 1 0',
    edges: [
      ['oI', 'abc', 'P'],
      ['tI', 'I', 'P'],
      ['cI', 'I', 'P'],
    ],
  },
  {
    p: '0 1/2 1/2; 1/2 0 1/2; 1/2 1/2 0',
    q: '-1 1 1; 1 -1 1; 1 1 -1',
    edges: [
      ['oF', 'abc', 'P'],
      ['cF', 'F', 'P'],
    ],
  },
  // p. 78: unconventional orthorhombic settings → abc.
  { p: '0 1 0; 1 0 0; 0 0 -1', q: '0 1 0; 1 0 0; 0 0 -1', edges: each(ORTHORHOMBIC, 'ba-c', 'abc') },
  { p: '0 0 1; 1 0 0; 0 1 0', q: '0 1 0; 0 0 1; 1 0 0', edges: each(ORTHORHOMBIC, 'cab', 'abc') },
  { p: '0 0 -1; 0 1 0; 1 0 0', q: '0 0 1; 0 1 0; -1 0 0', edges: each(ORTHORHOMBIC, '-cba', 'abc') },
  { p: '0 1 0; 0 0 1; 1 0 0', q: '0 0 1; 1 0 0; 0 1 0', edges: each(ORTHORHOMBIC, 'bca', 'abc') },
  { p: '1 0 0; 0 0 -1; 0 1 0', q: '1 0 0; 0 0 1; 0 -1 0', edges: each(ORTHORHOMBIC, 'a-cb', 'abc') },
  // p. 78: tetragonal P → C₁, I → F₁; P → C₂, I → F₂.
  {
    p: '1 1 0; -1 1 0; 0 0 1',
    q: '1/2 -1/2 0; 1/2 1/2 0; 0 0 1',
    edges: [
      ['tP', 'P', 'C1'],
      ['tI', 'I', 'F1'],
    ],
  },
  {
    p: '1 -1 0; 1 1 0; 0 0 1',
    q: '1/2 1/2 0; -1/2 1/2 0; 0 0 1',
    edges: [
      ['tP', 'P', 'C2'],
      ['tI', 'I', 'F2'],
    ],
  },
  // p. 78: primitive rhombohedral cell → triple hexagonal cells R₁, R₂, R₃, obverse, then reverse.
  {
    p: '1 0 1; -1 1 1; 0 -1 1',
    q: '2/3 -1/3 -1/3; 1/3 1/3 -2/3; 1/3 1/3 1/3',
    edges: [['hR', 'rhombohedral', 'R1-obverse']],
  },
  {
    p: '0 -1 1; 1 0 1; -1 1 1',
    q: '-1/3 2/3 -1/3; -2/3 1/3 1/3; 1/3 1/3 1/3',
    edges: [['hR', 'rhombohedral', 'R2-obverse']],
  },
  {
    p: '-1 1 1; 0 -1 1; 1 0 1',
    q: '-1/3 -1/3 2/3; 1/3 -2/3 1/3; 1/3 1/3 1/3',
    edges: [['hR', 'rhombohedral', 'R3-obverse']],
  },
  {
    p: '-1 0 1; 1 -1 1; 0 1 1',
    q: '-2/3 1/3 1/3; -1/3 -1/3 2/3; 1/3 1/3 1/3',
    edges: [['hR', 'rhombohedral', 'R1-reverse']],
  },
  {
    p: '0 1 1; -1 0 1; 1 -1 1',
    q: '1/3 -2/3 1/3; 2/3 -1/3 -1/3; 1/3 1/3 1/3',
    edges: [['hR', 'rhombohedral', 'R2-reverse']],
  },
  {
    p: '1 -1 1; 0 1 1; -1 0 1',
    q: '1/3 1/3 -2/3; -1/3 2/3 -1/3; 1/3 1/3 1/3',
    edges: [['hR', 'rhombohedral', 'R3-reverse']],
  },
  // pp. 78–79: hexagonal P → orthohexagonal C₁, C₂, C₃, triple hexagonal H₁, H₂, H₃, triple rhombohedral D₁, D₂.
  { p: '1 1 0; 0 2 0; 0 0 1', q: '1 -1/2 0; 0 1/2 0; 0 0 1', edges: [['hP', 'P', 'C1']] },
  { p: '1 -1 0; 1 1 0; 0 0 1', q: '1/2 1/2 0; -1/2 1/2 0; 0 0 1', edges: [['hP', 'P', 'C2']] },
  { p: '0 -2 0; 1 -1 0; 0 0 1', q: '-1/2 1 0; -1/2 0 0; 0 0 1', edges: [['hP', 'P', 'C3']] },
  { p: '1 1 0; -1 2 0; 0 0 1', q: '2/3 -1/3 0; 1/3 1/3 0; 0 0 1', edges: [['hP', 'P', 'H1']] },
  { p: '2 -1 0; 1 1 0; 0 0 1', q: '1/3 1/3 0; -1/3 2/3 0; 0 0 1', edges: [['hP', 'P', 'H2']] },
  { p: '1 -2 0; 2 -1 0; 0 0 1', q: '-1/3 2/3 0; -2/3 1/3 0; 0 0 1', edges: [['hP', 'P', 'H3']] },
  { p: '1 0 -1; 0 1 -1; 1 1 1', q: '2/3 -1/3 1/3; -1/3 2/3 1/3; -1/3 -1/3 1/3', edges: [['hP', 'P', 'D1']] },
  { p: '-1 0 1; 0 -1 1; 1 1 1', q: '-2/3 1/3 1/3; 1/3 -2/3 1/3; 1/3 1/3 1/3', edges: [['hP', 'P', 'D2']] },
  // p. 79: triple hexagonal cell R (obverse) → C-centred monoclinic, unique axis b, and A-centred, unique axis c, cell choices 1–3.
  { p: '2/3 0 0; 1/3 1 0; -2/3 0 1', q: '3/2 0 0; -1/2 1 0; 1 0 1', edges: [['hR', 'R1-obverse', 'b1']] },
  { p: '-1/3 -1 0; 1/3 -1 0; -2/3 0 1', q: '-3/2 3/2 0; -1/2 -1/2 0; -1 1 1', edges: [['hR', 'R1-obverse', 'b2']] },
  { p: '-1/3 1 0; -2/3 0 0; -2/3 0 1', q: '0 -3/2 0; 1 -1/2 0; 0 -1 1', edges: [['hR', 'R1-obverse', 'b3']] },
  { p: '0 2/3 0; 0 1/3 1; 1 -2/3 0', q: '1 0 1; 3/2 0 0; -1/2 1 0', edges: [['hR', 'R1-obverse', 'c1']] },
  { p: '0 -1/3 -1; 0 1/3 -1; 1 -2/3 0', q: '-1 1 1; -3/2 3/2 0; -1/2 -1/2 0', edges: [['hR', 'R1-obverse', 'c2']] },
  { p: '0 -1/3 1; 0 -2/3 0; 1 -2/3 0', q: '0 -1 1; 0 -3/2 0; 1 -1/2 0', edges: [['hR', 'R1-obverse', 'c3']] },
  // pp. 79–80: primitive rhombohedral cell → the same monoclinic cells.
  { p: '0 0 1; -1 1 1; -1 -1 1', q: '1 -1/2 -1/2; 0 1/2 -1/2; 1 0 0', edges: [['hR', 'rhombohedral', 'b1']] },
  { p: '-1 -1 1; 0 0 1; -1 1 1', q: '-1/2 1 -1/2; -1/2 0 1/2; 0 1 0', edges: [['hR', 'rhombohedral', 'b2']] },
  { p: '-1 1 1; -1 -1 1; 0 0 1', q: '-1/2 -1/2 1; 1/2 -1/2 0; 0 0 1', edges: [['hR', 'rhombohedral', 'b3']] },
  { p: '1 0 0; 1 -1 1; 1 -1 -1', q: '1 0 0; 1 -1/2 -1/2; 0 1/2 -1/2', edges: [['hR', 'rhombohedral', 'c1']] },
  { p: '1 -1 -1; 1 0 0; 1 -1 1', q: '0 1 0; -1/2 1 -1/2; -1/2 0 1/2', edges: [['hR', 'rhombohedral', 'c2']] },
  { p: '1 -1 1; 1 -1 -1; 1 0 0', q: '0 0 1; -1/2 -1/2 1; 1/2 -1/2 0', edges: [['hR', 'rhombohedral', 'c3']] },
];

/** The key of the conventional cell in the standard setting. */
const STANDARD: Readonly<Record<BravaisLattice, string>> = {
  aP: 'P',
  mP: 'b1',
  mS: 'b1',
  oP: 'abc',
  oS: 'abc',
  oI: 'abc',
  oF: 'abc',
  tP: 'P',
  tI: 'I',
  hP: 'P',
  hR: 'R1-obverse',
  cP: 'P',
  cI: 'I',
  cF: 'F',
};

type RMatrix = readonly (readonly Rational[])[];

const parse = (s: string): RMatrix => s.split(';').map((row) => row.trim().split(/\s+/).map(parseRational));
const product = (a: RMatrix, b: RMatrix): RMatrix =>
  a.map((row) => [0, 1, 2].map((j) => row.reduce((s, x, k) => add(s, multiply(x, b[k][j])), ZERO)));

/** Per lattice, each cell's P from the standard cell and its inverse, joined over the changes of cell. */
const cells = new Map<BravaisLattice, Map<string, { p: RMatrix; q: RMatrix }>>();

function cellsOf(lattice: BravaisLattice): Map<string, { p: RMatrix; q: RMatrix }> {
  const known = cells.get(lattice);
  if (known) return known;
  const one = parse('1 0 0; 0 1 0; 0 0 1');
  const found = new Map([[STANDARD[lattice], { p: one, q: one }]]);
  const edges = CELL_CHANGES.flatMap((change) =>
    change.edges
      .filter(([l]) => l === lattice)
      .map(([, from, to]) => ({ from, to, p: parse(change.p), q: parse(change.q) })),
  );
  // Breadth first from the standard cell, along a change's P from its first cell to its second, Q back.
  for (let grown = true; grown;) {
    grown = false;
    for (const e of edges) {
      const a = found.get(e.from);
      const b = found.get(e.to);
      if (a && !b) found.set(e.to, { p: product(a.p, e.p), q: product(e.q, a.q) });
      if (b && !a) found.set(e.from, { p: product(b.p, e.q), q: product(e.p, b.q) });
      grown ||= (a === undefined) !== (b === undefined);
    }
  }
  cells.set(lattice, found);
  return found;
}

/** The fields of a cell that each Bravais lattice takes. */
function fieldsOf(lattice: BravaisLattice): readonly (keyof Cell)[] {
  if (lattice === 'mP' || lattice === 'mS') return ['uniqueAxis', 'cellChoice'];
  if (lattice === 'oP' || lattice === 'oS') return ['setting'];
  if (lattice === 'oI' || lattice === 'oF') return ['setting', 'centring'];
  if (lattice === 'tP' || lattice === 'tI' || lattice === 'hP') return ['centring', 'cell'];
  if (lattice === 'hR') return ['axes', 'cell', 'setting', 'uniqueAxis', 'cellChoice'];
  if (lattice === 'cI' || lattice === 'cF') return ['centring'];
  return [];
}

/** The internal key of a cell, or a RangeError that says which cells the lattice has. */
function cellKey(lattice: BravaisLattice, cell: unknown, what: string): string {
  checkObject(cell, what);
  if (!isPlainObject(cell)) throw new RangeError(`${what} must be a plain object, not ${shown(cell)}`);
  const allowed = fieldsOf(lattice);
  const wrong = Object.keys(cell).filter((k) => !(allowed as readonly string[]).includes(k));
  if (wrong.length > 0) {
    const takes = allowed.length > 0 ? `the fields ${allowed.join(', ')}` : 'no fields (it has one cell, {})';
    throw new RangeError(`${what}: a cell of an ${lattice} lattice takes ${takes}, not ${wrong.join(', ')}`);
  }
  const c = cell as Cell;
  const fail = (): never => {
    throw new RangeError(
      `${what}: ${shown(cell)} names no cell of an ${lattice} lattice (cellTransformation lists them)`,
    );
  };
  const index = (v: unknown, n: number, dflt?: number): number => {
    if (v === undefined && dflt !== undefined) return dflt;
    return Number.isInteger(v) && (v as number) >= 1 && (v as number) <= n ? (v as number) : fail();
  };
  const monoclinic = (axes: readonly string[]): string => {
    const axis = c.uniqueAxis ?? 'b';
    if (!axes.includes(axis)) fail();
    return `${axis}${index(c.cellChoice, 3, 1)}`;
  };
  switch (lattice) {
    case 'mP':
    case 'mS':
      return monoclinic(['a', 'b', 'c']);
    case 'oP':
    case 'oS':
    case 'oI':
    case 'oF': {
      const setting = c.setting ?? 'abc';
      if (!(SETTINGS as readonly string[]).includes(setting)) fail();
      if (c.centring === undefined || c.centring === lattice[1]) return setting;
      return c.centring === 'P' && setting === 'abc' ? 'P' : fail();
    }
    case 'tP':
    case 'tI':
    case 'hP':
    case 'cI':
    case 'cF': {
      const own = lattice[1];
      const centring = c.centring ?? own;
      const several: Readonly<Record<string, number>> =
        lattice === 'tP' ? { C: 2 } : lattice === 'tI' ? { F: 2 } : lattice === 'hP' ? { C: 3, H: 3, D: 2 } : {};
      if (several[centring] !== undefined) return `${centring}${index(c.cell, several[centring])}`;
      if (c.cell !== undefined) fail();
      return centring === own || (centring === 'P' && own !== 'P') ? centring : fail();
    }
    case 'hR': {
      if (c.uniqueAxis !== undefined || c.cellChoice !== undefined) {
        if (c.axes !== undefined || c.cell !== undefined || c.setting !== undefined) fail();
        return monoclinic(['b', 'c']);
      }
      if (c.axes === 'rhombohedral') {
        return c.cell === undefined && c.setting === undefined ? 'rhombohedral' : fail();
      }
      if (c.axes !== undefined && c.axes !== 'hexagonal') fail();
      const setting = c.setting ?? 'obverse';
      if (setting !== 'obverse' && setting !== 'reverse') fail();
      return `R${index(c.cell, 3, 1)}-${setting}`;
    }
    default:
      return 'P';
  }
}

/**
 * The change of the coordinate system from one cell of a lattice to another: P with
 * (a′, b′, c′) = (a, b, c)·P, where (a, b, c) is the basis of `fromCell` and (a′, b′, c′) that of
 * `toCell`, to be passed to `changeOfCoordinates` (the origin stays). The change back is
 * `cellTransformation(bravaisLattice, toCell, fromCell)`.
 *
 * A cell is named by its fields (`Cell`), and an empty one is the conventional cell in the standard
 * setting: a monoclinic cell by its unique axis and cell choice, an orthorhombic one by its setting,
 * the primitive cell of a centred lattice by the centring `'P'`, the further cells of ITA by their
 * centring and index (C₁: centring `'C'`, cell 1), the cells of a rhombohedral lattice by their axes, `'hexagonal'` or `'rhombohedral'`, or as monoclinic cells.
 * Fractions such as 1/3 are the nearest numbers, which `changeOfCoordinates` reads back as fractions.
 *
 * @example
 * ```ts
 * // The operations of -3m with rhombohedral axes, from those with hexagonal axes:
 * const t = cellTransformation('hR', {}, { axes: 'rhombohedral' });
 * changeOfCoordinates(t, { operations: operations('-3m') }).operations;
 * ```
 *
 * @throws RangeError for a Bravais lattice not in ITA 2016 Table 1.3.4.1, or a cell the lattice does
 * not have.
 *
 * @remarks The matrices are those of ITA (6th ed., 2016) Table 1.5.1.1, pp. 77–80; a pair of cells
 * that the table does not join directly is joined by a product of its matrices, computed exactly.
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
  const all = cellsOf(bravaisLattice);
  const from = all.get(cellKey(bravaisLattice, fromCell, 'cellTransformation: the cell fromCell'));
  const to = all.get(cellKey(bravaisLattice, toCell, 'cellTransformation: the cell toCell'));
  if (!from || !to)
    throw new Error(`cellTransformation: a cell of ${bravaisLattice} is not joined to its standard cell`);
  const p = product(from.q, to.p);
  return deepFreeze({ linearPart: p.map((row) => row.map((x) => toNumber(x) + 0)) as unknown as Mat3 });
}
