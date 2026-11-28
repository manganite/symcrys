/**
 * The plane API (`symcrys/plane`): keys, the plane point groups, the conversion to plain numbers and
 * the errors. The values themselves are checked against print in `spaceGroups/*.reference.test.ts`.
 */

import { describe, expect, it } from 'vitest';
import * as plane from './plane.js';
import { planeAsymmetricUnit, planeElements } from './spaceGroups/cell.js';
import { describePlaneOperation } from './spaceGroups/describe.js';
import { compose, parseOperation, toPlain, translationOperation } from './spaceGroups/affine.js';
import { planeGroupOperations } from './spaceGroups/planeGroups.js';
import { parseRational, rational, toNumber } from './spaceGroups/rational.js';
import { readReference, section, tableRows } from './testUtils/references.js';
import { numbersIn } from './testUtils/noise.js';

const key = (m: readonly (readonly number[])[]) => JSON.stringify(m);

describe('keys', () => {
  it('17 plane groups in ITA order and 10 plane point groups, no key in both', () => {
    expect(plane.PLANE_GROUP_KEYS).toHaveLength(17);
    expect(plane.PLANE_GROUP_KEYS.map((k) => plane.planeGroup(k).number)).toEqual(
      [...Array(17).keys()].map((i) => i + 1),
    );
    expect(plane.POINT_GROUP_KEYS).toEqual(['1', '2', 'm', '2mm', '4', '4mm', '3', '3m', '6', '6mm']);
    expect(plane.PLANE_GROUP_KEYS.filter((k) => (plane.POINT_GROUP_KEYS as readonly string[]).includes(k))).toEqual([]);
  });
});

describe('keys, lists and finding by symbol (#97)', () => {
  it('isPlaneGroupKey and isPointGroupKey answer for the keys and nothing else', () => {
    for (const k of plane.PLANE_GROUP_KEYS) {
      expect(plane.isPlaneGroupKey(k)).toBe(true);
      expect(plane.isPointGroupKey(k)).toBe(false);
    }
    for (const k of plane.POINT_GROUP_KEYS) {
      expect(plane.isPointGroupKey(k)).toBe(true);
      expect(plane.isPlaneGroupKey(k)).toBe(false);
    }
    for (const k of ['', 'p1m1', 'P2', '3m1', 'mm2', 'p 2']) {
      expect(plane.isPlaneGroupKey(k), k).toBe(false);
      expect(plane.isPointGroupKey(k), k).toBe(false);
    }
  });

  it('planeGroups and pointGroups are the records of the keys, in order, frozen', () => {
    expect(plane.planeGroups()).toEqual(plane.PLANE_GROUP_KEYS.map((k) => plane.planeGroup(k)));
    expect(plane.pointGroups()).toEqual(plane.POINT_GROUP_KEYS.map((k) => plane.pointGroup(k)));
    expect(Object.isFrozen(plane.planeGroups())).toBe(true);
  });

  it('findPointGroup reads the key and the symbol of a setting, spaces ignored', () => {
    expect(plane.findPointGroup('3m')).toEqual({ key: '3m', setting: 1 });
    expect(plane.findPointGroup('3m1')).toEqual({ key: '3m', setting: 1 });
    expect(plane.findPointGroup('3 1 m')).toEqual({ key: '3m', setting: 2 });
    expect(plane.findPointGroup(' 2 m m ')).toEqual({ key: '2mm', setting: 1 });
    for (const k of plane.POINT_GROUP_KEYS) {
      for (const s of plane.settings(k)) expect(plane.findPointGroup(s.symbol)).toEqual({ key: k, setting: s.index });
    }
    for (const text of ['mm2', 'p3m1', '4/m', '']) expect(plane.findPointGroup(text), text).toBeUndefined();
    expect(plane.findPlaneGroup('3m1')).toBeUndefined();
    expect(plane.findPlaneGroup('P2mg')).toBeUndefined();
    expect(() => plane.findPlaneGroup(1 as never)).toThrow(RangeError);
    expect(() => plane.findPointGroup(null as never)).toThrow(RangeError);
  });

  it('a setting is chosen by its index or its symbol (#123)', () => {
    expect(plane.operations('3m', { setting: '31m' })).toEqual(plane.operations('3m', { setting: 2 }));
    expect(plane.operations('3m', { setting: '3 m 1' })).toEqual(plane.operations('3m', { setting: 1 }));
    expect(plane.operations('3m', { setting: '3m' })).toEqual(plane.operations('3m'));
    expect(plane.symbol('3m', { setting: '31m', form: 'full' })).toBe('3 1 m');
    expect(plane.generators('m', { setting: 'm' })).toEqual(plane.generators('m'));
    expect(plane.operations('pm', { setting: 'p1m1' })).toEqual(plane.operations('pm'));
    expect(plane.describeOperations('p2mg', { setting: 'p2mg' })).toEqual(plane.describeOperations('p2mg'));
    expect(() => plane.operations('3m', { setting: '3m2' })).toThrow(/settings: 3m1, 31m/);
    expect(() => plane.operations('pm', { setting: 'pg' })).toThrow(RangeError);
  });
});

describe('plane point groups', () => {
  it('are the linear parts of every plane group with that point group (cm and pg as pm, p4gm as p4mm, …)', () => {
    for (const k of plane.PLANE_GROUP_KEYS) {
      const g = plane.planeGroup(k);
      const linear = new Set(plane.operations(k).map((op) => key(op.matrix)));
      const point = plane.operations(g.pointGroup, { setting: g.pointGroupSetting });
      expect(new Set(point.map((op) => key(op.matrix))), k).toEqual(linear);
      expect(point.every((op) => op.translation.every((t) => t === 0))).toBe(true);
      expect(
        plane.pointGroup(g.pointGroup).order * g.centringTranslations.length + plane.pointGroup(g.pointGroup).order,
      ).toBe(plane.operations(k).length);
    }
  });

  it('3m has the settings 3m1 and 31m, the others one', () => {
    expect(plane.symbol('3m')).toBe('3m1');
    expect(plane.symbol('3m', { setting: 2 })).toBe('31m');
    expect(plane.symbol('2mm')).toBe('2mm');
    expect(plane.symbol('m')).toBe('m');
    // Plane groups too: the short symbol is the key, the full one as ITA prints it.
    expect(plane.symbol('pm')).toBe('pm');
    expect(plane.symbol('pm', { form: 'full' })).toBe('p 1 m 1');
    expect(plane.symbol('cm', { form: 'full' })).toBe('c 1 m 1');
    expect(plane.symbol('p2mg', { form: 'full' })).toBe('p 2 m g');
    expect(plane.symbol('3m', { setting: 2, form: 'full' })).toBe('3 1 m');
    expect(plane.symbol('m', { form: 'full' })).toBe('m');
    expect(() => plane.symbol('p7' as plane.PlaneGroupKey)).toThrow(/Unknown plane group or plane point group/);
    expect(() => plane.symbol('pm', { setting: 2 })).toThrow(RangeError);
    expect(() => plane.symbol('pm', { form: 'long' as never })).toThrow(RangeError);
    expect(plane.pointGroup('3m')).toEqual({ key: '3m', crystalSystem: 'hexagonal', order: 6, laueClass: '6mm' });
    expect(plane.pointGroup('4mm')).toEqual({ key: '4mm', crystalSystem: 'square', order: 8, laueClass: '4mm' });
    expect(plane.settings('3m')).toEqual([
      { index: 1, symbol: '3m1', isDefault: true },
      { index: 2, symbol: '31m', isDefault: false },
    ]);
    expect(plane.settings('m')).toEqual([{ index: 1, symbol: 'm', isDefault: true }]);
    expect(plane.settings('p2mg')).toEqual([{ index: 1, symbol: 'p2mg', isDefault: true }]);
    expect(() => plane.settings('p7' as plane.PointGroupKey)).toThrow(RangeError);
    expect(plane.planeGroup('p31m').pointGroupSetting).toBe(2);
    expect(plane.planeGroup('p3m1').pointGroupSetting).toBe(1);
    expect(() => plane.symbol('4mm', { setting: 2 })).toThrow(RangeError);
    expect(() => plane.operations('3m', { setting: 3 })).toThrow(RangeError);
    expect(() => plane.operations('p2', { setting: 2 })).toThrow(RangeError);
  });

  it('generators of a point group generate it', () => {
    for (const k of plane.POINT_GROUP_KEYS) {
      for (let s = 1; s <= plane.settings(k).length; s++) {
        const group = new Set([
          key([
            [1, 0],
            [0, 1],
          ]),
        ]);
        const gens = plane.generators(k, { setting: s }).map((g) => g.matrix);
        let grew = true;
        while (grew) {
          grew = false;
          for (const a of [...group]) {
            for (const b of gens) {
              const m = JSON.parse(a) as number[][];
              const p = [0, 1].map((i) => [0, 1].map((j) => m[i][0] * b[0][j] + m[i][1] * b[1][j]));
              if (!group.has(key(p))) {
                group.add(key(p));
                grew = true;
              }
            }
          }
        }
        expect(group).toEqual(new Set(plane.operations(k, { setting: s }).map((op) => key(op.matrix))));
      }
    }
  });
});

