/**
 * The magnetic point groups against their print sources.
 *
 * - Fixture class (a): ITC Vol. D (2013) Table 1.5.2.3 (printed pp. 111–112),
 *   re-parsed from references/. For each of its 90 groups (the 32 crystal classes and the 58
 *   black-and-white groups): the key is the printed short symbol; crystal system, Schoenflies symbol
 *   and full symbol as printed; and the operations of the ITC default setting are the printed
 *   symmetry operators, compared as far as the print names them (kind, time reversal, and the axis
 *   where it is printed: fully in the triclinic to tetragonal systems).
 * - Second print check, fixture class (a): Birss Table 6 (printed pp. 91–98) with the generating
 *   matrices σ(N) of eq. (2.17) (printed pp. 48–49). For each of its 90 groups: the printed
 *   generators, those of the last column combined with time reversal, closed with the independent
 *   algebra of testUtils and carried into the ITC frame (testUtils/birssFrame.ts), give exactly the
 *   operations of the ITC default setting; the matrices of the classical subgroup generate half of
 *   them; the operator list names the same operations; the printed symbol, read along Birss's
 *   directions, generates the printed group; the Shubnikov symbols agree with those of the ITC table.
 * - Fixture class (b): the symbol of every setting of every grey and black-and-white group, read
 *   along the symmetry directions of ITA Table 2.1.3.1 with a prime
 *   meaning time reversal, generates the operations of that setting. This covers what the tables
 *   do not print: the grey groups, the settings other than the default, and the axes of the
 *   trigonal, hexagonal and cubic operations.
 * - Orthorhombic settings. Fixture class (b), counted by hand: every orthorhombic group has the
 *   distinct orientations of its operations under the permutations of the axes as settings. Fixture
 *   class (a): Paufler (1986) Table A 6, rows 12 to 20, re-parsed from references/, prints each
 *   orthorhombic symbol with its operations; and C2v(Cs) in the six orientations print names it in
 *   (the symbols are printed, the operations, except in Birss's and Paufler's tables, read from the
 *   symbol by hand).
 */

import { describe, expect, it } from 'vitest';
import type { Mat3 } from '../linalg.js';
import { BIRSS_DIRECTIONS, toBirssFrame, toItcFrame } from '../testUtils/birssFrame.js';
import { groupOfSymbol, hmTokens } from '../testUtils/hermannMauguin.js';
import { close, sameGroup, type M, type RefOp } from '../testUtils/independentGroups.js';
import { operationLabel, printedLabels } from '../testUtils/operatorLists.js';
import { expectHeader, readReference, section, tableRows } from '../testUtils/references.js';
import { tensorForm } from '../tensors/tensorForm.js';
import { describeOperations } from './elements.js';
import { describeOperationsOf } from './identify.js';
import {
  MAGNETIC_POINT_GROUP_KEYS,
  POINT_GROUP_KEYS,
  crystalClassOf,
  findMagneticPointGroup,
  findPointGroup,
  generators,
  isMagneticPointGroupKey,
  isPointGroupKey,
  magneticPointGroups,
  operations,
  pointGroup,
  pointGroups,
  settings,
  symbol,
  type MagneticPointGroupKey,
} from './pointGroups.js';

/** The fixed properties of a group, read from its record. */
const isCentrosymmetric = (key: MagneticPointGroupKey) => pointGroup(key).centrosymmetric;
const isChiral = (key: MagneticPointGroupKey) => pointGroup(key).chiral;
const isPolar = (key: MagneticPointGroupKey) => pointGroup(key).polar;
const laueClass = (key: MagneticPointGroupKey) => pointGroup(key).laueClass;

const sorted = (labels: readonly string[]) => [...labels].sort();

function magneticKey(s: string, what: string): MagneticPointGroupKey {
  if (!isMagneticPointGroupKey(s)) throw new Error(`${what}: ${s} is not a symcrys key`);
  return s;
}

// --- ITC Vol. D Table 1.5.2.3 --------------------------------------------------------------------

const itcRows = tableRows(readReference('itc/vol-d-table-1.5.2.3.md'));
expectHeader(itcRows, ['System', 'Schoenflies', 'Shubnikov', 'Short', 'Full', 'Symmetry operators']);

