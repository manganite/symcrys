/**
 * The ITC data of the black-and-white groups (itcMagneticData.ts) against print (fixture class
 * (a)): ITC Vol. D Table 1.5.2.3, printed pp. 111–112, re-parsed from references/itc/. The default
 * setting of every black-and-white group has the printed full symbol, the printed Schoenflies symbol
 * G(H) and the printed crystal system, and its operations carry time reversal exactly where the
 * printed operators carry a prime, counted by kind (the operations themselves are compared with the
 * printed operators in magnetic.reference.test.ts).
 */

import { describe, expect, it } from 'vitest';
import { det } from '../linalg.js';
import { expectHeader, readReference, tableRows } from '../testUtils/references.js';
import { itcClass } from './itcData.js';
import { ITC_BLACK_WHITE, itcBlackWhiteOperations } from './itcMagneticData.js';

const rows = tableRows(readReference('itc/vol-d-table-1.5.2.3.md'));
expectHeader(rows, ['System', 'Schoenflies', 'Shubnikov', 'Short', 'Full', 'Symmetry operators']);

/** The number of printed operators with a prime: `n(op')` counts n, `±op'` counts 2. */
function primedCount(operators: string): number {
  return operators.split(', ').reduce((sum, op) => {
    if (!op.includes("'")) return sum;
    const n = /^(\d+)\((.*)\)$/.exec(op);
    const inner = n ? n[2] : op;
    return sum + (n ? Number(n[1]) : 1) * (inner.startsWith('±') ? 2 : 1);
  }, 0);
}

/** The number of printed operators with a prime that are proper rotations (no overbar, no m). */
function primedProperCount(operators: string): number {
  return operators.split(', ').reduce((sum, op) => {
    if (!op.includes("'")) return sum;
    const n = /^(\d+)\((.*)\)$/.exec(op);
    const inner = (n ? n[2] : op).replace(/^±/, '');
    if (inner.startsWith('-') || inner.startsWith('m')) return sum;
    return sum + (n ? Number(n[1]) : 1) * ((n ? n[2] : op).startsWith('±') ? 2 : 1);
  }, 0);
}

describe('ITC Vol. D Table 1.5.2.3 against the ITC data of the black-and-white groups', () => {
  const printed = rows.slice(1).filter((r) => r[3].includes("'"));

  it('prints the 58 groups of the data, each once', () => {
    expect(printed.map((r) => r[3]).sort()).toEqual(ITC_BLACK_WHITE.map((g) => g.key as string).sort());
  });

  it.each(printed.map((r) => [r[3], r] as const))('%s: default setting as printed', (key, r) => {
    const g = ITC_BLACK_WHITE.find((x) => x.key === key)!;
    const s = g.settings.find((x) => x.isDefault)!;
    expect(s.full).toBe(r[4]);
    expect(g.schoenflies).toBe(r[1]); // stored as printed, S6 included (#137 B3)
    expect(itcClass(g.crystalClass).crystalSystem).toBe(r[0].toLowerCase());
    const ops = itcBlackWhiteOperations(g.key, s.index);
    expect(ops.filter((o) => o.timeReversal)).toHaveLength(primedCount(r[5]));
    expect(ops.filter((o) => o.timeReversal && det(o.cartesian) > 0)).toHaveLength(primedProperCount(r[5]));
  });
});
