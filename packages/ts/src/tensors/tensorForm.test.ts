/**
 * The tensor API: what a form is (invariance, index symmetry, row echelon form, relations), how it
 * behaves under rotation and with settings, arbitrary operations, input checks, and
 * the use case of #30: the form of the SHG tensor at a surface, from the site symmetry of the
 * surface normal, compared with Yariv's Table 16.1 (print) for the site-symmetry groups.
 */

import { describe, expect, it } from 'vitest';
import { det, type Mat3, type Vec3 } from '../linalg.js';
import { operation, type CartesianOperation } from '../operations.js';
import { POINT_GROUP_KEYS, generators, operations, settings, type PointGroupKey } from '../pointGroups/pointGroups.js';
import { siteSymmetryOf } from '../siteSymmetry.js';
import { matrixRank, satisfies } from '../testUtils/rank.js';
import { YARIV_PANELS, basisScheme, printedScheme } from '../testUtils/yariv.js';
import {
  rotateTensor,
  rotateTensors,
  tensorForm,
  tensorFormOf,
  type IntrinsicSymmetry,
  type TensorKind,
  type TensorRank,
  type TensorSpec,
} from './tensorForm.js';

const spec = (
  rank: TensorRank,
  kind: TensorKind = 'polar',
  intrinsic: IntrinsicSymmetry = 'none',
  timeParity: 'even' | 'odd' = 'even',
): TensorSpec => ({ rank, kind, timeParity, intrinsic });

const SPECS: TensorSpec[] = [
  spec(0),
  spec(0, 'axial'),
  spec(1),
  spec(1, 'axial'),
  spec(2),
  spec(2, 'axial', 'symmetric-first-pair'),
  spec(3, 'polar', 'symmetric-last-pair'),
  spec(3, 'axial', 'symmetric-first-pair'),
  spec(4, 'polar', 'symmetric-pairs-exchangeable'),
  spec(4, 'axial', 'symmetric-pairs'),
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
              const sign = sp.kind === 'axial' ? Math.sign(det(op.cartesian)) : 1;
              if (!close(transform(b, op.cartesian, sp.rank, sign), b))
                failures.push(`setting ${s.index} rank ${sp.rank} ${sp.kind} row ${k}`);
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
      ['symmetric-first-pair', 3, [[1, 0, 2]]],
      ['symmetric-last-pair', 3, [[0, 2, 1]]],
      [
        'symmetric-pairs',
        4,
        [
          [1, 0, 2, 3],
          [0, 1, 3, 2],
        ],
      ],
      [
        'symmetric-pairs-exchangeable',
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

  it('is that of the requested setting, the ITC default without one', () => {
    // Class 2: ITC default unique axis b (setting 1), setting 2 unique axis c (docs/conventions.md, "Settings").
    expect(tensorForm('2', spec(1)).parameters).toEqual([[1]]);
    expect(tensorForm('2', spec(1), { setting: 2 }).parameters).toEqual([[2]]);
    expect(tensorForm('2', spec(1), { setting: '1 1 2' }).parameters).toEqual([[2]]);
    expect(() => tensorForm('2', spec(1), { convention: 'birss' } as never)).toThrow(/option convention was removed/);
  });

  it('time-odd tensors equal time-even ones for the 32 classes, which have no time reversal', () => {
    for (const key of POINT_GROUP_KEYS) {
      for (const sp of SPECS) expect(tensorForm(key, { ...sp, timeParity: 'odd' })).toEqual(tensorForm(key, sp));
    }
  });

  it('time reversal: a primed operation changes the sign of a time-odd tensor', () => {
    // 1' (grey group of 1): every time-odd tensor vanishes, every time-even one is free.
    const greyOne: CartesianOperation[] = [
      {
        cartesian: operation([
          [1, 0, 0],
          [0, 1, 0],
          [0, 0, 1],
        ]).cartesian,
        timeReversal: true,
      },
    ];
    expect(tensorFormOf(greyOne, spec(1, 'polar', 'none', 'odd')).basis).toHaveLength(0);
    expect(tensorFormOf(greyOne, spec(1)).basis).toHaveLength(3);
  });
});