/**
 * ITC Vol. D writes S6 for the class -3 and its magnetic groups; symcrys writes C3i in both
 * conventions, as ITA and Birss do (docs/conventions.md, "Symbols").
 */
const schoenfliesOfPrint = (s: string) => s.replace(/S6/g, 'C3i');

describe('ITC Vol. D Table 1.5.2.3 (printed pp. 111–112) against symcrys, ITC convention', () => {
  const rows = itcRows.slice(1);

  it('lists 90 groups: the 32 crystal classes and the 58 black-and-white groups, each once', () => {
    expect(rows).toHaveLength(90);
    const keys = rows.map((r) => magneticKey(r[3], 'Table 1.5.2.3'));
    expect(new Set(keys).size).toBe(90);
    expect(keys.filter((k) => pointGroup(k).type === 'I')).toEqual([...POINT_GROUP_KEYS]);
    // The black-and-white keys of symcrys are in the order of the table.
    expect(keys.filter((k) => pointGroup(k).type === 'III')).toEqual(
      MAGNETIC_POINT_GROUP_KEYS.filter((k) => pointGroup(k).type === 'III'),
    );
    expect(keys.filter((k) => pointGroup(k).type === 'II')).toHaveLength(0);
  });

  it('prints a black-and-white group as G(H), a crystal class as G', () => {
    for (const r of rows) {
      expect(/\(.+\)$/.test(r[1]), r[3]).toBe(pointGroup(magneticKey(r[3], 'Table 1.5.2.3')).type === 'III');
    }
  });

  for (const r of rows) {
    const [system, schoenflies, , short, full, operators] = r;
    const key = magneticKey(short, 'Table 1.5.2.3');
    describe(short, () => {
      it('crystal system, Schoenflies symbol and full symbol as printed', () => {
        expect(pointGroup(key).crystalSystem).toBe(system.toLowerCase());
        expect(symbol(key, { form: 'schoenflies' })).toBe(schoenfliesOfPrint(schoenflies));
        expect(symbol(key, { form: 'full' })).toBe(full);
        // The Schoenflies symbol G(H) names the crystal class G.
        expect(symbol(crystalClassOf(key), { form: 'schoenflies' })).toBe(
          schoenfliesOfPrint(schoenflies).replace(/\(.+\)$/, ''),
        );
      });

      it('operations of the ITC default setting = the printed symmetry operators', () => {
        const printed = printedLabels(operators);
        const actual = describeOperations(key).map((d) => operationLabel(system.toLowerCase(), d));
        expect(sorted(actual)).toEqual(sorted(printed));
        expect(pointGroup(key).order).toBe(printed.length);
      });
    });
  }
});

// --- Birss Table 6 --------------------------------------------------------------------------------

function entry(s: string): number {
  const sign = s.startsWith('-') ? -1 : 1;
  const body = s.replace(/^-/, '');
  if (body === '√3/2') return (sign * Math.sqrt(3)) / 2;
  if (body === '1/2') return sign * 0.5;
  if (/^\d$/.test(body)) return sign * Number(body);
  throw new Error(`Unreadable matrix entry: ${s}`);
}

const sigmaRows = tableRows(readReference('birss/sigma-matrices.md'));
expectHeader(sigmaRows, ['N', 'Symbol', 'Row 1', 'Row 2', 'Row 3', 'Operation']);
const SIGMA = new Map<number, M>(
  sigmaRows.slice(1).map((r) => [Number(r[0]), [r[2], r[3], r[4]].map((row) => row.split(/\s+/).map(entry))]),
);

const table6 = readReference('birss/table-6.md');
const birssRows = tableRows(table6);
expectHeader(birssRows, [
  'System',
  'Magnetic point group (International)',
  'Magnetic point group (Shubnikov)',
  'Classical subgroup (International)',
  'Classical subgroup (Shubnikov)',
  'Symmetry operators',
  'Generating matrices of subgroup',
  'Additional generating matrix',
]);
const errataRows = tableRows(section(table6, '## Errata'));
expectHeader(errataRows, ['Group', 'Column', 'Printed', 'Correct', 'Evidence']);
/** Errata by group and column. */
const ERRATA = new Map(errataRows.slice(1).map((r) => [`${r[0]} | ${r[1]}`, r]));

