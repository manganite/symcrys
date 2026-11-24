/**
 * Tensor forms of the magnetic point groups against Birss's Table 7 (fixture class (a)), an
 * independent second print check of the ITC output, re-parsed from references/birss/table-7.md: for
 * each of the 58 groups with operations combined with time reversal, and each rank 0 to 4, the i- and
 * c-tensors, polar and axial, of the ITC default setting, carried into Birss's frame
 * (testUtils/birssFrame.ts), must be exactly the solution space of the relations Tables 4b–4f print
 * for the symbol class Table 7 names. A symbol class without parentheses holds in Birss's frame; one
 * in parentheses holds in a frame rotated against it (Birss p. 110) and not in Birss's frame.
 *
 * Table 7 also names two classical groups, A and B, from which Birss reads the c-tensors. Both are
 * built here from the operations of the group, A by Birss's eq. (3.24) (p. 109), B by a rule derived
 * for this test (references/birss/table-7.md), and compared with Birss's printed symbol, read along
 * his directions, and with the parentheses. For the 32 groups with time reversal itself, Birss gives
 * no table: their c-tensors vanish and their i-tensors are those of the class (p. 102).
 */

import { describe, expect, it } from 'vitest';
import {
  MAGNETIC_POINT_GROUP_KEYS,
  POINT_GROUP_KEYS,
  findPointGroup,
  operations,
  pointGroup,
  settings,
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
import { BIRSS_DIRECTIONS, rotateComponents, tensorToBirssFrame, toBirssFrame } from '../testUtils/birssFrame.js';
import { groupOfSymbol } from '../testUtils/hermannMauguin.js';
import { sameGroup, type M } from '../testUtils/independentGroups.js';
import { matrixRank, satisfies } from '../testUtils/rank.js';
import { expectHeader, readReference, tableRows } from '../testUtils/references.js';
import { tensorForm, tensorFormOf, type TensorKind, type TensorRank, type TimeParity } from './tensorForm.js';

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

/** Birss prints the cubic groups without the overbar (docs/conventions.md, "Birss as a second print check"). */
const CUBIC: Record<string, string> = {
  m3: 'm-3',
  "m'3": "m'-3'",
  m3m: 'm-3m',
  "m3m'": "m-3m'",
  "m'3m'": "m'-3'm'",
  "m'3m": "m'-3'm",
};

/**
 * From Birss's printed symbol (column 2, without parentheses) to the symcrys key: the cubic groups
 * with the overbar; for D2h(C2h) and D6h(D3h) Birss's symbol differs from ITC's, which is the key
 * (docs/conventions.md, "Keys"). The A/B test below identifies each row independently.
 */
const KEY_OF_PRINTED: Record<string, string> = { ...CUBIC, "m'm'm": "mm'm'", "6'/mm'm": "6'/mmm'" };

const GROUPS = MAGNETIC_POINT_GROUP_KEYS.filter((k) => pointGroup(k).type !== 'II');

interface Row {
  /** Column 2 as printed, with its parentheses if it has them. */
  printed: string;
  key: MagneticPointGroupKey;
  cells: string[];
}

const ROWS: Row[] = rows.slice(1).map((r) => {
  const name = r[1].replace(/^\((.*)\)$/, '$1');
  const key = KEY_OF_PRINTED[name] ?? name;
  if (!(GROUPS as readonly string[]).includes(key)) throw new Error(`Table 7: no group for ${r[1]}`);
  return {
    printed: r[1],
    key: key as MagneticPointGroupKey,
    cells: r.map((cell, column) => ERRATA[`${r[1]} | ${column}`] ?? cell),
  };
});

const RANKS: TensorRank[] = [0, 1, 2, 3, 4];
/** Columns 5–8 (Birss's i, time-even) and 9–12 (c, time-odd) of the print, as indices of the cells. */
const COLUMNS: { column: number; timeParity: TimeParity; parity: TensorKind; even: boolean }[] = (
  ['even', 'odd'] as const
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

const IDENTITY: M = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];

/**
 * The rotated frames Birss's parentheses can mean (p. 110: axes rotated against those of the class
 * in Table 4a), relative to Birss's frame, rows the new axes: orthorhombic, the two cyclic
 * permutations of the axes; tetragonal, 45° about z; trigonal and hexagonal, 30° about z.
 */
function rotatedFrames(system: string): M[] {
  if (system === 'orthorhombic') {
    return [
      [
        [0, 1, 0],
        [0, 0, 1],
        [1, 0, 0],
      ],
      [
        [0, 0, 1],
        [1, 0, 0],
        [0, 1, 0],
      ],
    ];
  }
  const turn = (degrees: number): M => {
    const [c, s] = [Math.cos((degrees * Math.PI) / 180), Math.sin((degrees * Math.PI) / 180)];
    return [
      [c, s, 0],
      [-s, c, 0],
      [0, 0, 1],
    ];
  };
  if (system === 'tetragonal') return [turn(45)];
  if (system === 'trigonal' || system === 'hexagonal') return [turn(30)];
  return [];
}

/**
 * True if, in the frame `frame` relative to Birss's (rows the new axes), the tensors of all ranks of
 * the column have the printed form. The forms are those of the ITC default setting, carried into
 * Birss's frame (testUtils/birssFrame.ts) and then into `frame`.
 */
function holds(key: MagneticPointGroupKey, frame: M, c: (typeof COLUMNS)[number], letter: string | null) {
  return RANKS.filter((rank) => (rank % 2 === 0) === c.even).every((rank) => {
    const spec = { rank, kind: c.parity, timeParity: c.timeParity, intrinsic: 'none' } as const;
    const basis = tensorForm(key, spec).basis.map((b) =>
      rotateComponents(tensorToBirssFrame(key, b, rank), rank, frame),
    );
    if (letter === null) return basis.length === 0;
    const dim = 3 ** rank;
    const relations = relationRows(printedRelations(rank, letter), dim);
    return satisfies(basis, relations) && basis.length === dim - matrixRank(relations, dim);
  });
}

/** The group a symbol names, read along Birss's directions of a crystal system, as operations. */
const birssGroup = (symbol: string, system: string) =>
  groupOfSymbol(symbol, BIRSS_DIRECTIONS[system]).map((op) => ({ cartesian: op.m, timeReversal: op.t }));

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

describe("Birss Table 7: tensor forms of the magnetic point groups, ITC forms in Birss's frame", () => {
  for (const row of ROWS.filter((r) => pointGroup(r.key).type === 'III')) {
    it(`${row.printed}: i- and c-tensors of ranks 0–4, polar and axial`, () => {
      const others = rotatedFrames(pointGroup(row.key).crystalSystem);
      for (const c of COLUMNS) {
        const cell = row.cells[c.column];
        const m = /^(\()?([A-U])_[mn]\)?$/.exec(cell);
        if (cell !== '-' && !m) throw new Error(`Table 7: unreadable cell ${cell}`);
        const what = `${row.printed} ${c.timeParity} ${c.parity} ${c.even ? 'even' : 'odd'} [${cell}]`;
        if (m?.[1]) {
          expect(holds(row.key, IDENTITY, c, m[2]), `${what}: in parentheses, so not in Birss's frame`).toBe(false);
          expect(
            others.some((frame) => holds(row.key, frame, c, m[2])),
            `${what}: in a rotated frame`,
          ).toBe(true);
        } else {
          expect(holds(row.key, IDENTITY, c, m?.[2] ?? null), `${what}: in Birss's frame`).toBe(true);
        }
      }
    });
  }

  it('associated classical groups A and B are those built from the operations', () => {
    const scaled = (m: M, factor: number): M => m.map((r) => r.map((x) => factor * x + 0));
    const det3 = (m: M) =>
      m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
      m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
      m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
    const conjugate = (q: M, m: M): M => {
      const qm = q.map((r) => [0, 1, 2].map((j) => r[0] * m[0][j] + r[1] * m[1][j] + r[2] * m[2][j]));
      return qm.map((r) => [0, 1, 2].map((j) => r[0] * q[j][0] + r[1] * q[j][1] + r[2] * q[j][2]));
    };
    for (const row of ROWS.filter((r) => pointGroup(r.key).type === 'III')) {
      // The operations of the ITC default setting in Birss's frame.
      const ops = operations(row.key).map((op) => ({ m: toBirssFrame(row.key, op.cartesian), t: op.timeReversal }));
      const built = {
        // A, eq. (3.24): operations without time reversal, and those with time reversal times the inversion.
        A: ops.map((op) => ({ cartesian: scaled(op.m, op.t ? -1 : 1), timeReversal: false })),
        // B: the rotation part of the former, and the rotation part times the inversion of the latter.
        B: ops.map((op) => ({ cartesian: scaled(op.m, (op.t ? -1 : 1) * det3(op.m)), timeReversal: false })),
      };
      (['A', 'B'] as const).forEach((name, i) => {
        const cell = row.cells[2 + i];
        const m = /^(\()?([^()]+)\)?$/.exec(cell)!;
        const printedSymbol = CUBIC[m[2]] ?? m[2];
        const crystalClass = findPointGroup(printedSymbol)?.key;
        expect(crystalClass, `${row.printed} ${name} [${cell}]: a crystal class`).toBeDefined();
        const system = pointGroup(crystalClass!).crystalSystem;
        // The class in the orientation of Table 4a: Birss prints it under its key (Table 3).
        const standard = birssGroup(crystalClass!, system);
        // Without duplicates: an operation with time reversal and its product with the inversion can coincide.
        const group = built[name].filter(
          (op, k, list) =>
            list.findIndex((o) =>
              o.cartesian.every((r, x) => r.every((v, y) => Math.abs(v - op.cartesian[x][y]) < 1e-9)),
            ) === k,
        );
        const toRef = (list: { cartesian: M; timeReversal: boolean }[]) =>
          list.map((o) => ({ m: o.cartesian, t: o.timeReversal }));
        if (m[1] === undefined) {
          // Printed without parentheses: the class in Birss's frame, as its symbol names it, in the
          // orientation of Table 4a.
          expect(sameGroup(toRef(birssGroup(m[2], system)), group), `${row.printed} ${name} [${cell}]`).toBe(true);
          expect(sameGroup(toRef(standard), group), `${row.printed} ${name} [${cell}]: Table 4a`).toBe(true);
        } else if (CLASS_SYMBOL_IN_PARENTHESES.includes(`${row.printed} | ${name}`)) {
          // The symbol of the class: the group is the class in a rotated frame.
          expect(sameGroup(toRef(birssGroup(m[2], system)), group), `${row.printed} ${name}: rotated`).toBe(false);
          expect(
            rotatedFrames(system).some((q) =>
              sameGroup(
                toRef(birssGroup(m[2], system)).map((o) => ({ ...o, m: conjugate(q, o.m) })),
                group,
              ),
            ),
            `${row.printed} ${name} [${cell}]`,
          ).toBe(true);
        } else {
          // In parentheses: the symbol of the rotated setting, which names the group in Birss's
          // frame, and not the orientation of the class in Table 4a.
          expect(sameGroup(toRef(birssGroup(m[2], system)), group), `${row.printed} ${name} [${cell}]`).toBe(true);
          expect(sameGroup(toRef(standard), group), `${row.printed} ${name} [${cell}]: rotated`).toBe(false);
        }
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
      { rank: 2, kind: 'axial', timeParity: 'even', intrinsic: 'symmetric-first-pair' },
      { rank: 3, kind: 'polar', timeParity: 'even', intrinsic: 'symmetric-last-pair' },
      { rank: 4, kind: 'polar', timeParity: 'even', intrinsic: 'symmetric-pairs-exchangeable' },
    ] as const;
    for (const { key } of magnetic) {
      for (const s of settings(key)) {
        const ops = operations(key, { setting: s.index });
        const classical = ops.map((op) => ({ cartesian: op.cartesian, timeReversal: false }));
        for (const spec of specs) {
          expect(tensorForm(key, spec, { setting: s.index }), `${key} setting ${s.index}`).toEqual(
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
          const spec = { rank, kind: parity, intrinsic: 'none' } as const;
          expect(tensorForm(key, { ...spec, timeParity: 'odd' }).basis, `${key} rank ${rank} ${parity}`).toEqual([]);
          expect(tensorForm(key, { ...spec, timeParity: 'even' })).toEqual(
            tensorForm(crystalClass, { ...spec, timeParity: 'even' }),
          );
        }
      }
    }
  });
});
