import { describe, expect, it } from 'vitest';
import { apply, matricesEqual, multiply, type Vec3 } from '../linalg.js';
import { siteSymmetry } from '../siteSymmetry.js';
import { POINT_GROUP_KEYS, operations, settings } from './pointGroups.js';
import { wyckoffPositionOf, wyckoffPositions } from './wyckoff.js';

const ALL_SETTINGS = POINT_GROUP_KEYS.flatMap((key) => settings(key, 'itc').map((s) => ({ key, s })));
const DIRECTIONS: Vec3[] = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
  [1, 1, 0],
  [1, -1, 0],
  [1, 1, 1],
  [1, 2, 0],
  [0, 1, 1],
  [1, 0, 1],
  [2, 1, 0],
  [0.3, 0.7, 1.1],
];

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

  it('gives a group and a position for directions near an element, at the edge of the tolerance too', () => {
    let seed = 7;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648) * 2 - 1;
    const tolerance = 1e-4;
    for (const { key, s } of ALL_SETTINGS) {
      const ops = operations(key, { setting: s.index });
      for (const w of wyckoffPositions(key, { setting: s.index })) {
        for (const g of ops) {
          const image = apply(g.matrix, w.representative.cartesian);
          for (const delta of [tolerance / 4, tolerance, 2 * tolerance]) {
            const near: Vec3 = [image[0] + rnd() * delta, image[1] + rnd() * delta, image[2] + rnd() * delta];
            const site = siteSymmetry(ops, near, { tolerance });
            const label = `${key} #${s.index} ${w.letter} δ=${delta}`;
            expect(Number.isInteger(site.multiplicity), label).toBe(true);
            // A subgroup: closed under products; and each of its operations fixes the set direction.
            for (const i of site.operations) {
              const moved = apply(ops[i].matrix, site.direction);
              expect(Math.hypot(...moved.map((x, k) => x - site.direction[k])), label).toBeLessThan(1e-9);
              for (const j of site.operations) {
                const product = multiply(ops[i].matrix, ops[j].matrix);
                expect(
                  site.operations.some((k) => matricesEqual(ops[k].matrix, product)),
                  label,
                ).toBe(true);
              }
            }
            const letter = wyckoffPositionOf(key, near, { setting: s.index, tolerance }).letter;
            if (delta <= tolerance / 4) {
              // Every element fixing the image moves the perturbed direction by less than 2·√3·δ < tolerance.
              expect(letter, `${key} #${s.index} ${w.letter}`).toBe(w.letter);
            }
          }
        }
      }
    }
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

  it('closes the fixing operations to a group and sets the direction exactly on its axis', () => {
    // 6 × 10⁻⁵ off the sixfold axis: the sixfold rotations move it by 0.6 × 10⁻⁴ (fixing within the tolerance),
    // the threefold ones by 1.04 × 10⁻⁴ and the twofold one by 1.2 × 10⁻⁴ (not fixing): not a group.
    const near: Vec3 = [-0.0000424264, 0.0000424264, 1];
    const six = operations('6/mmm', { setting: 1 });
    const s = siteSymmetry(six, near, { tolerance: 1e-4 });
    expect(s.operations).toHaveLength(12);
    expect(s.multiplicity).toBe(2);
    expect(Math.abs(s.direction[0]) + Math.abs(s.direction[1])).toBeLessThan(1e-12);
  });

  it('works on any list of operations, ignoring time reversal', () => {
    const primed = ops.map((o) => ({ matrix: o.matrix, timeReversal: true }));
    expect(siteSymmetry(primed, [0, 0, 1]).operations).toHaveLength(8);
  });

  it('is not general if a non-identity operation alone fixes the direction', () => {
    const mirrorOnly = operations('m', { setting: 1 }).filter((o) => o.matrix[2][2] === -1);
    expect(mirrorOnly).toHaveLength(1);
    expect(siteSymmetry(mirrorOnly, [1, 2, 0]).general).toBe(false);
    expect(siteSymmetry(mirrorOnly, [1, 2, 3]).general).toBe(true);
  });

  it('throws if the operations fixing within a far too large tolerance fix no common direction', () => {
    // 422, tolerance 0.95: operations that move this direction by up to 0.95 generate a group fixing no
    // direction (found by a scan; a tolerance far beyond any use).
    expect(() => siteSymmetry(operations('422'), [0.9018, 0.3462, 0.2588], { tolerance: 0.95 })).toThrow(RangeError);
  });

  it('answers for the list as it is now, also when a caller changes its list in place (#90)', () => {
    // Before #90 the products were cached by the identity of the list: after the list of 2 was
    // replaced in place by that of mm2, [1, 0, 1] got the site symmetry [0, 1, 2, 3].
    const list = [...operations('2', { setting: 1 })];
    siteSymmetry(list, [0, 1, 0]);
    list.length = 0;
    list.push(...operations('mm2', { setting: 1 }));
    expect(siteSymmetry(list, [1, 0, 1]).operations).toEqual(siteSymmetry([...list], [1, 0, 1]).operations);
    for (const first of POINT_GROUP_KEYS) {
      for (const second of POINT_GROUP_KEYS) {
        const changing = [...operations(first)];
        for (const d of DIRECTIONS) siteSymmetry(changing, d, { tolerance: 1e-3 });
        changing.length = 0;
        changing.push(...operations(second));
        for (const d of DIRECTIONS) {
          expect(siteSymmetry(changing, d, { tolerance: 1e-3 }).operations, `${first} → ${second}`).toEqual(
            siteSymmetry([...changing], d, { tolerance: 1e-3 }).operations,
          );
        }
      }
    }
  });

  it('rejects a zero vector and an invalid tolerance', () => {
    expect(() => siteSymmetry(ops, [0, 0, 0])).toThrow(RangeError);
    expect(() => siteSymmetry(ops, [0, 0, 1], { tolerance: 0 })).toThrow(RangeError);
    expect(() => siteSymmetry(ops, [0, 0, 1], { tolerance: Number.NaN })).toThrow(RangeError);
  });
});

describe('magnetic point groups', () => {
  it('have no Wyckoff positions: ITA gives them for the crystal classes only', () => {
    for (const key of ["4'/mmm'", "2221'"]) {
      expect(() => wyckoffPositions(key as never)).toThrow(/32 crystal classes only/);
      expect(() => wyckoffPositionOf(key as never, [0, 0, 1])).toThrow(RangeError);
    }
    expect(() => wyckoffPositions('nonsense' as never)).toThrow(/Unknown point group key/);
  });

  it('site symmetry of a direction ignores the time reversal of their operations', () => {
    const site = siteSymmetry(operations("4'/mmm'"), [0, 0, 1]);
    expect(site.operations).toHaveLength(8);
    expect(site.multiplicity).toBe(2);
  });
});
