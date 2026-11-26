import { describe, expect, it } from 'vitest';
import { apply, matricesEqual, multiply, type Vec3 } from '../linalg.js';
import { siteSymmetryOf } from '../siteSymmetry.js';
import { POINT_GROUP_KEYS, generators, operations, settings } from './pointGroups.js';
import { GREY_POINT_GROUP_KEYS } from './keys.js';
import { numericHkl, representativeFace, wyckoffPosition, wyckoffPositions } from './wyckoff.js';

const ALL_SETTINGS = POINT_GROUP_KEYS.flatMap((key) => settings(key).map((s) => ({ key, s })));
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
    expect(wyckoffPositions('32')).toBe(wyckoffPositions('32', { setting: 1 }));
    expect(wyckoffPositions('32')[1].siteSymmetry).toBe('.2.');
    expect(wyckoffPositions('32', { setting: 2 })[1].siteSymmetry).toBe('..2');
    expect(wyckoffPositions('32', { setting: '312' })[1].siteSymmetry).toBe('..2');
  });

  it('refuse the option convention, removed in 0.11.0', () => {
    expect(() => wyckoffPositions('mmm', { convention: 'birss' } as never)).toThrow(/option convention was removed/);
    expect(() => wyckoffPosition('mmm', { cartesian: [0, 0, 1] }, { convention: 'birss' } as never)).toThrow(
      RangeError,
    );
  });

  it('reject an unknown setting', () => {
    expect(() => wyckoffPositions('mmm', { setting: 2 })).toThrow(RangeError);
  });

  it('are frozen', () => {
    const w = wyckoffPositions('4mm')[1];
    expect(Object.isFrozen(w)).toBe(true);
    expect(Object.isFrozen(w.siteSymmetryOperations)).toBe(true);
  });
});

