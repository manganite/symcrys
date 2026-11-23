/**
 * Behaviour of the point-group API. Correctness against print is in the *.reference.test.ts files;
 * the expected sets here restate docs/conventions.md.
 */

import { describe, expect, it } from 'vitest';
import { closeGroup, operationsEqual, type Operation } from '../operations.js';
import {
  POINT_GROUP_KEYS,
  findPointGroup,
  generators,
  isPointGroupKey,
  operations,
  pointGroup,
  pointGroups,
  settings,
  symbol,
  type PointGroupKey,
} from './pointGroups.js';

describe('lookup', () => {
  it('has the 32 crystal classes, all of type I, in key order', () => {
    expect(POINT_GROUP_KEYS).toHaveLength(32);
    expect(pointGroups().map((g) => g.key)).toEqual([...POINT_GROUP_KEYS]);
    expect(pointGroups().every((g) => g.type === 'I')).toBe(true);
  });

  it('rejects unknown keys and settings, and the removed option convention, with a RangeError', () => {
    expect(isPointGroupKey('m3m')).toBe(false);
    expect(() => pointGroup('m3m' as PointGroupKey)).toThrow(RangeError);
    expect(() => operations('32', { setting: 3 })).toThrow(RangeError);
    expect(() => operations('32', { setting: 0 })).toThrow(RangeError);
    expect(() => operations('32', { setting: 1.5 })).toThrow(RangeError);
    expect(() => operations('32', { setting: 1, convention: 'birss' } as never)).toThrow(RangeError);
    expect(() => generators('32', { convention: 'itc' } as never)).toThrow(
      /option convention was removed in symcrys 0\.11\.0/,
    );
    expect(() => symbol('32', { convention: 'birss' } as never)).toThrow(RangeError);
    expect(() => symbol('32', { form: 'schoenflies', setting: 9 })).toThrow(RangeError);
    expect(() => symbol('32', { form: 'long' as 'full' })).toThrow(RangeError);
  });

  it('keeps exported constants frozen', () => {
    expect(Object.isFrozen(POINT_GROUP_KEYS)).toBe(true);
  });

  it('returns frozen results, the same object on repeated calls', () => {
    const ops = operations('m-3m');
    expect(ops).toHaveLength(48);
    expect(Object.isFrozen(ops)).toBe(true);
    expect(Object.isFrozen(ops[1].matrix)).toBe(true);
    expect(Object.isFrozen(ops[1].matrix[0])).toBe(true);
    expect(operations('m-3m')).toBe(ops);
  });
});

describe('settings', () => {
  it('without options, the ITC default setting', () => {
    expect(operations('32')).toBe(operations('32', {}));
    expect(symbol('32')).toBe('321');
  });

  it('without a setting, operations and generators are those of the default setting', () => {
    for (const key of POINT_GROUP_KEYS) {
      const setting = settings(key).find((s) => s.isDefault)!.index;
      expect(generators(key)).toBe(generators(key, { setting }));
      expect(operations(key)).toBe(operations(key, { setting }));
    }
  });

  it('orders mm2 settings 2 and 3, which ITA does not list, and gives their generators, as setting 1 carried into their frame', () => {
    // Setting 1 in ITA's order (Pmm2, ITA 5th ed. p. 218): (1) 1, (2) 2 0,0,z, (3) m x,0,z, (4) m 0,y,z,
    // all diagonal. Setting 2 moves the 2-fold axis from z to x, setting 3 to y, each by a cyclic
    // permutation of x, y, z (docs/conventions.md, "Settings"): diagonal (d1, d2, d3) becomes
    // (d3, d1, d2) and (d2, d3, d1).
    const setting1 = [
      [1, 1, 1],
      [-1, -1, 1],
      [1, -1, 1],
      [-1, 1, 1],
    ];
    const expected = {
      2: setting1.map(([a, b, c]) => [c, a, b]),
      3: setting1.map(([a, b, c]) => [b, c, a]),
    };
    const diagonal = (d: number[]) => [0, 1, 2].map((i) => [0, 1, 2].map((j) => (i === j ? d[i] : 0)));
    const plain = (ops: readonly Operation[]) => ops.map((op) => op.matrix.map((row) => row.map((x) => x + 0)));
    for (const k of [2, 3] as const) {
      expect(plain(operations('mm2', { setting: k }))).toEqual(expected[k].map(diagonal));
      // ITA's generators of Pmm2 (p. 219): (2); (3)
      expect(plain(generators('mm2', { setting: k }))).toEqual([expected[k][1], expected[k][2]].map(diagonal));
    }
  });

  it('every class has exactly one default setting', () => {
    for (const key of POINT_GROUP_KEYS) expect(settings(key).filter((s) => s.isDefault)).toHaveLength(1);
  });

  it('generators close to the operations of their setting', () => {
    for (const key of POINT_GROUP_KEYS) {
      for (const s of settings(key)) {
        const ops = operations(key, { setting: s.index });
        const closed = closeGroup(generators(key, { setting: s.index }));
        expect(closed).toHaveLength(ops.length);
        expect(closed.every((a) => ops.some((b) => operationsEqual(a, b)))).toBe(true);
      }
    }
  });
});

describe('symbols', () => {
  it('short, full and Schoenflies forms', () => {
    expect(symbol('-3m')).toBe('-3m1');
    expect(symbol('-3m', { form: 'full' })).toBe('-3 2/m 1');
    expect(symbol('2', { form: 'full' })).toBe('1 2 1');
    expect(symbol('2', { form: 'full', setting: 1 })).toBe('1 1 2');
    expect(symbol('m-3m', { form: 'schoenflies' })).toBe('Oh');
  });
});

describe('findPointGroup', () => {
  it('a key gives the default setting, a symbol the setting it names', () => {
    expect(findPointGroup('32')).toEqual({ key: '32', setting: 2 });
    expect(findPointGroup('312')).toEqual({ key: '32', setting: 1 });
  });

  it('accepts full symbols with or without spaces, and returns undefined for unknown symbols', () => {
    expect(findPointGroup('4/m 2/m 2/m')).toEqual({ key: '4/mmm', setting: 1 });
    expect(findPointGroup('112')).toEqual({ key: '2', setting: 1 });
    expect(findPointGroup('m2m')).toEqual({ key: 'mm2', setting: 3 });
    expect(findPointGroup('m3m')).toBeUndefined();
    expect(findPointGroup(42 as unknown as string)).toBeUndefined();
  });
});
