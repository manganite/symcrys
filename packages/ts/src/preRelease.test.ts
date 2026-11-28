/**
 * What the review of the changes before 0.15.0 found: an orbit that disagreed with the site
 * symmetry near a symmetry element, unknown fields of a record read as absent, indices whose images
 * leave the safe integers, and a box with too many lines.
 */

import { describe, expect, it } from 'vitest';
import * as classes from './index.js';
import * as magnetic from './magnetic.js';
import * as plane from './plane.js';

describe('orbitOf near a symmetry element', () => {
  it('has one entry per coset of the site symmetry of siteSymmetryOf', () => {
    for (const [key, direction] of [
      ['mmm', [1, 4e-6, 4e-6]],
      ['4/m', [5e-6, -3e-6, 1]],
      ['m-3m', [1, 1 + 4e-6, 1 - 3e-6]],
    ] as const) {
      const ops = classes.operations(key);
      const site = classes.siteSymmetryOf(ops, direction as never);
      const orbit = classes.orbitOf(ops, direction as never);
      expect(orbit, key).toHaveLength(site.multiplicity);
      expect(orbit[0].operations, key).toEqual(site.operations);
      expect(new Set(orbit.map((p) => p.operations.length)), key).toEqual(new Set([site.operations.length]));
      expect(
        orbit.flatMap((p) => p.operations).sort((a, b) => a - b),
        key,
      ).toEqual(ops.map((_, i) => i));
    }
  });

  it('in the magnetic API too, a grey group with every matrix twice', () => {
    const ops = magnetic.operations("mmm1'");
    const orbit = magnetic.orbitOf(ops, [1, 4e-6, 4e-6]);
    expect(orbit).toHaveLength(magnetic.siteSymmetryOf(ops, [1, 4e-6, 4e-6]).multiplicity);
  });
});

describe('unknown fields of a record are refused', () => {
  it('in a tensor specification, a misspelt timeParity included', () => {
    expect(() =>
      classes.tensorForm('4', { rank: 1, kind: 'axial', intrinsic: 'none', timeparity: 'odd' } as never),
    ).toThrow(/Unknown field "timeparity"/);
    expect(() =>
      magnetic.tensorForm('4', {
        rank: 1,
        kind: 'axial',
        intrinsic: 'none',
        timeParity: 'odd',
        Intrinsic: 'x',
      } as never),
    ).toThrow(/Unknown field/);
  });

  it('in the parameters and angles of a cell; the edges of a whole cell pass isValidCell', () => {
    const cell = { a: 1, b: 2, c: 3, alpha: 90, beta: 90, gamma: 90 };
    expect(classes.isValidCell(cell)).toBe(true);
    expect(() => classes.isValidCell({ alpha: 90, beta: 90, gamma: 90, minVolumeRatio: 2 } as never)).toThrow(
      /no field "minVolumeRatio"/,
    );
    expect(() => classes.latticeFromParameters({ ...cell, d: 4 } as never)).toThrow(/no field "d"/);
    expect(() => plane.latticeFromParameters({ a: 1, b: 2, gamma: 90, c: 3 } as never)).toThrow(/no field "c"/);
  });
});

describe('indices whose images would leave the safe integers are refused', () => {
  it('in orbit and siteSymmetry of a key', () => {
    expect(() => classes.orbit('6/mmm', { hkl: [2 ** 52 + 1, 2 ** 52, 1] })).toThrow(/at most/);
    expect(() => classes.siteSymmetry('6/mmm', { uvw: [2 ** 53 - 1, 0, 0] })).toThrow(/at most/);
    expect(classes.orbit('6/mmm', { hkl: [2 ** 50, 1, 2] })).toHaveLength(24);
  });
});

describe('a box with too many lines is refused, as one with too many rotation points', () => {
  it('pm and cm along a long box', () => {
    expect(() =>
      plane.symmetryElements('pm', {
        box: [
          [0, 0],
          [2e6, 1],
        ],
      }),
    ).toThrow(/lines, more than/);
    expect(() =>
      plane.symmetryElements('cm', {
        box: [
          [0, 0],
          [3e6, 0],
        ],
      }),
    ).toThrow(/lines, more than/);
    expect(
      plane.symmetryElements('pm', {
        box: [
          [0, 0],
          [10, 1],
        ],
      }).lines.length,
    ).toBeGreaterThan(0);
  });
});
