/**
 * The plane API (`symcrys/plane`): keys, the plane point groups, the conversion to plain numbers and
 * the errors. The values themselves are checked against print in `spaceGroups/*.reference.test.ts`.
 */

import { describe, expect, it } from 'vitest';
import * as plane from './plane.js';
import { planeAsymmetricUnit, planeCellElements } from './spaceGroups/cell.js';
import { describePlaneOperation } from './spaceGroups/describe.js';
import { planeGroupOperations } from './spaceGroups/planeGroups.js';
import { toNumber } from './spaceGroups/rational.js';

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

describe('plane point groups', () => {
  it('are the linear parts of every plane group with that point group (cm and pg as pm, p4gm as p4mm, …)', () => {
    for (const k of plane.PLANE_GROUP_KEYS) {
      const g = plane.planeGroup(k);
      const linear = new Set(plane.operations(k).map((op) => key(op.matrix)));
      const point = plane.operations(g.pointGroup, { setting: g.pointGroupSetting });
      expect(new Set(point.map((op) => key(op.matrix))), k).toEqual(linear);
      expect(point.every((op) => op.translation.every((t) => t === 0))).toBe(true);
      expect(plane.pointGroup(g.pointGroup).order * g.centring.length + plane.pointGroup(g.pointGroup).order).toBe(
        g.order,
      );
    }
  });

  it('3m has the settings 3m1 and 31m, the others one', () => {
    expect(plane.symbol('3m')).toBe('3m1');
    expect(plane.symbol('3m', { setting: 2 })).toBe('31m');
    expect(plane.symbol('2mm')).toBe('2mm');
    expect(plane.symbol('m')).toBe('m');
    expect(plane.pointGroup('3m')).toEqual({ key: '3m', crystalSystem: 'hexagonal', order: 6 });
    expect(plane.pointGroup('4mm')).toEqual({ key: '4mm', crystalSystem: 'square', order: 8 });
    expect(plane.settings('3m')).toEqual([
      { index: 1, symbol: '3m1', default: true },
      { index: 2, symbol: '31m', default: false },
    ]);
    expect(plane.settings('m')).toEqual([{ index: 1, symbol: 'm', default: true }]);
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
      fullSymbol: 'c2mm',
      pointGroup: '2mm',
      pointGroupSetting: 1,
      crystalSystem: 'rectangular',
      centring: [[0.5, 0.5]],
      origin: 'at 2mm',
      order: 8,
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
      });
      expect(plane.asymmetricUnit(k).vertices).toEqual(planeAsymmetricUnit(k).vertices.map((v) => v.map(toNumber)));
      const e = planeCellElements(k);
      expect(plane.symmetryElements(k).lines.map((l) => l.segment)).toEqual(
        e.lines.map((l) => l.segment.map((p) => p.map(toNumber))),
      );
      expect(plane.symmetryElements(k).rotations.map((r) => r.order)).toEqual(e.rotations.map((r) => r.order));
    }
    expect(plane.describeOperations('p4gm')[4]).toEqual({
      kind: 'glide',
      order: 2,
      location: [0.25, 0],
      direction: [0, 1],
      glide: [0, 0.5],
    });
  });

  it('points', () => {
    expect(plane.wyckoffPositionOf('p6mm', [1 / 3, 2 / 3])).toEqual({
      letter: 'b',
      multiplicity: 2,
      siteSymmetry: '3m.',
      coordinates: ['1/3,2/3', '2/3,1/3'],
    });
    expect(plane.wyckoffPositionOf('cm', [0.2, 0.3])).toEqual(plane.wyckoffPositions('cm')[0]);
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
    expect(Object.isFrozen(plane.symmetryElements('p2').rotations[0].point)).toBe(true);
    expect(Object.isFrozen(plane.PLANE_GROUP_KEYS)).toBe(true);
  });
});

describe('snapToWyckoffPosition', () => {
  it('gives the printed position with the snapped point, frozen', () => {
    const s = plane.snapToWyckoffPosition('p6mm', [0.34, 0.66], { tolerance: 0.02 });
    expect(s).toEqual({ ...plane.wyckoffPositions('p6mm').find((w) => w.letter === 'b'), point: [1 / 3, 2 / 3] });
    expect(Object.isFrozen(s) && Object.isFrozen(s.point)).toBe(true);
    expect(plane.snapToWyckoffPosition('p2', [0.3, 0.4]).letter).toBe('e');
  });

  it('refuses a point group, a bad point or tolerance', () => {
    expect(() => plane.snapToWyckoffPosition('4mm' as plane.PlaneGroupKey, [0, 0])).toThrow(RangeError);
    expect(() => plane.snapToWyckoffPosition('p2', 'x' as unknown as number[])).toThrow(RangeError);
    expect(() => plane.snapToWyckoffPosition('p2', [0, 0], { tolerance: 0.6 })).toThrow(RangeError);
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
    expect(() => plane.symbol('p2' as plane.PointGroupKey)).toThrow(RangeError);
    for (const f of [plane.wyckoffPositions, plane.asymmetricUnit, plane.symmetryElements]) {
      expect(() => f('4mm' as plane.PlaneGroupKey)).toThrow(RangeError);
    }
    expect(() => plane.siteSymmetry('4mm' as plane.PlaneGroupKey, [0, 0])).toThrow(RangeError);
    expect(() => plane.orbit('p2', [0.1, 0.2], { tolerance: 0.5 })).toThrow(RangeError);
  });
});