/**
 * A printed cell with its erratum applied, if there is one for this group and column: the printed
 * entry (the whole cell, or one term of a list) is replaced by the correct one.
 */
function corrected(group: string, column: string, cell: string): string {
  const erratum = ERRATA.get(`${group} | ${column}`);
  if (!erratum) return cell;
  const terms = cell.split(', ');
  const at = terms.lastIndexOf(erratum[2]);
  if (at < 0) throw new Error(`Erratum for ${group}, ${column} does not match the printed row`);
  terms[at] = erratum[3];
  return terms.join(', ');
}

/**
 * From Birss's printed symbol to the symcrys key. Birss prints the cubic groups without the overbar
 * on the 3. For D2h(C2h) and D6h(D3h) the Birss short symbol differs from the ITC short symbol,
 * which is the key (docs/conventions.md, "Keys").
 */
const KEY_OF_PRINTED: Record<string, string> = {
  m3: 'm-3',
  "m'3": "m'-3'",
  m3m: 'm-3m',
  "m3m'": "m-3m'",
  "m'3m'": "m'-3'm'",
  "m'3m": "m'-3'm",
  "m'm'm": "mm'm'",
  "6'/mm'm": "6'/mmm'",
};

const sigmas = (cell: string, t: boolean): RefOp[] =>
  [...cell.matchAll(/σ'?\((\d)\)/g)].map((m) => {
    const matrix = SIGMA.get(Number(m[1]));
    if (!matrix) throw new Error(`Unknown σ(${m[1]})`);
    return { m: matrix, t };
  });

/**
 * Birss's Table 6, an independent second print check of the ITC output: the printed group, closed
 * from the printed generators in Birss's frame, is carried into the ITC frame (testUtils/birssFrame.ts)
 * and compared with the operations of the ITC default setting.
 */
describe('Birss Table 6 (printed pp. 91–98) against symcrys, in the ITC frame', () => {
  const rows = birssRows.slice(1);

  it('lists 90 groups, each once: the 32 crystal classes and the 58 black-and-white groups', () => {
    expect(rows).toHaveLength(90);
    const keys = rows.map((r) => magneticKey(KEY_OF_PRINTED[r[1]] ?? r[1], 'Table 6'));
    expect(new Set(keys).size).toBe(90);
    expect(keys.filter((k) => pointGroup(k).type === 'I')).toHaveLength(32);
    expect(keys.filter((k) => pointGroup(k).type === 'III')).toHaveLength(58);
  });

  it('applies every erratum to an existing row', () => {
    expect(ERRATA.size).toBe(errataRows.length - 1);
    for (const [, [group, column]] of ERRATA) {
      expect(rows.some((r) => r[1] === group)).toBe(true);
      expect(['Symmetry operators', 'Additional generating matrix']).toContain(column);
    }
  });

  it('the Shubnikov symbols are those of ITC Vol. D Table 1.5.2.3', () => {
    // Two independent prints: Birss underlines an element combined with time reversal, as ITC does;
    // the transcriptions write the underline as a prime (Birss) and as a leading underscore (ITC).
    const itc = new Map(itcRows.slice(1).map((r) => [r[3], r[2].replace(/_(-?[0-9m])/g, "$1'")]));
    for (const r of rows) expect(r[2], r[1]).toBe(itc.get(KEY_OF_PRINTED[r[1]] ?? r[1]));
    // The classical subgroup is a crystal class: its symbols are those of its own row.
    const own = new Map(rows.map((r) => [r[1], r[2]]));
    for (const r of rows.filter((x) => x[3] !== '-')) expect(r[4], `subgroup of ${r[1]}`).toBe(own.get(r[3]));
  });

  for (const r of rows) {
    const printed = r[1];
    const key = magneticKey(KEY_OF_PRINTED[printed] ?? printed, 'Table 6');
    describe(printed, () => {
      const additional = corrected(printed, 'Additional generating matrix', r[7]);
      const subgroup = close(sigmas(r[6], false));
      const group = close([...sigmas(r[6], false), ...sigmas(additional, true)]);

      const inItcFrame = (ops: RefOp[]) => ops.map((op) => ({ ...op, m: toItcFrame(key, op.m) }));

      it('operations of the ITC default setting = closure of the printed σ and σ′ generators, in the ITC frame', () => {
        expect(sameGroup(inItcFrame(group), operations(key))).toBe(true);
      });

      it('the classical subgroup holds the operations without time reversal', () => {
        const unprimed = operations(key).filter((op) => !op.timeReversal);
        expect(sameGroup(inItcFrame(subgroup), unprimed)).toBe(true);
        const blackWhite = r[3] !== '-';
        expect(pointGroup(key).type).toBe(blackWhite ? 'III' : 'I');
        expect(unprimed).toHaveLength(blackWhite ? pointGroup(key).order / 2 : pointGroup(key).order);
      });

      it("the printed symmetry operators name the operations, carried into Birss's frame", () => {
        const system = r[0].toLowerCase();
        expect(pointGroup(key).crystalSystem).toBe(system);
        const inBirssFrame = operations(key).map((op) => ({
          cartesian: toBirssFrame(key, op.cartesian) as unknown as Mat3,
          timeReversal: op.timeReversal,
        }));
        const actual = describeOperationsOf(inBirssFrame).map((d) => operationLabel(system, d));
        expect(sorted(actual)).toEqual(sorted(printedLabels(corrected(printed, 'Symmetry operators', r[5]))));
      });

      it('the printed symbol, read along Birss directions, generates the printed group', () => {
        const ops = group.map((op) => ({ cartesian: op.m, timeReversal: op.t }));
        expect(sameGroup(groupOfSymbol(printed, BIRSS_DIRECTIONS[r[0].toLowerCase()]), ops)).toBe(true);
      });
    });
  }
});

