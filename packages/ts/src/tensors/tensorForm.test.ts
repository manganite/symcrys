/**
 * The tensor API: what a form is (invariance, index symmetry, row echelon form, relations), how it
 * behaves under rotation and with settings and conventions, arbitrary operations, input checks, and
 * the use case of #30: the form of the SHG tensor at a surface, from the site symmetry of the
 * surface normal, compared with Yariv's Table 16.1 (print) for the site-symmetry groups.
 */

import { describe, expect, it } from 'vitest';
import { det, type Mat3, type Vec3 } from '../linalg.js';
import { operation, type Operation } from '../operations.js';
import { POINT_GROUP_KEYS, generators, operations, settings, type PointGroupKey } from '../pointGroups/pointGroups.js';
import { isPiezoelectric } from '../pointGroups/properties.js';
import { siteSymmetry } from '../siteSymmetry.js';
import { matrixRank, satisfies } from '../testUtils/rank.js';
import { YARIV_PANELS, basisScheme, printedScheme } from '../testUtils/yariv.js';
import {
  rotateTensor,
  tensorForm,
  tensorFormOf,
  type IntrinsicSymmetry,
  type TensorParity,
  type TensorRank,
  type TensorSpec,
} from './tensorForm.js';

const spec = (
  rank: TensorRank,
  parity: TensorParity = 'polar',
  intrinsic: IntrinsicSymmetry = 'none',
  timeParity: 'i' | 'c' = 'i',
): TensorSpec => ({ rank, parity, timeParity, intrinsic });

const SPECS: TensorSpec[] = [
  spec(0),
  spec(0, 'axial'),
  spec(1),
  spec(1, 'axial'),
  spec(2),
  spec(2, 'axial', 'ij'),
  spec(3, 'polar', 'jk'),
  spec(3, 'axial', 'ij'),
  spec(4, 'polar', 'voigt'),
  spec(4, 'axial', 'ij_kl'),
];

/** Indices of every flat index at a rank, first index first. */
const INDICES = [0, 1, 2, 3, 4].map((rank) =>
  Array.from({ length: 3 ** rank }, (_, f) =>
    Array.from({ length: rank }, (_, k) => Math.floor(f / 3 ** (rank - 1 - k)) % 3),
  ),
);

/** Independent of the library: (sign · R⊗…⊗R) applied to v, by explicit index loops. */
function transform(v: readonly number[], r: Mat3, rank: number, sign: number): number[] {
  const ix = INDICES[rank];
  return ix.map((oi) => {
    let s = 0;
    ix.forEach((ai, a) => {
      if (v[a] === 0) return;
      let p = v[a];
      for (let k = 0; k < rank; k++) p *= r[oi[k]][ai[k]];
      s += p;
    });
    return sign * s;
  });
}

const close = (a: readonly number[], b: readonly number[]) => a.every((x, i) => Math.abs(x - b[i]) < 1e-9);
const sameSpan = (a: readonly (readonly number[])[], b: readonly (readonly number[])[], dim: number) =>
  a.length === b.length && matrixRank([...a, ...b], dim) === a.length;

