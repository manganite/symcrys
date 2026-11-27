/**
 * `cellTransformation` against ITA (6th ed., 2016) Table 1.5.1.1, pp. 77–80 (fixture class (a)):
 * the 41 printed rows are re-parsed from references/itc/vol-a-2016-table-1.5.1.1.md, each row's
 * meaning is written out here as the cells it joins (from its printed statements), and the function
 * must give the printed P from the first cell to the second and the printed Q back. Checks that do
 * not use symcrys: Q = P⁻¹ exactly for every printed row, P of the orthorhombic settings from their
 * symbols, and |det P| from the volumes of the cells. Consistency with the point-group data of
 * symcrys (the rhombohedral axes, unique axis c, the settings of mm2) is checked at the end.
 */

import { describe, expect, it } from 'vitest';
import {
  cellTransformation,
  changeOfCoordinates,
  operations,
  type BravaisLattice,
  type Cell,
  type PointGroupKey,
} from './index.js';
import * as magnetic from './magnetic.js';
import { readReference, section, tableRows } from './testUtils/references.js';

const printed = tableRows(readReference('itc/vol-a-2016-table-1.5.1.1.md')).slice(1);

/** A rational as [numerator, denominator] (bigint), reduced, the sign in the numerator. */
type Q = readonly [bigint, bigint];
const gcd = (a: bigint, b: bigint): bigint => (b === 0n ? (a < 0n ? -a : a) : gcd(b, a % b));
const q = (n: bigint, d: bigint): Q => {
  const g = gcd(n, d) * (d < 0n ? -1n : 1n);
  return [n / g, d / g];
};
const parse = (s: string): Q => {
  const [n, d] = s.split('/');
  return q(BigInt(n), BigInt(d ?? '1'));
};
const matrix = (s: string): Q[][] => s.split(';').map((r) => r.trim().split(/\s+/).map(parse));
const plus = (a: Q, b: Q): Q => q(a[0] * b[1] + b[0] * a[1], a[1] * b[1]);
const times = (a: Q, b: Q): Q => q(a[0] * b[0], a[1] * b[1]);
const product = (a: Q[][], b: Q[][]): Q[][] =>
  a.map((row) => [0, 1, 2].map((j) => row.reduce<Q>((s, x, k) => plus(s, times(x, b[k][j])), [0n, 1n])));
const det = (m: Q[][]): Q => {
  const minor = (i: number, j: number, k: number, l: number) =>
    plus(times(m[i][j], m[k][l]), times(q(-1n, 1n), times(m[i][l], m[k][j])));
  return [
    times(m[0][0], minor(1, 1, 2, 2)),
    times(q(-1n, 1n), times(m[0][1], minor(1, 0, 2, 2))),
    times(m[0][2], minor(1, 0, 2, 1)),
  ].reduce(plus);
};
const value = ([n, d]: Q) => Number(n) / Number(d);
const unit = [0, 1, 2].map((i) => [0, 1, 2].map((j): Q => (i === j ? [1n, 1n] : [0n, 1n])));

const expectClose = (actual: readonly (readonly number[])[], expected: Q[][]) =>
  actual.forEach((row, i) => row.forEach((x, j) => expect(x).toBeCloseTo(value(expected[i][j]), 12)));

const mono = (uniqueAxis: 'a' | 'b' | 'c', cellChoice: number): Cell => ({ uniqueAxis, cellChoice });
const hex = (cell: number, setting: 'obverse' | 'reverse'): Cell => ({ axes: 'hexagonal', cell, setting });
const rh: Cell = { axes: 'rhombohedral' };
type Change = readonly [BravaisLattice, Cell, Cell];
const both = (from: Cell, to: Cell): Change[] => [
  ['mP', from, to],
  ['mS', from, to],
];
const cycle = (axis: 'a' | 'b' | 'c'): Change[] =>
  [1, 2, 3].flatMap((k) => both(mono(axis, k), mono(axis, (k % 3) + 1)));