describe('index symmetries, counts for class 1 and between symmetries', () => {
  const n = (key: PointGroupKey, rank: TensorRank, intrinsic: IntrinsicSymmetry) =>
    tensorForm(key, spec(rank, 'polar', intrinsic)).basis.length;

  it('class 1: rank 3 symmetric-first-pair 18, rank 4 symmetric-pairs 36, -exchangeable 21, rank 2 symmetric 6', () => {
    expect([
      n('1', 3, 'symmetric-first-pair'),
      n('1', 4, 'symmetric-pairs'),
      n('1', 4, 'symmetric-pairs-exchangeable'),
      n('1', 2, 'symmetric-first-pair'),
      n('1', 2, 'symmetric-last-pair'),
    ]).toEqual([18, 36, 21, 6, 6]);
  });

  it('rank 3: the first and the last pair give equal counts for every class; rank 4: exchangeable ≤ pairs ≤ none', () => {
    for (const key of POINT_GROUP_KEYS) {
      expect(n(key, 3, 'symmetric-first-pair'), key).toBe(n(key, 3, 'symmetric-last-pair'));
      expect(
        n(key, 4, 'symmetric-pairs-exchangeable') <= n(key, 4, 'symmetric-pairs') &&
          n(key, 4, 'symmetric-pairs') <= n(key, 4, 'none'),
        key,
      ).toBe(true);
    }
  });
});

describe("the index symmetries 'antisymmetric' and 'totally-symmetric'", () => {
  const MAGNETIC = [...POINT_GROUP_KEYS, "4'mm'", "6'/m'mm'", "mm'm'", "-3'm", "2221'", "m-3m1'"] as const;
  const count = (key: string, s: TensorSpec, setting = 1) =>
    tensorForm(key as PointGroupKey, s, { setting }).parameters.length;

  it('counts for class 1: an antisymmetric rank-2 tensor has 3, a totally symmetric one 6, 10, 15', () => {
    expect(count('1', spec(2, 'polar', 'antisymmetric'))).toBe(3);
    expect(count('1', spec(2, 'polar', 'totally-symmetric'))).toBe(6);
    expect(count('1', spec(3, 'polar', 'totally-symmetric'))).toBe(10);
    expect(count('1', spec(4, 'polar', 'totally-symmetric'))).toBe(15);
  });

  it('an antisymmetric polar (axial) rank-2 tensor is the dual of an axial (polar) vector, in every setting', () => {
    // t_ij = ε_ijk v_k: ε is an axial tensor, so the kind changes; the time parity does not.
    for (const key of MAGNETIC) {
      for (const s of settings(key as PointGroupKey)) {
        for (const timeParity of ['even', 'odd'] as const) {
          for (const [k2, k1] of [
            ['polar', 'axial'],
            ['axial', 'polar'],
          ] as const) {
            const form = tensorForm(key as PointGroupKey, spec(2, k2, 'antisymmetric', timeParity), {
              setting: s.index,
            });
            const vector = tensorForm(key as PointGroupKey, spec(1, k1, 'none', timeParity), { setting: s.index });
            expect(form.parameters.length, `${key} #${s.index} ${k2} ${timeParity}`).toBe(vector.parameters.length);
            // Each row is ε_ijk v_k for a v of the vector form.
            for (const row of form.basis) {
              const v = [row[5], row[6], row[1]]; // t_yz = v_x, t_zx = v_y, t_xy = v_z
              expect(
                row.map((x, f) => x + row[3 * (f % 3) + Math.floor(f / 3)]).every((x) => Math.abs(x) < 1e-12),
              ).toBe(true);
              expect(satisfies([v], vector.relations), `${key} #${s.index}`).toBe(true);
            }
          }
        }
      }
    }
  });

  it('a totally symmetric tensor is symmetric in every pair of indices and lies in the forms with fewer symmetries', () => {
    const permute = (b: readonly number[], rank: number, perm: number[]) =>
      b.map((_, f) => {
        const i = INDICES[rank][f];
        return b[perm.map((p) => i[p]).reduce((a, x) => a * 3 + x, 0)];
      });
    for (const key of MAGNETIC) {
      for (const rank of [2, 3, 4] as const) {
        const total = tensorForm(key as PointGroupKey, spec(rank, 'polar', 'totally-symmetric'));
        const last = tensorForm(key as PointGroupKey, spec(rank, 'polar', 'symmetric-last-pair'));
        for (const row of total.basis) {
          for (let k = 0; k + 1 < rank; k++) {
            const perm = Array.from({ length: rank }, (_, j) => (j === k ? k + 1 : j === k + 1 ? k : j));
            expect(permute(row, rank, perm), `${key} rank ${rank}`).toEqual(row);
          }
          expect(satisfies([row], last.relations), `${key} rank ${rank}`).toBe(true);
        }
        expect(total.parameters.length).toBeLessThanOrEqual(last.parameters.length);
      }
    }
  });

  it('their numbers of parameters equal the rank of the group average times the symmetriser, built here independently', () => {
    // The tensor representation as Kronecker powers of the matrices, the index symmetry as the mean
    // of the permutation matrices (with signs for 'antisymmetric'): rank(P·S) is the dimension of the
    // invariant tensors with that symmetry. Independent of the signed orbits of the library.
    const kron = (a: number[][], b: number[][]) =>
      a.flatMap((ra) => b.map((rb) => ra.flatMap((x) => rb.map((y) => x * y))));
    const permutations = (n: number): number[][] =>
      n === 1
        ? [[0]]
        : permutations(n - 1).flatMap((p) =>
            Array.from({ length: n }, (_, k) => [...p.slice(0, k), n - 1, ...p.slice(k)]),
          );
    const parity = (p: number[]) => {
      let s = 1;
      for (let i = 0; i < p.length; i++) for (let j = i + 1; j < p.length; j++) if (p[i] > p[j]) s = -s;
      return s;
    };
    for (const key of ['1', '2/m', 'mm2', '-42m', '3m', '6/mmm', '23', 'm-3m', "4'mm'", "-3'm", "m-3m1'"] as const) {
      const ops = operations(key as PointGroupKey);
      for (const [rank, intrinsic] of [
        [2, 'antisymmetric'],
        [2, 'totally-symmetric'],
        [3, 'totally-symmetric'],
        [4, 'totally-symmetric'],
      ] as const) {
        const dim = 3 ** rank;
        const signed = intrinsic === 'antisymmetric';
        const sym = Array.from({ length: dim }, () => new Array<number>(dim).fill(0));
        const perms = permutations(rank);
        for (const p of perms) {
          for (let f = 0; f < dim; f++) {
            const g = p.map((k) => INDICES[rank][f][k]).reduce((acc, x) => acc * 3 + x, 0);
            sym[g][f] += (signed ? parity(p) : 1) / perms.length;
          }
        }
        for (const kind of ['polar', 'axial'] as const) {
          for (const timeParity of ['even', 'odd'] as const) {
            const avg = Array.from({ length: dim }, () => new Array<number>(dim).fill(0));
            for (const op of ops) {
              let m: number[][] = [[1]];
              for (let r = 0; r < rank; r++)
                m = kron(
                  m,
                  op.cartesian.map((row) => [...row]),
                );
              const sign =
                (kind === 'axial' ? Math.sign(det(op.cartesian)) : 1) *
                (timeParity === 'odd' && op.timeReversal ? -1 : 1);
              for (let i = 0; i < dim; i++) for (let j = 0; j < dim; j++) avg[i][j] += (sign * m[i][j]) / ops.length;
            }
            const product = avg.map((row) => sym[0].map((_, j) => row.reduce((acc, x, k) => acc + x * sym[k][j], 0)));
            expect(
              count(key, spec(rank, kind, intrinsic, timeParity)),
              `${key} rank ${rank} ${intrinsic} ${kind} ${timeParity}`,
            ).toBe(matrixRank(product, dim));
          }
        }
      }
    }
  });

  it('refuses them at ranks where they do not apply', () => {
    expect(() => tensorForm('1', spec(3, 'polar', 'antisymmetric'))).toThrow(/needs rank 2/);
    expect(() => tensorForm('1', spec(1, 'polar', 'totally-symmetric'))).toThrow(/needs rank 2 or more/);
  });
});

