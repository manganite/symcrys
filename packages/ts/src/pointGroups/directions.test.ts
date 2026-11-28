import { describe, expect, it } from 'vitest';
import { apply, inverse, matricesEqual, multiply, transpose, type Vec3 } from '../linalg.js';
import * as classes from '../index.js';
import * as magnetic from '../magnetic.js';
import * as plane from '../plane.js';
import { numericHkl, representativeFace, representativeValues } from './wyckoff.js';

const ALL_SETTINGS = classes.POINT_GROUP_KEYS.flatMap((key) => classes.settings(key).map((s) => ({ key, s })));

/** The first printed point of a position as numbers: x, y, z take the values h, k, l take for faces. */
function printedPoint(key: classes.PointGroupKey, setting: number, coordinates: string): Vec3 {
  const asIndices = coordinates.replace(/x/g, 'h').replace(/y/g, 'k').replace(/z/g, 'l');
  return numericHkl(asIndices, representativeValues(key, setting)) as unknown as Vec3;
}

describe('a direction given to a function of a key: { hkl }, { uvw } or { cartesian }', () => {
  it('gives the printed letter for the printed point [uvw] and the printed face (hkl) of every position', () => {
    for (const { key, s } of ALL_SETTINGS) {
      const options = { setting: s.index };
      for (const w of classes.wyckoffPositions(key, options)) {
        const uvw = printedPoint(key, s.index, w.coordinates[0]);
        const hkl = representativeFace(key, s.index, w.millerIndices).hkl;
        const label = `${key} #${s.index} ${w.letter}: [${uvw}] (${hkl})`;
        expect(classes.wyckoffPosition(key, { uvw }, options).letter, label).toBe(w.letter);
        expect(classes.wyckoffPosition(key, { hkl }, options).letter, label).toBe(w.letter);
        expect(classes.siteSymmetry(key, { uvw }, options).multiplicity, label).toBe(w.multiplicity);
      }
    }
  });

  it('reads [uvw] as B·u and (hkl) as its normal B⁻ᵀ·h, B = latticeBasis(key, { setting })', () => {
    for (const { key, s } of ALL_SETTINGS) {
      const options = { setting: s.index };
      const b = classes.latticeBasis(key, options);
      for (const v of [
        [2, 1, 0],
        [1, -1, 3],
        [0, 0, 1],
      ] as Vec3[]) {
        expect(classes.siteSymmetry(key, { uvw: v }, options)).toEqual(
          classes.siteSymmetry(key, { cartesian: apply(b, v) }, options),
        );
        expect(classes.siteSymmetry(key, { hkl: v }, options)).toEqual(
          classes.siteSymmetry(key, { cartesian: apply(transpose(inverse(b)), v) }, options),
        );
      }
    }
  });

  it('reads the lattice direction [210] of 6/mmm as a lattice direction (it was read as Cartesian)', () => {
    // [210] lies on a twofold axis (multiplicity 6); read as a Cartesian vector it is a general
    // direction in a mirror plane (multiplicity 12).
    expect(classes.siteSymmetry('6/mmm', { uvw: [2, 1, 0] }).multiplicity).toBe(6);
    expect(classes.siteSymmetry('6/mmm', { cartesian: [2, 1, 0] }).multiplicity).toBe(12);
  });

  it('refuses a bare array, two kinds at once, other fields, and indices that are not integers', () => {
    for (const f of [
      () => classes.siteSymmetry('6/mmm', [2, 1, 0] as never),
      () => classes.wyckoffPosition('6/mmm', [2, 1, 0] as never),
      () => magnetic.siteSymmetry("6/m'mm", [2, 1, 0] as never),
    ]) {
      expect(f).toThrow(/not a bare array/);
    }
    expect(() => classes.siteSymmetry('4mm', { hkl: [1, 0, 0], uvw: [1, 0, 0] } as never)).toThrow(
      /exactly one of the fields/,
    );
    expect(() => classes.siteSymmetry('4mm', { normal: [1, 0, 0] } as never)).toThrow(/exactly one of the fields/);
    expect(() => classes.siteSymmetry('4mm', { uvw: [0.5, 0, 1] as never })).toThrow(/integers/);
    expect(() => classes.siteSymmetry('4mm', { hkl: [0, 0, 0] })).toThrow(/not all zero/);
    expect(() => classes.siteSymmetry('4mm', { cartesian: [0, 0, 0] })).toThrow(RangeError);
  });

  it('orbit takes { hkl } or { uvw } and points to orbitOf for a Cartesian vector', () => {
    expect(() => classes.orbit('4mm', { cartesian: [1, 0, 0] } as never)).toThrow(
      /orbitOf with the operations of the key/,
    );
    expect(() => classes.orbit('4mm', [1, 0, 0] as never)).toThrow(
      /a face \(hkl\) or a lattice direction \(uvw\), named by its field/,
    );
    expect(() => classes.orbit('4mm', { hkl: [1, 0, 0], foo: 1 } as never)).toThrow(
      /exactly one of the fields hkl, uvw/,
    );
  });
});

