/**
 * Tensor forms in the ITC convention against ITA Table 3.2.2.1 (fixture class (a)), re-parsed from
 * references/itc/vol-a-table-3.2.2.1.md: for the 21 noncentrosymmetric classes the numbers of
 * independent components of three tensors, the direction of the pyroelectric vector, and the
 * piezoelectric classes.
 *
 * The three tensors as the table counts them (each count reproduced by symcrys only with this
 * reading): pyroelectricity a polar vector; piezoelectricity and SHG a polar rank-3 tensor symmetric
 * in its last two indices (class 1: 18); optical activity the symmetric axial rank-2 gyration tensor
 * (class 1: 6). The directions are printed in the ITC setting (unique axis b for monoclinic), so
 * they are compared in the ITC default setting as printed.
 */

import { describe, expect, it } from 'vitest';
import { POINT_GROUP_KEYS, isPointGroupKey, type PointGroupKey } from '../pointGroups/pointGroups.js';
import { isCentrosymmetric, isPiezoelectric } from '../pointGroups/properties.js';
import { expectHeader, readReference, tableRows } from '../testUtils/references.js';
import { matrixRank } from '../testUtils/rank.js';
import { tensorForm, type TensorSpec } from './tensorForm.js';

const PYRO: TensorSpec = { rank: 1, parity: 'polar', timeParity: 'i', intrinsic: 'none' };
const PIEZO: TensorSpec = { rank: 3, parity: 'polar', timeParity: 'i', intrinsic: 'jk' };
const GYRATION: TensorSpec = { rank: 2, parity: 'axial', timeParity: 'i', intrinsic: 'ij' };

const rows = tableRows(readReference('itc/vol-a-table-3.2.2.1.md'));
expectHeader(rows, [
  'System',
  'Laue class',
  'Group',
  'Rank-1 (pyroelectricity)',
  'Rank-3 (piezo/SHG)',
  'Enantiomorphism',
  'Axial rank-2 (optical activity)',
]);

const count = (cell: string): number => {
  if (cell === '-') return 0;
  const m = cell.match(/^\+ \((\d+)\)/);
  if (!m) throw new Error(`Table 3.2.2.1: count in ${cell}`);
  return Number(m[1]);
};

interface Row {
  key: PointGroupKey;
  pyro: number;
  direction: string | null;
  piezo: number;
  gyration: number;
}

/** ITA prints D3h as -62m; the key is -6m2 (docs/conventions.md, "Keys"). Icosahedral and spherical rows are skipped. */
const ROWS: Row[] = rows
  .slice(1)
  .map((r) => ({ r, key: r[2] === '-62m' ? '-6m2' : r[2] }))
  .filter(({ key }) => isPointGroupKey(key))
  .map(({ r, key }) => ({
    key: key as PointGroupKey,
    pyro: count(r[3]),
    direction: r[3].match(/\[[^\]]+\]/)?.[0] ?? null,
    piezo: count(r[4]),
    gyration: count(r[6]),
  }));

const independent = (key: PointGroupKey, spec: TensorSpec) => tensorForm(key, spec).basis.length;

/** Cartesian axes along which a printed direction [uvw] has free components, in the ITC frame. */
const AXES: Record<string, number[]> = { '[uvw]': [0, 1, 2], '[001]': [2], '[010]': [1], '[u0w]': [0, 2] };

describe('ITA Table 3.2.2.1', () => {
  it('lists the 21 noncentrosymmetric classes', () => {
    expect(ROWS).toHaveLength(21);
    expect(ROWS.map((r) => r.key).sort()).toEqual(POINT_GROUP_KEYS.filter((k) => !isCentrosymmetric(k)).sort());
  });

  it.each(ROWS.map((r) => [r.key, r] as const))('%s: numbers of independent components', (key, r) => {
    expect(independent(key, PYRO), 'pyroelectric vector').toBe(r.pyro);
    expect(independent(key, PIEZO), 'piezoelectric tensor').toBe(r.piezo);
    expect(independent(key, GYRATION), 'gyration tensor').toBe(r.gyration);
  });

  it('the 11 centrosymmetric classes allow none of the three tensors', () => {
    const centro = POINT_GROUP_KEYS.filter((k) => isCentrosymmetric(k));
    expect(centro).toHaveLength(11);
    for (const k of centro) for (const spec of [PYRO, PIEZO, GYRATION]) expect(independent(k, spec), k).toBe(0);
  });

  it.each(ROWS.filter((r) => r.pyro > 0).map((r) => [r.key, r] as const))(
    '%s: the pyroelectric vector lies along the printed direction (ITC default setting)',
    (key, r) => {
      const basis = tensorForm(key, PYRO).basis;
      const axes = AXES[r.direction!];
      expect(axes, `direction ${r.direction}`).toBeDefined();
      const unit = (i: number) => [0, 1, 2].map((j) => (i === j ? 1 : 0));
      expect([0, 1, 2].filter((i) => matrixRank([...basis, unit(i)], 3) === basis.length)).toEqual(axes);
    },
  );

  it('isPiezoelectric: the 20 piezoelectric classes as printed (432 is not one)', () => {
    const printed = ROWS.filter((r) => r.piezo > 0).map((r) => r.key);
    expect(printed).toHaveLength(20);
    expect(POINT_GROUP_KEYS.filter((k) => isPiezoelectric(k)).sort()).toEqual([...printed].sort());
  });
});