describe('the names of a tensor specification up to 0.10', () => {
  it('are refused with the names that replace them', () => {
    const old = { rank: 3, parity: 'polar', timeParity: 'i', intrinsic: 'jk' } as unknown as TensorSpec;
    expect(() => tensorForm('1', old)).toThrow(/named kind since symcrys 0.11/);
    expect(() => tensorForm('1', { ...spec(3), timeParity: 'c' as never })).toThrow(/'c' up to symcrys 0.10 is 'odd'/);
    expect(() => tensorForm('1', { ...spec(3), intrinsic: 'jk' as never })).toThrow(
      /'jk' up to symcrys 0.10 is 'symmetric-last-pair'/,
    );
    expect(() => tensorForm('1', { ...spec(4), intrinsic: 'voigt' as never })).toThrow(
      /'symmetric-pairs-exchangeable'/,
    );
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
          cartesian: product(
            product(R1, op.cartesian),
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

describe('rotateTensors', () => {
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
  const improper = rot([-2, 1, 0.5], 111).map((r) => r.map((x) => -x)) as unknown as Mat3;
  const I: Mat3 = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];

  it('rotates each tensor by one rotation or by its own, as the independent transformation does', () => {
    for (const rank of [0, 1, 2, 3, 4] as const) {
      const dim = 3 ** rank;
      const list = [0, 1, 2].map((k) => Array.from({ length: dim }, (_, i) => Math.sin(7 * k + i + 1)));
      for (const kind of ['polar', 'axial'] as const) {
        const sp = spec(rank, kind);
        const f = (r: Mat3) => (kind === 'axial' ? Math.sign(det(r)) : 1);
        const one = rotateTensors(list, improper, sp);
        expect(one).toHaveLength(3);
        one.forEach((t, k) =>
          expect(close(t, transform(list[k], improper, rank, f(improper))), `${rank} ${kind}`).toBe(true),
        );
        const each = [R1, improper, I];
        rotateTensors(list, each, sp).forEach((t, k) =>
          expect(close(t, transform(list[k], each[k], rank, f(each[k]))), `${rank} ${kind} ${k}`).toBe(true),
        );
      }
    }
  });

  it('gives what rotateTensor gives, bit for bit, and frozen', () => {
    const list = [0, 1].map((k) => Array.from({ length: 27 }, (_, i) => Math.cos(5 * k + i)));
    const sp = spec(3, 'axial');
    const got = rotateTensors(list, [R1, improper], sp);
    expect(got).toEqual([rotateTensor(list[0], R1, sp), rotateTensor(list[1], improper, sp)]);
    expect(Object.isFrozen(got) && got.every((t) => Object.isFrozen(t))).toBe(true);
  });

  it('an empty list of tensors gives an empty list, and still checks the rotation and the specification', () => {
    expect(rotateTensors([], R1, spec(2))).toEqual([]);
    expect(rotateTensors([], [], spec(2))).toEqual([]);
    expect(() =>
      rotateTensors(
        [],
        [
          [2, 0, 0],
          [0, 1, 0],
          [0, 0, 1],
        ] as Mat3,
        spec(1),
      ),
    ).toThrow(/The rotation is not an orthogonal/);
    expect(() => rotateTensors([], R1, { ...spec(1), rank: 5 as TensorRank })).toThrow(RangeError);
  });

  it('refuses lists of other lengths, wrong rotations and wrong tensors, naming the one', () => {
    const v = [1, 0, 0];
    // One tensor or rotation is singular in the message (review of #249).
    expect(() => rotateTensors([v], [R1, R1], spec(1))).toThrow(/^1 tensor and 2 rotations:/);
    expect(() => rotateTensors([], [R1], spec(1))).toThrow(/^0 tensors and 1 rotation:/);
    // A rotation with a wrong row is one rotation with that row, not a list (review of #249).
    const badRow = [[1, 0, 0], [0, 1, 0], [[0], 0, 1]] as unknown as Mat3; // prettier-ignore
    expect(() => rotateTensors([v], badRow, spec(1))).toThrow(/Row 2 of the rotation must be 3 finite numbers/);
    expect(() => rotateTensors([v, v, v], [R1, R1], spec(1))).toThrow(
      /3 tensors and 2 rotations: pass one rotation for all, or one per tensor/,
    );
    expect(() =>
      rotateTensors(
        [v, v],
        [
          R1,
          [
            [2, 0, 0],
            [0, 1, 0],
            [0, 0, 1],
          ] as Mat3,
        ],
        spec(1),
      ),
    ).toThrow(/Rotation 1 is not an orthogonal/);
    expect(() =>
      rotateTensors(
        [v, v],
        [
          R1,
          [
            [1, 0, 0],
            [0, 1],
            [0, 0, 1],
          ] as unknown as Mat3,
        ],
        spec(1),
      ),
    ).toThrow(/Row 1 of rotation 1/);
    expect(() => rotateTensors([v, [1, 2]], R1, spec(1))).toThrow(
      /Tensor 1 must have 3 components \(rank 1\), not \[1,2\]/,
    );
    expect(() => rotateTensors([v, [1, Number.NaN, 0]], R1, spec(1))).toThrow(/Tensor 1/);
    // eslint-disable-next-line no-sparse-arrays
    expect(() => rotateTensors([v, , v] as never, R1, spec(1))).toThrow(/Tensor 1/);
    expect(() => rotateTensors(v as never, R1, spec(1))).toThrow(RangeError);
    expect(() => rotateTensors({} as never, R1, spec(1))).toThrow(/a list of tensors/);
    expect(() => rotateTensors([v], R1, spec(1), { tolerance: 1e-3, x: 1 } as never)).toThrow(RangeError);
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

  it('takes its parameters from the pivots of the reduction, also for operations with float noise (#88)', () => {
    // Noise below the orthogonality check leaves entries in the basis that are too small to be a
    // pivot; before #88 the parameters were read as the first non-zero entry of each row, and
    // 4mm with a noise of 1e-9 gave the parameters xxx, zxx, zzz instead of xxz, zxx, zzz.
    const noisy = (ops: readonly CartesianOperation[], eps: number): CartesianOperation[] =>
      ops.map((op) => ({ ...op, cartesian: op.cartesian.map((row) => row.map((x) => x + eps)) as unknown as Mat3 }));
    for (const key of POINT_GROUP_KEYS) {
      for (const sp of SPECS) {
        const form = tensorFormOf(noisy(operations(key), 1e-9), sp);
        const dim = 3 ** sp.rank;
        expect(form.parameters, `${key} ${JSON.stringify(sp)}`).toEqual(tensorForm(key, sp).parameters);
        expect(form.relations).toHaveLength(dim - form.basis.length);
        expect(satisfies(form.basis, form.relations, 1e-6)).toBe(true);
        expect(matrixRank(form.relations, dim)).toBe(dim - form.basis.length);
      }
    }
    expect(tensorFormOf(noisy(operations('4mm'), 2e-8), spec(3, 'polar', 'symmetric-last-pair')).parameters).toEqual([
      [0, 0, 2],
      [2, 0, 0],
      [2, 2, 2],
    ]);
  });

  it('an empty list is the group 1', () => {
    expect(tensorFormOf([], spec(3, 'polar', 'symmetric-last-pair'))).toEqual(
      tensorForm('1', spec(3, 'polar', 'symmetric-last-pair')),
    );
  });
});

describe('input checks', () => {
  it('rejects unknown keys, settings, ranks, parities and index symmetries that do not apply', () => {
    expect(() => tensorForm('7' as PointGroupKey, spec(1))).toThrow(RangeError);
    expect(() => tensorForm('2', spec(1), { setting: 4 })).toThrow(RangeError);
    expect(() => tensorForm('2', { ...spec(1), rank: 5 as TensorRank })).toThrow(RangeError);
    expect(() => tensorForm('2', { ...spec(1), kind: 'odd' as TensorKind })).toThrow(RangeError);
    expect(() => tensorForm('2', { ...spec(1), timeParity: 'x' as 'even' })).toThrow(RangeError);
    expect(() => tensorForm('2', spec(1, 'polar', 'symmetric-first-pair'))).toThrow(RangeError);
    expect(() => tensorForm('2', spec(3, 'polar', 'symmetric-pairs-exchangeable'))).toThrow(RangeError);
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
    const threefold: CartesianOperation = operation([
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
    const f = tensorForm('mm2', spec(3, 'polar', 'symmetric-last-pair'));
    expect(Object.isFrozen(f) && Object.isFrozen(f.basis) && f.basis.every((r) => Object.isFrozen(r))).toBe(true);
    expect(Object.isFrozen(f.parameters) && Object.isFrozen(f.relations)).toBe(true);
  });
});

describe('use case of #30: SHG at the surfaces of an m-3m crystal, against Yariv Table 16.1', () => {
  const SHG = spec(3, 'polar', 'symmetric-last-pair');
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
      const site = siteSymmetryOf(ops, c.normal).operations.map((i) => ops[i]);
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
  it('tensorForm takes magnetic keys and agrees with tensorFormOf of their operations', () => {
    const spec = { rank: 1, kind: 'axial', timeParity: 'odd', intrinsic: 'none' } as const;
    for (const key of ["m'm'2", "2221'", "-6'2m'"] as const) {
      expect(tensorForm(key, spec)).toEqual(tensorFormOf(operations(key), spec));
    }
    expect(tensorForm("m'm'2", spec).basis).toHaveLength(1);
    expect(tensorForm("2221'", spec).basis).toHaveLength(0);
    expect(() => tensorForm('nonsense' as never, spec)).toThrow(/Unknown point group key/);
  });

  it('tensorFormOf takes their operations: a grey group allows no time-odd tensor', () => {
    // Time reversal alone changes the sign of a time-odd tensor, so it must vanish.
    for (const rank of [1, 2, 3] as const) {
      for (const kind of ['polar', 'axial'] as const) {
        const spec = { rank, kind, timeParity: 'odd', intrinsic: 'none' } as const;
        expect(tensorFormOf(operations("mm21'"), spec).basis).toHaveLength(0);
        expect(tensorFormOf(operations("11'"), spec).basis).toHaveLength(0);
      }
    }
  });
});
