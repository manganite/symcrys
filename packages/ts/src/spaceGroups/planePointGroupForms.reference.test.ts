/**
 * The Wyckoff positions and edge forms of the plane point groups against ITA (6th ed., 2016)
 * Table 3.2.3.1, pp. 742–744 (fixture class (a)): the stored data equal the transcription
 * (references/itc/vol-a-table-3.2.3.1.md), without the point at the origin and the point forms. Checks
 * that read print alone: the printed coordinate doublets of each position are the orbit of its first
 * doublet under the operations of the group, in their order; the printed Miller indices of each form
 * are the orbit of its first edge, as a set (and the set after "or" that of the opposite edge); every form has
 * as many edges as its position has directions; the keys of the kinds of forms are their printed names.
 */

import { describe, expect, it } from 'vitest';
import * as plane from '../plane.js';
import { readReference, section, tableRows } from '../testUtils/references.js';

const FILE = readReference('itc/vol-a-table-3.2.3.1.md');
const positions = tableRows(section(FILE, '## Positions')).slice(1);
const forms = tableRows(section(FILE, '## Forms')).slice(1);

/** The key and setting of a printed group: `3m1` and `31m` are the settings of 3m. */
const groupOf = (printed: string): [plane.PointGroupKey, number] =>
  printed === '3m1' ? ['3m', 1] : printed === '31m' ? ['3m', 2] : [printed as plane.PointGroupKey, 1];

type M = number[][];
const mul = (a: M, b: M): M => a.map((row) => b[0].map((_, j) => row.reduce((s, x, k) => s + x * b[k][j], 0)));
const inv2 = (w: M): M => {
  const d = w[0][0] * w[1][1] - w[0][1] * w[1][0];
  return [
    [w[1][1] / d, -w[0][1] / d],
    [-w[1][0] / d, w[0][0] / d],
  ].map((r) => r.map((x) => x + 0));
};
const T = (m: M): M => m[0].map((_, j) => m.map((row) => row[j]));

/**
 * A coordinate as a row of coefficients of the two letters and a constant: `-x+y` → [-1, 1, 0],
 * `2x` → [2, 0, 0], `0` → [0, 0, 0], `-1` → [0, 0, -1]; `i` stands for −(h + k).
 */
function linear(text: string, letters: string): number[] {
  const out = [0, 0, 0];
  for (const [, sign, digits, letter] of text.matchAll(/([+-]?)(\d*)([a-z]?)/g)) {
    if (!digits && !letter) continue;
    const c = (sign === '-' ? -1 : 1) * (digits ? Number(digits) : 1);
    if (!letter) out[2] += c;
    else if (letter === 'i') {
      out[0] -= c;
      out[1] -= c;
    } else out[letters.indexOf(letter)] += c;
  }
  return out.map((x) => x + 0);
}

/** Doublets as matrices: row j holds the coefficients of x, y and the constant of coordinate j. */
const doublet = (t: string): M => t.split(',').map((c) => linear(c.trim(), 'xy'));
/** Miller indices as matrices over h, k and a constant: two components (the third, i, checked to be −(h + k)). */
const edge = (t: string): M => {
  const c = t.split(',').map((x) => linear(x.trim(), 'hk'));
  if (c.length === 3) expect(c[2]).toEqual(c[0].map((x, n) => -(x + c[1][n]) + 0));
  return c.slice(0, 2);
};
const key = (m: M) => JSON.stringify(m.map((r) => r.map((x) => x + 0)));
const dedup = (list: M[]): string[] => [...new Set(list.map(key))];

