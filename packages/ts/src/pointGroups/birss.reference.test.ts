/**
 * The crystal classes against Birss's print (fixture class (a)), an independent second print check
 * of the ITC output: Birss Table 3 (printed pp. 36–38) and the generating matrices σ(N) of equation
 * (2.17) (printed pp. 48–49), re-parsed from references/. For every crystal class, the printed
 * generators, closed with the independent algebra of testUtils and carried from Birss's frame into
 * the ITC frame (testUtils/birssFrame.ts), must give exactly the operations of symcrys in the ITC
 * default setting; Birss's printed symbol, read along Birss's directions, must generate the printed
 * group; Schoenflies symbol, crystal system and order must match the print.
 */

import { describe, expect, it } from 'vitest';
import { groupOfSymbol } from '../testUtils/hermannMauguin.js';
import { BIRSS_DIRECTIONS, toItcFrame } from '../testUtils/birssFrame.js';
import { close, sameGroup, type M, type RefOp } from '../testUtils/independentGroups.js';
import { expectHeader, readReference, section, tableRows } from '../testUtils/references.js';
import { symbol as itaSymbol } from '../crystalClasses.js';
import { isPointGroupKey, operations, pointGroup, type PointGroupKey } from './pointGroups.js';

// --- σ(0)–σ(9) ---------------------------------------------------------------------------------

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

// --- Table 3 ----------------------------------------------------------------------------------

const table3 = readReference('birss/table-3.md');
const rows = tableRows(table3);
expectHeader(rows, [
  'System',
  'Intl. abbreviated',
  'Full',
  'Schoenflies',
  'Shubnikov',
  'Symmetry operations',
  'Number',
  'Generating matrices',
]);

const errataRows = tableRows(section(table3, '## Errata'));
expectHeader(errataRows, ['Class', 'Column', 'Printed', 'Correct', 'Evidence']);
const ERRATA = new Map(errataRows.slice(1).map((r) => [r[0], r]));

/**
 * Birss prints the cubic classes without the overbar on the 3 (`m3`, `m3m`); symcrys keeps it in
 * both conventions (docs/conventions.md, "Symbols"). This is the only mapping from print to key.
 */
const KEY_OF_PRINTED: Record<string, string> = { m3: 'm-3', m3m: 'm-3m' };

const plain = (html: string) => html.replace(/<\/?sub>/g, '');

interface Table3Row {
  key: PointGroupKey;
  printedSymbol: string;
  system: string;
  schoenflies: string;
  order: number;
  generators: RefOp[];
}

const TABLE3: Table3Row[] = rows.slice(1).map((r) => {
  const printedSymbol = r[1];
  const key = KEY_OF_PRINTED[printedSymbol] ?? printedSymbol;
  if (!isPointGroupKey(key)) throw new Error(`Table 3 class ${printedSymbol} is not a symcrys key`);
  const erratum = ERRATA.get(printedSymbol);
  let gens = r[7];
  if (erratum) {
    if (erratum[1] !== 'Generating matrices' || gens !== erratum[2]) {
      throw new Error(`Erratum for ${printedSymbol} does not match the printed row`);
    }
    gens = erratum[3];
  }
  return {
    key,
    printedSymbol,
    system: r[0].toLowerCase(),
    schoenflies: plain(r[3]).replace(/\(.*\)$/, ''),
    order: Number(r[6]),
    generators: [...gens.matchAll(/σ\((\d)\)/g)].map((m) => {
      const matrix = SIGMA.get(Number(m[1]));
      if (!matrix) throw new Error(`Unknown σ(${m[1]})`);
      return { m: matrix, t: false };
    }),
  };
});

describe('Birss Table 3 (printed pp. 36–38) against symcrys, in the ITC frame', () => {
  it('lists the 32 crystal classes, each once, and the σ pool has ten matrices', () => {
    expect(TABLE3).toHaveLength(32);
    expect(new Set(TABLE3.map((r) => r.key)).size).toBe(32);
    expect(SIGMA.size).toBe(10);
  });

  it('applies every erratum to an existing row', () => {
    for (const printed of ERRATA.keys()) expect(TABLE3.some((r) => r.printedSymbol === printed)).toBe(true);
  });

  for (const row of TABLE3) {
    describe(row.key, () => {
      it('operations of the ITC default setting = closure of the printed σ generators, in the ITC frame', () => {
        const ref = close(row.generators);
        expect(ref).toHaveLength(row.order);
        const inItcFrame = ref.map((op) => ({ ...op, m: toItcFrame(row.key, op.m) }));
        expect(sameGroup(inItcFrame, operations(row.key))).toBe(true);
      });

      it('the printed symbol, read along Birss directions, generates the printed group', () => {
        // Birss reads the unique axis of a monoclinic class along z (Table 4a, p. 56: `2//z`; σ(3) of `2` is a rotation about z).
        const printedGroup = close(row.generators).map((op) => ({ cartesian: op.m, timeReversal: op.t }));
        expect(sameGroup(groupOfSymbol(row.printedSymbol, BIRSS_DIRECTIONS[row.system]), printedGroup)).toBe(true);
      });

      it('order, crystal system and Schoenflies symbol as printed', () => {
        expect(pointGroup(row.key).order).toBe(row.order);
        expect(pointGroup(row.key).crystalSystem).toBe(row.system);
        // Birss writes C3i, as ITA does and the crystallographic API (#137 B3).
        expect(itaSymbol(row.key, { form: 'schoenflies' })).toBe(row.schoenflies);
      });
    });
  }
});