describe('wyckoffPosition', () => {
  it('finds the position of every image of every representative', () => {
    for (const { key, s } of ALL_SETTINGS) {
      const ops = operations(key, { setting: s.index });
      for (const w of wyckoffPositions(key, { setting: s.index })) {
        for (const g of ops) {
          const image = apply(g.cartesian, representativeFace(key, s.index, w.millerIndices).cartesian);
          expect(
            wyckoffPosition(key, { cartesian: image }, { setting: s.index }).letter,
            `${key} #${s.index} ${w.letter}`,
          ).toBe(w.letter);
          const scaled: Vec3 = [image[0] * 7, image[1] * 7, image[2] * 7];
          expect(wyckoffPosition(key, { cartesian: scaled }, { setting: s.index }).letter).toBe(w.letter);
        }
      }
    }
  });

  it('finds both pedions of a polar axis in the same position, as ITA prints "(001) or (001̄)"', () => {
    expect(wyckoffPosition('4mm', { cartesian: [0, 0, -1] }).letter).toBe('a');
    expect(wyckoffPosition('2', { cartesian: [0, -1, 0] }).letter).toBe('a');
  });

  it('gives a group and a position for directions near an element, at the edge of the tolerance too', () => {
    let seed = 7;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648) * 2 - 1;
    const tolerance = 1e-4;
    for (const { key, s } of ALL_SETTINGS) {
      const ops = operations(key, { setting: s.index });
      for (const w of wyckoffPositions(key, { setting: s.index })) {
        for (const g of ops) {
          const image = apply(g.cartesian, representativeFace(key, s.index, w.millerIndices).cartesian);
          for (const delta of [tolerance / 4, tolerance, 2 * tolerance]) {
            const near: Vec3 = [image[0] + rnd() * delta, image[1] + rnd() * delta, image[2] + rnd() * delta];
            const site = siteSymmetryOf(ops, near, { tolerance });
            const label = `${key} #${s.index} ${w.letter} δ=${delta}`;
            expect(Number.isInteger(site.multiplicity), label).toBe(true);
            // A subgroup: closed under products; and each of its operations fixes the set direction.
            for (const i of site.operations) {
              const moved = apply(ops[i].cartesian, site.direction);
              expect(Math.hypot(...moved.map((x, k) => x - site.direction[k])), label).toBeLessThan(1e-9);
              for (const j of site.operations) {
                const product = multiply(ops[i].cartesian, ops[j].cartesian);
                expect(
                  site.operations.some((k) => matricesEqual(ops[k].cartesian, product)),
                  label,
                ).toBe(true);
              }
            }
            const letter = wyckoffPosition(key, { cartesian: near }, { setting: s.index, tolerance }).letter;
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
    expect(wyckoffPosition('4/mmm', { cartesian: near }).letter).toBe('g');
    expect(wyckoffPosition('4/mmm', { cartesian: near }, { tolerance: 1e-4 }).letter).toBe('d');
  });
});

describe('siteSymmetry', () => {
  const ops = operations('4mm');

  it('lists the operations fixing a direction and projects onto their fixed space', () => {
    const s = siteSymmetryOf(ops, [1, 1.00004, 3], { tolerance: 1e-4 });
    expect(s.operations).toHaveLength(2);
    expect(s.multiplicity).toBe(4);
    expect(s.general).toBe(false);
    expect(Math.abs(s.direction[0] - s.direction[1])).toBeLessThan(1e-12);
    expect(Math.hypot(...s.direction)).toBeCloseTo(1, 12);
  });

  it('treats the general position and the default tolerance', () => {
    const s = siteSymmetryOf(ops, [1, 1.00004, 3]);
    expect(s.operations).toEqual([0]);
    expect(s.general).toBe(true);
    expect(s.multiplicity).toBe(8);
  });

  it('closes the fixing operations to a group and sets the direction exactly on its axis', () => {
    // 6 × 10⁻⁵ off the sixfold axis: the sixfold rotations move it by 0.6 × 10⁻⁴ (fixing within the tolerance),
    // the threefold ones by 1.04 × 10⁻⁴ and the twofold one by 1.2 × 10⁻⁴ (not fixing): not a group.
    const near: Vec3 = [-0.0000424264, 0.0000424264, 1];
    const six = operations('6/mmm', { setting: 1 });
    const s = siteSymmetryOf(six, near, { tolerance: 1e-4 });
    expect(s.operations).toHaveLength(12);
    expect(s.multiplicity).toBe(2);
    expect(Math.abs(s.direction[0]) + Math.abs(s.direction[1])).toBeLessThan(1e-12);
  });

  it('gives the same result whatever time reversal the operations carry', () => {
    // 4m'm' has the operations of 4mm in the same order, half of them with time reversal.
    expect(siteSymmetryOf(operations("4m'm'"), [1, 0, 1]).operations).toEqual(
      siteSymmetryOf(ops, [1, 0, 1]).operations,
    );
  });

  it('is general only if no operation but the identity fixes the direction', () => {
    const m = operations('m', { setting: 2 });
    expect(siteSymmetryOf(m, [1, 2, 0]).general).toBe(false);
    expect(siteSymmetryOf(m, [1, 2, 3]).general).toBe(true);
  });

  it('refuses a list that is not a group, naming the missing product', () => {
    // The generators of 4/mmm gave a site symmetry without the identity and the multiplicity 4.
    expect(() => siteSymmetryOf(generators('4/mmm'), [1, 0, 0])).toThrow(
      /not a group: the identity is not in the list/,
    );
    const withIdentity = [operations('1')[0], ...generators('4/mmm')];
    expect(() => siteSymmetryOf(withIdentity, [1, 0, 0])).toThrow(
      /not a group: the product of operations \d+ and \d+ is not in the list/,
    );
    const mirrorOnly = operations('m', { setting: 2 }).filter((o) => o.cartesian[2][2] === -1);
    expect(() => siteSymmetryOf(mirrorOnly, [1, 2, 0])).toThrow(RangeError);
    // A group in any order and any frame is accepted.
    expect(siteSymmetryOf([...operations('4/mmm')].reverse(), [1, 0, 0]).multiplicity).toBe(4);
  });

  it('refuses an operation twice, a missing identity, and a list closed in its matrices but not in time reversal', () => {
    const m = operations('m', { setting: 2 });
    expect(() => siteSymmetryOf([...m, m[1]], [1, 0, 0])).toThrow(/operations 1 and 2 are the same/);
    expect(() => siteSymmetryOf([m[1]], [1, 0, 0])).toThrow(/the identity is not in the list/);
    // 1, 1', 2: closed in the matrices, but 1'·2 = 2' is missing (it gave the multiplicity 1.5).
    const i = { cartesian: m[0].cartesian, timeReversal: false };
    const two = operations('2', { setting: 2 })[1].cartesian;
    expect(() =>
      siteSymmetryOf([i, { ...i, timeReversal: true }, { cartesian: two, timeReversal: false }], [1, 0, 0]),
    ).toThrow(/product of operations 1 and 2/);
    // A grey group, every matrix twice with the two time reversals, is a group.
    expect(siteSymmetryOf(operations("4/mmm1'"), [1, 0, 0]).multiplicity).toBe(4);
    // Matrices rounded to 6 decimals pass at the default tolerance.
    const rounded = operations('6/mmm').map((o) => ({
      cartesian: o.cartesian.map((row) => row.map((x) => Math.round(x * 1e6) / 1e6)) as unknown as Vec3[],
    }));
    expect(siteSymmetryOf(rounded as never, [1, 0, 0]).multiplicity).toBe(6);
  });

  it('reads an empty list as the group 1, as the other functions of a list do', () => {
    expect(siteSymmetryOf([], [0, 0, 2])).toEqual({
      operations: [],
      direction: [0, 0, 1],
      multiplicity: 1,
      general: true,
    });
  });

  it('throws if the operations fixing within a far too large tolerance fix no common direction', () => {
    // 422, tolerance 0.95: operations that move this direction by up to 0.95 generate a group fixing no
    // direction (found by a scan; a tolerance far beyond any use).
    expect(() => siteSymmetryOf(operations('422'), [0.9018, 0.3462, 0.2588], { tolerance: 0.95 })).toThrow(RangeError);
  });

  it('answers for the list as it is now, also when a caller changes its list in place (#90)', () => {
    // Before #90 the products were cached by the identity of the list: after the list of 2 was
    // replaced in place by that of mm2, [1, 0, 1] got the site symmetry [0, 1, 2, 3].
    const list = [...operations('2', { setting: 1 })];
    siteSymmetryOf(list, [0, 1, 0]);
    list.length = 0;
    list.push(...operations('mm2', { setting: 1 }));
    expect(siteSymmetryOf(list, [1, 0, 1]).operations).toEqual(siteSymmetryOf([...list], [1, 0, 1]).operations);
    for (const first of POINT_GROUP_KEYS) {
      for (const second of POINT_GROUP_KEYS) {
        const changing = [...operations(first)];
        for (const d of DIRECTIONS) siteSymmetryOf(changing, d, { tolerance: 1e-3 });
        changing.length = 0;
        changing.push(...operations(second));
        for (const d of DIRECTIONS) {
          expect(siteSymmetryOf(changing, d, { tolerance: 1e-3 }).operations, `${first} → ${second}`).toEqual(
            siteSymmetryOf([...changing], d, { tolerance: 1e-3 }).operations,
          );
        }
      }
    }
  });

  it('gives a subgroup of a grey group also at a large tolerance, each matrix twice or not at all (#133)', () => {
    // Before #133 the product of two operations was looked up by its matrix alone, so in a grey group
    // it always found the copy without time reversal: 6mm1' at [0.74, -0.16, -0.14], tolerance 0.7,
    // gave 15 of its 24 operations.
    expect(siteSymmetryOf(operations("6mm1'"), [0.74, -0.16, -0.14], { tolerance: 0.7 }).operations).toHaveLength(24);
    expect(GREY_POINT_GROUP_KEYS).toHaveLength(32);
    for (const key of GREY_POINT_GROUP_KEYS) {
      const ops = operations(key);
      for (const d of DIRECTIONS) {
        for (const tolerance of [0.5, 0.7, 0.9]) {
          let site;
          try {
            site = siteSymmetryOf(ops, d, { tolerance });
          } catch (e) {
            expect(e, `${key} ${d} ${tolerance}`).toBeInstanceOf(RangeError);
            continue;
          }
          const members = site.operations.map((i) => ops[i]);
          for (const a of members) {
            for (const b of members) {
              const m = multiply(a.cartesian, b.cartesian);
              const t = a.timeReversal !== b.timeReversal;
              expect(
                members.some((c) => c.timeReversal === t && matricesEqual(c.cartesian, m)),
                `${key} ${d} ${tolerance}: closed under the magnetic product`,
              ).toBe(true);
            }
          }
          for (const a of members) {
            expect(
              members.filter((c) => matricesEqual(c.cartesian, a.cartesian)),
              `${key} ${d} ${tolerance}`,
            ).toHaveLength(2);
          }
        }
      }
    }
  });

  it('throws if the fixing operations do not settle into a group, instead of returning a non-group (#91)', () => {
    // Found by a scan of the review of #91: before, this returned 10 of the 24 operations of 6221',
    // which are no subgroup, and the direction not projected. Since #133 compares whole operations
    // in the products, the closure fixes no common direction there, which throws as well.
    expect(() => siteSymmetryOf(operations("6221'"), [-0.655, 0.766, 0.415], { tolerance: 0.99 })).toThrow(
      /does not settle|No common fixed direction/,
    );
  });

  it('rejects a zero vector and an invalid tolerance', () => {
    expect(() => siteSymmetryOf(ops, [0, 0, 0])).toThrow(RangeError);
    expect(() => siteSymmetryOf(ops, [0, 0, 1], { tolerance: 0 })).toThrow(RangeError);
    expect(() => siteSymmetryOf(ops, [0, 0, 1], { tolerance: Number.NaN })).toThrow(RangeError);
  });
});

describe('magnetic point groups', () => {
  it('have no Wyckoff positions: ITA gives them for the crystal classes only', () => {
    for (const key of ["4'/mmm'", "2221'"]) {
      expect(() => wyckoffPositions(key as never)).toThrow(/32 crystal classes only/);
      expect(() => wyckoffPosition(key as never, { cartesian: [0, 0, 1] })).toThrow(RangeError);
    }
    expect(() => wyckoffPositions('nonsense' as never)).toThrow(/Unknown point group key/);
  });

  it('site symmetry of a direction ignores the time reversal of their operations', () => {
    const site = siteSymmetryOf(operations("4'/mmm'"), [0, 0, 1]);
    expect(site.operations).toHaveLength(8);
    expect(site.multiplicity).toBe(2);
  });
});

describe('reading printed Miller indices', () => {
  it('reads terms and sums of terms, with h = 3, k = 2, l = 1 unless given', () => {
    expect(numericHkl('h,k,-h-k')).toEqual([3, 2, -5]);
    expect(numericHkl('h,k,2k-h', { h: 5, k: 2, l: 1 })).toEqual([5, 2, -1]);
    expect(numericHkl('h,h,-2h,l')).toEqual([3, 3, 1]);
    expect(numericHkl('1,-1,0')).toEqual([1, -1, 0]);
  });

  it('refuses run-together terms and stray signs', () => {
    for (const bad of ['hk,0,0', 'h2,0,0', 'h+,0,0', '+h,0,0', 'h--k,0,0', 'x,0,0']) {
      expect(() => numericHkl(bad), bad).toThrow(/Unreadable/);
    }
  });
});
