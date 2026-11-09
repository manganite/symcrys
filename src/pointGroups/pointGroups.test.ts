/**
 * Behaviour of the point-group API. Correctness against print is in the *.reference.test.ts files;
 * the expected sets here restate docs/conventions.md.
 */

import { describe, expect, it } from 'vitest';
import { closeGroup, operationsEqual } from '../operations.js';
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

/** Classes whose default setting differs between ITC and Birss (docs/conventions.md, "Settings"). */
const CONVENTION_DEPENDENT = ['2', 'm', '2/m', '32', '3m', '-3m', '-6m2'];

describe('lookup', () => {
  it('has the 32 crystal classes, all of type I, in key order', () => {
    expect(POINT_GROUP_KEYS).toHaveLength(32);
    expect(pointGroups().map((g) => g.key)).toEqual([...POINT_GROUP_KEYS]);
    expect(pointGroups().every((g) => g.type === 'I')).toBe(true);
  });

  it('rejects unknown keys, settings and conventions with a RangeError', () => {
    expect(isPointGroupKey('m3m')).toBe(false);
    expect(() => pointGroup('m3m' as PointGroupKey)).toThrow(RangeError);
    expect(() => operations('32', { setting: 3 })).toThrow(RangeError);
    expect(() => operations('32', { setting: 0 })).toThrow(RangeError);
    expect(() => operations('32', { setting: 1.5 })).toThrow(RangeError);
    expect(() => settings('32', 'ita' as 'itc')).toThrow(RangeError);
    expect(() => symbol('32', { form: 'long' as 'full' })).toThrow(RangeError);
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

describe('settings and conventions', () => {
  it('ITC is the default convention', () => {
    expect(operations('32')).toBe(operations('32', { convention: 'itc' }));
    expect(symbol('32')).toBe('321');
  });

  it('every class has exactly one default setting per convention', () => {
    for (const key of POINT_GROUP_KEYS) {
      for (const c of ['itc', 'birss'] as const) expect(settings(key, c).filter((s) => s.isDefault)).toHaveLength(1);
    }
  });

  it('the default setting differs between the conventions exactly for the documented classes', () => {
    const differing = POINT_GROUP_KEYS.filter(
      (key) =>
        settings(key, 'itc').find((s) => s.isDefault)!.index !== settings(key, 'birss').find((s) => s.isDefault)!.index,
    );
    expect(differing).toEqual(CONVENTION_DEPENDENT);
  });

  it('a setting index is the same frame in both conventions', () => {
    for (const key of POINT_GROUP_KEYS) {
      for (const s of settings(key)) {
        expect(operations(key, { convention: 'itc', setting: s.index })).toBe(
          operations(key, { convention: 'birss', setting: s.index }),
        );
      }
    }
  });

  it('trigonal and hexagonal pairs: each frame carries in Birss the ITC symbol of the other frame', () => {
    for (const key of ['32', '3m', '-3m', '-6m2'] as const) {
      const itc = settings(key, 'itc');
      const birss = settings(key, 'birss');
      expect(birss[1].symbol).toBe(itc[0].symbol);
      expect(birss[0].fullSymbol).toBe(itc[1].fullSymbol);
      expect(birss[1].fullSymbol).toBe(itc[0].fullSymbol);
      expect(birss[0].symbol).toBe(key);
    }
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
    expect(symbol('-3m', { convention: 'birss' })).toBe('-3m');
    expect(symbol('2', { form: 'full' })).toBe('1 2 1');
    expect(symbol('2', { form: 'full', convention: 'birss' })).toBe('1 1 2');
    expect(symbol('m-3m', { form: 'schoenflies' })).toBe('Oh');
  });
});

describe('findPointGroup', () => {
  it('a key gives the default setting of the convention', () => {
    expect(findPointGroup('32')).toEqual({ key: '32', setting: 2 });
    expect(findPointGroup('32', 'birss')).toEqual({ key: '32', setting: 1 });
  });

  it('the same symbol can name different frames in the two conventions', () => {
    expect(findPointGroup('312', 'itc')).toEqual({ key: '32', setting: 1 });
    expect(findPointGroup('312', 'birss')).toEqual({ key: '32', setting: 2 });
  });

  it('accepts full symbols with or without spaces, and returns undefined for unknown symbols', () => {
    expect(findPointGroup('4/m 2/m 2/m')).toEqual({ key: '4/mmm', setting: 1 });
    expect(findPointGroup('112')).toEqual({ key: '2', setting: 1 });
    expect(findPointGroup('m2m')).toEqual({ key: 'mm2', setting: 3 });
    expect(findPointGroup('m3m')).toBeUndefined();
  });
});