describe('a tensor form', () => {
  // The set of operations of a setting is the same in both conventions (docs/conventions.md, "Settings").
  for (const key of POINT_GROUP_KEYS) {
    it(`${key}: is invariant under every operation, in every setting`, () => {
      const failures: string[] = [];
      for (const s of settings(key)) {
        const ops = operations(key, { setting: s.index });
        for (const sp of SPECS) {
          tensorForm(key, sp, { setting: s.index }).basis.forEach((b, k) => {
            for (const op of ops) {
              const sign = sp.parity === 'axial' ? Math.sign(det(op.matrix)) : 1;
              if (!close(transform(b, op.matrix, sp.rank, sign), b))
                failures.push(`setting ${s.index} rank ${sp.rank} ${sp.parity} row ${k}`);
            }
          });
        }
      }
      expect(failures).toEqual([]);
    });
  }

  it('has the index symmetry it was asked for', () => {
    const swapped = (b: readonly number[], rank: number, perm: number[]) =>
      b.map((_, f) => {
        const i = Array.from({ length: rank }, (_, k) => Math.floor(f / 3 ** (rank - 1 - k)) % 3);
        return b[perm.map((p) => i[p]).reduce((a, x) => a * 3 + x, 0)];
      });
    const cases: [IntrinsicSymmetry, TensorRank, number[][]][] = [
      ['ij', 3, [[1, 0, 2]]],
      ['jk', 3, [[0, 2, 1]]],
      [
        'ij_kl',
        4,
        [
          [1, 0, 2, 3],
          [0, 1, 3, 2],
        ],
      ],
      [
        'voigt',
        4,
        [
          [1, 0, 2, 3],
          [0, 1, 3, 2],
          [2, 3, 0, 1],
        ],
      ],
    ];
    for (const [intrinsic, rank, perms] of cases) {
      for (const b of tensorForm('1', spec(rank, 'polar', intrinsic)).basis) {
        for (const p of perms) expect(close(swapped(b, rank, p), b), intrinsic).toBe(true);
      }
    }
  });

  it('is in reduced row echelon form, with the parameters at the pivots', () => {
    for (const key of POINT_GROUP_KEYS) {
      for (const sp of SPECS) {
        const { basis, parameters, rank } = tensorForm(key, sp);
        const flat = parameters.map((p) => p.reduce((a, x) => a * 3 + x, 0));
        expect(parameters.every((p) => p.length === rank)).toBe(true);
        expect(
          [...flat].sort((a, b) => a - b),
          key,
        ).toEqual(flat);
        basis.forEach((row, k) => {
          expect(row.findIndex((x) => x !== 0)).toBe(flat[k]);
          flat.forEach((p, j) => expect(row[p]).toBe(j === k ? 1 : 0));
        });
      }
    }
  });

  it('has exact entries for the 32 classes in all settings: 0, ±1/2, ±1, ±2', () => {
    const exact = new Set([0, 0.5, -0.5, 1, -1, 2, -2]);
    for (const key of POINT_GROUP_KEYS) {
      for (const s of settings(key)) {
        for (const sp of SPECS) {
          for (const row of tensorForm(key, sp, { setting: s.index }).basis) {
            expect(
              row.filter((x) => !exact.has(x)),
              `${key} ${s.index}`,
            ).toEqual([]);
          }
        }
      }
    }
  });

  it('has relations that hold for the form and leave exactly it', () => {
    for (const key of POINT_GROUP_KEYS) {
      for (const sp of SPECS) {
        const { basis, relations } = tensorForm(key, sp);
        const dim = 3 ** sp.rank;
        expect(relations).toHaveLength(dim - basis.length);
        expect(satisfies(basis, relations, 1e-12)).toBe(true);
        expect(matrixRank(relations, dim)).toBe(dim - basis.length);
      }
    }
  });

  it('is the same for a setting index in both conventions; the convention picks only the default', () => {
    for (const key of POINT_GROUP_KEYS) {
      for (const s of settings(key)) {
        for (const sp of SPECS) {
          expect(tensorForm(key, sp, { setting: s.index, convention: 'itc' })).toEqual(
            tensorForm(key, sp, { setting: s.index, convention: 'birss' }),
          );
        }
      }
    }
    // Class 2: ITC default unique axis b, Birss unique axis c (docs/conventions.md, "Settings").
    expect(tensorForm('2', spec(1)).parameters).toEqual([[1]]);
    expect(tensorForm('2', spec(1), { convention: 'birss' }).parameters).toEqual([[2]]);
  });

  it('c-tensors equal i-tensors for the 32 classes, which have no time reversal', () => {
    for (const key of POINT_GROUP_KEYS) {
      for (const sp of SPECS) expect(tensorForm(key, { ...sp, timeParity: 'c' })).toEqual(tensorForm(key, sp));
    }
  });

  it('time reversal: a primed operation changes the sign of a c-tensor', () => {
    // 1' (grey group of 1): every c-tensor vanishes, every i-tensor is free.
    const greyOne: Operation[] = [
      {
        matrix: operation([
          [1, 0, 0],
          [0, 1, 0],
          [0, 0, 1],
        ]).matrix,
        timeReversal: true,
      },
    ];
    expect(tensorFormOf(greyOne, spec(1, 'polar', 'none', 'c')).basis).toHaveLength(0);
    expect(tensorFormOf(greyOne, spec(1)).basis).toHaveLength(3);
  });
});

describe('index symmetries, counts for class 1 and between symmetries', () => {
  const n = (key: PointGroupKey, rank: TensorRank, intrinsic: IntrinsicSymmetry) =>
    tensorForm(key, spec(rank, 'polar', intrinsic)).basis.length;

  it('class 1: rank 3 ij 18, rank 4 ij_kl 36, voigt 21, rank 2 ij and jk 6', () => {
    expect([n('1', 3, 'ij'), n('1', 4, 'ij_kl'), n('1', 4, 'voigt'), n('1', 2, 'ij'), n('1', 2, 'jk')]).toEqual([
      18, 36, 21, 6, 6,
    ]);
  });

  it('rank 3: ij and jk give equal counts for every class; rank 4: voigt ≤ ij_kl ≤ none', () => {
    for (const key of POINT_GROUP_KEYS) {
      expect(n(key, 3, 'ij'), key).toBe(n(key, 3, 'jk'));
      expect(n(key, 4, 'voigt') <= n(key, 4, 'ij_kl') && n(key, 4, 'ij_kl') <= n(key, 4, 'none'), key).toBe(true);
    }
  });
});

