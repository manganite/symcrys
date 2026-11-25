/**
 * toVoigt and fromVoigt (#137 E3): shapes, the round trip, the defaults of the named properties and
 * the errors. The factors against print are in voigt.reference.test.ts, itcVolD.reference.test.ts
 * (§ 1.1.4.10.6) and itcMagnetic.reference.test.ts (Table 1.5.7.1).
 */

import { describe, expect, it } from 'vitest';
import * as classes from '../index.js';
import * as magnetic from '../magnetic.js';
import type { TensorSpec } from './tensorForm.js';

const spec = (rank: 2 | 3 | 4, intrinsic: TensorSpec['intrinsic']) =>
  ({ rank, kind: 'polar', timeParity: 'even', intrinsic }) as const;

describe('toVoigt and fromVoigt', () => {
  it('shapes: 6; 3 × 6 for the last pair, 6 × 3 for the first; 6 × 6 at rank 4', () => {
    const sym2 = classes.tensorForm('1', spec(2, 'symmetric-last-pair')).basis[0];
    expect(classes.toVoigt(sym2, spec(2, 'symmetric-last-pair'), { factors: [1] })).toHaveLength(6);
    const d = classes.tensorForm('1', 'piezoelectric').basis[0];
    const v3 = classes.toVoigt(d, 'piezoelectric') as readonly (readonly number[])[];
    expect([v3.length, v3[0].length]).toEqual([3, 6]);
    const e = classes.tensorForm('1', spec(3, 'symmetric-first-pair')).basis[0];
    const v3e = classes.toVoigt(e, spec(3, 'symmetric-first-pair'), { factors: [1] }) as readonly (readonly number[])[];
    expect([v3e.length, v3e[0].length]).toEqual([6, 3]);
    const s = classes.tensorForm('1', spec(4, 'symmetric-pairs')).basis[0];
    const v4 = classes.toVoigt(s, spec(4, 'symmetric-pairs'), { factors: [2, 2] }) as readonly (readonly number[])[];
    expect([v4.length, v4[0].length]).toEqual([6, 6]);
  });

  it('the round trip gives every basis tensor back, for every layout and factor', () => {
    const cases: [ReturnType<typeof spec>, (1 | 2)[]][] = [
      [spec(2, 'symmetric-first-pair'), [2]],
      [spec(2, 'totally-symmetric'), [1]],
      [spec(3, 'symmetric-last-pair'), [2]],
      [spec(3, 'symmetric-first-pair'), [1]],
      [spec(3, 'totally-symmetric'), [2]],
      [spec(4, 'symmetric-pairs'), [1, 2]],
      [spec(4, 'symmetric-pairs-exchangeable'), [2, 2]],
      [spec(4, 'totally-symmetric'), [1, 1]],
    ];
    for (const [s, factors] of cases) {
      for (const key of ['1', '3m', '6/mmm', 'm-3m'] as const) {
        for (const t of classes.tensorForm(key, s).basis) {
          const back = classes.fromVoigt(classes.toVoigt(t, s, { factors }), s, { factors });
          back.forEach((x, n) => expect(x, `${key} ${s.intrinsic} ${factors.join()}`).toBeCloseTo(t[n], 14));
        }
      }
    }
  });

  it('ITC § 1.1.4.10.4, group 3 (p. 25): ⊙ is twice minus the linked component for d, minus it for e', () => {
    const t = classes.tensorForm('3', 'piezoelectric').basis;
    // The basis tensor with d_111 = 1: d_11 = 1, d_12 = −1, d_26 = −2 (d), −1 for e_ijk read in the last pair.
    const one = t.find((b) => b[0] === 1)!;
    const d = classes.toVoigt(one, 'piezoelectric') as readonly (readonly number[])[];
    expect([d[0][0], d[0][1], d[1][5]]).toEqual([1, -1, -2]);
    const e = classes.toVoigt(one, spec(3, 'symmetric-last-pair'), { factors: [1] }) as readonly (readonly number[])[];
    expect([e[0][0], e[0][1], e[1][5]]).toEqual([1, -1, -1]);
  });

  it('the named properties: ITC’s factors for piezoelectric and piezomagnetic, none for the others', () => {
    const d = classes.tensorForm('-43m', 'piezoelectric').basis[0];
    expect(classes.toVoigt(d, 'piezoelectric')).toEqual(classes.toVoigt(d, 'piezoelectric', { factors: [2] }));
    const g = classes.tensorForm('422', 'gyrotropic').basis[0];
    expect(() => classes.toVoigt(g, 'gyrotropic')).toThrow(/give the factors/);
    expect(classes.toVoigt(g, 'gyrotropic', { factors: [1] })).toHaveLength(6);
    const lambda = magnetic.tensorForm("4'", 'piezomagnetic').basis[0];
    expect(magnetic.toVoigt(lambda, 'piezomagnetic')).toEqual(
      magnetic.toVoigt(lambda, 'piezomagnetic', { factors: [2] }),
    );
  });

  it('refuses a missing or wrong factor, a specification without a symmetric pair, and a tensor without its symmetry', () => {
    const s3 = spec(3, 'symmetric-last-pair');
    const t = classes.tensorForm('1', s3).basis[0];
    expect(() => classes.toVoigt(t, s3)).toThrow(/give the factors/);
    expect(() => classes.toVoigt(t, s3, { factors: [3 as never] })).toThrow(/1 or 2/);
    expect(() => classes.toVoigt(t, s3, { factors: [2, 2] })).toThrow(/1 or 2/);
    expect(() => classes.toVoigt(new Array(27).fill(0), spec(3, 'none'), { factors: [2] })).toThrow(
      /symmetric index pair/,
    );
    expect(() => classes.toVoigt([1, 0, 0], { rank: 1, kind: 'polar', intrinsic: 'none' }, { factors: [1] })).toThrow(
      /symmetric index pair/,
    );
    const asymmetric = [...t];
    asymmetric[5] += 1; // d_012 changed, d_021 not
    expect(() => classes.toVoigt(asymmetric, s3, { factors: [2] })).toThrow(/index symmetry/);
    expect(() => classes.toVoigt(t.slice(1), s3, { factors: [2] })).toThrow(/27 finite numbers/);
    // A 6 × 6 matrix that is not symmetric is no tensor with interchangeable pairs.
    const c = Array.from({ length: 6 }, (_, a) => Array.from({ length: 6 }, (__, b) => (a === 0 && b === 1 ? 1 : 0)));
    expect(() => classes.fromVoigt(c, spec(4, 'symmetric-pairs-exchangeable'), { factors: [1, 1] })).toThrow(
      /index symmetry/,
    );
    expect(() => classes.fromVoigt([[1, 2, 3]], spec(4, 'symmetric-pairs'), { factors: [1, 1] })).toThrow(/6 × 6/);
  });

  it('the crystallographic API refuses a time-odd tensor; the magnetic API takes it', () => {
    const odd = { rank: 3, kind: 'axial', timeParity: 'odd', intrinsic: 'symmetric-last-pair' } as const;
    expect(() => classes.toVoigt(new Array(27).fill(0), odd as never, { factors: [2] })).toThrow(/time-odd/);
    expect(magnetic.toVoigt(new Array(27).fill(0), odd, { factors: [2] })).toHaveLength(3);
  });

  it('results are frozen', () => {
    const v = classes.toVoigt(
      classes.tensorForm('1', 'piezoelectric').basis[0],
      'piezoelectric',
    ) as readonly (readonly number[])[];
    expect(Object.isFrozen(v) && Object.isFrozen(v[0])).toBe(true);
  });
});