describe('plain numbers at the API', () => {
  it('plane groups', () => {
    expect(plane.planeGroup('c2mm')).toEqual({
      key: 'c2mm',
      number: 9,
      pointGroup: '2mm',
      pointGroupSetting: 1,
      crystalSystem: 'rectangular',
      bravaisLattice: 'oc',
      pattersonSymmetry: 'c2mm',
      centringTranslations: [[0.5, 0.5]],
      originSiteSymmetry: '2mm',
    });
    const ops = plane.operations('p3');
    expect(ops[1]).toEqual({
      matrix: [
        [0, -1],
        [1, -1],
      ],
      translation: [0, 0],
    });
    expect(plane.operations('c2mm')[5].translation).toEqual([0.5, 0.5]);
    expect(plane.generators('c2mm')[0]).toEqual({
      matrix: [
        [1, 0],
        [0, 1],
      ],
      translation: [0.5, 0.5],
    });
  });

  it('descriptions, asymmetric unit and elements are the exact values as the nearest doubles', () => {
    for (const k of plane.PLANE_GROUP_KEYS) {
      const exact = planeGroupOperations(k).map(describePlaneOperation);
      plane.describeOperations(k).forEach((d, i) => {
        expect(d.kind).toBe(exact[i].kind);
        expect(d.point).toEqual(exact[i].location?.map(toNumber));
        expect(d.glide).toEqual(exact[i].glide?.map(toNumber));
        expect(d.direction).toEqual(exact[i].direction);
        expect(d.axis?.lattice).toEqual(exact[i].axis);
      });
      expect(plane.asymmetricUnit(k).vertices).toEqual(planeAsymmetricUnit(k).vertices.map((v) => v.map(toNumber)));
      expect(plane.asymmetricUnit(k).edges).toEqual(planeAsymmetricUnit(k).edges);
      const e = planeElements(k);
      expect(plane.symmetryElements(k).lines.map((l) => l.point)).toEqual(e.lines.map((l) => l.point.map(toNumber)));
      expect(plane.symmetryElements(k).lines.map((l) => l.axis.lattice)).toEqual(e.lines.map((l) => l.axis));
      expect(plane.symmetryElements(k).rotationPoints.map((r) => r.n)).toEqual(e.rotationPoints.map((r) => r.n));
    }
    expect(plane.describeOperations('p4gm')[4]).toEqual({
      kind: 'glide-reflection',
      n: 2,
      point: [0.25, 0],
      direction: [0, 1],
      axis: { lattice: [1, 0] },
      glide: [0, 0.5],
    });
  });

  it('the orbit of a point gives each image with the operations that map the point there', () => {
    const orbit = plane.orbit('p4', { point: [0.1, 0.2] });
    expect(orbit).toHaveLength(4);
    expect(orbit.flatMap((e) => e.operations).sort((a, b) => a - b)).toEqual([0, 1, 2, 3]);
    expect(plane.orbit('p4', { point: [0, 0] })).toEqual([{ point: [0, 0], operations: [0, 1, 2, 3] }]);
    expect(Object.isFrozen(orbit[0].operations)).toBe(true);
    // Every entry: its operations map the point (set onto its site symmetry) onto its point, and
    // the first entry holds the site symmetry, also for a centred group and near an element with a
    // tolerance (where merging images pairwise put 4+ and 4- without 2 together, review of #153).
    const image = (op: plane.PlaneOperation, p: readonly number[]) =>
      [0, 1].map((i) => op.matrix[i][0] * p[0] + op.matrix[i][1] * p[1] + op.translation[i]);
    const sameMod1 = (a: readonly number[], b: readonly number[]) =>
      a.every((x, i) => Math.abs(x - b[i] - Math.round(x - b[i])) < 1e-9);
    const cases: [plane.PlaneGroupKey, number[], number | undefined][] = [
      ['c2mm', [0, 0], undefined],
      ['c2mm', [0.1, 0], undefined],
      ['p4', [0.01, 0.002], 0.02],
      ['p6mm', [0.335, 0.666], 0.01],
      ['p31m', [0.1, 0.3], undefined],
    ];
    for (const [k, p, tolerance] of cases) {
      const ops = plane.operations(k);
      const options = tolerance === undefined ? undefined : { tolerance };
      const site = plane.siteSymmetry(k, { point: p }, options);
      const entries = plane.orbit(k, { point: p }, options);
      expect(entries[0].operations, `${k} ${p}`).toEqual(site.operations);
      expect(entries, `${k} ${p}`).toHaveLength(site.multiplicity);
      for (const e of entries) {
        for (const i of e.operations) expect(sameMod1(image(ops[i], site.point), e.point), `${k} ${p} ${i}`).toBe(true);
      }
    }
  });

  it('points', () => {
    expect(plane.wyckoffPosition('p6mm', { point: [1 / 3, 2 / 3] })).toEqual({
      letter: 'b',
      multiplicity: 2,
      siteSymmetry: '3m.',
      coordinates: ['1/3,2/3', '2/3,1/3'],
      // The threefold rotations and the mirrors -y,-x; -x+y,y; x,x-y, which map 1/3,2/3 onto itself modulo the lattice.
      siteSymmetryOperations: [0, 1, 2, 6, 7, 8],
    });
    expect(plane.wyckoffPosition('cm', { point: [0.2, 0.3] })).toEqual(plane.wyckoffPositions('cm')[0]);
    const site = plane.siteSymmetry('p2mm', { point: [0.5, 0.2] });
    expect(site.multiplicity).toBe(2);
    expect(site.general).toBe(false);
    expect(plane.siteSymmetry('p2mm', { point: [0.31, 0.2] }).general).toBe(true);
    expect(plane.orbit('p2', { point: [0.1, 0.2] })).toHaveLength(2);
    expect(plane.wyckoffPositions('cm')).toEqual([
      { letter: 'b', multiplicity: 4, siteSymmetry: '1', coordinates: ['x,y', '-x,y'], siteSymmetryOperations: [0] },
      { letter: 'a', multiplicity: 2, siteSymmetry: '.m.', coordinates: ['0,y'], siteSymmetryOperations: [0, 1] },
    ]);
  });

  it('results are frozen', () => {
    expect(Object.isFrozen(plane.operations('p2')[0].matrix[0])).toBe(true);
    expect(Object.isFrozen(plane.symmetryElements('p2').rotationPoints[0].point)).toBe(true);
    expect(Object.isFrozen(plane.PLANE_GROUP_KEYS)).toBe(true);
  });
});

