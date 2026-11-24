/**
 * The plane API (`symcrys/plane`): keys, the plane point groups, the conversion to plain numbers and
 * the errors. The values themselves are checked against print in `spaceGroups/*.reference.test.ts`.
 */

import { describe, expect, it } from 'vitest';
import * as plane from './plane.js';
import { planeAsymmetricUnit, planeElements } from './spaceGroups/cell.js';
import { describePlaneOperation } from './spaceGroups/describe.js';
import { compose, translationOperation } from './spaceGroups/affine.js';
import { planeGroupOperations } from './spaceGroups/planeGroups.js';
import { rational, toNumber } from './spaceGroups/rational.js';

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
      expect(plane.pointGroup(g.pointGroup).order * g.centring.length + plane.pointGroup(g.pointGroup).order).toBe(
        plane.operations(k).length,
      );
    }
  });

  it('3m has the settings 3m1 and 31m, the others one', () => {
    expect(plane.symbol('3m')).toBe('3m1');
    expect(plane.symbol('3m', { setting: 2 })).toBe('31m');
    expect(plane.symbol('2mm')).toBe('2mm');
    expect(plane.symbol('m')).toBe('m');
    // Plane groups too (#137 F4): the short symbol is the key, the full one as ITA prints it.
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
    expect(() => plane.settings('p2' as plane.PointGroupKey)).toThrow(/plane group \(planeGroup\)/);
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
      centring: [[0.5, 0.5]],
      origin: 'at 2 m m',
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
        expect(d.location).toEqual(exact[i].location?.map(toNumber));
        expect(d.glide).toEqual(exact[i].glide?.map(toNumber));
        expect(d.direction).toEqual(exact[i].direction);
        expect(d.axis).toEqual(exact[i].axis);
      });
      expect(plane.asymmetricUnit(k).vertices).toEqual(planeAsymmetricUnit(k).vertices.map((v) => v.map(toNumber)));
      expect(plane.asymmetricUnit(k).edges).toEqual(planeAsymmetricUnit(k).edges);
      const e = planeElements(k);
      expect(plane.symmetryElements(k).lines.map((l) => l.point)).toEqual(e.lines.map((l) => l.point.map(toNumber)));
      expect(plane.symmetryElements(k).lines.map((l) => l.axis)).toEqual(e.lines.map((l) => l.axis));
      expect(plane.symmetryElements(k).rotationPoints.map((r) => r.n)).toEqual(e.rotationPoints.map((r) => r.n));
    }
    expect(plane.describeOperations('p4gm')[4]).toEqual({
      kind: 'glide-reflection',
      n: 2,
      location: [0.25, 0],
      direction: [0, 1],
      axis: [1, 0],
      glide: [0, 0.5],
    });
  });

  it('the orbit of a point gives each image with the operations that map the point there (#137 C4)', () => {
    const orbit = plane.orbit('p4', [0.1, 0.2]);
    expect(orbit).toHaveLength(4);
    expect(orbit.flatMap((e) => e.operations).sort((a, b) => a - b)).toEqual([0, 1, 2, 3]);
    expect(plane.orbit('p4', [0, 0])).toEqual([{ point: [0, 0], operations: [0, 1, 2, 3] }]);
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
      const site = plane.siteSymmetry(k, p, options);
      const entries = plane.orbit(k, p, options);
      expect(entries[0].operations, `${k} ${p}`).toEqual(site.operations);
      expect(entries, `${k} ${p}`).toHaveLength(site.multiplicity);
      for (const e of entries) {
        for (const i of e.operations) expect(sameMod1(image(ops[i], site.point), e.point), `${k} ${p} ${i}`).toBe(true);
      }
    }
  });

  it('points', () => {
    expect(plane.wyckoffPosition('p6mm', [1 / 3, 2 / 3])).toEqual({
      letter: 'b',
      multiplicity: 2,
      siteSymmetry: '3m.',
      coordinates: ['1/3,2/3', '2/3,1/3'],
    });
    expect(plane.wyckoffPosition('cm', [0.2, 0.3])).toEqual(plane.wyckoffPositions('cm')[0]);
    const site = plane.siteSymmetry('p2mm', [0.5, 0.2]);
    expect(site.multiplicity).toBe(2);
    expect(site.general).toBe(false);
    expect(plane.siteSymmetry('p2mm', [0.31, 0.2]).general).toBe(true);
    expect(plane.orbit('p2', [0.1, 0.2])).toHaveLength(2);
    expect(plane.wyckoffPositions('cm')).toEqual([
      { letter: 'b', multiplicity: 4, siteSymmetry: '1', coordinates: ['x,y', '-x,y'] },
      { letter: 'a', multiplicity: 2, siteSymmetry: '.m.', coordinates: ['0,y'] },
    ]);
  });

  it('results are frozen', () => {
    expect(Object.isFrozen(plane.operations('p2')[0].matrix[0])).toBe(true);
    expect(Object.isFrozen(plane.symmetryElements('p2').rotationPoints[0].point)).toBe(true);
    expect(Object.isFrozen(plane.PLANE_GROUP_KEYS)).toBe(true);
  });
});

