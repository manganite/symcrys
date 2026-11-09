import { describe, expect, it } from 'vitest';
import {
  IDENTITY,
  INVERSION,
  apply,
  conjugate,
  det,
  matricesEqual,
  multiply,
  rotationX,
  rotationY,
  rotationZ,
  snap,
  trace,
  transpose,
  type Mat3,
} from './linalg.js';

describe('linalg', () => {
  it('rotations turn counter-clockwise seen from the positive axis', () => {
    expect(apply(rotationZ(90), [1, 0, 0])).toEqual([0, 1, 0]);
    expect(apply(rotationX(90), [0, 1, 0])).toEqual([0, 0, 1]);
    expect(apply(rotationY(90), [0, 0, 1])).toEqual([1, 0, 0]);
  });

  it('snaps rotation entries to exact values, without negative zero', () => {
    const r = rotationZ(120);
    expect(r[0][0]).toBe(-0.5);
    expect(r[1][0]).toBe(Math.sqrt(3) / 2);
    expect(Object.is(rotationZ(180)[0][1], 0)).toBe(true);
    expect(
      snap([
        [1e-12, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
      ] as Mat3)[0][0],
    ).toBe(0);
  });

  it('determinant, trace, transpose, product', () => {
    expect(det(INVERSION)).toBe(-1);
    expect(det(rotationZ(60))).toBeCloseTo(1, 12);
    expect(trace(rotationZ(90))).toBe(1);
    const r = rotationZ(30);
    expect(matricesEqual(multiply(r, transpose(r)), IDENTITY)).toBe(true);
    expect(matricesEqual(multiply(rotationZ(60), rotationZ(60)), rotationZ(120))).toBe(true);
  });

  it('conjugate expresses an operation in a rotated frame', () => {
    // A twofold axis along y, seen in a frame rotated by 90° about z, lies along −x, i.e. along x.
    expect(matricesEqual(snap(conjugate(rotationY(180), rotationZ(90))), rotationX(180))).toBe(true);
  });
});
