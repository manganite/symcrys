import { describe, expect, it } from 'vitest';
import { representativeFace } from './wyckoff.js';
import { apply, det, inverse, matricesEqual, multiply, transpose, type Mat3, type Vec3 } from '../linalg.js';
import { familyBasis } from '../lattice.js';
import { orbit, orbitOf } from './orbits.js';
import { MAGNETIC_POINT_GROUP_KEYS, POINT_GROUP_KEYS, generators, operations, settings } from './pointGroups.js';
import { wyckoffPositions } from './wyckoff.js';

const ALL_SETTINGS = POINT_GROUP_KEYS.flatMap((key) => settings(key).map((s) => ({ key, s })));

describe('the matrix W of an operation (field matrix)', () => {
  for (const key of MAGNETIC_POINT_GROUP_KEYS) {
    it(`is an integer matrix of determinant ±1 with the determinant of the Cartesian one, for operations and generators: ${key}`, () => {
      for (const s of settings(key)) {
        for (const op of [...operations(key, { setting: s.index }), ...generators(key, { setting: s.index })]) {
          expect(op.matrix.flat().every((x) => Number.isInteger(x))).toBe(true);
          expect(det(op.matrix)).toBe(Math.round(det(op.cartesian)));
          expect(Math.abs(det(op.matrix))).toBe(1);
        }
      }
    });
  }

  it('is the Cartesian operation in the lattice basis: R·B = B·W', () => {
    const b = familyBasis('hexagonal');
    for (const op of operations('6/mmm')) {
      expect(matricesEqual(multiply(op.cartesian, b), multiply(b, op.matrix))).toBe(true);
    }
  });

  it('is frozen, and the list is cached', () => {
    const ops = operations('432');
    expect(operations('432')).toBe(ops);
    expect(Object.isFrozen(ops) && Object.isFrozen(ops[1]) && Object.isFrozen(ops[1].matrix[0])).toBe(true);
    expect(Object.isFrozen(ops[1].cartesian[0])).toBe(true);
  });
});

describe('orbit', () => {
  it('has as many faces as the multiplicity of each Wyckoff position, the given face first with its site symmetry', () => {
    for (const { key, s } of ALL_SETTINGS) {
      for (const w of wyckoffPositions(key, { setting: s.index })) {
        const face = representativeFace(key, s.index, w.millerIndices);
        const faces = orbit(key, { hkl: face.hkl }, { setting: s.index });
        expect(faces, `${key} #${s.index} ${w.letter}`).toHaveLength(w.multiplicity);
        expect(faces[0].hkl).toEqual(face.hkl);
        expect(faces[0].operations).toEqual(w.siteSymmetryOperations);
        expect(faces.flatMap((f) => f.operations).sort((a, b) => a - b)).toEqual(
          Array.from({ length: operations(key, { setting: s.index }).length }, (_, i) => i),
        );
      }
    }
  });

  it('maps a face as the Cartesian operations map its normal', () => {
    const b = familyBasis('hexagonal');
    const reciprocal = transpose(inverse(b));
    const normal = (h: readonly number[]): Vec3 => {
      const v = apply(reciprocal, h as unknown as Vec3);
      const n = Math.hypot(...v);
      return [v[0] / n, v[1] / n, v[2] / n];
    };
    const ops = operations('-6m2');
    for (const f of orbit('-6m2', { hkl: [3, 2, 1] })) {
      const image = apply(ops[f.operations[0]].cartesian, normal([3, 2, 1]));
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
  it('refuses a list that is not a group, naming the missing product', () => {
    // The generators of 4/mmm gave 4 poles instead of the 16 of the general form.
    expect(() => orbitOf(generators('4/mmm'), [1, 2, 3])).toThrow(/not a group: the identity is not in the list/);
    const withIdentity = [operations('1')[0], ...generators('4/mmm')];
    expect(() => orbitOf(withIdentity, [1, 2, 3])).toThrow(
      /not a group: the product of operations \d+ and \d+ is not in the list/,
    );
    expect(orbitOf(operations('4/mmm'), [1, 2, 3])).toHaveLength(16);
  });

  it('reads an empty list as the group 1: the orbit is the direction itself', () => {
    expect(orbitOf([], [0, 3, 4])).toEqual([{ direction: [0, 0.6, 0.8], operations: [] }]);
  });

  it('gives the poles of orbit, with the same operations', () => {
    for (const { key, s } of ALL_SETTINGS) {
      const ops = operations(key, { setting: s.index });
      for (const w of wyckoffPositions(key, { setting: s.index })) {
        const face = representativeFace(key, s.index, w.millerIndices);
        const exact = orbit(key, { hkl: face.hkl }, { setting: s.index });
        const poles = orbitOf(ops, face.cartesian);
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

  it('takes a subgroup of a group as given, its indices referring to that list', () => {
    const two = operations('4mm').slice(0, 2); // 1 and 2 along z
    expect(orbitOf(two, [3, 2, 1]).map((p) => p.operations)).toEqual([[0], [1]]);
  });

  it('refuses a zero vector, a matrix that is not orthogonal, and an operation without its Cartesian matrix', () => {
    expect(() => orbitOf(operations('4mm'), [0, 0, 0])).toThrow(RangeError);
    const lattice = operations('3').map((op) => ({ cartesian: op.matrix as Mat3 }));
    expect(() => orbitOf(lattice, [1, 0, 0])).toThrow(/orthogonal/);
    const withoutCartesian = operations('3').map((op) => ({ matrix: op.matrix }));
    expect(() => orbitOf(withoutCartesian as never, [1, 0, 0])).toThrow(
      /Operation 0 has no Cartesian matrix.*field matrix is the matrix W in the lattice basis/,
    );
  });
});