const invariant = (from: 'a' | 'b' | 'c', to: 'a' | 'b' | 'c'): Change[] =>
  [1, 2, 3].flatMap((k) => both(mono(from, k), mono(to, k)));
const orthorhombic = (setting: Cell['setting']): Change[] =>
  (['oP', 'oS', 'oI', 'oF'] as const).map((l) => [l, { setting }, {}] as const);

/**
 * What each printed row states, in the names of `Cell`, and the ratio of the volumes of the two
 * cells (new over old), read from their centrings: a primitive cell of an I lattice has 1/2 of the
 * volume, of an F lattice 1/4, a C-centred cell of a P lattice twice, a triple cell three times.
 */
const MEANING: readonly (readonly [changes: readonly Change[], volume: string])[] = [
  [cycle('b'), '1'],
  [cycle('c'), '1'],
  [cycle('a'), '1'],
  [invariant('b', 'c'), '1'],
  [invariant('b', 'a'), '1'],
  [invariant('c', 'a'), '1'],
  [
    [
      ['oI', {}, { centring: 'P' }],
      ['tI', {}, { centring: 'P' }],
      ['cI', { centring: 'I' }, { centring: 'P' }],
    ],
    '1/2',
  ],
  [
    [
      ['oF', {}, { centring: 'P' }],
      ['cF', {}, { centring: 'P' }],
    ],
    '1/4',
  ],
  [orthorhombic('ba-c'), '1'],
  [orthorhombic('cab'), '1'],
  [orthorhombic('-cba'), '1'],
  [orthorhombic('bca'), '1'],
  [orthorhombic('a-cb'), '1'],
  [
    [
      ['tP', {}, { centring: 'C', cell: 1 }],
      ['tI', {}, { centring: 'F', cell: 1 }],
    ],
    '2',
  ],
  [
    [
      ['tP', { centring: 'P' }, { centring: 'C', cell: 2 }],
      ['tI', {}, { centring: 'F', cell: 2 }],
    ],
    '2',
  ],
  [[['hR', rh, {}]], '3'],
  [[['hR', rh, hex(2, 'obverse')]], '3'],
  [[['hR', rh, hex(3, 'obverse')]], '3'],
  [[['hR', rh, hex(1, 'reverse')]], '3'],
  [[['hR', rh, { cell: 2, setting: 'reverse' }]], '3'],
  [[['hR', rh, hex(3, 'reverse')]], '3'],
  [[['hP', {}, { centring: 'C', cell: 1 }]], '2'],
  [[['hP', {}, { centring: 'C', cell: 2 }]], '2'],
  [[['hP', {}, { centring: 'C', cell: 3 }]], '2'],
  [[['hP', {}, { centring: 'H', cell: 1 }]], '3'],
  [[['hP', {}, { centring: 'H', cell: 2 }]], '3'],
  [[['hP', {}, { centring: 'H', cell: 3 }]], '3'],
  [[['hP', {}, { centring: 'D', cell: 1 }]], '3'],
  [[['hP', { centring: 'P' }, { centring: 'D', cell: 2 }]], '3'],
  [[['hR', hex(1, 'obverse'), { centring: 'C', cell: 1 }]], '2/3'],
  [[['hR', { axes: 'hexagonal' }, { centring: 'C', cell: 2 }]], '2/3'],
  [[['hR', {}, { centring: 'C', cell: 3 }]], '2/3'],
  [[['hR', {}, { centring: 'A', cell: 1 }]], '2/3'],
  [[['hR', {}, { centring: 'A', cell: 2 }]], '2/3'],
  [[['hR', {}, { centring: 'A', cell: 3 }]], '2/3'],
  [[['hR', rh, { centring: 'C', cell: 1 }]], '2'],
  [[['hR', rh, { centring: 'C', cell: 2 }]], '2'],
  [[['hR', rh, { centring: 'C', cell: 3 }]], '2'],
  [[['hR', rh, { centring: 'A', cell: 1 }]], '2'],
  [[['hR', rh, { centring: 'A', cell: 2 }]], '2'],
  [[['hR', rh, { centring: 'A', cell: 3 }]], '2'],
];