describe('rotateTensor', () => {
  const rot = (axis: Vec3, deg: number): Mat3 => {
    const [x, y, z] = axis.map((c) => c / Math.hypot(...axis));
    const c = Math.cos((deg * Math.PI) / 180);
    const s = Math.sin((deg * Math.PI) / 180);
    const t = 1 - c;
    return [
      [t * x * x + c, t * x * y - s * z, t * x * z + s * y],
      [t * x * y + s * z, t * y * y + c, t * y * z - s * x],
      [t * x * z - s * y, t * y * z + s * x, t * z * z + c],
    ];
  };
  const R1 = rot([1, 2, 3], 37);
  const R2 = rot([-2, 1, 0.5], 111);
  const product = (a: Mat3, b: Mat3): Mat3 =>
    [0, 1, 2].map((i) =>
      [0, 1, 2].map((j) => a[i][0] * b[0][j] + a[i][1] * b[1][j] + a[i][2] * b[2][j]),
    ) as unknown as Mat3;

  it('agrees with the independent transformation, polar and axial, proper and improper', () => {
    const t = Array.from({ length: 27 }, (_, i) => Math.sin(i + 1));
    const improper = R1.map((r) => r.map((x) => -x)) as unknown as Mat3;
    for (const r of [R1, improper]) {
      expect(close(rotateTensor(t, r, spec(3)), transform(t, r, 3, 1))).toBe(true);
      expect(close(rotateTensor(t, r, spec(3, 'axial')), transform(t, r, 3, Math.sign(det(r))))).toBe(true);
    }
  });

  it('composes: R2 after R1 is R2·R1', () => {
    const t = Array.from({ length: 81 }, (_, i) => Math.cos(3 * i));
    expect(
      close(rotateTensor(rotateTensor(t, R1, spec(4)), R2, spec(4)), rotateTensor(t, product(R2, R1), spec(4))),
    ).toBe(true);
  });

  it('is covariant with the form: the rotated form is the form under the rotated operations', () => {
    for (const key of ['3m', '-42m', 'm-3', '6/m'] as const) {
      for (const sp of SPECS) {
        const rotatedOps = operations(key).map((op) => ({
          matrix: product(
            product(R1, op.matrix),
            [0, 1, 2].map((i) => [0, 1, 2].map((j) => R1[j][i])) as unknown as Mat3,
          ),
          timeReversal: op.timeReversal,
        }));
        const dim = 3 ** sp.rank;
        const rotated = tensorForm(key, sp).basis.map((b) => rotateTensor(b, R1, sp));
        expect(sameSpan(rotated, tensorFormOf(rotatedOps, sp).basis, dim), `${key} rank ${sp.rank}`).toBe(true);
      }
    }
  });
});

describe('tensorFormOf', () => {
  it('equals tensorForm for the operations of a class, and closes a list of generators first', () => {
    for (const key of POINT_GROUP_KEYS) {
      for (const sp of SPECS) {
        expect(tensorFormOf(operations(key), sp)).toEqual(tensorForm(key, sp));
        expect(tensorFormOf(generators(key), sp)).toEqual(tensorForm(key, sp));
      }
    }
  });

  it('an empty list is the group 1', () => {
    expect(tensorFormOf([], spec(3, 'polar', 'jk'))).toEqual(tensorForm('1', spec(3, 'polar', 'jk')));
  });
});