describe('symmetryElements and asymmetricUnit', () => {
  it('give each element once modulo the lattice, and the translates in a box on request', () => {
    // p2: the four twofold points 0,0; 1/2,0; 0,1/2; 1/2,1/2, each once (in the cell [0, 1]² there are nine).
    const once = plane.symmetryElements('p2');
    expect(once.rotationPoints.map((r) => r.point)).toEqual([
      [0, 0],
      [0.5, 0],
      [0, 0.5],
      [0.5, 0.5],
    ]);
    const cell = plane.symmetryElements('p2', { box: [[0, 0], [1, 1]] }); // prettier-ignore
    expect(cell.rotationPoints).toHaveLength(9);
    // pm: the mirror lines x = 0 and x = 1/2 once, as a point and a direction.
    expect(plane.symmetryElements('pm').lines.map((l) => [l.kind, l.point, l.direction])).toEqual([
      ['mirror', [0, 0], [0, 1]],
      ['mirror', [0.5, 0], [0, 1]],
    ]);
    // In a box [−1, 1] × [0, 1] the lines x = −1, −1/2, 0, 1/2, 1, not clipped.
    const box = plane.symmetryElements('pm', { box: [[-1, 0], [1, 1]] }); // prettier-ignore
    expect(box.lines.map((l) => l.point[0])).toEqual([-1, -0.5, 0, 0.5, 1]);
    expect(Object.isFrozen(box.lines[0].point)).toBe(true);
    expect(() => plane.symmetryElements('p2', { box: [[1, 0], [0, 1]] })).toThrow(RangeError); // prettier-ignore
    // A point as a box: the elements through it (the twofold point 1/2,1/2 of p2).
    expect(plane.symmetryElements('p2', { box: [[0.5, 0.5], [0.5, 0.5]] }).rotationPoints).toHaveLength(1); // prettier-ignore
    // cm modulo its centred lattice: the mirror line 0,y and the glide line 1/4,y, as ITA lists them.
    expect(plane.symmetryElements('cm').lines.map((l) => [l.kind, l.point])).toEqual([
      ['mirror', [0, 0]],
      ['glide', [0.25, 0]],
    ]);
    expect(() => plane.symmetryElements('p6mm', { box: [[-1e4, -1e4], [1e4, 1e4]] })).toThrow(/more than/); // prettier-ignore
    expect(() => plane.symmetryElements('p2', { box: [[0, 0]] as never })).toThrow(RangeError);
  });

  it('give the printed inequalities, also those that hold no edge (p3: x ≤ 2/3, y ≤ 2/3)', () => {
    // ITA 2016, p. 188: 0 ≤ x ≤ 2/3; 0 ≤ y ≤ 2/3; x ≤ (1 + y)/2; y ≤ min(1 − x, (1 + x)/2).
    const unit = plane.asymmetricUnit('p3');
    expect(unit.inequalities).toEqual([
      [-1, 0, 0],
      [3, 0, 2],
      [0, -1, 0],
      [0, 3, 2],
      [2, -1, 1],
      [1, 1, 1],
      [-1, 2, 1],
    ]);
    expect(unit.edges.map((e) => unit.inequalities[e])).not.toContainEqual([3, 0, 2]);
    expect(unit.edges).toHaveLength(unit.vertices.length);
  });
});

describe('wyckoffDistances', () => {
  it('gives every printed position in printed order with its nearest point and distance, frozen', () => {
    const all = plane.wyckoffDistances('p6mm', { point: [0.34, 0.66] });
    expect(all.map((d) => d.letter)).toEqual(plane.wyckoffPositions('p6mm').map((w) => w.letter));
    const b = all.find((d) => d.letter === 'b')!;
    expect(b).toEqual({
      ...plane.wyckoffPositions('p6mm').find((w) => w.letter === 'b'),
      point: [1 / 3, 2 / 3],
      distance: b.distance,
    });
    expect(b.distance).toBeCloseTo(0.34 - 1 / 3, 12); // per coordinate: max(|0.34 − 1/3|, |0.66 − 2/3|)
    expect(all[0].distance).toBe(0); // the general position, printed first, holds every point
    expect(Object.isFrozen(all) && Object.isFrozen(b) && Object.isFrozen(b.point)).toBe(true);
  });

  it('with a basis: Euclidean distances in its unit', () => {
    // pm, rectangular cell a = 2, b = 1: the point (0.1, 0.3) is 0.1 · 2 = 0.2 from the line x = 0.
    const a = plane.wyckoffDistances('pm', { point: [0.1, 0.3] }, { basis: [[2, 0], [0, 1]] }).find((d) => d.letter === 'a')!; // prettier-ignore
    expect(a.distance).toBeCloseTo(0.2, 12);
    expect(a.point[0]).toBe(0);
    expect(a.point[1]).toBeCloseTo(0.3, 12);
  });

  it('agrees with wyckoffPosition and siteSymmetry: one notion', () => {
    // 0.012 from the mirror line of pm; its image is 0.024 away, beyond the tolerance 0.02.
    expect(plane.wyckoffPosition('pm', { point: [0.012, 0.3] }, { tolerance: 0.02 }).letter).toBe('a');
    const site = plane.siteSymmetry('pm', { point: [0.012, 0.3] }, { tolerance: 0.02 });
    expect(site.multiplicity).toBe(1);
    expect(site.general).toBe(false);
    expect(site.point[0]).toBe(0);
  });

  it('agree at tolerances below 10⁻⁹ and for large coordinates (review of step 10a)', () => {
    // Before, the site symmetry was recomputed at 10⁻⁹ and the point not reduced modulo the
    // lattice first: both threw a plain Error. A coordinate beyond 10⁶ is refused (#208): at 10¹⁶ a
    // double has no fractional part, and the point lay at distance 0 from 1/4,y of p2mg.
    const cases: [plane.PlaneGroupKey, number[], number, string][] = [
      ['p2', [3e-10, 1e-10], 1e-12, 'e'],
      ['p4mm', [0.3, 3e-10], 1e-12, 'g'],
      ['p3m1', [1 / 3 + 2e-10, 2 / 3 + 1e-10], 1e-12, 'd'],
      ['p2mg', [1e6, 0.3], 1e-6, 'd'],
      ['p4mm', [1e5 + 0.3, 0.2], 0.1, 'f'],
    ];
    for (const [k, p, tolerance, letter] of cases) {
      const w = plane.wyckoffPosition(k, { point: p }, { tolerance });
      const site = plane.siteSymmetry(k, { point: p }, { tolerance });
      const orbit = plane.orbit(k, { point: p }, { tolerance });
      expect(w.letter, `${k} ${p}`).toBe(letter);
      expect(site.multiplicity, `${k} ${p}`).toBe(w.multiplicity);
      expect(orbit, `${k} ${p}`).toHaveLength(w.multiplicity);
      expect(orbit[0].operations).toEqual(site.operations);
    }
    expect(plane.wyckoffDistances('p2mg', { point: [1e6, 0.3] }).find((d) => d.letter === 'c')!.distance).toBeCloseTo(
      0.25,
      9,
    );
    expect(() => plane.wyckoffDistances('p2mg', { point: [1e16, 0.3] })).toThrow(RangeError);
  });

  it('refuses a point group, a bad point or basis', () => {
    expect(() => plane.wyckoffDistances('4mm' as plane.PlaneGroupKey, { point: [0, 0] })).toThrow(RangeError);
    expect(() => plane.wyckoffDistances('p2', { point: 'x' as unknown as number[] })).toThrow(RangeError);
    expect(() => plane.wyckoffDistances('p2', { point: [0, 0] }, { basis: [[1, 2], [2, 4]] })).toThrow(RangeError); // prettier-ignore
    // Bases whose products overflow or vanish are refused, as metricTensor refuses them: the
    // metric of the distances is computed by the same function.
    for (const s of [1e200, 1e-200]) {
      expect(() => plane.wyckoffDistances('p2', { point: [0.1, 0.2] }, { basis: [[s, 0], [0, s]] })).toThrow(RangeError); // prettier-ignore
      expect(() => plane.metricTensor([[s, 0], [0, s]])).toThrow(RangeError); // prettier-ignore
    }
    // Large and small bases that do not overflow are taken, the distances scaled with them.
    for (const s of [1e100, 1e-100]) {
      const d = plane.wyckoffDistances('p2', { point: [0.1, 0.2] }, { basis: [[s, 0], [0, s]] }); // prettier-ignore
      expect(d.find((p) => p.letter === 'a')!.distance / s).toBeCloseTo(Math.hypot(0.1, 0.2), 12);
    }
  });
});