describe('the changes of cell against print (ITA 2016 Table 1.5.1.1)', () => {
  it('has the 41 printed rows, each with its meaning', () => {
    expect(printed.map((r) => Number(r[0]))).toEqual(Array.from({ length: 41 }, (_, i) => i + 1));
    expect(MEANING).toHaveLength(41);
  });

  it('the six rows of the transcription of Chapter 1.5 are rows 7, 8, 24 to 27 here', () => {
    const selected = tableRows(section(readReference('itc/vol-a-2016-1.5-transformations.md'), '## 7 ')).slice(1);
    expect(selected.map((r) => [r[1], r[2]])).toEqual(
      [7, 8, 24, 25, 26, 27].map((n) => [printed[n - 1][3], printed[n - 1][4]]),
    );
  });

  for (const [i, [no, , transformation, p, inverse]] of printed.entries()) {
    const [changes, volume] = MEANING[i];
    it(`row ${no}: ${transformation.slice(0, 70)}`, () => {
      const P = matrix(p);
      const Q = matrix(inverse);
      expect(product(P, Q)).toEqual(unit);
      expect(det(P)).toEqual(parse(volume));
      for (const [lattice, from, to] of changes) {
        expectClose(cellTransformation(lattice, from, to).linearPart, P);
        expectClose(cellTransformation(lattice, to, from).linearPart, Q);
      }
    });
  }

  it('the orthorhombic rows map the basis their setting symbol names onto (a, b, c)', () => {
    for (const setting of ['ba-c', 'cab', '-cba', 'bca', 'a-cb'] as const) {
      // Old basis vector i is the standard vector its letter names, with its sign; P(i, j) is that sign.
      const letters = setting.match(/-?[abc]/g)!;
      const expected = [0, 1, 2].map((i) =>
        [0, 1, 2].map((j) => (letters[i].endsWith('abc'[j]) ? (letters[i].startsWith('-') ? -1 : 1) : 0)),
      );
      expect(cellTransformation('oP', { setting }, {}).linearPart).toEqual(expected);
    }
  });
});

