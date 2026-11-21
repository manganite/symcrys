import { describe, expect, it } from 'vitest';
import { apply, det, inverse, matricesEqual, multiply, transpose, type Mat3, type Vec3 } from '../linalg.js';
import { latticeBasis } from '../lattice.js';
import { latticeOperations, orbit, orbitOf } from './orbits.js';
import { MAGNETIC_POINT_GROUP_KEYS, POINT_GROUP_KEYS, operations, settings } from './pointGroups.js';
import { wyckoffPositions } from './wyckoff.js';

const ALL_SETTINGS = POINT_GROUP_KEYS.flatMap((key) => settings(key, 'itc').map((s) => ({ key, s })));

describe('latticeOperations', () => {
  for (const key of MAGNETIC_POINT_GROUP_KEYS) {
    it(`are integer matrices, index for index the operations of the same call: ${key}`, () => {
      for (const s of settings(key, 'itc')) {
        for (const convention of ['itc', 'birss'] as const) {
          const ops = operations(key, { convention, setting: s.index });
          const lattice = latticeOperations(key, { convention, setting: s.index });
          expect(lattice).toHaveLength(ops.length);
          lattice.forEach((w, i) => {
            expect(w.matrix.flat().every((x) => Number.isInteger(x))).toBe(true);
            expect(Math.abs(det(w.matrix))).toBe(1);
            expect(w.timeReversal).toBe(ops[i].timeReversal);
          });
        }
      }
    });
  }

  it('are the Cartesian operations in the lattice basis: R·B = B·W', () => {
    const b = latticeBasis('hexagonal');
    const ops = operations('6/mmm');
    latticeOperations('6/mmm').forEach((w, i) => {
      expect(matricesEqual(multiply(ops[i].matrix, b), multiply(b, w.matrix))).toBe(true);
    });
  });

  it('are the same set in both conventions, in the order of operations', () => {
    const itc = latticeOperations('-3m', { convention: 'itc', setting: 1 }).map((w) => JSON.stringify(w.matrix));
    const birss = latticeOperations('-3m', { convention: 'birss', setting: 1 }).map((w) => JSON.stringify(w.matrix));
    expect([...birss].sort()).toEqual([...itc].sort());
  });

  it('are frozen and cached', () => {
    const w = latticeOperations('432');
    expect(latticeOperations('432')).toBe(w);
    expect(Object.isFrozen(w) && Object.isFrozen(w[1]) && Object.isFrozen(w[1].matrix[0])).toBe(true);
  });
});