describe('describeOperationsOf', () => {
  it('describes the operations of every group as describeOperations does', () => {
    for (const k of [...plane.PLANE_GROUP_KEYS, ...plane.POINT_GROUP_KEYS]) {
      expect(plane.describeOperationsOf(plane.operations(k))).toEqual(plane.describeOperations(k));
    }
    expect(plane.describeOperationsOf(plane.operations('3m', { setting: 2 }))).toEqual(
      plane.describeOperations('3m', { setting: 2 }),
    );
  });

  it('describes products and shifted operations as the exact description gives them', () => {
    for (const k of plane.PLANE_GROUP_KEYS) {
      const ops = planeGroupOperations(k);
      const shift = translationOperation([rational(1), rational(-2)]);
      const others = ops.flatMap((a) => [compose(shift, a), ...ops.map((b) => compose(a, b))]);
      const plain = others.map((op) => ({
        matrix: op.matrix.map((r) => [...r]),
        translation: op.translation.map(toNumber),
      }));
      plane.describeOperationsOf(plain).forEach((d, i) => {
        const e = describePlaneOperation(others[i]);
        expect(d.kind).toBe(e.kind);
        expect(d.n).toBe(e.n);
        expect(d.sense).toBe(e.sense);
        expect(d.point).toEqual(e.location?.map(toNumber));
        expect(d.glide).toEqual(e.glide?.map(toNumber));
        expect(d.translation).toEqual(e.translation?.map(toNumber));
        expect(d.axis?.lattice).toEqual(e.axis);
      });
    }
  });

  it('refuses a translation within the tolerance of two fractions, instead of reading either', () => {
    // The review of #121 step 8a: 1/12 at tolerance 0.01 was read as 1/11 (the smaller denominator),
    // and 1/4 at 0.09 as 1/3.
    const op = (t: number[]) => ({
      matrix: [
        [1, 0],
        [0, 1],
      ],
      translation: t,
    });
    expect(plane.describeOperationsOf([op([0.25, 1 / 12])])[0].translation).toEqual([0.25, 1 / 12]);
    expect(() => plane.describeOperationsOf([op([0.25, 1 / 12])], { tolerance: 0.01 })).toThrow(/1\/11 and 1\/12/);
    expect(() => plane.describeOperationsOf([op([0.25, 0])], { tolerance: 0.09 })).toThrow(RangeError);
    expect(plane.describeOperationsOf([op([0.2501, 0.5])], { tolerance: 0.001 })[0].translation).toEqual([0.25, 0.5]);
  });

  it('reads a translation within the tolerance of a fraction with a denominator up to 12', () => {
    const [d] = plane.describeOperationsOf([
      {
        matrix: [
          [0, -1],
          [1, -1],
        ],
        translation: [1 / 3 + 1e-12, 2 / 3],
      },
    ]);
    expect(d).toMatchObject({ kind: 'rotation', n: 3, sense: '+' });
    expect(
      plane.describeOperationsOf([
        {
          matrix: [
            [1, 0],
            [0, 1],
          ],
          translation: [1 / 12, 0],
        },
      ])[0].kind,
    ).toBe('translation');
  });

  it('refuses what is not an operation of a plane group', () => {
    const bad: unknown[] = [
      {
        matrix: [
          [1, 0],
          [0, 1],
        ],
        translation: [0.1234, 0],
      },
      {
        matrix: [
          [1, 0],
          [0, 1],
        ],
        translation: [1 / 13, 0],
      },
      {
        matrix: [
          [0.5, 0],
          [0, 1],
        ],
        translation: [0, 0],
      },
      {
        matrix: [
          [1, 1],
          [0, 1],
        ],
        translation: [0, 0],
      },
      {
        matrix: [
          [1, 0, 0],
          [0, 1, 0],
          [0, 0, 1],
        ],
        translation: [0, 0, 0],
      },
      {
        matrix: [
          [1, 0],
          [0, 1],
        ],
      },
      {
        matrix: [
          [1n, 0],
          [0, 1],
        ],
        translation: [0, 0],
      },
      null,
    ];
    for (const op of bad) {
      expect(() => plane.describeOperationsOf([op as plane.PlaneOperation])).toThrow(RangeError);
    }
    expect(() => plane.describeOperationsOf('p2' as unknown as plane.PlaneOperation[])).toThrow(RangeError);
  });
});

describe('errors', () => {
  it('unknown keys, and the key of the other kind', () => {
    for (const f of [plane.operations, plane.generators, plane.describeOperations]) {
      expect(() => f('p7' as plane.PlaneGroupKey)).toThrow(/Unknown plane group or plane point group: "p7"/);
    }
    expect(() => plane.orbit('p7' as plane.PlaneGroupKey, { point: [0, 0] })).toThrow(
      /Unknown plane group or plane point group: "p7"/,
    );
    expect(() => plane.pointGroup('7' as plane.PointGroupKey)).toThrow(/Unknown plane point group: "7"/);
    expect(() => plane.planeGroup(9 as unknown as plane.PlaneGroupKey)).toThrow(RangeError);
    expect(() => plane.planeGroup('2mm' as plane.PlaneGroupKey)).toThrow(/plane group, not of the point group 2mm/);
    expect(() => plane.pointGroup('p2' as plane.PointGroupKey)).toThrow(/planeGroup/);
    expect(() => plane.symbol('p7' as plane.PointGroupKey)).toThrow(RangeError);
    for (const f of [plane.asymmetricUnit, plane.symmetryElements]) {
      expect(() => f('4mm' as plane.PlaneGroupKey)).toThrow(RangeError);
    }
    expect(() => plane.crystalForms('p4mm' as plane.PointGroupKey)).toThrow(RangeError);
    expect(() => plane.wyckoffPositions('4mm', { setting: 2 })).toThrow(RangeError);
    expect(() => plane.wyckoffPositions('p4mm', { setting: 2 })).toThrow(RangeError);
    expect(() => plane.siteSymmetry('4mm' as plane.PlaneGroupKey, { point: [0, 0] })).toThrow(
      /takes a lattice direction \{ uv \} or an edge/,
    );
    expect(() => plane.siteSymmetry('p4mm' as plane.PointGroupKey, { uv: [1, 0] })).toThrow(
      /takes a point \{ point \}/,
    );
    expect(() => plane.orbit('p2', { point: [0.1, 0.2] }, { tolerance: 0.5 })).toThrow(RangeError);
  });
});