describe('cellTransformation', () => {
  it('joins any two cells of a lattice; the change back is the inverse', () => {
    const t = cellTransformation('hR', hex(2, 'reverse'), { centring: 'A', cell: 3 });
    const back = cellTransformation('hR', { centring: 'A', cell: 3 }, hex(2, 'reverse'));
    const round = changeOfCoordinates(t, {
      metric: [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
      ],
    });
    expect(changeOfCoordinates(round.inverse, {}).inverse.linearPart).toEqual(t.linearPart);
    const prod = t.linearPart.map((row) =>
      [0, 1, 2].map((j) => row.reduce((s, x, k) => s + x * back.linearPart[k][j], 0)),
    );
    prod.forEach((row, i) => row.forEach((x, j) => expect(x).toBeCloseTo(i === j ? 1 : 0, 12)));
    expect(cellTransformation('mS', mono('a', 2), mono('a', 2)).linearPart).toEqual([
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ]);
    expect(cellTransformation('aP', {}, {}).linearPart[2]).toEqual([0, 0, 1]);
    expect(magnetic.cellTransformation).toBe(cellTransformation);
  });

  it('gives the operations of symcrys in the other setting (consistency with the point-group data)', () => {
    const sorted = (ops: readonly { matrix: readonly (readonly number[])[] }[]) =>
      ops.map((o) => JSON.stringify(o.matrix)).sort();
    const cases: readonly [BravaisLattice, Cell, PointGroupKey, Parameters<typeof operations>[1]][] = [
      ['hR', { axes: 'rhombohedral' }, '-3m', { axes: 'rhombohedral' }],
      ['mP', { uniqueAxis: 'c' }, '2/m', { uniqueAxis: 'c' }],
      ['mP', { uniqueAxis: 'a' }, 'm', { uniqueAxis: 'a' }],
      ['oP', { setting: 'cab' }, 'mm2', { setting: 2 }],
      ['oP', { setting: 'bca' }, 'mm2', { setting: 3 }],
    ];
    for (const [lattice, cell, key, setting] of cases) {
      const changed = changeOfCoordinates(cellTransformation(lattice, {}, cell), {
        operations: operations(key),
      }).operations!;
      expect(sorted(changed)).toEqual(sorted(operations(key, setting)));
    }
  });

  it('the worked example of ITA 2016 § 1.5.3.2.1 (B), p. 90: unique axis c, cell choice 3 → unique axis b, cell choice 1', () => {
    const example = section(readReference('itc/vol-a-2016-1.5-transformations.md'), '## 5 ');
    const printedP = matrix(/^P: (.*)$/m.exec(example)![1]);
    expectClose(cellTransformation('mP', mono('c', 3), mono('b', 1)).linearPart, printedP);
  });

  it('every cell spans the lattice of the standard cell, with the centring its name states', () => {
    // The centring vectors of a cell (ITA 2016 Table 1.2.1.2 and § 1.5.1, Figs. 1.5.1.6–1.5.1.10),
    // written out here from the name of the cell, not from the matrices.
    const t = (s: string) => s.split(' ').map((x) => value(parse(x)));
    const V: Readonly<Record<string, number[][]>> = {
      P: [],
      A: [t('0 1/2 1/2')],
      B: [t('1/2 0 1/2')],
      C: [t('1/2 1/2 0')],
      I: [t('1/2 1/2 1/2')],
      F: [t('0 1/2 1/2'), t('1/2 0 1/2'), t('1/2 1/2 0')],
      obverse: [t('2/3 1/3 1/3'), t('1/3 2/3 2/3')],
      reverse: [t('1/3 2/3 1/3'), t('2/3 1/3 2/3')],
      H: [t('2/3 1/3 0'), t('1/3 2/3 0')],
      D: [t('1/3 1/3 1/3'), t('2/3 2/3 2/3')],
    };
    const monoclinic = (axis: 'a' | 'b' | 'c', centrings: string): [Cell, string][] =>
      [1, 2, 3].map((k) => [mono(axis, k), centrings[k - 1]]);
    const settings = (letters: string): [Cell, string][] =>
      (['abc', 'ba-c', 'cab', '-cba', 'bca', 'a-cb'] as const).map((setting, i) => [{ setting }, letters[i]]);
    const CELLS: readonly [BravaisLattice, string, readonly [Cell, string][]][] = [
      ['mP', 'P', [...monoclinic('b', 'PPP'), ...monoclinic('c', 'PPP'), ...monoclinic('a', 'PPP')]],
      ['mS', 'C', [...monoclinic('b', 'CAI'), ...monoclinic('c', 'ABI'), ...monoclinic('a', 'BCI')]],
      ['oP', 'P', settings('PPPPPP')],
      ['oS', 'C', settings('CCAABB')],
      ['oI', 'I', [...settings('IIIIII'), [{ centring: 'P' }, 'P']]],
      ['oF', 'F', [...settings('FFFFFF'), [{ centring: 'P' }, 'P']]],
      [
        'tP',
        'P',
        [
          [{ centring: 'C', cell: 1 }, 'C'],
          [{ centring: 'C', cell: 2 }, 'C'],
        ],
      ],
      [
        'tI',
        'I',
        [
          [{ centring: 'F', cell: 1 }, 'F'],
          [{ centring: 'F', cell: 2 }, 'F'],
          [{ centring: 'P' }, 'P'],
        ],
      ],
      [
        'hP',
        'P',
        [
          ...[1, 2, 3].map((cell): [Cell, string] => [{ centring: 'C', cell }, 'C']),
          ...[1, 2, 3].map((cell): [Cell, string] => [{ centring: 'H', cell }, 'H']),
          ...[1, 2].map((cell): [Cell, string] => [{ centring: 'D', cell }, 'D']),
        ],
      ],
      [
        'hR',
        'obverse',
        [
          [rh, 'P'],
          ...[1, 2, 3].map((cell): [Cell, string] => [hex(cell, 'obverse'), 'obverse']),
          ...[1, 2, 3].map((cell): [Cell, string] => [hex(cell, 'reverse'), 'reverse']),
          ...[1, 2, 3].map((cell): [Cell, string] => [{ centring: 'C', cell }, 'C']),
          ...[1, 2, 3].map((cell): [Cell, string] => [{ centring: 'A', cell }, 'A']),
        ],
      ],
      ['cI', 'I', [[{ centring: 'P' }, 'P']]],
      ['cF', 'F', [[{ centring: 'P' }, 'P']]],
    ];
    const apply = (m: readonly (readonly number[])[], v: readonly number[]) =>
      m.map((row) => row.reduce((s, x, k) => s + x * v[k], 0));
    const unitVectors = [t('1 0 0'), t('0 1 0'), t('0 0 1')];
    /** Whether v is a vector of the lattice with the given centring vectors (coordinates modulo 1). */
    const inLattice = (v: readonly number[], centring: readonly number[][]) =>
      [[0, 0, 0], ...centring].some((c) => v.every((x, i) => Math.abs(x - c[i] - Math.round(x - c[i])) < 1e-9));
    for (const [lattice, standard, cells] of CELLS) {
      for (const [cell, centring] of cells) {
        const where = `${lattice} ${JSON.stringify(cell)}`;
        // Coordinates in the new cell are x′ = P⁻¹x: the standard cell's translations must be
        // translations of the new cell, and the new cell's (by P) translations of the standard cell.
        const P = cellTransformation(lattice, {}, cell).linearPart;
        const Q = cellTransformation(lattice, cell, {}).linearPart;
        for (const v of [...unitVectors, ...V[standard]]) expect(inLattice(apply(Q, v), V[centring]), where).toBe(true);
        for (const v of [...unitVectors, ...V[centring]]) expect(inLattice(apply(P, v), V[standard]), where).toBe(true);
      }
    }
  });

  it('refuses a lattice or a cell that ITA does not name', () => {
    const bad: readonly [unknown, unknown][] = [
      ['hP', { centring: 'H' }], // which of H₁, H₂, H₃
      ['hP', { centring: 'H', cell: 4 }],
      ['tP', { centring: 'F', cell: 1 }],
      ['oS', { centring: 'P' }],
      ['oI', { setting: 'cab', centring: 'P' }],
      ['hR', { uniqueAxis: 'b' }], // the monoclinic cells of hR are named by centring and cell
      ['hR', { centring: 'C' }],
      ['hR', { centring: 'A', cell: 1, axes: 'hexagonal' }],
      ['oP', { setting: null }],
      ['hR', { cell: null }],
      ['hR', { axes: 'rhombohedral', cell: 2 }],
      ['hR', { axes: 'hexagonal', setting: 'abc' }],
      ['mP', { setting: 'abc' }],
      ['mP', { cellChoice: 0 }],
      ['cP', { centring: 'I' }],
      ['tP', { cell: 1 }],
      ['mS', { centring: 'C' }],
      ['cI', { centring: 'F' }],
      ['hR', null],
      ['hR', 'R1'],
    ];
    for (const [lattice, cell] of bad) {
      expect(
        () => cellTransformation(lattice as BravaisLattice, {}, cell as Cell),
        JSON.stringify([lattice, cell]),
      ).toThrow(RangeError);
    }
    expect(() => cellTransformation('mC' as BravaisLattice, {}, {})).toThrow(/aP, mP, mS/);
  });
});
