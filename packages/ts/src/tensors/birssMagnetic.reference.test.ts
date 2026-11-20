/**
 * Tensor forms of the magnetic point groups in the Birss convention against Birss's Table 7
 * (fixture class (a)), re-parsed from references/birss/table-7.md: for each of the 58 groups with
 * operations combined with time reversal, and each rank 0 to 4, the i- and c-tensors, polar and
 * axial, must be exactly the solution space of the relations Tables 4b–4f print for the symbol
 * class Table 7 names. A symbol class without parentheses holds in Birss's frame (setting 1); one
 * in parentheses holds in a rotated setting and not in setting 1.
 *
 * Table 7 also names two classical groups, A and B, from which Birss reads the c-tensors. Both are
 * built here from the operations of the group, A by Birss's eq. (3.24) (p. 109), B by a rule
 * derived for this test (references/birss/table-7.md), and compared with the print, symbol and
 * parentheses, which identifies each row independently of its symbol in column 2. For the 32 groups with time reversal itself, Birss gives no
 * table: their c-tensors vanish and their i-tensors are those of the class (p. 102).
 */

import { describe, expect, it } from 'vitest';
import { det, type Mat3 } from '../linalg.js';
import type { Operation } from '../operations.js';
import {
  MAGNETIC_POINT_GROUP_KEYS,
  POINT_GROUP_KEYS,
  operations,
  pointGroup,
  settings,
  symbol,
  type MagneticPointGroupKey,
  type PointGroupKey,
} from '../pointGroups/pointGroups.js';
import {
  CLASS_ROWS,
  relationRows,
  relations4e,
  relations4f,
  relationsLowRank,
  type Relation,
} from '../testUtils/birssTensorTables.js';
import { matrixRank, satisfies } from '../testUtils/rank.js';
import { expectHeader, readReference, tableRows } from '../testUtils/references.js';
import { tensorForm, tensorFormOf, type TensorParity, type TensorRank, type TimeParity } from './tensorForm.js';

const rows = tableRows(readReference('birss/table-7.md'));
expectHeader(rows, [
  'System',
  'Magnetic point group (International)',
  'Associated classical group A (International)',
  'Associated classical group B (International)',
  'i-tensor: Polar even rank m',
  'i-tensor: Axial even rank m',
  'i-tensor: Polar odd rank n',
  'i-tensor: Axial odd rank n',
  'c-tensor: Polar even rank m',
  'c-tensor: Axial even rank m',
  'c-tensor: Polar odd rank n',
  'c-tensor: Axial odd rank n',
]);

/** Errata of the book (references/birss/table-7.md, "Errata of the book"): `group | column` → correct cell. */
const ERRATA: Record<string, string> = {
  "(-6'2m') | 5": '(R_m)',
  "(-6'2m') | 6": '(R_n)',
  "-6m'2' | 2": '(-62m)',
  "-6m'2' | 9": '(R_m)',
  "-6m'2' | 10": '(R_n)',
};

/**
 * Rows whose associated group in parentheses carries the symbol of the class, not that of the
 * rotated setting: `row | column`. The print has `(-42m)` here and `(-4m2)` in the row `4'mm'`.
 */
const CLASS_SYMBOL_IN_PARENTHESES = ["-42'm' | A"];

/** Birss prints the cubic groups without the overbar (docs/conventions.md, "Where ITC and Birss differ"). */
const CUBIC: Record<string, string> = {
  m3: 'm-3',
  "m'3": "m'-3'",
  m3m: 'm-3m',
  "m3m'": "m-3m'",
  "m'3m'": "m'-3'm'",
  "m'3m": "m'-3'm",
};

const BIRSS = { convention: 'birss' } as const;
const GROUPS = MAGNETIC_POINT_GROUP_KEYS.filter((k) => pointGroup(k).type !== 'II');
const BY_BIRSS_SYMBOL = new Map(GROUPS.map((k) => [symbol(k, BIRSS), k]));

interface Row {
  /** Column 2 as printed, with its parentheses if it has them. */
  printed: string;
  key: MagneticPointGroupKey;
  cells: string[];
}

const ROWS: Row[] = rows.slice(1).map((r) => {
  const name = r[1].replace(/^\((.*)\)$/, '$1');
  const key = BY_BIRSS_SYMBOL.get(CUBIC[name] ?? name);
  if (!key) throw new Error(`Table 7: no group for ${r[1]}`);
  return { printed: r[1], key, cells: r.map((cell, column) => ERRATA[`${r[1]} | ${column}`] ?? cell) };
});

