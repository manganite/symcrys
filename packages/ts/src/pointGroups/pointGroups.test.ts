/**
 * Behaviour of the point-group API. Correctness against print is in the *.reference.test.ts files;
 * the expected sets here restate docs/conventions.md.
 */

import { describe, expect, it } from 'vitest';
import { operationsEqual, type Operation } from '../operations.js';
import { closeWithin } from '../closure.js';
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
    expect(() => operations('32', { setting: 4 })).toThrow(RangeError);
    expect(() => operations('32', { setting: 0 })).toThrow(RangeError);
    expect(() => operations('32', { setting: 1.5 })).toThrow(RangeError);
    expect(() => operations('32', { setting: 1, convention: 'birss' } as never)).toThrow(RangeError);
    expect(() => generators('32', { convention: 'itc' } as never)).toThrow(
      /option convention was removed in symcrys 0\.11\.0/,
    );
    expect(() => symbol('32', { convention: 'birss' } as never)).toThrow(RangeError);
    expect(() => (settings as (...args: unknown[]) => unknown)('32', 'birss')).toThrow(
      /convention argument was removed/,
    );
    expect(() => (findPointGroup as (...args: unknown[]) => unknown)('312', 'birss')).toThrow(RangeError);
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
        const closed = closeWithin(generators(key, { setting: s.index }), 1e-9) ?? [];
        expect(closed).toHaveLength(ops.length);
        expect(closed.every((a) => ops.some((b) => operationsEqual(a, b)))).toBe(true);
      }
    }
  });
});