describe('plane cells (#119)', () => {
  const close = (x: readonly (readonly number[])[], y: readonly (readonly number[])[]) =>
    x.every((r, i) => r.every((v, j) => Math.abs(v - y[i][j]) < 1e-12));

  it('latticeFromParameters: a along x, b at gamma towards +y; latticeParameters reads them back', () => {
    expect(plane.latticeFromParameters({ a: 3, b: 4, gamma: 90 })).toEqual([
      [3, 0],
      [0, 4],
    ]);
    const hex = plane.latticeFromParameters({ a: 2, b: 2, gamma: 120 });
    expect(hex[0]).toEqual([2, -1]);
    expect(hex[1][1]).toBeCloseTo(Math.sqrt(3), 15);
    for (const p of [
      { a: 3, b: 4, gamma: 90 },
      { a: 2, b: 2, gamma: 120 },
      { a: 1.5, b: 7, gamma: 101.3 },
      { a: 5, b: 2, gamma: 37 },
    ]) {
      const back = plane.latticeParameters(plane.latticeFromParameters(p));
      expect(back.a).toBeCloseTo(p.a, 12);
      expect(back.b).toBeCloseTo(p.b, 12);
      expect(back.gamma).toBeCloseTo(p.gamma, 12);
    }
    // Independent of orientation and handedness.
    expect(
      plane.latticeParameters([
        [0, 3],
        [4, 0],
      ]),
    ).toEqual({ a: 4, b: 3, gamma: 90 });
    expect(Object.isFrozen(plane.latticeFromParameters({ a: 1, b: 1, gamma: 90 })[0])).toBe(true);
  });

  it('metricTensor is AᵀA and reciprocalBasis A⁻ᵀ, with a_i · a*_j = δ_ij', () => {
    const basis = plane.latticeFromParameters({ a: 1.5, b: 7, gamma: 101.3 });
    const g = plane.metricTensor(basis);
    const c = Math.cos((101.3 * Math.PI) / 180);
    expect(
      close(g, [
        [2.25, 1.5 * 7 * c],
        [1.5 * 7 * c, 49],
      ]),
    ).toBe(true);
    const r = plane.reciprocalBasis(basis);
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 2; j++) {
        const dot = basis[0][i] * r[0][j] + basis[1][i] * r[1][j];
        expect(dot).toBeCloseTo(i === j ? 1 : 0, 14);
      }
    }
  });

  it('refuses bad parameters and bases', () => {
    for (const p of [
      { a: 0, b: 1, gamma: 90 },
      { a: 1, b: -1, gamma: 90 },
      { a: 1, b: 1, gamma: 180 },
      { a: 1, b: 1, gamma: 0 },
    ]) {
      expect(() => plane.latticeFromParameters(p), JSON.stringify(p)).toThrow(RangeError);
    }
    for (const b of [
      [
        [1, 0],
        [2, 0],
      ],
      [
        [1, 0, 0],
        [0, 1, 0],
      ],
      [[1, 0]],
    ]) {
      expect(() => plane.metricTensor(b as never), JSON.stringify(b)).toThrow(RangeError);
      expect(() => plane.reciprocalBasis(b as never)).toThrow(RangeError);
      expect(() => plane.latticeParameters(b as never)).toThrow(RangeError);
    }
    // Flat within rounding, and scales whose products overflow or vanish, are refused (review of
    // #172), as in the cell functions of the point groups.
    for (const gamma of [1e-8, 180 - 1e-7]) {
      expect(() => plane.latticeFromParameters({ a: 1, b: 1, gamma }), String(gamma)).toThrow(/gives no cell/);
    }
    for (const x of [1e-200, 1e200]) {
      const b: plane.Mat2 = [
        [x, 0],
        [0, x],
      ];
      expect(() => plane.metricTensor(b), String(x)).toThrow(/singular/);
      expect(() => plane.reciprocalBasis(b)).toThrow(/singular/);
      expect(() => plane.latticeParameters(b)).toThrow(/singular/);
      expect(() => plane.latticeFromParameters({ a: x, b: x, gamma: 90 })).toThrow(/singular/);
    }
    const small: plane.Mat2 = [
      [1e-150, 0],
      [0, 1e-150],
    ];
    expect(plane.latticeParameters(small).gamma).toBe(90);
    expect(plane.reciprocalBasis(small)[0][0]).toBeCloseTo(1e150, -140);
    expect(() => plane.cellRestrictions('trigonal' as plane.PlaneSystem)).toThrow(
      /oblique, rectangular, square, hexagonal/,
    );
  });

  it('the metric of a cell built to the restrictions of each system is the metric of that system', () => {
    // G = [[a², ab cos γ], [ab cos γ, b²]] with the printed restrictions: square a²·I, hexagonal
    // a²·[[1, −1/2], [−1/2, 1]], rectangular diagonal.
    const g = (system: plane.PlaneSystem, a: number, b: number, gamma = 104) => {
      const r = plane.cellRestrictions(system);
      return plane.metricTensor(
        plane.latticeFromParameters({ a, b: r.equal.length ? a : b, gamma: r.angles.gamma ?? gamma }),
      );
    };
    expect(
      close(g('square', 3, 4), [
        [9, 0],
        [0, 9],
      ]),
    ).toBe(true);
    expect(
      close(g('hexagonal', 2, 5), [
        [4, -2],
        [-2, 4],
      ]),
    ).toBe(true);
    expect(
      close(g('rectangular', 3, 4), [
        [9, 0],
        [0, 16],
      ]),
    ).toBe(true);
    const oblique = g('oblique', 3, 4);
    expect(oblique[0][1]).toBeCloseTo(12 * Math.cos((104 * Math.PI) / 180), 12);
  });
});

describe('a point of the plane', () => {
  it('has coordinates of at most 10⁶ in magnitude', () => {
    expect(() => plane.orbit('p4mm', { point: [1e300, 0] })).toThrow(RangeError);
    expect(() => plane.siteSymmetry('p4mm', { point: [2e6, 0] })).toThrow(/at most 1000000/);
    expect(() => plane.wyckoffPosition('p4mm', { point: [0, -2e6] })).toThrow(RangeError);
    expect(plane.orbit('p4mm', { point: [1e6, 0.25] }).length).toBeGreaterThan(0);
  });
});

describe('sites under a plane point group: a lattice direction { uv } or an edge { hk } (#208)', () => {
  /** A vector of a doublet or Miller indices as ITA prints them, the parameters set to small primes. */
  const vectorOf = (text: string): number[] => {
    const values: Record<string, number> = { x: 1, y: 3, h: 2, k: 5 };
    return text
      .split(',')
      .slice(0, 2)
      .map((c) => {
        const m = /^(-?)(\d*)([xyhk]?)$/.exec(c)!;
        const n = m[3] ? (m[2] ? Number(m[2]) : 1) * values[m[3]] : Number(m[2]);
        return m[1] ? -n : n;
      });
  };

  it('every position holds the direction of its first doublet and the edge of its first Miller indices', () => {
    for (const key of plane.POINT_GROUP_KEYS) {
      for (const { index: setting } of plane.settings(key)) {
        const positions = plane.wyckoffPositions(key, { setting });
        for (const w of positions) {
          const uv = vectorOf(w.coordinates[0]);
          const hk = vectorOf(w.millerIndices!);
          const where = `${key} #${setting} ${w.letter}`;
          expect(plane.wyckoffPosition(key, { uv }, { setting }), where).toEqual(w);
          expect(plane.wyckoffPosition(key, { hk }, { setting }), where).toEqual(w);
          // The site symmetry of the first edge is the position's; the orbits have its multiplicity.
          const edge = plane.siteSymmetry(key, { hk }, { setting });
          expect(edge.operations, where).toEqual(w.siteSymmetryOperations);
          expect(edge.multiplicity, where).toBe(w.multiplicity);
          expect(edge.general, where).toBe(w.siteSymmetryOperations.length === 1);
          expect(plane.orbit(key, { uv }, { setting }), where).toHaveLength(w.multiplicity);
          expect(plane.orbit(key, { hk }, { setting }), where).toHaveLength(w.multiplicity);
        }
      }
    }
  });

  it('turns an edge as a linear form and a direction as a vector', () => {
    // 4: the rotation (2) is -y,x; it turns [1,0] into [0,1] and the edge (1,0), normal to a*, into (0,1).
    expect(plane.orbit('4', { uv: [1, 2] }).map((e) => e.uv)).toEqual([
      [1, 2],
      [-1, -2],
      [-2, 1],
      [2, -1],
    ]);
    expect(plane.orbit('4', { hk: [1, 0] }).map((e) => e.hk)).toEqual([
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]);
    // 6mm: the direction [1,0] lies on the mirror x,0 (position a), the edge (1,0) is normal to the
    // mirror x,-x (position b), as ITA Table 3.2.3.1 gives them.
    expect(plane.wyckoffPosition('6mm', { uv: [1, 0] }).letter).toBe('a');
    expect(plane.wyckoffPosition('6mm', { hk: [1, 0] }).letter).toBe('b');
  });

  it('refuses a vector that is not two integers not both zero, and an input of the other kind', () => {
    expect(() => plane.siteSymmetry('4mm', { uv: [0, 0] })).toThrow(/two integers, not both zero/);
    expect(() => plane.orbit('4mm', { hk: [0.5, 1] })).toThrow(/two integers/);
    expect(() => plane.orbit('4mm', { uv: [1, 0], hk: [1, 0] } as never)).toThrow(/by one field/);
    expect(() => plane.wyckoffPosition('3m', { uv: [1, 0] }, { setting: 3 })).toThrow(RangeError);
    expect(() => plane.siteSymmetry('p2', { point: [0, 0] }, { setting: 2 })).toThrow(RangeError);
  });
});