describe('orbit', () => {
  it('has as many faces as the multiplicity of each Wyckoff position, the given face first with its site symmetry', () => {
    for (const { key, s } of ALL_SETTINGS) {
      for (const w of wyckoffPositions(key, { setting: s.index })) {
        const faces = orbit(key, { hkl: w.representative.hkl }, { setting: s.index });
        expect(faces, `${key} #${s.index} ${w.letter}`).toHaveLength(w.multiplicity);
        expect(faces[0].hkl).toEqual(w.representative.hkl);
        expect(faces[0].operations).toEqual(w.siteSymmetryOperations);
        expect(faces.flatMap((f) => f.operations).sort((a, b) => a - b)).toEqual(
          Array.from({ length: operations(key, { setting: s.index }).length }, (_, i) => i),
        );
      }
    }
  });

  it('maps a face as the Cartesian operations map its normal', () => {
    const b = latticeBasis('hexagonal');
    const reciprocal = transpose(inverse(b));
    const normal = (h: readonly number[]): Vec3 => {
      const v = apply(reciprocal, h as unknown as Vec3);
      const n = Math.hypot(...v);
      return [v[0] / n, v[1] / n, v[2] / n];
    };
    const ops = operations('-6m2');
    for (const f of orbit('-6m2', { hkl: [3, 2, 1] })) {
      const image = apply(ops[f.operations[0]].matrix, normal([3, 2, 1]));
      const n = normal(f.hkl);
      expect(Math.hypot(image[0] - n[0], image[1] - n[1], image[2] - n[2])).toBeLessThan(1e-12);
    }
  });

  it('of a direction transforms with W, of a face with W⁻ᵀ: in the hexagonal family they differ', () => {
    expect(orbit('3', { uvw: [1, 0, 0] }).map((e) => e.uvw)).toEqual([
      [1, 0, 0],
      [0, 1, 0],
      [-1, -1, 0],
    ]);
    expect(orbit('3', { hkl: [1, 0, 0] }).map((e) => e.hkl)).toEqual([
      [1, 0, 0],
      [-1, 1, 0],
      [0, -1, 0],
    ]);
  });

  it('of a grey group maps each face by twice as many operations as the class', () => {
    const grey = orbit("4mm1'", { hkl: [1, 0, 0] });
    expect(grey.map((f) => f.hkl)).toEqual(orbit('4mm', { hkl: [1, 0, 0] }).map((f) => f.hkl));
    expect(grey[0].operations).toHaveLength(4);
  });

  it('refuses indices that are not three integers, not all zero, and wants exactly one of hkl, uvw', () => {
    expect(() => orbit('4mm', { hkl: [0, 0, 0] })).toThrow(RangeError);
    expect(() => orbit('4mm', { hkl: [2 ** 53 + 2, 0, 0] })).toThrow(RangeError);
    expect(() => orbit('4mm', { hkl: [1, 0.5, 0] as unknown as [number, number, number] })).toThrow(RangeError);
    expect(() => orbit('4mm', { hkl: [1, 0, 0, 0] as unknown as [number, number, number] })).toThrow(RangeError);
    expect(() => orbit('4mm', {} as { hkl: [number, number, number] })).toThrow(RangeError);
    expect(() => orbit('4mm', { hkl: [1, 0, 0], uvw: [1, 0, 0] } as { hkl: [number, number, number] })).toThrow(
      RangeError,
    );
  });

  it('takes a value of the union type', () => {
    const indices: { hkl: [number, number, number] } | { uvw: [number, number, number] } = { uvw: [0, 0, 1] };
    expect(orbit('4mm', indices)).toHaveLength(1);
  });

  it('is frozen', () => {
    const o = orbit('m-3m', { hkl: [1, 1, 1] });
    expect(Object.isFrozen(o) && Object.isFrozen(o[0]) && Object.isFrozen(o[0].hkl)).toBe(true);
    expect(Object.isFrozen(o[0].operations)).toBe(true);
  });
});

describe('orbitOf', () => {
  it('gives the poles of orbit, with the same operations', () => {
    for (const { key, s } of ALL_SETTINGS) {
      const ops = operations(key, { setting: s.index });
      for (const w of wyckoffPositions(key, { setting: s.index })) {
        const exact = orbit(key, { hkl: w.representative.hkl }, { setting: s.index });
        const poles = orbitOf(ops, w.representative.cartesian);
        expect(
          poles.map((p) => p.operations),
          `${key} #${s.index} ${w.letter}`,
        ).toEqual(exact.map((f) => f.operations));
      }
    }
  });

  it('merges poles closer than the tolerance', () => {
    const ops = operations('4mm');
    const off: Vec3 = [0.00002, 0, 1];
    expect(orbitOf(ops, off)).toHaveLength(4);
    expect(orbitOf(ops, off, { tolerance: 1e-4 })).toHaveLength(1);
    expect(orbitOf(ops, [0, 0, 2])[0].direction).toEqual([0, 0, 1]);
  });

  it('takes the list as it is, not closed', () => {
    const ops = operations('4mm').slice(0, 2);
    expect(orbitOf(ops, [3, 2, 1]).map((p) => p.operations)).toEqual([[0], [1]]);
  });

  it('refuses a zero vector and a matrix that is not orthogonal', () => {
    expect(() => orbitOf(operations('4mm'), [0, 0, 0])).toThrow(RangeError);
    const lattice = latticeOperations('3').map((w) => ({ matrix: w.matrix as Mat3 }));
    expect(() => orbitOf(lattice, [1, 0, 0])).toThrow(/orthogonal/);
  });
});
