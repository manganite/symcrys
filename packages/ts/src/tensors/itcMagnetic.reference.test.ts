/**
 * The magnetic tensor properties in the ITC convention against ITC Vol. D, Chapter 1.5 (fixture
 * class (a)), re-parsed from references/itc/: Table 1.5.2.4 (ferromagnetism: 31 groups and the
 * direction of M_s), Table 1.5.7.1 (piezomagnetism: 66 groups, the form of Λ_iα) and Table 1.5.8.1
 * (linear magnetoelectric effect: 58 groups, the form of α_ij, and the 11 groups the text names).
 *
 * A printed form belongs to the orientation its Hermann–Mauguin symbol names (§ 1.5.7.1, p. 134),
 * so each printed symbol, the alternatives in square brackets included, is looked up among the ITC
 * symbols of the settings, and the form is compared in that setting: the printed matrix and the
 * form must span the same space. Two printed orientations of C2v(Cs) are no setting of symcrys
 * (docs/conventions.md, "Settings of the magnetic groups"); their form is computed from the
 * operations the printed symbol names, read independently of the library.
 */

import { describe, expect, it } from 'vitest';
import type { Mat3 } from '../linalg.js';
import {
  MAGNETIC_POINT_GROUP_KEYS,
  findMagneticPointGroup,
  operations,
  pointGroup,
  settings,
  symbol,
  type MagneticPointGroupKey,
} from '../pointGroups/pointGroups.js';
import { groupOfSymbol } from '../testUtils/hermannMauguin.js';
import { matrixRank } from '../testUtils/rank.js';
import { readReference, section, tableRows } from '../testUtils/references.js';
import { TENSOR_PROPERTIES, type TensorPropertyName } from './propertyTable.js';
import { tensorForm, tensorFormOf } from './tensorForm.js';
import { allowsProperty } from './tensorProperties.js';

// --- printed symbols → group and setting ------------------------------------------------------------

interface Orientation {
  key: MagneticPointGroupKey;
  setting: number;
}

/** Groups without time reversal as an element of its own: the 90 groups of ITC Vol. D Chapter 1.5. */
const GROUPS = MAGNETIC_POINT_GROUP_KEYS.filter((k) => pointGroup(k).type !== 'II');
const compact = (s: string) => s.replace(/\s+/g, '');
/** The tables of Chapter 1.5 print S6 where symcrys has C3i, the symbol of ITA. */
const schoenflies = (key: MagneticPointGroupKey) => symbol(key, { form: 'schoenflies' }).replace('C3i', 'S6');

const BY_SYMBOL = new Map<string, Orientation[]>();
const DEFAULT = new Map<string, Orientation>();
for (const key of GROUPS) {
  for (const s of settings(key, 'itc')) {
    for (const name of new Set([s.symbol, compact(s.fullSymbol)])) {
      BY_SYMBOL.set(name, [...(BY_SYMBOL.get(name) ?? []), { key, setting: s.index }]);
    }
    if (s.isDefault) DEFAULT.set(key, { key, setting: s.index });
  }
}

/**
 * The orientation a printed symbol names: the setting with this symbol; a symbol several settings
 * of one group share (monoclinic `2`, trigonal `32`) is the default setting, which is the one ITC
 * means by it (unique axis y; 32 = 321).
 */
function orientation(printed: string): Orientation | null {
  const found = BY_SYMBOL.get(compact(printed)) ?? [];
  const keys = new Set(found.map((o) => o.key));
  if (keys.size > 1) throw new Error(`${printed}: a symbol of several groups (${[...keys].join(', ')})`);
  if (found.length === 1) return found[0];
  if (found.length > 1) return DEFAULT.get(found[0].key)!;
  return DEFAULT.get(printed) ?? null;
}

interface Printed {
  block: string;
  schoenflies: string;
  /** The orientations the row names: `2 (= 121)` → `121`; `mm2 [2mm, m2m]` → three. */
  symbols: string[];
}

function printedGroups(content: string): Printed[] {
  return tableRows(section(content, '## Groups'))
    .slice(1)
    .map(([block, schoenflies, hm]) => {
      const m = /^([^([]+?)(?: \(= ([^)]+)\))?(?: \[([^\]]+)\])?$/.exec(hm);
      if (!m) throw new Error(`Unreadable Hermann–Mauguin cell: ${hm}`);
      const first = m[2] ?? m[1];
      if (m[2] && orientation(m[2])?.key !== orientation(m[1])?.key) throw new Error(`${hm}: two groups`);
      return { block, schoenflies, symbols: [first, ...(m[3]?.split(', ') ?? [])] };
    });
}

/** The printed matrices by block: rows of cells such as `0`, `L14`, `-2L22`. */
function printedMatrices(content: string): Map<string, string[][]> {
  return new Map(
    tableRows(section(content, '## Matrices'))
      .slice(1)
      .map(([block, ...rows]) => [block, rows.map((r) => r.split(' '))]),
  );
}