describe('input checks', () => {
  it('rejects unknown keys, settings, ranks, parities and index symmetries that do not apply', () => {
    expect(() => tensorForm('7' as PointGroupKey, spec(1))).toThrow(RangeError);
    expect(() => tensorForm('2', spec(1), { setting: 3 })).toThrow(RangeError);
    expect(() => tensorForm('2', { ...spec(1), rank: 5 as TensorRank })).toThrow(RangeError);
    expect(() => tensorForm('2', { ...spec(1), parity: 'odd' as TensorParity })).toThrow(RangeError);
    expect(() => tensorForm('2', { ...spec(1), timeParity: 'x' as 'i' })).toThrow(RangeError);
    expect(() => tensorForm('2', spec(1, 'polar', 'ij'))).toThrow(RangeError);
    expect(() => tensorForm('2', spec(3, 'polar', 'voigt'))).toThrow(RangeError);
    expect(() => tensorForm('2', spec(3, 'polar', 'kl' as IntrinsicSymmetry))).toThrow(RangeError);
    expect(() =>
      rotateTensor(
        [1, 2],
        [
          [1, 0, 0],
          [0, 1, 0],
          [0, 0, 1],
        ],
        spec(1),
      ),
    ).toThrow(RangeError);
    // Not Cartesian: a threefold axis in the lattice basis, a stretch.
    const threefold: Operation = operation([
      [0, -1, 0],
      [1, -1, 0],
      [0, 0, 1],
    ]);
    expect(() => tensorFormOf([threefold], spec(1))).toThrow(RangeError);
    expect(() =>
      rotateTensor(
        [1, 0, 0],
        [
          [2, 0, 0],
          [0, 1, 0],
          [0, 0, 1],
        ],
        spec(1),
      ),
    ).toThrow(RangeError);
  });

  it('returns frozen results', () => {
    const f = tensorForm('mm2', spec(3, 'polar', 'jk'));
    expect(Object.isFrozen(f) && Object.isFrozen(f.basis) && f.basis.every((r) => Object.isFrozen(r))).toBe(true);
    expect(Object.isFrozen(f.parameters) && Object.isFrozen(f.relations)).toBe(true);
  });
});

describe('use case of #30: SHG at the surfaces of an m-3m crystal, against Yariv Table 16.1', () => {
  const SHG = spec(3, 'polar', 'jk');
  const unit = (v: Vec3): Vec3 => v.map((c) => c / Math.hypot(...v)) as unknown as Vec3;
  const cross = (a: Vec3, b: Vec3): Vec3 => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];

  /**
   * Surface frame: z along the normal, x along the normal of a mirror containing it (Yariv's
   * orientation of 4mm, mm2 and 3m, m ⊥ x1), y = z × x. Rows are the new axes in the cubic frame.
   */
  const cases: { surface: string; normal: Vec3; x: Vec3; panel: string; order: number }[] = [
    { surface: '(001)', normal: [0, 0, 1], x: [1, 0, 0], panel: 'class-4mm', order: 8 },
    { surface: '(110)', normal: [1, 1, 0], x: [0, 0, 1], panel: 'class-mm2', order: 4 },
    { surface: '(111)', normal: [1, 1, 1], x: [1, -1, 0], panel: 'class-3m-perpx1', order: 6 },
  ];

  it('no SHG from the bulk', () => {
    expect(tensorForm('m-3m', SHG).basis).toHaveLength(0);
  });

  for (const c of cases) {
    it(`${c.surface}: the form at the surface is Yariv's ${c.panel.replace('class-', '')}`, () => {
      const ops = operations('m-3m');
      const site = siteSymmetry(ops, c.normal).operations.map((i) => ops[i]);
      expect(site).toHaveLength(c.order);
      const z = unit(c.normal);
      const x = unit(c.x);
      const frame: Mat3 = [x, cross(z, x), z];
      const basis = tensorFormOf(site, SHG).basis.map((b) => rotateTensor(b, frame, SHG));
      const panel = YARIV_PANELS.find((p) => p.id === c.panel)!;
      expect(basis).toHaveLength(panel.printedCount);
      const got = basisScheme(basis);
      const want = printedScheme(panel);
      expect(got.partition).toBe(want.partition);
      for (const [cell, sign] of want.signs) expect(got.signs.get(cell), cell).toBeCloseTo(sign, 9);
    });
  }
});

describe('magnetic point groups', () => {
  it('tensorForm and isPiezoelectric take the crystal classes only, until the forms are anchored (#13, #41)', () => {
    const spec = { rank: 1, parity: 'axial', timeParity: 'c', intrinsic: 'none' } as const;
    for (const key of ["m'm'2", "2221'"]) {
      expect(() => tensorForm(key as never, spec)).toThrow(/32 crystal classes so far/);
      expect(() => isPiezoelectric(key as never)).toThrow(RangeError);
    }
    expect(() => tensorForm('nonsense' as never, spec)).toThrow(/Unknown point group key/);
  });

  it('tensorFormOf takes their operations: a grey group allows no time-odd tensor', () => {
    // Time reversal alone changes the sign of a time-odd tensor, so it must vanish.
    for (const rank of [1, 2, 3] as const) {
      for (const parity of ['polar', 'axial'] as const) {
        const spec = { rank, parity, timeParity: 'c', intrinsic: 'none' } as const;
        expect(tensorFormOf(operations("mm21'"), spec).basis).toHaveLength(0);
        expect(tensorFormOf(operations("11'"), spec).basis).toHaveLength(0);
      }
    }
  });
});
