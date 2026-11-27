/**
 * Behaviour fixed for the review of 0.14.0 (#208): one parameter name for the specification of
 * `toVoigt`/`fromVoigt` in both point-group entry points; the functions of directions read
 * operations without time reversal in the magnetic API; a clear refusal of an irrational P in
 * `changeOfCoordinates`; the bound on the coordinates of a point of the plane; the short symbols of
 * International Tables (1952) in `findPlaneGroup`.
 */

import { describe, expect, it } from 'vitest';
import * as classes from './index.js';
import * as magnetic from './magnetic.js';
import * as plane from './plane.js';

describe('#208: consistency and errors', () => {
  it('names the specification of toVoigt and fromVoigt spec in both entry points', () => {
    const name = (f: (...args: never[]) => unknown) => /\(([^)]*)\)/.exec(f.toString())![1].split(',')[1].trim();
    for (const api of [classes, magnetic]) {
      expect(name(api.toVoigt as never)).toBe('spec');
      expect(name(api.fromVoigt as never)).toBe('spec');
    }
  });

  it('siteSymmetryOf and orbitOf of the magnetic API take operations without timeReversal', () => {
    const ops = magnetic.operations('4mm').map((op) => ({ cartesian: op.cartesian }));
    expect(magnetic.siteSymmetryOf(ops, [0, 0, 1]).operations).toHaveLength(8);
    expect(magnetic.orbitOf(ops, [1, 0, 0])).toHaveLength(4);
  });

  it('refuses a linear part P that is a rotation, and names rotateTensor', () => {
    const c = Math.cos(Math.PI / 6);
    const s = Math.sin(Math.PI / 6);
    const rotation = [
      [c, -s, 0],
      [s, c, 0],
      [0, 0, 1],
    ] as unknown as classes.Mat3;
    for (const tolerance of [1e-3, 1e-5, 1e-6]) {
      expect(() =>
        classes.changeOfCoordinates({ linearPart: rotation }, { points: [[0.1, 0.2, 0.3]] }, { tolerance }),
      ).toThrow(/not rational within the tolerance.*rotateTensor/);
    }
    // A sixteenfold superstructure and its inverse pass.
    const p = classes.changeOfCoordinates(
      {
        linearPart: [
          [1, 0, 0],
          [0, 1, 0],
          [0, 0, 1 / 16],
        ],
      },
      { points: [[0, 0, 0.5]] },
    );
    expect(p.points![0][2]).toBeCloseTo(8, 12);
  });

  it('refuses a point of the plane with a coordinate beyond 10⁶', () => {
    expect(() => plane.orbit('p4mm', { point: [1e300, 0] })).toThrow(RangeError);
    expect(() => plane.siteSymmetry('p4mm', { point: [2e6, 0] })).toThrow(/at most 1000000/);
    expect(plane.orbit('p4mm', { point: [1e6, 0.25] }).length).toBeGreaterThan(0);
  });

  it('finds a plane group by the short symbols of International Tables (1952)', () => {
    const old: Record<string, string> = {
      pmm: 'p2mm',
      pmg: 'p2mg',
      pgg: 'p2gg',
      cmm: 'c2mm',
      p4m: 'p4mm',
      p4g: 'p4gm',
      p6m: 'p6mm',
    };
    for (const [symbol, key] of Object.entries(old)) expect(plane.findPlaneGroup(symbol)?.key, symbol).toBe(key);
    expect(plane.findPlaneGroup('p 4 g')?.key).toBe('p4gm');
  });
});
