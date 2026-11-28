import { describe, expect, it } from 'vitest';
import { millerIndices } from '../indices.js';
import { representativeFace } from './wyckoff.js';
import { apply, type Vec3 } from '../linalg.js';
import { siteSymmetryOf } from '../siteSymmetry.js';
import { CRYSTAL_FORM_TYPES, crystalForms } from './crystalForms.js';
import { POINT_GROUP_KEYS, operations, settings } from './pointGroups.js';
import { wyckoffPosition, wyckoffPositions } from './wyckoff.js';
import { classData } from './classData.js';
import { carryFace, readPattern } from '../testUtils/settingChange.js';

const ALL_SETTINGS = POINT_GROUP_KEYS.flatMap((key) => settings(key).map((s) => ({ key, s })));

/** The distinct images of a direction under a list of operations. */
function orbitSize(key: (typeof POINT_GROUP_KEYS)[number], setting: number, v: Vec3): number {
  const images: Vec3[] = [];
  for (const g of operations(key, { setting })) {
    const w = apply(g.cartesian, v);
    if (!images.some((u) => Math.hypot(u[0] - w[0], u[1] - w[1], u[2] - w[2]) < 1e-9)) images.push(w);
  }
  return images.length;
}

describe('CRYSTAL_FORM_TYPES', () => {
  it('are the 47 kinds of forms, by key, frozen', () => {
    expect(Object.keys(CRYSTAL_FORM_TYPES)).toHaveLength(47);
    expect(CRYSTAL_FORM_TYPES['tetragonal-prism']).toEqual({
      name: 'Tetragonal prism',
      faces: 4,
      eigensymmetry: '4/mmm',
    });
    expect(Object.isFrozen(CRYSTAL_FORM_TYPES) && Object.isFrozen(CRYSTAL_FORM_TYPES.pedion)).toBe(true);
  });
});

