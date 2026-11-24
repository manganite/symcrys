/**
 * The magnetic tensor properties in the ITC convention against ITC Vol. D, Chapter 1.5 (fixture
 * class (a)), re-parsed from references/itc/: Table 1.5.2.4 (ferromagnetism: 31 groups and the
 * direction of M_s), Table 1.5.7.1 (piezomagnetism: 66 groups, the form of Λ_iα) and Table 1.5.8.1
 * (linear magnetoelectric effect: 58 groups, the form of α_ij, and the 11 groups the text names).
 *
 * A printed form belongs to the orientation its Hermann–Mauguin symbol names (§ 1.5.7.1, p. 134),
 * so each printed symbol, the alternatives in square brackets included, is looked up among the ITC
 * symbols of the settings, and the form is compared in that setting: the printed matrix and the
 * form must span the same space. Every printed orientation is a setting, also the two of C2v(Cs)
 * that exchange two axes against Birss's (docs/conventions.md, "Settings of the magnetic groups").
 */

import { describe, expect, it } from 'vitest';
import {
  MAGNETIC_POINT_GROUP_KEYS,
  findMagneticPointGroup,
  operations,
  pointGroup,
  settings,
  symbol,
  type MagneticPointGroupKey,
} from '../pointGroups/pointGroups.js';
import { matrixRank } from '../testUtils/rank.js';
import { readReference, section, tableRows } from '../testUtils/references.js';
import { TENSOR_PROPERTIES, type TensorPropertyName } from './propertyTable.js';
import { tensorForm } from './tensorForm.js';
import { allowsProperty } from './tensorProperties.js';

// --- printed symbols → group and setting ------------------------------------------------------------

interface Orientation {
  key: MagneticPointGroupKey;
  setting: number;
}

/** Groups without time reversal as an element of its own: the 90 groups of ITC Vol. D Chapter 1.5. */
const GROUPS = MAGNETIC_POINT_GROUP_KEYS.filter((k) => pointGroup(k).type !== 'II');
const compact = (s: string) => s.replace(/\s+/g, '');
/** The magnetic API writes Schoenflies symbols as ITC Vol. D does (`S6`, #137 B3). */
const schoenflies = (key: MagneticPointGroupKey) => symbol(key, { form: 'schoenflies' });

/**
 * The short symbol with all three positions, read from the full symbol by ITA's rule (the first
 * position as it stands, every other one by its element after the `/`): `-3 2'/m' 1` → `-3m'1`. The
 * tables print it beside the key (`-3m' (= -3m'1)`), and since #137 B2 the default setting of a
 * magnetic group has the key as its short symbol.
 */
const threePositions = (full: string) =>
  full
    .split(' ')
    .map((t, i) => (i > 0 && t.includes('/') ? t.split('/')[1] : t))
    .join('');

const BY_SYMBOL = new Map<string, Orientation[]>();
const DEFAULT = new Map<string, Orientation>();
for (const key of GROUPS) {
  // A setting with rhombohedral axes has the Cartesian operations, so the tensor forms, of setting 1;
  // its symbol (`32`) is the key, which the tables of Chapter 1.5 use for the default setting.
  for (const s of settings(key).filter((x) => x.axes !== 'rhombohedral')) {
    const trigonal = pointGroup(key).crystalSystem === 'trigonal';
    const names = [s.symbol, compact(s.fullSymbol), ...(trigonal ? [threePositions(s.fullSymbol)] : [])];
    for (const name of new Set(names)) {
      BY_SYMBOL.set(name, [...(BY_SYMBOL.get(name) ?? []), { key, setting: s.index }]);
    }
    if (s.isDefault) DEFAULT.set(key, { key, setting: s.index });
  }
}

/**
 * The orientation a printed symbol names: the setting with this symbol. The monoclinic short
 * symbols (`2`, `m'`) belong to both settings of their group and stand for the default one, unique
 * axis y, as the tables say. A trigonal symbol without its third entry (`32`, `-3'm`) is no symbol
 * of a setting: it is the key of the group and stands for its default setting, which is the
 * orientation ITC means by it (Table 1.5.7.1: 32 = 321; text of § 1.5.8.1, tested below).
 */
