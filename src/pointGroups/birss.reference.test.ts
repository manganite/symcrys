/**
 * Birss convention against its print source (fixture class (a)): Birss Table 3 (printed pp. 36–39)
 * and the generating matrices σ(N) of equation (2.17) (printed p. 48), re-parsed from references/.
 * For every crystal class, the printed generators, closed with the independent algebra of
 * testUtils, must give exactly the operations of symcrys in the Birss default setting; the short
 * symbol, Schoenflies symbol, crystal system and order must match the print.
 */

import { describe, expect, it } from 'vitest';
import { close, sameGroup, type M, type RefOp } from '../testUtils/independentGroups.js';
import { expectHeader, readReference, section, tableRows } from '../testUtils/references.js';
import { isPointGroupKey, operations, pointGroup, settings, symbol, type PointGroupKey } from './pointGroups.js';

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

describe('Birss Table 3 (printed pp. 36–39) against symcrys, Birss convention', () => {
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
      it('operations of the Birss default setting = closure of the printed σ generators', () => {
        const ref = close(row.generators);
        expect(ref).toHaveLength(row.order);
        expect(sameGroup(ref, operations(row.key, { convention: 'birss' }))).toBe(true);
      });

      it('the Birss default is setting 1, the stored frame', () => {
        expect(settings(row.key, 'birss').find((s) => s.isDefault)?.index).toBe(1);
      });

      it('order, crystal system, Schoenflies and short symbol as printed', () => {
        expect(pointGroup(row.key).order).toBe(row.order);
        expect(pointGroup(row.key).crystalSystem).toBe(row.system);
        expect(symbol(row.key, { form: 'schoenflies' })).toBe(row.schoenflies);
        expect(symbol(row.key, { convention: 'birss' })).toBe(row.key);
      });
    });
  }
});