const RANKS: TensorRank[] = [0, 1, 2, 3, 4];
/** Columns 5–8 (i) and 9–12 (c) of the print, as indices of the cells. */
const COLUMNS: { column: number; timeParity: TimeParity; parity: TensorParity; even: boolean }[] = (
  ['i', 'c'] as const
).flatMap((timeParity, t) =>
  (
    [
      ['polar', true],
      ['axial', true],
      ['polar', false],
      ['axial', false],
    ] as const
  ).map(([parity, even], c) => ({ column: 4 + 4 * t + c, timeParity, parity, even })),
);

function printedRelations(rank: TensorRank, letter: string): Relation[] {
  if (rank === 3) return relations4e(letter);
  if (rank === 4) return relations4f(letter);
  return relationsLowRank(rank, letter);
}

/** True if, in the given setting, the tensors of all ranks of the column have the printed form. */
function holds(key: MagneticPointGroupKey, setting: number, c: (typeof COLUMNS)[number], letter: string | null) {
  return RANKS.filter((rank) => (rank % 2 === 0) === c.even).every((rank) => {
    const spec = { rank, parity: c.parity, timeParity: c.timeParity, intrinsic: 'none' } as const;
    const basis = tensorForm(key, spec, { ...BIRSS, setting }).basis;
    if (letter === null) return basis.length === 0;
    const dim = 3 ** rank;
    const relations = relationRows(printedRelations(rank, letter), dim);
    return satisfies(basis, relations) && basis.length === dim - matrixRank(relations, dim);
  });
}

const signature = (ops: readonly { matrix: readonly (readonly number[])[] }[]): string =>
  [
    ...new Set(
      ops.map((op) =>
        op.matrix
          .flat()
          .map((x) => (Math.round(x * 1e6) / 1e6 + 0).toFixed(6))
          .join(','),
      ),
    ),
  ]
    .sort()
    .join(';');

/** Signature of the operations → class and setting, for the 32 classes in the Birss convention. */
const CLASS_BY_OPERATIONS = new Map(
  POINT_GROUP_KEYS.flatMap((k) =>
    settings(k, 'birss').map(
      (s) => [signature(operations(k, { ...BIRSS, setting: s.index })), { key: k, setting: s.index }] as const,
    ),
  ),
);

describe('Birss Table 7: the transcription as read', () => {
  it('lists the 32 classes and the 58 groups with operations combined with time reversal, each once', () => {
    expect(ROWS).toHaveLength(90);
    expect(ROWS.map((r) => r.key).sort()).toEqual([...GROUPS].sort());
  });

  it('gives the classes the symbol classes of Table 4a, for i- and c-tensors, and no associated groups', () => {
    for (const row of ROWS.filter((r) => pointGroup(r.key).type === 'I')) {
      const a = CLASS_ROWS.find((r) => r.key === row.key)!;
      const letters = [a.polarEven, a.axialEven, a.polarOdd, a.axialOdd];
      expect(row.cells.slice(2, 4), row.printed).toEqual(['-', '-']);
      for (const c of COLUMNS) {
        expect(row.cells[c.column].match(/^([A-U])_[mn]$/)?.[1] ?? null, `${row.printed} column ${c.column + 1}`).toBe(
          letters[(c.column - 4) % 4],
        );
      }
    }
  });
});