function orientation(printed: string): Orientation | null {
  const found = BY_SYMBOL.get(compact(printed)) ?? [];
  const keys = new Set(found.map((o) => o.key));
  if (keys.size > 1) throw new Error(`${printed}: a symbol of several groups (${[...keys].join(', ')})`);
  if (found.length === 1) return found[0];
  if (found.length > 1) {
    if (pointGroup(found[0].key).crystalSystem !== 'monoclinic') throw new Error(`${printed}: several settings`);
    return DEFAULT.get(found[0].key)!;
  }
  const byKey = DEFAULT.get(printed);
  if (byKey && pointGroup(byKey.key).crystalSystem !== 'trigonal') throw new Error(`${printed}: no setting`);
  return byKey ?? null;
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

/** The form in the orientation a printed symbol names. */
function formFor(printed: string, name: TensorPropertyName): readonly (readonly number[])[] {
  const o = orientation(printed);
  if (!o) throw new Error(`${printed}: no setting has this symbol`);
  return tensorForm(o.key, name, { setting: o.setting }).basis;
}

function describeFormTable(
  file: string,
  name: TensorPropertyName,
  count: number,
  dim: number,
  place: (row: number, column: number, value: number, v: number[]) => void,
): void {
  const content = readReference(file);
  const groups = printedGroups(content);
  const matrices = printedMatrices(content);

  it(`lists ${count} groups, exactly those that allow the property`, () => {
    const keys = groups.map((g) => orientation(g.symbols[0])!.key);
    expect(keys).toHaveLength(count);
    expect([...keys].sort()).toEqual(GROUPS.filter((k) => allowsProperty(k, name)).sort());
  });

  it('prints each group under the Schoenflies symbol of the group', () => {
    for (const g of groups) {
      for (const s of g.symbols) {
        const o = orientation(s);
        expect(schoenflies(o!.key), s).toBe(g.schoenflies);
      }
    }
  });

  it('names only orientations that are settings; findMagneticPointGroup finds the same', () => {
    for (const s of groups.flatMap((g) => g.symbols)) {
      expect(orientation(s), s).not.toBeNull();
      expect(findMagneticPointGroup(s) ?? null, s).toEqual(orientation(s));
    }
  });

  for (const g of groups) {
    it(`block ${g.block}, ${g.schoenflies}: ${g.symbols.join(', ')}`, () => {
      const printed = printedSpace(matrices.get(g.block)!, dim, place);
      for (const s of g.symbols) {
        expect(sameSpace(formFor(s, name), printed, dim), `${s}: form in the printed orientation`).toBe(true);
      }
    });
  }
}

describe('ITC Vol. D Table 1.5.7.1: piezomagnetic effect', () => {
  describeFormTable('itc/vol-d-table-1.5.7.1.md', 'piezomagnetic', 66, 27, placeVoigt);
});

describe('ITC Vol. D Table 1.5.8.1: linear magnetoelectric effect', () => {
  describeFormTable('itc/vol-d-table-1.5.8.1.md', 'magnetoelectric', 58, 9, placeRank2);

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
        (op) => !op.timeReversal && op.cartesian.every((r, i) => r.every((x, j) => x === (i === j ? -1 : 0))),
      );
    expect(GROUPS.filter(centre)).toHaveLength(21);
    expect(GROUPS.filter((k) => centre(k) && allowsProperty(k, 'magnetoelectric'))).toEqual([]);
    expect([...named].sort()).toEqual(GROUPS.filter((k) => !centre(k) && !allowsProperty(k, 'magnetoelectric')).sort());
  });
});

describe('ITC Vol. D § 1.5.8.1: the trigonal orientations the text names', () => {
  const content = readReference('itc/vol-d-table-1.5.8.1.md');
  const rows = tableRows(section(content, '## Trigonal orientations with the same form')).slice(1);
  const blocks = new Map(printedGroups(content).map((g) => [g.symbols[0], g.block]));
  const matrices = printedMatrices(content);

  it.each(rows.map((r) => [r[0], r[1], r[2]] as const))(
    '%s is %s, and %s has the same form',
    (short, first, second) => {
      const meant = orientation(short)!;
      // The symbol with three entries is a symbol of a setting, found without the fallback by key.
      expect(BY_SYMBOL.get(first)).toEqual([meant]);
      const other = BY_SYMBOL.get(second)!;
      expect(other).toHaveLength(1);
      expect(other[0].key).toBe(meant.key);
      expect(other[0].setting).not.toBe(meant.setting);
      const printed = printedSpace(matrices.get(blocks.get(short)!)!, 9, placeRank2);
      for (const o of [meant, other[0]]) {
        expect(sameSpace(tensorForm(o.key, 'magnetoelectric', { setting: o.setting }).basis, printed, 9)).toBe(true);
      }
    },
  );

  it('are the six trigonal groups of the table with two settings', () => {
    expect(rows).toHaveLength(6);
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
        op.cartesian[0][0] * (op.cartesian[1][1] * op.cartesian[2][2] - op.cartesian[1][2] * op.cartesian[2][1]) -
          op.cartesian[0][1] * (op.cartesian[1][0] * op.cartesian[2][2] - op.cartesian[1][2] * op.cartesian[2][0]) +
          op.cartesian[0][2] * (op.cartesian[1][0] * op.cartesian[2][1] - op.cartesian[1][1] * op.cartesian[2][0]),
      );
      if (d < 0 !== improper || op.timeReversal !== (m[3] !== '')) continue;
      const r = op.cartesian.map((row) => row.map((x) => d * x)); // the rotation part
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
});

describe('the tensors these tables are compared with', () => {
  it('are those of TENSOR_PROPERTIES: axial, time-odd, of rank 1, 3 (symmetric in j, k) and 2', () => {
    expect(TENSOR_PROPERTIES.ferromagnetic.spec).toEqual({
      rank: 1,
      kind: 'axial',
      timeParity: 'odd',
      intrinsic: 'none',
    });
    expect(TENSOR_PROPERTIES.piezomagnetic.spec).toEqual({
      rank: 3,
      kind: 'axial',
      timeParity: 'odd',
      intrinsic: 'symmetric-last-pair',
    });
    expect(TENSOR_PROPERTIES.magnetoelectric.spec).toEqual({
      rank: 2,
      kind: 'axial',
      timeParity: 'odd',
      intrinsic: 'none',
    });
  });
});