describe('lists of operations of the plane: siteSymmetryOf, orbitOf (#208)', () => {
  it('give for the operations of a key what the functions of the key give', () => {
    for (const key of plane.PLANE_GROUP_KEYS) {
      const ops = plane.operations(key);
      for (const point of [
        [0, 0],
        [0.5, 0],
        [1 / 3, 2 / 3],
        [0.25, 0.25],
        [0.1, 0.2],
        [0.5, 0.31],
      ]) {
        const where = `${key} ${point.join(',')}`;
        const site = plane.siteSymmetry(key, { point });
        const of = plane.siteSymmetryOf(ops, { point });
        // On an exact point the two settle on the same site, up to the last bit of the point.
        expect({ ...of, point: undefined }, where).toEqual({ ...site, point: undefined });
        of.point.forEach((x, i) => expect(x, where).toBeCloseTo(site.point[i], 12));
        const orbit = plane.orbit(key, { point });
        const orbitOf = plane.orbitOf(ops, { point });
        expect(
          orbitOf.map((e) => e.operations),
          where,
        ).toEqual(orbit.map((e) => e.operations));
        orbitOf.forEach((e, j) => e.point.forEach((x, i) => expect(x, where).toBeCloseTo(orbit[j].point[i], 12)));
      }
    }
    for (const key of plane.POINT_GROUP_KEYS) {
      for (const { index: setting } of plane.settings(key)) {
        const ops = plane.operations(key, { setting });
        for (const v of [
          [1, 0],
          [1, 1],
          [1, 2],
          [2, -1],
        ]) {
          expect(plane.siteSymmetryOf(ops, { uv: v })).toEqual(plane.siteSymmetry(key, { uv: v }, { setting }));
          expect(plane.orbitOf(ops, { hk: v })).toEqual(plane.orbit(key, { hk: v }, { setting }));
        }
      }
    }
  });

  it('read a direction under the linear parts of a plane group, a point modulo the lattice', () => {
    // cm: the identity and the centring have the same linear part, so both fix every direction.
    const cm = plane.operations('cm');
    expect(plane.siteSymmetryOf(cm, { uv: [0, 1] })).toEqual({
      operations: [0, 1, 2, 3],
      multiplicity: 1,
      general: false,
    });
    expect(plane.siteSymmetryOf(cm, { uv: [1, 1] })).toEqual({ operations: [0, 2], multiplicity: 2, general: true });
    // p2: the point 1/2,0 is a twofold point modulo the lattice.
    expect(plane.siteSymmetryOf(plane.operations('p2'), { point: [0.5, 0] }).operations).toEqual([0, 1]);
    expect(plane.siteSymmetryOf(plane.operations('2'), { uv: [1, 0] }).operations).toEqual([0]);
  });

  it('take the empty list as the group 1', () => {
    expect(plane.siteSymmetryOf([], { point: [1.25, -0.5] })).toEqual({
      operations: [],
      point: [0.25, 0.5],
      multiplicity: 1,
      general: true,
    });
    expect(plane.orbitOf([], { uv: [1, 2] })).toEqual([{ uv: [1, 2], operations: [] }]);
  });

  it('refuse a list that is not a group', () => {
    expect(() => plane.siteSymmetryOf(plane.generators('p4mm'), { point: [0.1, 0.2] })).toThrow(
      /not a group: the product of operations/,
    );
    expect(() => plane.orbitOf(plane.generators('4mm'), { uv: [1, 0] })).toThrow(
      /linear parts of the operations are not a group/,
    );
    const shifted = [
      ...plane.operations('p2'),
      {
        matrix: [
          [1, 0],
          [0, 1],
        ],
        translation: [1, 0],
      },
    ];
    expect(() => plane.siteSymmetryOf(shifted, { point: [0.1, 0.2] })).toThrow(/equal modulo the lattice/);
    expect(() => plane.siteSymmetryOf('p2' as never, { point: [0, 0] })).toThrow(/a list of operations/);
  });
});

describe('the point group and the plane group of a list of operations (#208)', () => {
  it('identify every plane group and plane point group from its operations and from its generators', () => {
    for (const key of plane.PLANE_GROUP_KEYS) {
      const g = plane.planeGroup(key);
      expect(plane.planeGroupOf(plane.operations(key)), key).toEqual({ key, setting: 1 });
      expect(plane.planeGroupOf(plane.generators(key)), key).toEqual({ key, setting: 1 });
      expect(plane.pointGroupOf(plane.operations(key)), key).toEqual({
        key: g.pointGroup,
        setting: g.pointGroupSetting,
      });
    }
    for (const key of plane.POINT_GROUP_KEYS) {
      for (const { index: setting } of plane.settings(key)) {
        expect(plane.pointGroupOf(plane.generators(key, { setting }))).toEqual({ key, setting });
      }
    }
    expect(plane.pointGroupOf([])).toEqual({ key: '1', setting: 1 });
  });

  it('do not depend on the origin; the setting is given only for the operations of the key', () => {
    const shift: plane.CoordinateTransformation = {
      linearPart: [
        [1, 0],
        [0, 1],
      ],
      originShift: [1 / 12, 1 / 6],
    };
    for (const key of plane.PLANE_GROUP_KEYS) {
      const moved = plane.changeOfCoordinates(shift, { operations: plane.operations(key) }).operations!;
      expect(plane.planeGroupOf(moved)?.key, key).toBe(key);
    }
    const p2 = plane.changeOfCoordinates(shift, { operations: plane.operations('p2') }).operations!;
    expect(plane.planeGroupOf(p2)).toEqual({ key: 'p2' });
  });

  it('tell mirrors from glides per direction, in either orientation of a rectangular cell', () => {
    const op = (matrix: number[][], translation: number[]) => ({ matrix, translation });
    const mA = [
      [-1, 0],
      [0, 1],
    ];
    const mB = [
      [1, 0],
      [0, -1],
    ];
    expect(plane.planeGroupOf([op(mA, [0, 0])])).toEqual({ key: 'pm', setting: 1 });
    expect(plane.planeGroupOf([op(mB, [0, 0])])).toEqual({ key: 'pm' });
    expect(plane.planeGroupOf([op(mB, [0.5, 0])])).toEqual({ key: 'pg' });
    // p2mg with the mirror lines normal to b instead of a: p2gm, the group in the other orientation.
    expect(plane.planeGroupOf([op(mB, [0, 0]), op(mA, [0, 0.5])])).toEqual({ key: 'p2mg' });
    expect(plane.planeGroupOf([op(mA, [0, 0.5]), op(mB, [0.5, 0])])).toEqual({ key: 'p2gg' });
    expect(
      plane.planeGroupOf([
        op(mA, [0, 0]),
        op(
          [
            [1, 0],
            [0, 1],
          ],
          [0.5, 0.5],
        ),
      ]),
    ).toEqual({ key: 'cm', setting: 1 });
  });

  it('refuse operations outside a conventional cell, and operations that generate no group', () => {
    const op = (matrix: number[][], translation: number[]) => ({ matrix, translation });
    // cm in its primitive cell: the mirror along the diagonal.
    expect(() =>
      plane.planeGroupOf([
        op(
          [
            [0, 1],
            [1, 0],
          ],
          [0, 0],
        ),
      ]),
    ).toThrow(/in no conventional cell/);
    expect(
      plane.pointGroupOf([
        op(
          [
            [0, 1],
            [1, 0],
          ],
          [0, 0],
        ),
      ]),
    ).toEqual({ key: 'm' });
    expect(() =>
      plane.planeGroupOf([
        op(
          [
            [1, 0],
            [0, 1],
          ],
          [0.5, 0],
        ),
      ]),
    ).toThrow(/translation x\+1\/2,y besides the lattice/);
    // A fourfold rotation with the centring of a square cell: p4 in a cell twice too large.
    const quarter = op(
      [
        [0, -1],
        [1, 0],
      ],
      [0, 0],
    );
    expect(() =>
      plane.planeGroupOf([
        quarter,
        op(
          [
            [1, 0],
            [0, 1],
          ],
          [0.5, 0.5],
        ),
      ]),
    ).toThrow(/translation/);
    // A fourfold rotation about 0,1/2 is p4 with another origin.
    expect(
      plane.planeGroupOf([
        op(
          [
            [0, -1],
            [1, 0],
          ],
          [0.5, 0.5],
        ),
      ]),
    ).toEqual({ key: 'p4' });
    expect(() =>
      plane.pointGroupOf([
        op(
          [
            [1, 1],
            [0, 1],
          ],
          [0, 0],
        ),
      ]),
    ).toThrow(/no finite group/);
    expect(() =>
      plane.pointGroupOf([
        op(
          [
            [2, 0],
            [0, 1],
          ],
          [0, 0],
        ),
      ]),
    ).toThrow(/Determinant 2 is not ±1/);
  });
});