describe('ITA 2016 Table 3.2.3.1: the positions and edge forms of the plane point groups', () => {
  it('the stored data equal the transcription, without the origin and the point forms', () => {
    const groups = [...new Set(positions.map((r) => r[0]))];
    expect(groups).toEqual(['1', '2', 'm', '2mm', '4', '4mm', '3', '3m1', '31m', '6', '6mm']);
    for (const g of groups) {
      const [k, setting] = groupOf(g);
      const printed = positions.filter((r) => r[0] === g && r[3] !== 'o');
      const lib = plane.wyckoffPositions(k, { setting });
      expect(
        lib.map((p) => [p.multiplicity, p.letter, p.siteSymmetry, p.coordinates.join('; ')]),
        g,
      ).toEqual(printed.map((r) => [Number(r[2]), r[3], r[4], r[5]]));
      const printedForms = forms.filter((r) => r[0] === g && r[1] !== 'o');
      const libForms = plane.crystalForms(k, { setting });
      expect(
        libForms.map((f) => [
          f.letter,
          f.basic ? 'basic' : 'limiting',
          plane.CRYSTAL_FORM_TYPES[f.formType].name,
          f.millerIndices,
        ]),
        g,
      ).toEqual(printedForms.map((r) => [r[1], r[2], r[3], r[5].split(';')[0].trim()]));
      // A position gives the first edge of its basic form.
      expect(lib.map((p) => p.millerIndices)).toEqual(
        lib.map((p) => libForms.find((f) => f.letter === p.letter && f.basic)!.millerIndices),
      );
    }
  });

  it('names each kind of edge form by its printed name in lower case with hyphens', () => {
    const names = [...new Set(forms.map((r) => r[3]).filter(Boolean))];
    expect(Object.values(plane.CRYSTAL_FORM_TYPES).map((t) => t.name)).toEqual(names);
    expect(Object.keys(plane.CRYSTAL_FORM_TYPES)).toEqual(names.map((n) => n.toLowerCase().replace(/ /g, '-')));
  });

  for (const g of [...new Set(positions.map((r) => r[0]))]) {
    it(`${g}: the printed doublets are orbits under the operations in their order, the edges as sets`, () => {
      const [k, setting] = groupOf(g);
      const ops = plane.operations(k, { setting }).map((op) => op.matrix.map((row) => [...row]));
      for (const r of positions.filter((p) => p[0] === g && p[3] !== 'o')) {
        const printed = r[5].split(';').map((t) => doublet(t.trim()));
        expect(dedup(ops.map((w) => mul(w, printed[0]))), `${g} ${r[3]}`).toEqual(printed.map(key));
        // The site symmetry: the operations that fix the first doublet, |G|/multiplicity of them.
        const fixing = ops.flatMap((w, i) => (key(mul(w, printed[0])) === key(printed[0]) ? [i] : []));
        expect(fixing.length * Number(r[2])).toBe(ops.length);
        const lib = plane.wyckoffPositions(k, { setting }).find((p) => p.letter === r[3])!;
        expect(lib.siteSymmetryOperations, `${g} ${r[3]}`).toEqual(fixing);
      }
      for (const r of forms.filter((f) => f[0] === g && f[1] !== 'o')) {
        // An edge (h k) maps to (h k)·W⁻¹ under W: the component rows of E become W⁻ᵀE.
        const orbit = (e: M) => dedup(ops.map((w) => mul(T(inv2(w)), e)));
        const printed = r[5].split(';').map((t) => edge(t.trim()));
        // As sets: print arranges a row of edges by cyclic permutation of the indices (in 3m1 the
        // second row of the ditrigon is (k̄h̄ī) (īk̄h̄) (h̄īk̄)), not always in the order of the operations.
        expect(orbit(printed[0]).sort(), `${g} ${r[1]} ${r[3]}`).toEqual(printed.map(key).sort());
        const multiplicity = Number(positions.find((p) => p[0] === g && p[3] === r[1])![2]);
        expect(printed).toHaveLength(multiplicity);
        if (r[6]) {
          const other = r[6].split(';').map((t) => edge(t.trim()));
          expect(other.map(key)).toEqual(printed.map((e) => key(e.map((row) => row.map((x) => -x)))));
        }
      }
    });
  }

  it('a plane group has no edge forms, and its positions take no other setting', () => {
    expect(() => plane.crystalForms('p4mm' as plane.PointGroupKey)).toThrow(RangeError);
    expect(plane.wyckoffPositions('p4mm')[0].millerIndices).toBeUndefined();
    expect(() => plane.wyckoffPositions('3m', { setting: 3 })).toThrow(RangeError);
    expect(plane.wyckoffPositions('3m', { setting: '31m' })).toEqual(plane.wyckoffPositions('3m', { setting: 2 }));
  });
});
