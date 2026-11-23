import { describe, expect, it } from 'vitest';
import { apply, type Vec3 } from '../linalg.js';
import { siteSymmetry } from '../siteSymmetry.js';
import { CRYSTAL_FORM_TYPES, crystalForms } from './crystalForms.js';
import { POINT_GROUP_KEYS, operations, settings } from './pointGroups.js';
import { wyckoffPositionOf, wyckoffPositions } from './wyckoff.js';

const ALL_SETTINGS = POINT_GROUP_KEYS.flatMap((key) => settings(key).map((s) => ({ key, s })));

/** The distinct images of a direction under a list of operations. */
function orbitSize(key: (typeof POINT_GROUP_KEYS)[number], setting: number, v: Vec3): number {
  const images: Vec3[] = [];
  for (const g of operations(key, { setting })) {
    const w = apply(g.matrix, v);
    if (!images.some((u) => Math.hypot(u[0] - w[0], u[1] - w[1], u[2] - w[2]) < 1e-9)) images.push(w);
  }
  return images.length;
}

describe('CRYSTAL_FORM_TYPES', () => {
  it('are the 47 forms, form n at index n - 1, frozen', () => {
    expect(CRYSTAL_FORM_TYPES).toHaveLength(47);
    CRYSTAL_FORM_TYPES.forEach((t, i) => expect(t.number).toBe(i + 1));
    expect(CRYSTAL_FORM_TYPES[9]).toEqual({ number: 10, name: 'Tetragonal prism', faces: 4, eigensymmetry: '4/mmm' });
    expect(Object.isFrozen(CRYSTAL_FORM_TYPES) && Object.isFrozen(CRYSTAL_FORM_TYPES[0])).toBe(true);
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
        const v = f.representative.cartesian;
        expect(wyckoffPositionOf(key, v, { setting: s.index }).letter, label).toBe(f.letter);
        expect(orbitSize(key, s.index, v), label).toBe(CRYSTAL_FORM_TYPES[f.formType - 1].faces);
        const ops = operations(key, { setting: s.index });
        expect(ops.length / siteSymmetry(ops, v).operations.length, label).toBe(f.multiplicity);
      }
    }
  });

  it('meet their condition with the representative', () => {
    const conditional = ALL_SETTINGS.flatMap(({ key, s }) =>
      crystalForms(key, { setting: s.index }).filter((f) => f.condition !== undefined),
    );
    expect(conditional.length).toBeGreaterThan(0);
    for (const f of conditional) {
      const [h, , l] = f.representative.hkl.map(Math.abs);
      expect(f.condition === '|h|<|l|' ? h < l : h > l, `${f.millerIndices} ${f.condition}`).toBe(true);
    }
    // -43m c: (113) is the trigon-tritetrahedron, (331) the tetragon-tritetrahedron.
    const c = crystalForms('-43m').filter((f) => f.letter === 'c' && f.basic);
    expect(c.map((f) => [f.formType, f.representative.hkl])).toEqual([
      [39, [1, 1, 3]],
      [38, [3, 3, 1]],
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
    expect(Object.isFrozen(f.representative) && Object.isFrozen(f.representative.hkl)).toBe(true);
    expect(Object.isFrozen(f.representative.cartesian)).toBe(true);
  });
});