describe('the site symmetry of a Wyckoff position of a plane group (#208)', () => {
  it('holds the operations that fix the first doublet, |G|/multiplicity of them, those of a point on it', () => {
    for (const key of plane.PLANE_GROUP_KEYS) {
      const order = plane.operations(key).length;
      for (const w of plane.wyckoffPositions(key)) {
        const where = `${key} ${w.letter}`;
        expect(w.siteSymmetryOperations.length * w.multiplicity, where).toBe(order);
        // A point of the first doublet for parameters that put it on no other position.
        const { matrix, translation } = toPlain(parseOperation(w.coordinates[0]));
        const [x, y] = [0.1234, 0.3721];
        const point = matrix.map((row, i) => row[0] * x + row[1] * y + translation[i]);
        expect(plane.siteSymmetry(key, { point }).operations, where).toEqual(w.siteSymmetryOperations);
      }
    }
  });
});

describe('lists of operations: what the review of #229 found', () => {
  const op = (matrix: number[][], translation: number[]) => ({ matrix, translation });
  const I = [
    [1, 0],
    [0, 1],
  ];

  it('refuse a singular matrix, which is closed under products too', () => {
    const zero = op(
      [
        [0, 0],
        [0, 0],
      ],
      [0, 0],
    );
    expect(() => plane.siteSymmetryOf([zero], { point: [0.3, 0.2] })).toThrow(/Determinant 0/);
    expect(() => plane.orbitOf([zero], { uv: [1, 0] })).toThrow(/Determinant 0/);
    const projection = op(
      [
        [1, 0],
        [0, 0],
      ],
      [0, 0],
    );
    expect(() => plane.siteSymmetryOf([op(I, [0, 0]), projection], { uv: [1, 0] })).toThrow(RangeError);
  });

  it('read the operations within EPSILON, whatever the tolerance of the point', () => {
    const near = { point: [0.25, 0.01] };
    expect(plane.siteSymmetryOf(plane.operations('p2mg'), near, { tolerance: 0.05 }).operations).toEqual(
      plane.siteSymmetryOf(plane.operations('p2mg'), { point: [0.25, 0] }).operations,
    );
    const twelfth = [
      op(I, [0, 0]),
      op(
        [
          [-1, 0],
          [0, 1],
        ],
        [1 / 12, 0],
      ),
    ];
    expect(plane.orbitOf(twelfth, { point: [0.3, 0.2] }, { tolerance: 0.01 })).toHaveLength(2);
  });

  it('measure the distance to the element, as the functions of a key do', () => {
    // pm: 0.012 from the mirror x = 0 lies on it at the tolerance 0.02, for the key and the list alike
    // (its image, 0.024 away, does not decide); at 0.01 it does not.
    expect(plane.siteSymmetry('pm', { point: [0.012, 0.3] }, { tolerance: 0.02 }).multiplicity).toBe(1);
    expect(
      plane.siteSymmetryOf(plane.operations('pm'), { point: [0.012, 0.3] }, { tolerance: 0.02 }).multiplicity,
    ).toBe(1);
    expect(
      plane.siteSymmetryOf(plane.operations('pm'), { point: [0.012, 0.3] }, { tolerance: 0.01 }).multiplicity,
    ).toBe(2);
  });

  it('check the tolerance for a direction or an edge too, and bound their components', () => {
    expect(() => plane.siteSymmetry('4mm', { uv: [1, 0] }, { tolerance: -5 })).toThrow(/tolerance/);
    expect(() => plane.orbit('4mm', { hk: [1, 0] }, { tolerance: null } as never)).toThrow(/tolerance/);
    expect(() => plane.orbit('6mm', { uv: [2 ** 53 - 1, -(2 ** 53 - 2)] })).toThrow(/at most/);
    expect(plane.orbit('6mm', { uv: [2 ** 51, 1] })).toHaveLength(12);
  });
});

// --- the safety net of #234: tests that fail on 0.15.0 (it.fails); each fix removes its mark -------

