/**
 * The rank-3 form with symmetric last pair (second-harmonic generation, piezoelectric d_ijk without
 * Voigt factor) against Yariv's Table 16.1 (fixture class (a)), re-parsed from
 * references/yariv/table-16.1.md.
 *
 * Yariv's d_ijk is the tensor component itself (no factor 2 on μ = 4, 5, 6), so his 3×6 grid can be
 * compared cell by cell: the nonzero cells, their grouping into equal moduli, and the signs. Each
 * panel resolves to the one setting of symcrys that reproduces its cells; the setting is an output
 * of the test, not an input. For the four classes Yariv prints in two orientations, the panel he
 * calls the standard orientation is the ITC default setting.
 */

import { describe, expect, it } from 'vitest';
import { settings, type PointGroupKey } from '../pointGroups/pointGroups.js';
import { YARIV_PANELS, basisScheme, cellsOf, printedScheme, type YarivPanel } from '../testUtils/yariv.js';
import { tensorForm, type TensorSpec } from './tensorForm.js';

const SHG: TensorSpec = { rank: 3, parity: 'polar', timeParity: 'i', intrinsic: 'jk' };

const schemeAt = (key: string, setting: number) =>
  basisScheme(tensorForm(key as PointGroupKey, SHG, { setting }).basis);

/** The (class, setting) pairs whose computed cells equal the panel's printed cells. */
function resolve(p: YarivPanel): { key: string; setting: number }[] {
  const want = cellsOf(printedScheme(p)).join(',');
  return p.groups.flatMap((key) =>
    settings(key as PointGroupKey)
      .map((s) => s.index)
      .filter((setting) => cellsOf(schemeAt(key, setting)).join(',') === want)
      .map((setting) => ({ key, setting })),
  );
}

describe('Yariv Table 16.1: the transcription as read', () => {
  it('24 panels over the 21 noncentrosymmetric classes', () => {
    expect(YARIV_PANELS).toHaveLength(24);
    expect(new Set(YARIV_PANELS.flatMap((p) => p.groups)).size).toBe(21);
  });

  it.each(YARIV_PANELS.map((p) => [p.id, p] as const))('%s: number of link groups = printed count', (_id, p) => {
    expect(p.links.length).toBe(p.printedCount);
    expect(p.links.every((g) => g.some((m) => m.filled))).toBe(true);
  });
});

describe('Yariv Table 16.1: forms', () => {
  it.each(YARIV_PANELS.map((p) => [p.id, p] as const))('%s: cells, classes and signs', (_id, p) => {
    const matches = resolve(p);
    expect(
      matches.map((m) => m.key),
      `${p.id}: one matching setting per class, got ${JSON.stringify(matches)}`,
    ).toEqual(p.groups);
    for (const m of matches) {
      const n = tensorForm(m.key as PointGroupKey, SHG, { setting: m.setting }).basis.length;
      expect(n, `${p.id}: number of independent components`).toBe(p.printedCount);
      const got = schemeAt(m.key, m.setting);
      const want = printedScheme(p);
      expect(got.partition, `${p.id}: classes`).toBe(want.partition);
      for (const [cell, sign] of want.signs)
        expect(got.signs.get(cell), `${p.id}: sign of ${cell}`).toBeCloseTo(sign, 9);
    }
  });

  it("Yariv's standard orientation is the ITC default setting", () => {
    const resolved = Object.fromEntries(
      YARIV_PANELS.filter((p) => p.groups.length === 1).map((p) => [p.id, resolve(p)[0].setting]),
    );
    const itcDefault = (key: string) => settings(key as PointGroupKey).find((s) => s.isDefault)!.index;
    const standard = YARIV_PANELS.filter((p) => p.panel.includes('standard orientation'));
    expect(standard.map((p) => p.groups[0]).sort()).toEqual(['-6m2', '2', '3m', 'm']);
    for (const p of standard) expect(resolved[p.id], p.id).toBe(itcDefault(p.groups[0]));
  });
});