describe('latticeBasis(key, { setting })', () => {
  it('is the basis B of every setting in which cartesian = B·W·B⁻¹, for the 122 groups', () => {
    for (const key of magnetic.POINT_GROUP_KEYS) {
      for (const s of magnetic.settings(key)) {
        const b = magnetic.latticeBasis(key, { setting: s.index });
        const bInv = inverse(b);
        for (const op of magnetic.operations(key, { setting: s.index })) {
          expect(matricesEqual(multiply(multiply(b, op.matrix), bInv), op.cartesian), `${key} #${s.index}`).toBe(true);
        }
      }
    }
  });

  it('names the key to take for the name of a crystal family', () => {
    expect(() => classes.latticeBasis('hexagonal' as never)).toThrow(/for "hexagonal" use "6\/mmm"/);
    expect(() => magnetic.latticeBasis('cubic' as never)).toThrow(/use "m-3m"/);
  });

  it('puts a along x and c along z for hexagonal axes, the obverse a_R, b_R, c_R for rhombohedral axes', () => {
    const hex = classes.latticeBasis('32');
    expect(apply(hex, [1, 0, 0])).toEqual([1, 0, 0]);
    expect(apply(hex, [0, 0, 1])).toEqual([0, 0, 1]);
    const rh = classes.latticeBasis('32', { axes: 'rhombohedral' });
    // a_R = (2a + b + c)/3 (ITA 2016 Table 1.5.1.1, R₁ obverse).
    const aR = apply(hex, [2 / 3, 1 / 3, 1 / 3]);
    apply(rh, [1, 0, 0]).forEach((x, i) => expect(x).toBeCloseTo(aR[i], 12));
  });
});

describe('a point of the plane: { point }', () => {
  it('refuses a bare array and other fields', () => {
    expect(() => plane.siteSymmetry('p4', [0.1, 0.2] as never)).toThrow(/a point \{ point \}.*by one field/);
    expect(() => plane.orbit('p4', [0.1, 0.2] as never)).toThrow(RangeError);
    expect(() => plane.wyckoffPosition('p4', { point: [0, 0], x: 1 } as never)).toThrow(/by one field/);
    expect(() => plane.wyckoffDistances('p4', { point: [0, 0], x: 1 } as never)).toThrow(/by its field point/);
    expect(plane.wyckoffPosition('p4', { point: [0.5, 0.5] }).letter).toBe('b');
  });
});

describe('edge cases found while removing duplicated tables (#233)', () => {
  it.fails('a name of Object.prototype is an unknown key, not a family (#233)', () => {
    for (const api of [classes, magnetic]) {
      for (const name of ['toString', '__proto__', 'constructor']) {
        expect(() => api.latticeBasis(name as never)).toThrow(`Unknown point group key: "${name}"`);
      }
    }
  });
});