// --- Symbols of every setting, read independently -----------------------------------------------

const X = [1, 0, 0];
const Y = [0, 1, 0];
const Z = [0, 0, 1];
/** Hexagonal [1-10] with a along x and b at 120°: a tertiary direction, 30° below x. */
const HEX_TERTIARY = [1.5, -Math.sqrt(3) / 2, 0];

/**
 * A representative Cartesian direction for each position of the symbol: ITA Table 2.1.3.1 in the
 * frame of symcrys (docs/conventions.md, "Cartesian frame"; the table itself is re-read by
 * symmetryDirections.reference.test.ts).
 */
const DIRECTIONS: Record<'itc', Record<string, number[][]>> = {
  itc: {
    triclinic: [Z],
    monoclinic: [X, Y, Z],
    orthorhombic: [X, Y, Z],
    tetragonal: [Z, X, [1, -1, 0]],
    trigonal: [Z, X, HEX_TERTIARY],
    hexagonal: [Z, X, HEX_TERTIARY],
    cubic: [X, [1, 1, 1], [1, -1, 0]],
  },
};
const AXIS: Record<string, number[]> = { a: X, b: Y, c: Z };

describe('symbols of every setting of the magnetic groups generate its operations', () => {
  for (const key of MAGNETIC_POINT_GROUP_KEYS) {
    const group = pointGroup(key);
    if (group.type === 'I') continue; // the classes: itc.reference.test.ts
    for (const s of settings(key)) {
      it(`${key}, setting ${s.index}: ${s.symbol} (${s.fullSymbol})`, () => {
        const system = group.crystalSystem;
        const ops = operations(key, { setting: s.index });
        const directions = DIRECTIONS.itc[system];
        // A monoclinic short symbol has one position, along the unique axis.
        const positions = hmTokens(s.symbol).filter((t) => t !== "1'");
        const shortDirections = system === 'monoclinic' && positions.length === 1 ? [AXIS[s.uniqueAxis!]] : directions;
        expect(sameGroup(groupOfSymbol(s.symbol, shortDirections), ops)).toBe(true);
        expect(sameGroup(groupOfSymbol(s.fullSymbol, directions), ops)).toBe(true);
        // A symbol that is, without spaces, the key gives the default setting (`3 2'`, rhombohedral).
        const def = settings(key).find((x) => x.isDefault)!.index;
        const isKey = s.fullSymbol.replace(/\s+/g, '') === key;
        expect(findMagneticPointGroup(s.fullSymbol)).toEqual({ key, setting: isKey ? def : s.index });
      });
    }
  }
});

// --- Orthorhombic settings --------------------------------------------------------------------------