describe('symmetryElements and asymmetricUnit (#137 F2, F3)', () => {
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
    const all = plane.wyckoffDistances('p6mm', [0.34, 0.66]);
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
    const a = plane.wyckoffDistances('pm', [0.1, 0.3], { basis: [[2, 0], [0, 1]] }).find((d) => d.letter === 'a')!; // prettier-ignore
    expect(a.distance).toBeCloseTo(0.2, 12);
    expect(a.point[0]).toBe(0);
    expect(a.point[1]).toBeCloseTo(0.3, 12);
  });

  it('agrees with wyckoffPosition and siteSymmetry: one notion (#137 F1)', () => {
    // 0.012 from the mirror line of pm; its image is 0.024 away, beyond the tolerance 0.02.
    expect(plane.wyckoffPosition('pm', [0.012, 0.3], { tolerance: 0.02 }).letter).toBe('a');
    const site = plane.siteSymmetry('pm', [0.012, 0.3], { tolerance: 0.02 });
    expect(site.multiplicity).toBe(1);
    expect(site.general).toBe(false);
    expect(site.point[0]).toBe(0);
  });

  it('agree at tolerances below 10⁻⁹ and for large coordinates (review of step 10a)', () => {
    // Before, the site symmetry was recomputed at 10⁻⁹ and the point not reduced modulo the
    // lattice first: both threw a plain Error, and 1e16 lay at distance 0 from 1/4,y of p2mg.
    const cases: [plane.PlaneGroupKey, number[], number, string][] = [
      ['p2', [3e-10, 1e-10], 1e-12, 'e'],
      ['p4mm', [0.3, 3e-10], 1e-12, 'g'],
      ['p3m1', [1 / 3 + 2e-10, 2 / 3 + 1e-10], 1e-12, 'd'],
      ['p2mg', [1e16, 0.3], 1e-6, 'd'],
      ['p4mm', [1e10 + 0.3, 0.2], 0.1, 'f'],
    ];
    for (const [k, p, tolerance, letter] of cases) {
      const w = plane.wyckoffPosition(k, p, { tolerance });
      const site = plane.siteSymmetry(k, p, { tolerance });
      const orbit = plane.orbit(k, p, { tolerance });
      expect(w.letter, `${k} ${p}`).toBe(letter);
      expect(site.multiplicity, `${k} ${p}`).toBe(w.multiplicity);
      expect(orbit, `${k} ${p}`).toHaveLength(w.multiplicity);
      expect(orbit[0].operations).toEqual(site.operations);
    }
    expect(plane.wyckoffDistances('p2mg', [1e16, 0.3]).find((d) => d.letter === 'c')!.distance).toBeCloseTo(0.25, 12);
  });

  it('refuses a point group, a bad point or basis', () => {
    expect(() => plane.wyckoffDistances('4mm' as plane.PlaneGroupKey, [0, 0])).toThrow(RangeError);
    expect(() => plane.wyckoffDistances('p2', 'x' as unknown as number[])).toThrow(RangeError);
    expect(() => plane.wyckoffDistances('p2', [0, 0], { basis: [[1, 2], [2, 4]] })).toThrow(RangeError); // prettier-ignore
    // Bases of extreme scale are not singular (the test scales the columns first).
    expect(plane.wyckoffDistances('p2', [0, 0], { basis: [[1e200, 0], [0, 1e200]] })).toHaveLength(5); // prettier-ignore
    expect(plane.wyckoffDistances('p2', [0, 0], { basis: [[1e-200, 0], [0, 1e-200]] })).toHaveLength(5); // prettier-ignore
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
        expect(d.location).toEqual(e.location?.map(toNumber));
        expect(d.glide).toEqual(e.glide?.map(toNumber));
        expect(d.translation).toEqual(e.translation?.map(toNumber));
        expect(d.axis).toEqual(e.axis);
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
    expect(() => plane.orbit('p7' as plane.PlaneGroupKey, [0, 0])).toThrow(/Unknown plane group: "p7"/);
    expect(() => plane.pointGroup('7' as plane.PointGroupKey)).toThrow(/Unknown plane point group: "7"/);
    expect(() => plane.planeGroup(9 as unknown as plane.PlaneGroupKey)).toThrow(RangeError);
    expect(() => plane.planeGroup('2mm' as plane.PlaneGroupKey)).toThrow(/plane group, not of the point group 2mm/);
    expect(() => plane.pointGroup('p2' as plane.PointGroupKey)).toThrow(/planeGroup/);
    expect(() => plane.symbol('p7' as plane.PointGroupKey)).toThrow(RangeError);
    for (const f of [plane.wyckoffPositions, plane.asymmetricUnit, plane.symmetryElements]) {
      expect(() => f('4mm' as plane.PlaneGroupKey)).toThrow(RangeError);
    }
    expect(() => plane.siteSymmetry('4mm' as plane.PlaneGroupKey, [0, 0])).toThrow(RangeError);
    expect(() => plane.orbit('p2', [0.1, 0.2], { tolerance: 0.5 })).toThrow(RangeError);
  });
});

describe('plane cells (#119, #137 G5)', () => {
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
      expect(() => plane.metricTensor(b), JSON.stringify(b)).toThrow(RangeError);
      expect(() => plane.reciprocalBasis(b)).toThrow(RangeError);
      expect(() => plane.latticeParameters(b)).toThrow(RangeError);
    }
    expect(() => plane.cellRestrictions('trigonal' as plane.PlaneSystem)).toThrow(
      /oblique, rectangular, square, hexagonal/,
    );
  });

  it('a cell built to the restrictions of a system has them', () => {
    for (const system of ['oblique', 'rectangular', 'square', 'hexagonal'] as const) {
      const r = plane.cellRestrictions(system);
      const p = { a: 3, b: r.equal.length ? 3 : 4, gamma: r.angles.gamma ?? 104 };
      const back = plane.latticeParameters(plane.latticeFromParameters(p));
      if (r.angles.gamma !== undefined) expect(back.gamma).toBeCloseTo(r.angles.gamma, 12);
      for (const [x, y] of r.equal) expect(back[x as 'a']).toBeCloseTo(back[y as 'b'], 12);
    }
  });
});