describe('crystalForms', () => {
  it('exist for every ITC setting: one basic form or more per Wyckoff position, limiting forms after it', () => {
    for (const { key, s } of ALL_SETTINGS) {
      const label = `${key} #${s.index}`;
      const forms = crystalForms(key, { setting: s.index });
      const positions = wyckoffPositions(key, { setting: s.index });
      expect([...new Set(forms.map((f) => f.letter))], label).toEqual(positions.map((p) => p.letter));
      for (const p of positions) {
        const own = forms.filter((f) => f.letter === p.letter);
        expect(own[0].basic, `${label} ${p.letter}`).toBe(true);
        expect(own.every((f) => f.multiplicity === p.multiplicity && f.siteSymmetry === p.siteSymmetry)).toBe(true);
      }
    }
  });

  it('have representatives in their Wyckoff position, with as many faces as the form', () => {
    for (const { key, s } of ALL_SETTINGS) {
      for (const f of crystalForms(key, { setting: s.index })) {
        const label = `${key} #${s.index} ${f.letter} ${f.millerIndices}`;
        const v = representativeFace(key, s.index, f.millerIndices, f.condition).cartesian;
        expect(wyckoffPosition(key, { cartesian: v }, { setting: s.index }).letter, label).toBe(f.letter);
        expect(orbitSize(key, s.index, v), label).toBe(CRYSTAL_FORM_TYPES[f.formType].faces);
        const ops = operations(key, { setting: s.index });
        expect(ops.length / siteSymmetryOf(ops, v).operations.length, label).toBe(f.multiplicity);
      }
    }
  });

  it('meet their condition with the representative', () => {
    const conditional = ALL_SETTINGS.flatMap(({ key, s }) =>
      crystalForms(key, { setting: s.index }).filter((f) => f.condition !== undefined),
    );
    expect(conditional.length).toBeGreaterThan(0);
    for (const f of conditional) {
      const [h, , l] = millerIndices(
        f.millerIndices,
        f.condition === '|h|<|l|' ? { h: 1, k: 2, l: 3 } : { h: 3, k: 2, l: 1 },
      ).map(Math.abs);
      expect(f.condition === '|h|<|l|' ? h < l : h > l, `${f.millerIndices} ${f.condition}`).toBe(true);
    }
    // -43m c: (113) is the trigon-tritetrahedron, (331) the tetragon-tritetrahedron.
    const c = crystalForms('-43m').filter((f) => f.letter === 'c' && f.basic);
    expect(c.map((f) => [f.formType, representativeFace('-43m', 1, f.millerIndices, f.condition).hkl])).toEqual([
      ['trigon-tritetrahedron', [1, 1, 3]],
      ['tetragon-tritetrahedron', [3, 3, 1]],
    ]);
  });

  it('carry setting 1 into mm2 settings 2 and 3, which ITA does not print', () => {
    const one = crystalForms('mm2', { setting: 1 });
    for (const setting of [2, 3]) {
      const other = crystalForms('mm2', { setting });
      expect(other.map((f) => [f.letter, f.basic, f.formType])).toEqual(
        one.map((f) => [f.letter, f.basic, f.formType]),
      );
    }
    expect(crystalForms('mm2', { setting: 2 }).map((f) => f.millerIndices)).toEqual([
      'h,k,l',
      '0,k,l',
      'h,0,l',
      '0,0,1',
      'h,k,0',
      '0,1,0',
      '1,0,0',
    ]);
  });

  it('carry unique axis b into unique axis a (a′ = b, b′ = c, c′ = a), which ITA does not print', () => {
    // By hand from the printed unique-axis-b lists (ITA Table 3.2.3.2, pp. 745–746), h, k, l renamed
    // after their new axes: (h0l) → (0kl), (010) → (100).
    expect(crystalForms('2', { setting: 3 }).map((f) => f.millerIndices)).toEqual(['h,k,l', '0,k,l', '1,0,0']);
    expect(crystalForms('m', { setting: 3 }).map((f) => f.millerIndices)).toEqual(['h,k,l', '1,0,0', '0,k,l']);
    expect(crystalForms('2/m', { setting: '2/m 1 1' }).map((f) => f.millerIndices)).toEqual([
      'h,k,l',
      '0,k,l',
      '1,0,0',
    ]);
  });

  it('default to the ITC default setting', () => {
    expect(crystalForms('32')).toBe(crystalForms('32', { setting: 1 }));
    expect(crystalForms('32')).toBe(crystalForms('32', { setting: '321' }));
    expect(crystalForms('2').at(-1)?.millerIndices).toBe('0,1,0');
    expect(crystalForms('2', { setting: 2 }).at(-1)?.millerIndices).toBe('0,0,1');
  });

  it('refuse the option convention, removed in 0.11.0', () => {
    expect(() => crystalForms('mmm', { convention: 'birss' } as never)).toThrow(RangeError);
    expect(() => crystalForms('mmm', { convention: 'itc' } as never)).toThrow(/option convention was removed/);
  });

  it('reject an unknown setting', () => {
    expect(() => crystalForms('mmm', { setting: 2 })).toThrow(RangeError);
  });

  it('are frozen', () => {
    const f = crystalForms('4mm')[1];
    expect(Object.isFrozen(crystalForms('4mm')) && Object.isFrozen(f)).toBe(true);
    expect('representative' in f).toBe(false);
  });
});

describe('crystalForms of the settings ITA does not print', () => {
  // The settings that come from a printed one by a change of basis P (classData.ts, `from`).
  const unprinted = POINT_GROUP_KEYS.flatMap((key) =>
    classData(key).settings.flatMap((s) => (s.from ? [{ key, index: s.index, from: s.from }] : [])),
  );

  it('are five settings', () => {
    expect(unprinted).toHaveLength(5);
  });

  for (const { key, index, from } of unprinted) {
    it(`${key}, setting ${index}: are the forms of setting ${from.index} carried by P, in the same order`, () => {
      const p = from.basis.map((row) => [...row]);
      const printed = crystalForms(key, { setting: from.index });
      const computed = crystalForms(key, { setting: index });
      const positions = wyckoffPositions(key, { setting: index });
      expect(computed).toHaveLength(printed.length);
      computed.forEach((f, i) => {
        const q = printed[i];
        const label = `${key} #${index} ${f.letter} ${f.formType}`;
        expect([f.letter, f.multiplicity, f.basic, f.formType, f.condition], label).toEqual([
          q.letter,
          q.multiplicity,
          q.basic,
          q.formType,
          q.condition,
        ]);
        expect(f.siteSymmetry, label).toBe(positions.find((w) => w.letter === f.letter)?.siteSymmetry);
        expect(readPattern(f.millerIndices, 'hkl'), label).toEqual(carryFace(q.millerIndices, p));
      });
    });
  }
});