describe('Birss Table 7: tensor forms of the magnetic point groups in the Birss frame', () => {
  for (const row of ROWS.filter((r) => pointGroup(r.key).type === 'III')) {
    it(`${row.printed}: i- and c-tensors of ranks 0–4, polar and axial`, () => {
      const others = settings(row.key, 'birss')
        .map((s) => s.index)
        .filter((i) => i !== 1);
      for (const c of COLUMNS) {
        const cell = row.cells[c.column];
        const m = /^(\()?([A-U])_[mn]\)?$/.exec(cell);
        if (cell !== '-' && !m) throw new Error(`Table 7: unreadable cell ${cell}`);
        const what = `${row.printed} ${c.timeParity} ${c.parity} ${c.even ? 'even' : 'odd'} [${cell}]`;
        if (m?.[1]) {
          expect(holds(row.key, 1, c, m[2]), `${what}: in parentheses, so not in setting 1`).toBe(false);
          expect(
            others.some((s) => holds(row.key, s, c, m[2])),
            `${what}: in a rotated setting`,
          ).toBe(true);
        } else {
          expect(holds(row.key, 1, c, m?.[2] ?? null), `${what}: in setting 1`).toBe(true);
        }
      }
    });
  }

  it('associated classical groups A and B are those built from the operations', () => {
    const scaled = (op: Operation, factor: number) => ({ matrix: op.matrix.map((r) => r.map((x) => factor * x)) });
    for (const row of ROWS.filter((r) => pointGroup(r.key).type === 'III')) {
      const ops = operations(row.key, { ...BIRSS, setting: 1 });
      const built = {
        // A, eq. (3.24): operations without time reversal, and those with time reversal times the inversion.
        A: ops.map((op) => scaled(op, op.timeReversal ? -1 : 1)),
        // B: the rotation part of the former, and the rotation part times the inversion of the latter.
        B: ops.map((op) => scaled(op, (op.timeReversal ? -1 : 1) * det(op.matrix as Mat3))),
      };
      (['A', 'B'] as const).forEach((name, i) => {
        const cell = row.cells[2 + i];
        const found = CLASS_BY_OPERATIONS.get(signature(built[name]));
        expect(found, `${row.printed} ${name}: a crystal class in one of its settings`).toBeDefined();
        const m = /^(\()?([^()]+)\)?$/.exec(cell)!;
        const rotated = m[1] !== undefined;
        // Printed without parentheses: the class in Birss's frame. With parentheses: in a rotated
        // setting, under the symbol of that setting, `(-4m2)`; in one row Birss prints the symbol
        // of the class instead.
        expect(found!.setting === 1, `${row.printed} ${name} [${cell}]: setting`).toBe(!rotated);
        const setting = CLASS_SYMBOL_IN_PARENTHESES.includes(`${row.printed} | ${name}`) ? 1 : found!.setting;
        expect(symbol(found!.key, { ...BIRSS, setting }), `${row.printed} ${name}`).toBe(CUBIC[m[2]] ?? m[2]);
      });
    }
  });
});

describe('Birss Table 7: parentheses of column 2, and time-even forms', () => {
  const magnetic = ROWS.filter((r) => pointGroup(r.key).type === 'III');

  it('three groups are printed in parentheses: those with a time-even symbol class in parentheses', () => {
    // Birss p. 110: these groups are referred to axes rotated against those of their class in Table
    // 4a, so the i-tensors of the class hold in the rotated setting (after the erratum for (-6'2m')).
    const inParentheses = magnetic.filter((r) => r.printed.startsWith('('));
    expect(inParentheses.map((r) => r.printed)).toEqual(["(2'm'm)", "(-4'm2')", "(-6'2m')"]);
    expect(magnetic.filter((r) => r.cells.slice(4, 8).some((c) => c.startsWith('('))).map((r) => r.printed)).toEqual(
      inParentheses.map((r) => r.printed),
    );
  });

  it('a time-even form is the form under the operations with time reversal dropped, index symmetries included', () => {
    const specs = [
      { rank: 2, parity: 'axial', timeParity: 'i', intrinsic: 'ij' },
      { rank: 3, parity: 'polar', timeParity: 'i', intrinsic: 'jk' },
      { rank: 4, parity: 'polar', timeParity: 'i', intrinsic: 'voigt' },
    ] as const;
    for (const { key } of magnetic) {
      for (const s of settings(key, 'birss')) {
        const ops = operations(key, { ...BIRSS, setting: s.index });
        const classical = ops.map((op) => ({ matrix: op.matrix, timeReversal: false }));
        for (const spec of specs) {
          expect(tensorForm(key, spec, { ...BIRSS, setting: s.index }), `${key} setting ${s.index}`).toEqual(
            tensorFormOf(classical, spec),
          );
        }
      }
    }
  });
});

describe('Groups with time reversal itself (Birss p. 102)', () => {
  it('every c-tensor vanishes and every i-tensor is that of the class', () => {
    for (const key of MAGNETIC_POINT_GROUP_KEYS.filter((k) => pointGroup(k).type === 'II')) {
      // The key of such a group is the key of its class followed by 1' (docs/conventions.md, "Keys").
      const crystalClass = key.slice(0, -2) as PointGroupKey;
      expect(POINT_GROUP_KEYS, key).toContain(crystalClass);
      for (const rank of RANKS) {
        for (const parity of ['polar', 'axial'] as const) {
          const spec = { rank, parity, intrinsic: 'none' } as const;
          expect(tensorForm(key, { ...spec, timeParity: 'c' }, BIRSS).basis, `${key} rank ${rank} ${parity}`).toEqual(
            [],
          );
          expect(tensorForm(key, { ...spec, timeParity: 'i' }, BIRSS)).toEqual(
            tensorForm(crystalClass, { ...spec, timeParity: 'i' }, BIRSS),
          );
        }
      }
    }
  });
});