describe('orthorhombic groups: a setting for every orientation of the axes', () => {
  const PERMUTATIONS = [
    [0, 1, 2],
    [1, 2, 0],
    [2, 0, 1],
    [1, 0, 2],
    [0, 2, 1],
    [2, 1, 0],
  ];
  /** The operations of an orthorhombic group are diagonal: sign pattern and time reversal identify one. */
  const signature = (
    ops: readonly { cartesian: readonly (readonly number[])[]; timeReversal: boolean }[],
    p: number[],
  ) =>
    ops
      .map((op) => p.map((i) => Math.round(op.cartesian[i][i])).join(',') + (op.timeReversal ? "'" : ''))
      .sort()
      .join(' ');
  const SAME_AXES = [0, 1, 2];

  /**
   * Distinct orientations: six divided by the number of permutations of the three positions of the
   * symbol that leave it unchanged (`222`: 6, `mm2`: 2, `2'm'm`: 1), counted by hand.
   */
  const ORIENTATIONS: Record<string, number> = {
    '222': 1,
    mm2: 3,
    mmm: 1,
    "2'2'2": 3,
    "m'm'2": 3,
    "2'm'm": 6,
    "mm'm'": 3,
    "m'm'm'": 1,
    "mmm'": 3,
  };

  const orthorhombic = MAGNETIC_POINT_GROUP_KEYS.filter((k) => pointGroup(k).crystalSystem === 'orthorhombic');

  it('are 3 classes, 3 grey and 6 black-and-white groups', () => {
    expect(orthorhombic.filter((k) => pointGroup(k).type !== 'II').sort()).toEqual(Object.keys(ORIENTATIONS).sort());
    expect(orthorhombic).toHaveLength(12);
  });

  it.each(orthorhombic)('%s: the settings are the distinct orientations, each once', (key) => {
    const stored = operations(key, { setting: 1 });
    const orientations = new Set(PERMUTATIONS.map((p) => signature(stored, p)));
    const ofSettings = settings(key).map((s) => signature(operations(key, { setting: s.index }), SAME_AXES));
    expect(orientations.size).toBe(ORIENTATIONS[key.replace(/1'$/, '')]);
    expect(new Set(ofSettings).size).toBe(ofSettings.length);
    expect([...ofSettings].sort()).toEqual([...orientations].sort());
  });

  describe('Paufler Table A 6 (p. 316): the orthorhombic symbols with their operations', () => {
    const rows = tableRows(readReference('paufler/table-a6-orthorhombic.md'));
    expectHeader(rows, ['No.', 'Symbol', 'Symmetry operations']);
    /** `2'_z` → the sign pattern of x, y, z, with a prime for time reversal. */
    const printedPattern = (text: string): string => {
      const m = /^(1|-1|2|m)('?)(?:_([xyz]))?('?)$/.exec(text);
      if (!m) throw new Error(`Paufler Table A 6: unreadable operation ${text}`);
      const axis = 'xyz'.indexOf(m[3] ?? '');
      const signs =
        m[1] === '1'
          ? [1, 1, 1]
          : m[1] === '-1'
            ? [-1, -1, -1]
            : [0, 1, 2].map((i) => ((i === axis) === (m[1] === '2') ? 1 : -1));
      return signs.join(',') + (m[2] || m[4] ? "'" : '');
    };

    it('lists the nine orthorhombic groups without time reversal as an element', () => {
      expect(
        rows
          .slice(1)
          .map((r) => findMagneticPointGroup(r[1])?.key)
          .sort(),
      ).toEqual(Object.keys(ORIENTATIONS).sort());
    });

    it.each(rows.slice(1).map((r) => [r[1], r[2]] as const))('%s: %s', (symbolText, printed) => {
      const found = findMagneticPointGroup(symbolText);
      expect(found).toBeDefined();
      const ops = operations(found!.key, { setting: found!.setting });
      expect(signature(ops, SAME_AXES)).toBe(printed.split(', ').map(printedPattern).sort().join(' '));
    });
  });

  /**
   * C2v(Cs), the one orthorhombic group whose three elements all differ, in the six orientations as
   * print names them. Operations as sign patterns of x, y, z, a prime for time reversal.
   */
  const C2V_CS: [symbolText: string, setting: number, axis: 'a' | 'b' | 'c', ops: string, source: string][] = [
    // In the column order of ITA 2016 Table 1.5.4.4 applied to 2'm'm: abc, ba-c, cab, -cba, bca, a-cb (#137 A4).
    ["2'm'm", 1, 'c', "1,-1,-1' 1,-1,1' 1,1,-1 1,1,1", 'Birss Table 6; ITC Vol. D Table 1.5.2.3'],
    ["m'2'm", 2, 'c', "-1,1,-1' -1,1,1' 1,1,-1 1,1,1", 'ITC Vol. D Table 1.5.7.1'],
    ["m2'm'", 3, 'a', "-1,1,-1' -1,1,1 1,1,-1' 1,1,1", 'ITC Vol. D Table 1.5.8.1 (in brackets)'],
    // Paufler prints the operations: 1, 2'_z, m_x, m'_y.
    ["mm'2'", 4, 'a', "-1,-1,1' -1,1,1 1,-1,1' 1,1,1", 'Paufler (1986), p. 62 and Table A 6, no. 15, p. 316'],
    ["m'm2'", 5, 'b', "-1,-1,1' -1,1,1' 1,-1,1 1,1,1", 'ITC Vol. D Table 1.5.2.4'],
    ["2'mm'", 6, 'b', "1,-1,-1' 1,-1,1 1,1,-1' 1,1,1", 'ITC Vol. D Table 1.5.8.1'],
  ];

  it.each(C2V_CS)("2'm'm as %s is setting %i, axis %s (%s; %s)", (symbolText, setting, axis, ops) => {
    expect(findMagneticPointGroup(symbolText)).toEqual({ key: "2'm'm", setting });
    expect(symbol("2'm'm", { setting })).toBe(symbolText);
    expect(signature(operations("2'm'm", { setting }), SAME_AXES)).toBe(ops);
    // `axis` is the normal of the mirror plane without time reversal; an orthorhombic setting has no
    // unique axis (#137 C4).
    const s = settings("2'm'm").find((x) => x.index === setting)!;
    expect(s.uniqueAxis).toBeUndefined();
    const mirror = operations("2'm'm", { setting }).find(
      (op) => !op.timeReversal && op.cartesian[0][0] * op.cartesian[1][1] * op.cartesian[2][2] < 0,
    )!;
    expect(mirror.cartesian['abc'.indexOf(axis)]['abc'.indexOf(axis)]).toBe(-1);
    // It is the direction a spontaneous magnetization may have (ITC Vol. D Table 1.5.2.4: ⊥ m).
    const unit = [0, 1, 2].map((i) => (i === 'abc'.indexOf(axis) ? 1 : 0));
    expect(tensorForm("2'm'm", 'ferromagnetic', { setting }).basis).toEqual([unit]);
  });

  it("2'm'm: six settings, setting 1 the default", () => {
    expect(settings("2'm'm").map((s) => [s.index, s.isDefault])).toEqual([
      [1, true],
      [2, false],
      [3, false],
      [4, false],
      [5, false],
      [6, false],
    ]);
  });
});

// --- Structure --------------------------------------------------------------------------------------

describe('the 122 magnetic point groups', () => {
  it('are 32 crystal classes, 32 grey and 58 black-and-white groups, classes first', () => {
    const all = magneticPointGroups();
    expect(all.map((g) => g.key)).toEqual([...MAGNETIC_POINT_GROUP_KEYS]);
    expect(all).toHaveLength(122);
    expect(new Set(all.map((g) => g.key)).size).toBe(122);
    expect(all.slice(0, 32)).toEqual(pointGroups());
    expect(all.slice(32, 64).every((g) => g.type === 'II')).toBe(true);
    expect(all.slice(64).every((g) => g.type === 'III')).toBe(true);
    expect(all.slice(64)).toHaveLength(58);
  });

  it('a grey group is its class with and without time reversal (ITC Vol. D, eq. (1.5.2.1))', () => {
    POINT_GROUP_KEYS.forEach((classKey, i) => {
      const key = MAGNETIC_POINT_GROUP_KEYS[32 + i];
      expect(key).toBe(`${classKey}1'`);
      expect(crystalClassOf(key)).toBe(classKey);
      expect(pointGroup(key).crystalClass).toBe(classKey);
      expect(pointGroup(key).crystalSystem).toBe(pointGroup(classKey).crystalSystem);
      const classSettings = settings(classKey);
      const greySettings = settings(key);
      expect(greySettings.map((s) => [s.index, s.isDefault, s.uniqueAxis])).toEqual(
        classSettings.map((s) => [s.index, s.isDefault, s.uniqueAxis]),
      );
      expect(greySettings.map((s) => s.symbol)).toEqual(classSettings.map((s) => `${s.symbol}1'`));
      for (const s of classSettings) {
        const classOps = operations(classKey, { setting: s.index });
        const ops = operations(key, { setting: s.index });
        expect(ops).toHaveLength(2 * classOps.length);
        for (const t of [false, true]) {
          const part: RefOp[] = classOps.map((op) => ({ m: op.cartesian.map((row) => [...row]), t }));
          expect(part.every((p) => ops.some((o) => sameGroup([p], [o])))).toBe(true);
        }
      }
    });
  });

  it('in a black-and-white group half of the operations of its class carry time reversal', () => {
    for (const key of MAGNETIC_POINT_GROUP_KEYS.slice(64)) {
      const classKey = crystalClassOf(key);
      expect(isPointGroupKey(classKey)).toBe(true);
      for (const s of settings(key)) {
        const ops = operations(key, { setting: s.index });
        expect(ops.filter((op) => op.timeReversal)).toHaveLength(ops.length / 2);
        // Without time reversal the operations are those of the class in one of its settings with the
        // same axes (hexagonal and rhombohedral axes share the Cartesian operations).
        const stripped = ops.map((op) => ({ cartesian: op.cartesian, timeReversal: false }));
        const match = settings(classKey).filter(
          (c) =>
            c.axes === s.axes &&
            sameGroup(
              operations(classKey, { setting: c.index }).map((op) => ({
                m: op.cartesian.map((row) => [...row]),
                t: false,
              })),
              stripped,
            ),
        );
        expect(match, `${key} setting ${s.index}`).toHaveLength(1);
      }
    }
  });

  it('operations in the order of the class, a grey group class first', () => {
    for (const key of MAGNETIC_POINT_GROUP_KEYS.slice(32)) {
      const group = pointGroup(key);
      const classKey = crystalClassOf(key);
      for (const s of settings(key)) {
        const ops = operations(key, { setting: s.index });
        // The class setting with the same Cartesian operations and the same axes (hexagonal and
        // rhombohedral axes share the Cartesian operations, not the lattice basis).
        const classSetting = settings(classKey).find((c) => {
          if (c.axes !== s.axes) return false;
          const classOps = operations(classKey, { setting: c.index });
          return classOps.every((x) =>
            ops.some((o) => sameGroup([{ m: x.cartesian.map((r) => [...r]), t: o.timeReversal }], [o])),
          );
        })!;
        const classOps = operations(classKey, { setting: classSetting.index });
        const expected = group.type === 'II' ? [...classOps, ...classOps] : classOps;
        expect(ops.map((o) => o.cartesian)).toEqual(expected.map((o) => o.cartesian));
        // And the same matrices W in the lattice basis, those of ITA's general position for the class.
        expect(ops.map((o) => o.matrix)).toEqual(expected.map((o) => o.matrix));
        if (group.type === 'II') {
          expect(ops.map((o) => o.timeReversal)).toEqual([...classOps.map(() => false), ...classOps.map(() => true)]);
        }
        // The generators are those of the class, with the time reversal they have in the group.
        const gens = generators(key, { setting: s.index });
        const classGens = generators(classKey, { setting: classSetting.index });
        const expectedGens =
          group.type === 'II'
            ? [...classGens.map((g) => g.cartesian), ops[0].cartesian]
            : classGens.map((g) => g.cartesian);
        expect(gens.map((g) => g.cartesian)).toEqual(expectedGens);
        const identityW = classOps[0].matrix;
        expect(gens.map((g) => g.matrix)).toEqual(
          group.type === 'II' ? [...classGens.map((g) => g.matrix), identityW] : classGens.map((g) => g.matrix),
        );
        if (group.type === 'II') expect(gens[gens.length - 1].timeReversal).toBe(true);
        expect(sameGroup(close(gens.map((g) => ({ m: g.cartesian.map((r) => [...r]), t: g.timeReversal }))), ops)).toBe(
          true,
        );
      }
    }
  });

  it('findPointGroup finds crystal classes only, findMagneticPointGroup all groups', () => {
    for (const key of MAGNETIC_POINT_GROUP_KEYS) {
      const isClass = pointGroup(key).type === 'I';
      const found = findMagneticPointGroup(key);
      expect(found?.key, key).toBe(key);
      expect(findPointGroup(key)).toEqual(isClass ? found : undefined);
    }
    expect(findMagneticPointGroup('nonsense')).toBeUndefined();
  });

  it('a symbol printed in ITC Vol. D Table 1.5.2.3 finds its group in the default setting', () => {
    // Short and full symbol.
    for (const r of itcRows.slice(1)) {
      const key = magneticKey(r[3], 'ITC Vol. D Table 1.5.2.3');
      const def = settings(key).find((s) => s.isDefault)!.index;
      expect(findMagneticPointGroup(r[3]), `ITC ${r[3]}`).toEqual({ key, setting: def });
      expect(findMagneticPointGroup(r[4]), `ITC ${r[4]}`).toEqual({ key, setting: def });
    }
  });

  it('a symbol finds the setting it names; a symbol that several settings share, the default', () => {
    for (const key of MAGNETIC_POINT_GROUP_KEYS) {
      const all = settings(key);
      const def = all.find((s) => s.isDefault)!.index;
      for (const s of all) {
        const what = `${key} setting ${s.index}`;
        // A symbol several settings share, or one that is the key without spaces, gives the default.
        const compact = (t: string) => t.replace(/\s+/g, '');
        const shared = all.filter((t) => t.symbol === s.symbol).length > 1 || compact(s.symbol) === key;
        expect(findMagneticPointGroup(s.symbol), `${what}: ${s.symbol}`).toEqual({
          key,
          setting: shared ? def : s.index,
        });
        const fullShared =
          all.filter((t) => compact(t.fullSymbol) === compact(s.fullSymbol)).length > 1 ||
          compact(s.fullSymbol) === key;
        expect(findMagneticPointGroup(s.fullSymbol), `${what}: ${s.fullSymbol}`).toEqual({
          key,
          setting: fullShared ? def : s.index,
        });
      }
      // The key gives the default setting, also where it is the symbol of another setting (`32`).
      expect(findMagneticPointGroup(key), key).toEqual({ key, setting: def });
    }
    // Settings that share a short symbol: the monoclinic ones (unique axis b, c and a), and the
    // hexagonal and rhombohedral axes of 3, -3 and their magnetic groups.
    const sharing = MAGNETIC_POINT_GROUP_KEYS.filter((key) => {
      const symbols = settings(key).map((s) => s.symbol);
      return new Set(symbols).size < symbols.length;
    });
    expect(sharing.filter((key) => pointGroup(key).crystalSystem === 'monoclinic')).toHaveLength(11);
    expect(sharing.filter((key) => pointGroup(key).crystalSystem !== 'monoclinic')).toEqual([
      '3',
      '-3',
      "31'",
      "-31'",
      "-3'",
    ]);
  });

  it('a key finds the default setting', () => {
    for (const key of MAGNETIC_POINT_GROUP_KEYS) {
      const def = settings(key).find((s) => s.isDefault)!.index;
      expect(findMagneticPointGroup(key), key).toEqual({ key, setting: def });
    }
  });
});

// --- Properties -------------------------------------------------------------------------------------

describe('properties of the magnetic point groups', () => {
  it('centrosymmetric needs the inversion without time reversal', () => {
    expect(isCentrosymmetric('mmm')).toBe(true);
    expect(isCentrosymmetric("mmm1'")).toBe(true);
    expect(isCentrosymmetric("mm'm'")).toBe(true);
    // m'm'm' and mmm' contain the inversion only combined with time reversal.
    expect(isCentrosymmetric("m'm'm'")).toBe(false);
    expect(isCentrosymmetric("mmm'")).toBe(false);
  });

  it('polar, chiral and Laue class are those of the crystal class', () => {
    for (const key of MAGNETIC_POINT_GROUP_KEYS) {
      const classKey = crystalClassOf(key);
      expect([isPolar(key), isChiral(key), laueClass(key)], key).toEqual([
        isPolar(classKey),
        isChiral(classKey),
        laueClass(classKey),
      ]);
    }
  });
});
