/**
 * Tensor forms in the ITC convention against ITC Vol. D, Chapter 1.1 (fixture class (a)),
 * re-parsed from references/itc/:
 *
 * - § 1.1.4.10.7: the full forms (cells, links, signs) of axial tensors of rank 2, general and
 *   symmetric, in the frame ITC draws them: in the ITC default setting, and for the monoclinic
 *   classes also with the axis parallel to Ox3 (unique axis c, setting 1);
 * - § 1.1.4.10.6: the numbers of independent components of fourth-rank tensors with both index pairs
 *   symmetric (`'ij_kl'`: p, π, Q) and with the pairs also interchangeable (`'voigt'`: c, s).
 */

import { describe, expect, it } from 'vitest';
import { isPointGroupKey, settings, type PointGroupKey } from '../pointGroups/pointGroups.js';
import { expectHeader, readReference, tableRows } from '../testUtils/references.js';
import { linkScheme, schemeOf } from '../testUtils/yariv.js';
import { tensorForm, type TensorSpec } from './tensorForm.js';

/** Abbreviations of § 1.1.4.10.6 and § 1.1.4.10.7 (see the transcriptions), and D3h printed as -62m. */
const ABBREVIATION: Record<string, string> = {
  '42': '422',
  '62': '622',
  '4m': '4mm',
  '6m': '6mm',
  '4/mm': '4/mmm',
  '6/mm': '6/mmm',
  '-62m': '-6m2',
  '2mm': 'mm2',
};

function keyOf(printed: string, misprint: Record<string, string> = {}): PointGroupKey {
  const key = misprint[printed] ?? ABBREVIATION[printed] ?? printed;
  if (!isPointGroupKey(key)) throw new Error(`ITC Vol. D: not a class: ${printed}`);
  return key;
}

const itcDefault = (key: PointGroupKey) => settings(key).find((s) => s.isDefault)!.index;

// --- § 1.1.4.10.7: axial tensors of rank 2 ---------------------------------------------------------

const AXIAL = tableRows(readReference('itc/vol-d-1.1.4.10.7-axial-rank-2.md'));
expectHeader(AXIAL, ['Section', 'Groups (as printed)', 'Frame', 'Links']);

const PANELS = AXIAL.slice(1).map((r) => ({
  section: r[0],
  symmetric: r[0].startsWith('1.1.4.10.7.2'),
  groups: r[1].split(',').map((g) => keyOf(g.trim())),
  frame: r[2],
  links:
    r[3] === '—'
      ? []
      : r[3].split(';').map((g) =>
          g
            .trim()
            .split(/\s+/)
            .map((m) => {
              const x = m.match(/^([1-3])([1-3])([fo])$/);
              if (!x) throw new Error(`ITC Vol. D 1.1.4.10.7: mark ${m}`);
              return { name: `${x[1]}${x[2]}`, filled: x[3] === 'f' };
            }),
        ),
}));

/** The setting the panel is drawn in: ITC default, or the monoclinic setting with the axis on Ox3 / Ox2. */
function settingOf(key: PointGroupKey, frame: string): number {
  if (!frame) return itcDefault(key);
  const axis = frame === 'parallel to Ox3' ? 'c' : frame === 'parallel to Ox2' ? 'b' : null;
  const s = settings(key).find((x) => x.uniqueAxis === axis);
  if (!s) throw new Error(`${key}: no setting for frame ${frame}`);
  return s.index;
}

const GRID = [1, 2, 3].flatMap((i) => [1, 2, 3].map((j) => ({ i, j, name: `${i}${j}`, index: (i - 1) * 3 + (j - 1) })));

describe('ITC Vol. D § 1.1.4.10.7: axial tensors of rank 2', () => {
  it('the transcription covers the 32 classes in both parts, except those the section leaves out', () => {
    const covered = (sym: boolean) => new Set(PANELS.filter((p) => p.symmetric === sym).flatMap((p) => p.groups));
    expect(covered(false).size).toBe(30); // without -6 and 6/m
    expect(covered(true).size).toBe(30); // without 6/m and 6mm
  });

  for (const p of PANELS) {
    const spec: TensorSpec = { rank: 2, parity: 'axial', timeParity: 'i', intrinsic: p.symmetric ? 'ij' : 'none' };
    const title = `${p.section} ${p.groups.join(', ')}${p.frame ? ` (${p.frame})` : ''}`;
    it(`${title}: cells, links and signs`, () => {
      for (const key of p.groups) {
        const setting = settingOf(key, p.frame);
        const basis = tensorForm(key, spec, { setting }).basis;
        expect(basis, `${key} setting ${setting}: independent components`).toHaveLength(p.links.length);
        const cells = p.symmetric ? GRID.filter((c) => c.i <= c.j) : GRID;
        const got = schemeOf(basis, cells);
        const want = linkScheme(p.links);
        expect(got.partition, `${key} setting ${setting}`).toBe(want.partition);
        for (const [cell, sign] of want.signs)
          expect(got.signs.get(cell), `${key}: sign of ${cell}`).toBeCloseTo(sign, 9);
      }
    });
  }

  it('the monoclinic panels drawn parallel to Ox2 are the ITC default setting (unique axis b)', () => {
    for (const key of ['2', 'm'] as const) expect(settingOf(key, 'parallel to Ox2')).toBe(itcDefault(key));
  });
});

// --- § 1.1.4.10.6: counts of fourth-rank tensors -----------------------------------------------------

const COUNTS = tableRows(readReference('itc/vol-d-table-1.1.4.10.6-rank-4-counts.md'));
expectHeader(COUNTS, ['Section', 'Groups (as printed)', 'Count p', 'Count c', 'Note']);

/** § 1.1.4.10.6.7 (i) prints "3m" in the cubic system; the class meant is m-3 (see the transcription). */
const CUBIC_MISPRINT = { '3m': 'm-3' };

const ROWS4 = COUNTS.slice(1)
  .filter((r) => r[1] !== 'all tensors (spherical system)')
  .map((r) => ({
    section: r[0],
    groups: r[1].split(',').map((g) => keyOf(g.trim(), r[0].startsWith('1.1.4.10.6.7') ? CUBIC_MISPRINT : {})),
    p: Number(r[2]),
    c: Number(r[3]),
  }));

describe('ITC Vol. D § 1.1.4.10.6: fourth-rank tensors, numbers of independent components', () => {
  it('the rows cover the 32 classes once each', () => {
    const all = ROWS4.flatMap((r) => r.groups);
    expect(all).toHaveLength(32);
    expect(new Set(all).size).toBe(32);
  });

  it.each(ROWS4.map((r) => [`${r.section} ${r.groups.join(', ')}`, r] as const))('%s', (_t, r) => {
    for (const key of r.groups) {
      const n = (intrinsic: 'ij_kl' | 'voigt') =>
        tensorForm(key, { rank: 4, parity: 'polar', timeParity: 'i', intrinsic }).basis.length;
      expect(n('ij_kl'), `${key}: p, π, Q`).toBe(r.p);
      expect(n('voigt'), `${key}: c, s`).toBe(r.c);
    }
  });
});