describe('a setting by its symbol', () => {
  it('takes the short or the full ITC symbol, spaces ignored', () => {
    expect(operations('32', { setting: '312' })).toBe(operations('32', { setting: 2 }));
    expect(operations('32', { setting: '3 1 2' })).toBe(operations('32', { setting: 2 }));
    expect(operations('mm2', { setting: '2mm' })).toBe(operations('mm2', { setting: 2 }));
    expect(operations('2', { setting: '1 1 2' })).toBe(operations('2', { setting: 2 }));
    expect(symbol('-6m2', { setting: '-62m', form: 'full' })).toBe('-6 2 m');
  });

  it('a symbol that several settings share gives the standard; axes and uniqueAxis choose another (#96)', () => {
    expect(operations('2', { setting: '2' })).toBe(operations('2', { setting: 1 }));
    expect(operations('2', { setting: '2', uniqueAxis: 'c' })).toBe(operations('2', { setting: 2 }));
    expect(operations('2', { uniqueAxis: 'a' })).toBe(operations('2', { setting: 3 }));
    expect(operations('2', { setting: '2 1 1' })).toBe(operations('2', { setting: 3 }));
    expect(operations('32', { setting: '32' })).toBe(operations('32', { setting: 1 }));
    expect(operations('32', { setting: '3 2' })).toBe(operations('32', { setting: 1 }));
    expect(operations('32', { axes: 'rhombohedral' })).toBe(operations('32', { setting: 3 }));
    expect(operations('32', { setting: '32', axes: 'rhombohedral' })).toBe(operations('32', { setting: 3 }));
    expect(operations('32', { axes: 'hexagonal' })).toBe(operations('32', { setting: 1 }));
    expect(operations('32', { setting: '312', axes: 'hexagonal' })).toBe(operations('32', { setting: 2 }));
    expect(operations('3', { setting: '3', axes: 'rhombohedral' })).toBe(operations('3', { setting: 2 }));
    expect(operations('6/mmm', { axes: 'hexagonal' })).toBe(operations('6/mmm'));
    expect(findPointGroup('32', { axes: 'rhombohedral' })).toEqual({ key: '32', setting: 3 });
    expect(findPointGroup('D3', { axes: 'rhombohedral' })).toEqual({ key: '32', setting: 3 });
    expect(findPointGroup('2', { uniqueAxis: 'c' })).toEqual({ key: '2', setting: 2 });
  });

  it('refuses a symbol that names no setting, and criteria that no setting meets, naming the settings', () => {
    expect(() => operations('32', { setting: '3 2 2' })).toThrow(/has no setting "3 2 2" \(settings 1: 321/);
    expect(() => operations('32', { setting: '312', axes: 'rhombohedral' })).toThrow(
      /has no setting "312", rhombohedral axes \(settings 1: 321 \(3 2 1, hexagonal axes\), 2: 312 .*3: 32 \(3 2, rhombohedral axes\)\)/,
    );
    expect(() => operations('32', { setting: 3, axes: 'hexagonal' })).toThrow(
      /setting 3 does not have the hexagonal axes/,
    );
    expect(() => operations('6/mmm', { axes: 'rhombohedral' })).toThrow(/has no setting with rhombohedral axes/);
    expect(() => operations('m-3m', { axes: 'hexagonal' })).toThrow(
      /axes applies to the trigonal and hexagonal groups/,
    );
    expect(() => operations('mm2', { uniqueAxis: 'c' })).toThrow(/uniqueAxis applies to the monoclinic groups/);
    expect(() => operations('2', { uniqueAxis: 'z' as never })).toThrow(/uniqueAxis must be 'a', 'b' or 'c'/);
    expect(() => operations('32', { axes: 'trigonal' as never })).toThrow(/axes must be 'hexagonal' or 'rhombohedral'/);
    expect(() => findPointGroup('mm2', { uniqueAxis: 'c' })).toThrow(/uniqueAxis applies to the monoclinic groups/);
    expect(() => findPointGroup('32', { setting: 2 } as never)).toThrow(
      /takes the options axes, uniqueAxis, not "setting"/,
    );
    expect(() => findPointGroup('xyz', { axes: 'bogus' } as never)).toThrow(/axes must be/);
    expect(() => findPointGroup('32', { convention: 'itc' } as never)).toThrow(/option convention was removed/);
    expect(() => (findPointGroup as (...args: unknown[]) => unknown)('32', 'birss')).toThrow(
      /convention argument was removed/,
    );
    expect(() => operations('32', { setting: [2] } as never)).toThrow(/must be an index or a symbol, not \[2\]/);
    expect(() => operations('32', { setting: true } as never)).toThrow(RangeError);
  });
});

describe('the numbering of the settings (#137 A4)', () => {
  it('the ITC default first, then monoclinic c and a, the other orientation, trigonal rhombohedral axes last, orthorhombic in the column order of ITA Table 1.5.4.4', () => {
    const symbols = (key: PointGroupKey) => settings(key).map((s) => s.symbol);
    for (const key of POINT_GROUP_KEYS) expect(settings(key)[0].isDefault).toBe(true);
    expect(settings('2').map((s) => s.uniqueAxis)).toEqual(['b', 'c', 'a']);
    expect(symbols('mm2')).toEqual(['mm2', '2mm', 'm2m']);
    expect(symbols('-42m')).toEqual(['-42m', '-4m2']);
    expect(symbols('32')).toEqual(['321', '312', '32']);
    expect(symbols('3m')).toEqual(['3m1', '31m', '3m']);
    expect(symbols('-3m')).toEqual(['-3m1', '-31m', '-3m']);
    expect(symbols('3')).toEqual(['3', '3']);
    expect(settings('3').map((s) => s.axes)).toEqual(['hexagonal', 'rhombohedral']);
    expect(symbols('-6m2')).toEqual(['-6m2', '-62m']);
  });

  it('records the unique axis of monoclinic settings only, and the axes of trigonal ones', () => {
    for (const key of POINT_GROUP_KEYS) {
      const system = pointGroup(key).crystalSystem;
      for (const s of settings(key)) {
        expect('uniqueAxis' in s, `${key} ${s.index}`).toBe(system === 'monoclinic');
        expect(s.axes !== undefined, `${key} ${s.index}`).toBe(system === 'trigonal');
      }
    }
  });
});

describe('symbols', () => {
  it('short, full and Schoenflies forms', () => {
    expect(symbol('-3m')).toBe('-3m1');
    expect(symbol('-3m', { form: 'full' })).toBe('-3 2/m 1');
    expect(symbol('2', { form: 'full' })).toBe('1 2 1');
    expect(symbol('2', { form: 'full', setting: 2 })).toBe('1 1 2');
    expect(symbol('m-3m', { form: 'schoenflies' })).toBe('Oh');
  });
});

describe('findPointGroup', () => {
  it('a key gives the default setting, a symbol the setting it names', () => {
    expect(findPointGroup('32')).toEqual({ key: '32', setting: 1 });
    expect(findPointGroup('312')).toEqual({ key: '32', setting: 2 });
  });

  it('accepts full symbols with or without spaces, and returns undefined for unknown symbols', () => {
    expect(findPointGroup('4/m 2/m 2/m')).toEqual({ key: '4/mmm', setting: 1 });
    expect(findPointGroup('112')).toEqual({ key: '2', setting: 2 });
    expect(findPointGroup('m2m')).toEqual({ key: 'mm2', setting: 3 });
    expect(findPointGroup('m3m')).toEqual({ key: 'm-3m', setting: 1 }); // Birss's spelling (#96)
    expect(findPointGroup('m3m3')).toBeUndefined();
    expect(findPointGroup('P4mm')).toBeUndefined();
    expect(findPointGroup(42 as unknown as string)).toBeUndefined();
  });
});