/** Spanning vectors of a printed matrix, one per symbol; `place` puts a cell into the flat tensor. */
function printedSpace(
  matrix: string[][],
  dim: number,
  place: (row: number, column: number, value: number, v: number[]) => void,
): number[][] {
  const vectors = new Map<string, number[]>();
  matrix.forEach((cells, row) =>
    cells.forEach((cell, column) => {
      if (cell === '0') return;
      const m = /^(-?)(\d?)([a-zL]\d\d)$/.exec(cell);
      if (!m) throw new Error(`Unreadable cell: ${cell}`);
      if (!vectors.has(m[3])) vectors.set(m[3], new Array<number>(dim).fill(0));
      place(row, column, (m[1] ? -1 : 1) * Number(m[2] || 1), vectors.get(m[3])!);
    }),
  );
  return [...vectors.values()];
}

/** Voigt column α = 1 … 6 → index pairs jk (ITC Vol. D eq. (1.5.7.4)); Λ_iα = 2 Λ_ijk for α = 4, 5, 6. */
const VOIGT = [[[0, 0]], [[1, 1]], [[2, 2]], [[1, 2], [2, 1]], [[2, 0], [0, 2]], [[0, 1], [1, 0]]]; // prettier-ignore
const placeVoigt = (i: number, a: number, value: number, v: number[]) => {
  for (const [j, k] of VOIGT[a]) v[9 * i + 3 * j + k] += a < 3 ? value : value / 2;
};
const placeRank2 = (i: number, j: number, value: number, v: number[]) => {
  v[3 * i + j] += value;
};

const sameSpace = (a: readonly (readonly number[])[], b: readonly (readonly number[])[], dim: number): boolean =>
  matrixRank(a, dim) === matrixRank(b, dim) && matrixRank([...a, ...b], dim) === matrixRank(a, dim);

const AXES_XYZ = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];

/** The form in the orientation a printed symbol names. */
function formFor(printed: string, name: TensorPropertyName): { basis: readonly (readonly number[])[]; key?: string } {
  const o = orientation(printed);
  if (o) return { basis: tensorForm(o.key, name, { setting: o.setting }).basis, key: o.key };
  const ops = groupOfSymbol(printed, AXES_XYZ).map((op) => ({ matrix: op.m as unknown as Mat3, timeReversal: op.t }));
  return { basis: tensorFormOf(ops, name).basis };
}

function describeFormTable(
  file: string,
  name: TensorPropertyName,
  count: number,
  dim: number,
  place: (row: number, column: number, value: number, v: number[]) => void,
  noSetting: string[],
): void {
  const content = readReference(file);
  const groups = printedGroups(content);
  const matrices = printedMatrices(content);

  it(`lists ${count} groups, exactly those that allow the property`, () => {
    const keys = groups.map((g) => orientation(g.symbols.find((s) => orientation(s))!)!.key);
    expect(keys).toHaveLength(count);
    expect([...keys].sort()).toEqual(GROUPS.filter((k) => allowsProperty(k, name)).sort());
  });

  it('prints each group under the Schoenflies symbol of the group', () => {
    for (const g of groups) {
      for (const s of g.symbols) {
        const o = orientation(s);
        if (o) expect(schoenflies(o.key), s).toBe(g.schoenflies);
      }
    }
  });

  it('names orientations that are settings, with the known exceptions; findMagneticPointGroup finds the same', () => {
    expect(groups.flatMap((g) => g.symbols).filter((s) => !orientation(s))).toEqual(noSetting);
    for (const s of groups.flatMap((g) => g.symbols)) {
      expect(findMagneticPointGroup(s) ?? null, s).toEqual(orientation(s));
    }
  });

  for (const g of groups) {
    it(`block ${g.block}, ${g.schoenflies}: ${g.symbols.join(', ')}`, () => {
      const printed = printedSpace(matrices.get(g.block)!, dim, place);
      for (const s of g.symbols) {
        expect(sameSpace(formFor(s, name).basis, printed, dim), `${s}: form in the printed orientation`).toBe(true);
      }
    });
  }
}

describe('ITC Vol. D Table 1.5.7.1: piezomagnetic effect', () => {
  describeFormTable('itc/vol-d-table-1.5.7.1.md', 'piezomagnetic', 66, 27, placeVoigt, ["m'2'm"]);
});

describe('ITC Vol. D Table 1.5.8.1: linear magnetoelectric effect', () => {
  describeFormTable('itc/vol-d-table-1.5.8.1.md', 'magnetoelectric', 58, 9, placeRank2, ["2'mm'"]);

  it('the 11 groups without a centre of symmetry that the text names do not allow it', () => {
    const rows = tableRows(
      section(readReference('itc/vol-d-table-1.5.8.1.md'), '## Groups without a centre of symmetry'),
    ).slice(1);
    const named = rows.map(([printed, hm]) => {
      const o = orientation(hm);
      expect(o, hm).not.toBeNull();
      expect(schoenflies(o!.key), hm).toBe(printed);
      return o!.key;
    });
    expect(named).toHaveLength(11);
    // "There are 21 magnetic point groups that possess a centre of symmetry" (not combined with time
    // reversal); of the remaining 69, the 11 named ones are left out: 58 remain.
    const centre = (k: MagneticPointGroupKey) =>
      operations(k).some(
        (op) => !op.timeReversal && op.matrix.every((r, i) => r.every((x, j) => x === (i === j ? -1 : 0))),
      );
    expect(GROUPS.filter(centre)).toHaveLength(21);
    expect(GROUPS.filter((k) => centre(k) && allowsProperty(k, 'magnetoelectric'))).toEqual([]);
    expect([...named].sort()).toEqual(GROUPS.filter((k) => !centre(k) && !allowsProperty(k, 'magnetoelectric')).sort());
  });
});

