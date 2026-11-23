/**
 * describeOperations and symmetryDirections, checked with the independent algebra of testUtils
 * (fixture class (b)): every description must rebuild its matrix, every direction must carry
 * exactly the elements the group contains along it, and the symbol at each position must name
 * them. The print anchor for the names and signs is in elements.reference.test.ts.
 */

import { describe, expect, it } from 'vitest';
import { mirrorNormal, mul, neg, rotationAbout, sameM, I3, type M } from '../testUtils/independentGroups.js';
import { hmTokens } from '../testUtils/hermannMauguin.js';
import { describeOperations, symmetryDirections, type OperationDescription } from './elements.js';
import { LATTICE_SYMMETRY_DIRECTIONS } from '../symmetryDirections.js';
import { POINT_GROUP_KEYS, operations, pointGroup, settings, type PointGroupKey } from './pointGroups.js';

/** Columns a, b, c of the #6 frame, typed here independently of src/lattice.ts. */
const HEXAGONAL: M = [
  [1, -1 / 2, 0],
  [0, Math.sqrt(3) / 2, 0],
  [0, 0, 1],
];

/** The crystal family of a key, mapped here independently of src/lattice.ts. */
const familyOf = (key: PointGroupKey) => {
  const s = pointGroup(key).crystalSystem;
  return s === 'trigonal' ? 'hexagonal' : s;
};

function cartesianOf(key: PointGroupKey, uvw: readonly number[]): number[] {
  const system = pointGroup(key).crystalSystem;
  const v =
    system === 'trigonal' || system === 'hexagonal'
      ? mul(
          HEXAGONAL,
          uvw.map((x) => [x]),
        ).map((r) => r[0])
      : [...uvw];
  const n = Math.hypot(v[0], v[1], v[2]);
  return v.map((x) => x / n);
}

/** The matrix a description names, built with the independent algebra. */
function rebuild(d: OperationDescription): M {
  if (d.kind === 'identity') return I3;
  if (d.kind === 'inversion') return neg(I3);
  const u = [...d.axis!.cartesian];
  if (d.kind === 'mirror') return mirrorNormal(u);
  const turns = (d.sense === '-' ? -1 : 1) / d.order;
  const r = rotationAbout(u, turns);
  return d.kind === 'rotation' ? r : neg(r);
}

const CASES: [PointGroupKey, number][] = POINT_GROUP_KEYS.flatMap((key) =>
  settings(key).map((s): [PointGroupKey, number] => [key, s.index]),
);

const inGroup = (ops: readonly { matrix: readonly (readonly number[])[] }[], m: M) =>
  ops.some((o) => sameM(m, o.matrix));

describe('describeOperations', () => {
  it.each(CASES)('%s, setting %i: each description rebuilds its operation', (key, setting) => {
    const ops = operations(key, { setting });
    const descriptions = describeOperations(key, { setting });
    expect(descriptions).toHaveLength(ops.length);
    descriptions.forEach((d, i) => {
      expect(sameM(rebuild(d), ops[i].matrix)).toBe(true);
      expect(d.timeReversal).toBe(ops[i].timeReversal);
      if (d.kind === 'identity' || d.kind === 'inversion') {
        expect(d.axis).toBeUndefined();
        expect(d.order).toBe(1);
      } else {
        const c = cartesianOf(key, d.axis!.lattice);
        expect(c.every((x, k) => Math.abs(x - d.axis!.cartesian[k]) < 1e-9)).toBe(true);
        expect(d.axis!.lattice.every(Number.isInteger)).toBe(true);
        const table = LATTICE_SYMMETRY_DIRECTIONS[familyOf(key)].flat().map((u) => [...u]);
        // the sign of ITA Table 2.1.3.1, also for twofold axes and mirror normals
        expect(table).toContainEqual([...d.axis!.lattice]);
      }
      expect(d.sense !== undefined).toBe(d.order >= 3);
    });
  });

  it('names the identity first, as operations() lists it', () => {
    for (const key of POINT_GROUP_KEYS) expect(describeOperations(key)[0].kind).toBe('identity');
  });

  it('rejects an unknown key or setting like operations()', () => {
    expect(() => describeOperations('5' as PointGroupKey)).toThrow(RangeError);
    expect(() => describeOperations('2', { setting: 4 })).toThrow(RangeError);
  });

  it('returns frozen results', () => {
    const d = describeOperations('m-3m');
    expect(Object.isFrozen(d)).toBe(true);
    expect(Object.isFrozen(d[1])).toBe(true);
  });
});

describe('symmetryDirections', () => {
  it.each(CASES)('%s, setting %i: the elements along each direction', (key, setting) => {
    const ops = operations(key, { setting });
    const positions = symmetryDirections(key, { setting });
    let elements = 0;
    for (const p of positions) {
      for (const d of p.directions) {
        const u = cartesianOf(key, d.lattice);
        const rotation = [6, 4, 3, 2].find((n) => inGroup(ops, rotationAbout(u, 1 / n))) ?? 1;
        const rotoinversion = [6, 4, 3].find((n) => inGroup(ops, neg(rotationAbout(u, 1 / n)))) ?? 0;
        expect([d.rotation, d.rotoinversion, d.mirror]).toEqual([
          rotation,
          rotoinversion,
          inGroup(ops, mirrorNormal(u)),
        ]);
        // operations along this direction, counted independently of the library
        elements += ops.filter((o) =>
          [2, 3, 4, 6].some((n) =>
            [1, -1].some(
              (s) => sameM(rotationAbout(u, s / n), o.matrix) || sameM(neg(rotationAbout(u, s / n)), o.matrix),
            ),
          ),
        ).length;
      }
    }
    // Every operation other than the identity and the inversion lies along exactly one direction.
    const trivial = ops.filter((o) => sameM(I3, o.matrix) || sameM(neg(I3), o.matrix)).length;
    expect(elements).toBe(ops.length - trivial);
  });

  it.each(CASES)('%s, setting %i: the symbol at each position names its elements', (key, setting) => {
    for (const p of symmetryDirections(key, { setting })) {
      if (p.symbol === undefined) continue;
      const [token] = hmTokens(p.symbol);
      const m = /^(-?)([1-6])(\/m)?$|^m$/.exec(token);
      expect(m).not.toBeNull();
      for (const d of p.directions) {
        if (token === 'm') expect([d.rotation, d.mirror]).toEqual([1, true]);
        else if (m![1] === '-') expect(d.rotoinversion).toBe(Number(m![2]));
        else {
          expect(d.rotation).toBe(Number(m![2]));
          // `N` without `/m`: no mirror perpendicular, except where the symbol shows it elsewhere
          // (never for a position symbol N alone in the 32 classes).
          expect(d.mirror).toBe(m![3] === '/m');
        }
      }
    }
  });

  it('lists every position of the family; triclinic none', () => {
    expect(symmetryDirections('1')).toEqual([]);
    expect(symmetryDirections('-1')).toEqual([]);
    const four = symmetryDirections('4');
    expect(four.map((p) => [p.position, p.symbol])).toEqual([
      [1, '4'],
      [2, undefined],
      [3, undefined],
    ]);
    expect(four[1].directions.every((d) => d.rotation === 1 && d.rotoinversion === 0 && !d.mirror)).toBe(true);
  });

  it('reads position 2 of the hexagonal family along a, position 3 along the tertiary directions', () => {
    const itc = symmetryDirections('32', { setting: 2 });
    expect(itc.map((p) => p.symbol)).toEqual(['3', '1', '2']);
  });
});