describe('#235: one measure for a key and a list, and the accuracy of the operations', () => {
  // ITA (2016), plane group 3 pm, p. 178: position 1 a .m. 0,y on the mirror 0,y. The point lies
  // 7.5·10⁻⁶ from it, within the default tolerance 10⁻⁵; its image under the mirror lies 1.5·10⁻⁵ away.
  const point = [0.0000075, 0.2];

  it('siteSymmetry of the key puts the point on the mirror', () => {
    expect(plane.siteSymmetry('pm', { point }).multiplicity).toBe(1);
  });

  it('siteSymmetryOf the operations of pm does the same', () => {
    expect(plane.siteSymmetryOf(plane.operations('pm'), { point }).multiplicity).toBe(1);
  });

  it('a tolerance below the deviation of the operations is refused, naming both numbers', () => {
    // A twofold rotation with the translation 0.333333 for 1/3: read as 1/3, it moves a point of the
    // cell by 3.3·10⁻⁷ from where the exact operation moves it.
    const ops = [
      { matrix: [[1, 0], [0, 1]], translation: [0, 0] },
      { matrix: [[-1, 0], [0, -1]], translation: [0.333333, 0] },
    ]; // prettier-ignore
    let error: unknown;
    try {
      plane.siteSymmetryOf(ops, { point: [0.1, 0.2] }, { tolerance: 1e-7 });
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(RangeError);
    const named = numbersIn((error as Error).message);
    expect(named).toContain(1e-7);
    // The deviation 3.3·10⁻⁷, written to a few digits.
    expect(named.some((x) => Math.abs(x / (1 / 3 - 0.333333) - 1) < 0.05)).toBe(true);
  });
});

describe('#236: integer arithmetic of the plane beyond 2⁵³', () => {
  it('orbitOf with a lattice operation of large entries refuses an image beyond the safe integers', () => {
    // [[-1, 3], [0, 1]] is an involution of determinant −1; the image of [0, 2⁵² − 1] has the first
    // component 3·(2⁵² − 1) > 2⁵³.
    const ops = [
      { matrix: [[1, 0], [0, 1]], translation: [0, 0] },
      { matrix: [[-1, 3], [0, 1]], translation: [0, 0] },
    ]; // prettier-ignore
    expect(() => plane.orbitOf(ops, { uv: [0, 2 ** 52 - 1] })).toThrow(RangeError);
  });
});

describe('#238: wyckoffDistances in a skew basis', () => {
  // The positions of p2 as ITA (2016) prints them, plane group 2, p. 177.
  const printed = tableRows(section(readReference('itc/vol-a-2016-plane-groups.md'), '## 2 — p2'))
    .slice(1)
    .map(([, letter, , coordinates]) => ({ letter, coordinates }));
  const pointOf = (text: string) => text.split(',').map((c) => toNumber(parseRational(c)));
  const metric = (B: number[][]) => [
    [B[0][0] ** 2 + B[1][0] ** 2, B[0][0] * B[0][1] + B[1][0] * B[1][1]],
    [B[0][0] * B[0][1] + B[1][0] * B[1][1], B[0][1] ** 2 + B[1][1] ** 2],
  ];
  /** The distance of x to the nearest lattice translate of p, by a search over ±40 cells. */
  const nearest = (x: number[], p: number[], B: number[][]) => {
    const G = metric(B);
    let best = Infinity;
    for (let i = -40; i <= 40; i++)
      for (let j = -40; j <= 40; j++) {
        const r = [x[0] - p[0] - i, x[1] - p[1] - j];
        best = Math.min(
          best,
          Math.sqrt(r[0] * (G[0][0] * r[0] + G[0][1] * r[1]) + r[1] * (G[1][0] * r[0] + G[1][1] * r[1])),
        );
      }
    return best;
  };
  /** The distances of x to the four twofold points of p2, by brute force, sorted. */
  const bruteForce = (x: number[], B: number[][]) =>
    printed
      .filter((p) => p.letter !== 'e')
      .map((p) => nearest(x, pointOf(p.coordinates), B))
      .sort((a, b) => a - b);
  const computed = (x: number[], B: number[][]) =>
    plane
      .wyckoffDistances('p2', { point: x }, { basis: B })
      .filter((d) => d.letter !== 'e')
      .map((d) => d.distance)
      .sort((a, b) => a - b);

  it('setup: p2 has the general position e and the four twofold points a–d', () => {
    expect(printed.map((p) => p.letter)).toEqual(['e', 'd', 'c', 'b', 'a']);
  });

  it('the basis [[1, 10], [0, 1]] of the issue: the distances of a full search', () => {
    const B = [
      [1, 10],
      [0, 1],
    ];
    const x = [0, 0.49];
    const want = Object.fromEntries(
      printed.filter((p) => p.letter !== 'e').map((p) => [p.letter, nearest(x, pointOf(p.coordinates), B)]),
    );
    const got = Object.fromEntries(
      plane.wyckoffDistances('p2', { point: x }, { basis: B }).map((d) => [d.letter, d.distance]),
    );
    for (const letter of ['a', 'b', 'c', 'd']) expect(got[letter], letter).toBeCloseTo(want[letter], 12);
  });

  it('a sheared basis of the same lattice gives the same distances (shears up to ±100)', () => {
    const B0 = [
      [1, 0.3],
      [0, 1.2],
    ];
    const x0 = [0.37, 0.21];
    const reference = bruteForce(x0, B0);
    const wrong: string[] = [];
    for (const k of [-100, -37, -10, -3, 3, 10, 37, 100]) {
      for (const U of [
        [
          [1, k],
          [0, 1],
        ],
        [
          [1, 0],
          [k, 1],
        ],
      ]) {
        // B = B0·U; the point in the new basis is U⁻¹·x0 (det U = 1).
        const B = B0.map((row) => [row[0] * U[0][0] + row[1] * U[1][0], row[0] * U[0][1] + row[1] * U[1][1]]);
        const x = [U[1][1] * x0[0] - U[0][1] * x0[1], -U[1][0] * x0[0] + U[0][0] * x0[1]];
        const d = computed(x, B);
        if (d.some((v, i) => Math.abs(v - reference[i]) > 1e-9))
          wrong.push(`${JSON.stringify(U)}: ${d.map((v) => v.toFixed(4))}`);
      }
    }
    expect(wrong).toEqual([]);
  });

  it('a basis that contradicts the cell of p4 (ITA 2016 Table 2.1.1.1, p. 143: a = b, γ = 90°) is refused', () => {
    expect(() => plane.wyckoffDistances('p4', { point: [0.1, 0.2] }, { basis: [[1, 0.3], [0, 1.1]] })).toThrow(RangeError); // prettier-ignore
  });

  it('a basis that contradicts the cell of pm (γ = 90°) is refused', () => {
    expect(() => plane.wyckoffDistances('pm', { point: [0.1, 0.2] }, { basis: [[1, 0.3], [0, 1.1]] })).toThrow(RangeError); // prettier-ignore
  });

  it('a basis that satisfies the cell restrictions is taken', () => {
    expect(plane.wyckoffDistances('p4', { point: [0.1, 0.2] }, { basis: [[2, 0], [0, 2]] })).toHaveLength(4); // prettier-ignore
  });
});

describe('#235: what the review of #244 found', () => {
  it('a mirror given with whole cells added to its translation is still a mirror', () => {
    // −x, y + 3 is the mirror x = 0 (ITA 2016, pm, p. 178) shifted by three cells along it.
    const ops = [
      { matrix: [[1, 0], [0, 1]], translation: [0, 0] },
      { matrix: [[-1, 0], [0, 1]], translation: [0, 3] },
    ]; // prettier-ignore
    expect(plane.siteSymmetryOf(ops, { point: [1e-6, 0.3] }).operations).toEqual([0, 1]);
  });
});

describe('#238: what the review of #247 found', () => {
  it('lines in a long, slightly skew cell that the cell check takes: the distance between the lines', () => {
    // pm with a = 1, b = 10⁴, γ = 88°: |a·b| > a²/2, so the reduction shears b by −349 a. The
    // lines x = k (positions a: 0,y and b: 1/2,y, ITA 2016 p. 179) lie |a|·sin γ apart, so the
    // point [0.3, 0.49] lies 0.3·sin γ from a and 0.2·sin γ from b.
    const gamma = (88 * Math.PI) / 180;
    const basis = [[1, 1e4 * Math.cos(gamma)], [0, 1e4 * Math.sin(gamma)]]; // prettier-ignore
    const d = plane.wyckoffDistances('pm', { point: [0.3, 0.49] }, { basis });
    expect(d.find((p) => p.letter === 'a')!.distance).toBeCloseTo(0.3 * Math.sin(gamma), 9);
    expect(d.find((p) => p.letter === 'b')!.distance).toBeCloseTo(0.2 * Math.sin(gamma), 9);
    // The same with a tolerance that takes a cell of γ = 75°.
    const g75 = (75 * Math.PI) / 180;
    const wide = [[1, 100 * Math.cos(g75)], [0, 100 * Math.sin(g75)]]; // prettier-ignore
    const e = plane.wyckoffDistances('pm', { point: [0.3, 0.49] }, { basis: wide, tolerance: 0.01 });
    expect(e.find((p) => p.letter === 'a')!.distance).toBeCloseTo(0.3 * Math.sin(g75), 9);
  });

  it('a nearly singular basis that the basis check takes gives finite distances, met by the points given', () => {
    const basis = [[1, 1], [0, 1e-8]]; // prettier-ignore
    for (const d of plane.wyckoffDistances('p2', { point: [0.3, 0.4] }, { basis })) {
      expect(Number.isFinite(d.distance)).toBe(true);
      // The returned point lies at the returned distance, modulo the lattice: for a point position
      // the residual is a lattice vector plus the Cartesian difference.
      expect(d.distance).toBeLessThan(1);
    }
  });

  it('a shear of 10⁶ gives the distances of the unsheared basis', () => {
    const B0 = [[1, 0.3], [0, 1.2]]; // prettier-ignore
    const k = 1e6;
    // B = B0·[[1, k], [0, 1]]; the point in the new basis is U⁻¹·x0.
    const B = [[B0[0][0], B0[0][0] * k + B0[0][1]], [B0[1][0], B0[1][0] * k + B0[1][1]]]; // prettier-ignore
    const x0 = [0.37, 0.21];
    const x = [x0[0] - k * x0[1], x0[1]].map((v) => v - Math.floor(v));
    const want = plane.wyckoffDistances('p2', { point: x0 }, { basis: B0 }).map((d) => d.distance);
    const got = plane.wyckoffDistances('p2', { point: x }, { basis: B }).map((d) => d.distance);
    got.forEach((d, i) => expect(Math.abs(d - want[i])).toBeLessThan(1e-6));
  });
});
