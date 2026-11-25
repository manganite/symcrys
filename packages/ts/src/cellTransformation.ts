/**
 * Changes between the cells of a lattice (#120; decided by Thomas on 2026-11-25): the transformation
 * matrix P from one named cell of a Bravais lattice to another, for `changeOfCoordinates`. The data
 * are the matrices of ITA (6th ed., 2016) Table 1.5.1.1, pp. 77–80, transcribed in
 * references/itc/vol-a-2016-table-1.5.1.1.md and compared with it by
 * cellTransformation.reference.test.ts; a pair of cells that the table does not join directly is
 * joined by a product of its matrices, exactly in rationals.
 */

import { checkObject, shown } from './checks.js';
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
  { p: '2/3 0 0; 1/3 1 0; -2/3 0 1', q: '3/2 0 0; -1/2 1 0; 1 0 1', edges: [['hR', 'R1-obverse', 'C1']] },
  { p: '-1/3 -1 0; 1/3 -1 0; -2/3 0 1', q: '-3/2 3/2 0; -1/2 -1/2 0; -1 1 1', edges: [['hR', 'R1-obverse', 'C2']] },
  { p: '-1/3 1 0; -2/3 0 0; -2/3 0 1', q: '0 -3/2 0; 1 -1/2 0; 0 -1 1', edges: [['hR', 'R1-obverse', 'C3']] },
  { p: '0 2/3 0; 0 1/3 1; 1 -2/3 0', q: '1 0 1; 3/2 0 0; -1/2 1 0', edges: [['hR', 'R1-obverse', 'A1']] },
  { p: '0 -1/3 -1; 0 1/3 -1; 1 -2/3 0', q: '-1 1 1; -3/2 3/2 0; -1/2 -1/2 0', edges: [['hR', 'R1-obverse', 'A2']] },
  { p: '0 -1/3 1; 0 -2/3 0; 1 -2/3 0', q: '0 -1 1; 0 -3/2 0; 1 -1/2 0', edges: [['hR', 'R1-obverse', 'A3']] },
  // pp. 79–80: primitive rhombohedral cell → the same monoclinic cells.
  { p: '0 0 1; -1 1 1; -1 -1 1', q: '1 -1/2 -1/2; 0 1/2 -1/2; 1 0 0', edges: [['hR', 'rhombohedral', 'C1']] },
  { p: '-1 -1 1; 0 0 1; -1 1 1', q: '-1/2 1 -1/2; -1/2 0 1/2; 0 1 0', edges: [['hR', 'rhombohedral', 'C2']] },
  { p: '-1 1 1; -1 -1 1; 0 0 1', q: '-1/2 -1/2 1; 1/2 -1/2 0; 0 0 1', edges: [['hR', 'rhombohedral', 'C3']] },
  { p: '1 0 0; 1 -1 1; 1 -1 -1', q: '1 0 0; 1 -1/2 -1/2; 0 1/2 -1/2', edges: [['hR', 'rhombohedral', 'A1']] },
  { p: '1 -1 -1; 1 0 0; 1 -1 1', q: '0 1 0; -1/2 1 -1/2; -1/2 0 1/2', edges: [['hR', 'rhombohedral', 'A2']] },
  { p: '1 -1 1; 1 -1 -1; 1 0 0', q: '0 0 1; -1/2 -1/2 1; 1/2 -1/2 0', edges: [['hR', 'rhombohedral', 'A3']] },
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
      return (SETTINGS as readonly string[]).includes(setting)
        ? setting
        : fail(`setting must be one of ${SETTINGS.join(', ')}`);
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
