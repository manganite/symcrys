import { describe, expect, it } from 'vitest';
import { apply, type Vec3 } from '../linalg.js';
import { siteSymmetry } from '../siteSymmetry.js';
import { POINT_GROUP_KEYS, operations, settings } from './pointGroups.js';
import { wyckoffPositionOf, wyckoffPositions } from './wyckoff.js';

const ALL_SETTINGS = POINT_GROUP_KEYS.flatMap((key) => settings(key, 'itc').map((s) => ({ key, s })));

describe('wyckoffPositions', () => {
  it('exist for every ITC setting, without the origin', () => {
    for (const { key, s } of ALL_SETTINGS) {
      const list = wyckoffPositions(key, { setting: s.index });
      expect(list.length, `${key} #${s.index}`).toBeGreaterThan(0);
      expect(list.some((w) => w.letter === 'o')).toBe(false);
      expect(list[0].siteSymmetry).toBe('1');
      expect(list[0].multiplicity).toBe(operations(key, { setting: s.index }).length);
    }
  });

  it('default to the ITC default setting', () => {
    expect(wyckoffPositions('32')).toBe(wyckoffPositions('32', { setting: 2 }));
    expect(wyckoffPositions('32')[1].siteSymmetry).toBe('.2.');
    expect(wyckoffPositions('32', { setting: 1 })[1].siteSymmetry).toBe('..2');
  });

  it('are not defined in the Birss convention', () => {
    expect(() => wyckoffPositions('mmm', { convention: 'birss' })).toThrow(RangeError);
    expect(() => wyckoffPositionOf('mmm', [0, 0, 1], { convention: 'birss' })).toThrow(RangeError);
  });

  it('reject an unknown setting', () => {
    expect(() => wyckoffPositions('mmm', { setting: 2 })).toThrow(RangeError);
  });

  it('are frozen', () => {
    const w = wyckoffPositions('4mm')[1];
    expect(Object.isFrozen(w)).toBe(true);
    expect(Object.isFrozen(w.representative.cartesian)).toBe(true);
    expect(Object.isFrozen(w.siteSymmetryOperations)).toBe(true);
  });
});

describe('wyckoffPositionOf', () => {
  it('finds the position of every image of every representative', () => {
    for (const { key, s } of ALL_SETTINGS) {
      const ops = operations(key, { setting: s.index });
      for (const w of wyckoffPositions(key, { setting: s.index })) {
        for (const g of ops) {
          const image = apply(g.matrix, w.representative.cartesian);
          expect(wyckoffPositionOf(key, image, { setting: s.index }).letter, `${key} #${s.index} ${w.letter}`).toBe(
            w.letter,
          );
          const scaled: Vec3 = [image[0] * 7, image[1] * 7, image[2] * 7];
          expect(wyckoffPositionOf(key, scaled, { setting: s.index }).letter).toBe(w.letter);
        }
      }
    }
  });

  it('finds both pedions of a polar axis in the same position, as ITA prints "(001) or (001̄)"', () => {
    expect(wyckoffPositionOf('4mm', [0, 0, -1]).letter).toBe('a');
    expect(wyckoffPositionOf('2', [0, -1, 0]).letter).toBe('a');
  });

  it('uses the tolerance for directions rounded near an element', () => {
    const near: Vec3 = [1, 0.5, 0.00005];
    expect(wyckoffPositionOf('4/mmm', near).letter).toBe('g');
    expect(wyckoffPositionOf('4/mmm', near, { tolerance: 1e-4 }).letter).toBe('d');
  });
});

describe('siteSymmetry', () => {
  const ops = operations('4mm');

  it('lists the operations fixing a direction and projects onto their fixed space', () => {
    const s = siteSymmetry(ops, [1, 1.00004, 3], { tolerance: 1e-4 });
    expect(s.operations).toHaveLength(2);
    expect(s.multiplicity).toBe(4);
    expect(s.general).toBe(false);
    expect(Math.abs(s.direction[0] - s.direction[1])).toBeLessThan(1e-12);
    expect(Math.hypot(...s.direction)).toBeCloseTo(1, 12);
  });

  it('treats the general position and the default tolerance', () => {
    const s = siteSymmetry(ops, [1, 1.00004, 3]);
    expect(s.operations).toEqual([0]);
    expect(s.general).toBe(true);
    expect(s.multiplicity).toBe(8);
  });

  it('works on any list of operations, ignoring time reversal', () => {
    const primed = ops.map((o) => ({ matrix: o.matrix, timeReversal: true }));
    expect(siteSymmetry(primed, [0, 0, 1]).operations).toHaveLength(8);
  });

  it('rejects a zero vector and an invalid tolerance', () => {
    expect(() => siteSymmetry(ops, [0, 0, 0])).toThrow(RangeError);
    expect(() => siteSymmetry(ops, [0, 0, 1], { tolerance: 0 })).toThrow(RangeError);
    expect(() => siteSymmetry(ops, [0, 0, 1], { tolerance: Number.NaN })).toThrow(RangeError);
  });
});