describe('ITC Vol. D Table 1.5.2.4: ferromagnetism', () => {
  const rows = tableRows(readReference('itc/vol-d-table-1.5.2.4.md')).slice(1);

  it('lists 31 groups, exactly those that allow a spontaneous magnetization', () => {
    const keys = rows.map((r) => orientation(r[2])!.key);
    expect(keys).toHaveLength(31);
    expect([...keys].sort()).toEqual(
      MAGNETIC_POINT_GROUP_KEYS.filter((k) => allowsProperty(k, 'ferromagnetic')).sort(),
    );
    for (const r of rows) expect(schoenflies(orientation(r[2])!.key), r[2]).toBe(r[1].split(' = ')[0]);
  });

  /** Axis of the operations that the element names (`2'`, `m`, `-4`), found from the matrices alone. */
  function elementAxis(ops: ReturnType<typeof operations>, element: string): number[] {
    const m = /^(-?)([2346]|m)('?)$/.exec(element);
    if (!m) throw new Error(`Unreadable element: ${element}`);
    const improper = m[1] !== '' || m[2] === 'm';
    const order = m[2] === 'm' ? 2 : Number(m[2]);
    const axes: number[][] = [];
    for (const op of ops) {
      const d = Math.round(
        op.matrix[0][0] * (op.matrix[1][1] * op.matrix[2][2] - op.matrix[1][2] * op.matrix[2][1]) -
          op.matrix[0][1] * (op.matrix[1][0] * op.matrix[2][2] - op.matrix[1][2] * op.matrix[2][0]) +
          op.matrix[0][2] * (op.matrix[1][0] * op.matrix[2][1] - op.matrix[1][1] * op.matrix[2][0]),
      );
      if (d < 0 !== improper || op.timeReversal !== (m[3] !== '')) continue;
      const r = op.matrix.map((row) => row.map((x) => d * x)); // the rotation part
      const trace = r[0][0] + r[1][1] + r[2][2];
      if (Math.abs(trace - (1 + 2 * Math.cos((2 * Math.PI) / order))) > 1e-9) continue;
      // The axis spans the symmetric part of r minus its trace part: r + rᵀ − (trace − 1)·1 = 2(1 − cos)·n nᵀ.
      const p = r.map((row, i) => row.map((x, j) => x + r[j][i] - (i === j ? trace - 1 : 0)));
      axes.push(p.reduce((a, b) => (Math.hypot(...b) > Math.hypot(...a) ? b : a)));
    }
    if (axes.length === 0) throw new Error(`No element ${element}`);
    if (matrixRank(axes, 3) !== 1) throw new Error(`Element ${element} along several axes`);
    return axes[0];
  }

  it.each(rows.map((r) => [r[2], r[3]] as const))('%s: M_s %s', (hm, direction) => {
    const o = orientation(hm)!;
    const basis = tensorForm(o.key, 'ferromagnetic', { setting: o.setting }).basis;
    if (direction === 'Any') {
      expect(basis).toHaveLength(3);
      return;
    }
    const m = /^(∥|⊥) (\S+)$/.exec(direction);
    expect(m, direction).not.toBeNull();
    const axis = elementAxis(operations(o.key, { setting: o.setting }), m![2]);
    // Along the axis of a rotation or perpendicular to a mirror plane: the axis itself. In a mirror
    // plane or perpendicular to a rotation axis: the plane normal to the axis.
    const alongAxis = (m![1] === '∥') !== m![2].startsWith('m');
    if (alongAxis) {
      expect(basis).toHaveLength(1);
      expect(matrixRank([basis[0], axis], 3)).toBe(1);
    } else {
      expect(basis).toHaveLength(2);
      for (const b of basis) expect(Math.abs(b.reduce((s, x, i) => s + x * axis[i], 0))).toBeLessThan(1e-9);
    }
  });

  it('the description in TENSOR_PROPERTIES names the tensors these tables are compared with', () => {
    expect(TENSOR_PROPERTIES.ferromagnetic.spec).toEqual({
      rank: 1,
      parity: 'axial',
      timeParity: 'c',
      intrinsic: 'none',
    });
    expect(TENSOR_PROPERTIES.piezomagnetic.spec).toEqual({
      rank: 3,
      parity: 'axial',
      timeParity: 'c',
      intrinsic: 'jk',
    });
    expect(TENSOR_PROPERTIES.magnetoelectric.spec).toEqual({
      rank: 2,
      parity: 'axial',
      timeParity: 'c',
      intrinsic: 'none',
    });
  });
});
