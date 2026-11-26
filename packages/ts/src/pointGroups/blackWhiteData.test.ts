/**
 * The ITC data of the black-and-white groups (blackWhiteData.ts, #122 PR 2c) and the API. The API
 * reads the settings, defaults, symbols and operations of these groups in the ITC convention from
 * these data, so this test checks the wiring and the derivation: every setting names one setting of
 * its class and exactly one group (the module throws otherwise); half of the class's operations
 * carry time reversal; the API gives the data's operations in the same order. That the output did
 * not change is checked by the ITC baseline pins (#121, itcBaseline.pins.test.ts), correctness by
 * blackWhiteData.reference.test.ts and magnetic.reference.test.ts.
 */

import { describe, expect, it } from 'vitest';
import { matricesEqual } from '../linalg.js';
import { BLACK_WHITE_POINT_GROUP_KEYS } from './keys.js';
import { settingLatticeOperations } from './classData.js';
import { BLACK_WHITE_GROUPS, blackWhiteClassSetting, blackWhiteOperations } from './blackWhiteData.js';
import { operations, pointGroup, settings, symbol } from './pointGroups.js';

const SETTINGS = BLACK_WHITE_GROUPS.flatMap((g) =>
  g.settings.map((s) => [`${g.key} #${s.index} ${s.full}`, g, s] as const),
);

describe('the ITC data of the black-and-white groups', () => {
  it('has the 58 groups in the order of BLACK_WHITE_POINT_GROUP_KEYS, one default each', () => {
    expect(BLACK_WHITE_GROUPS.map((g) => g.key)).toEqual([...BLACK_WHITE_POINT_GROUP_KEYS]);
    for (const g of BLACK_WHITE_GROUPS) {
      expect(g.settings.filter((s) => s.isDefault)).toHaveLength(1);
      expect(settings(g.key)).toHaveLength(g.settings.length);
    }
  });

  it('numbers the settings: the default first, orthorhombic in the column order of ITA Table 1.5.4.4', () => {
    // abc, ba-c, cab, -cba, bca, a-cb: the positions of the new symbol taken from these of the default.
    const columns = [
      [0, 1, 2],
      [1, 0, 2],
      [2, 0, 1],
      [2, 1, 0],
      [1, 2, 0],
      [0, 2, 1],
    ];
    for (const g of BLACK_WHITE_GROUPS) {
      expect(g.settings[0].isDefault, g.key).toBe(true);
      const system = pointGroup(g.key).crystalSystem;
      if (system === 'orthorhombic') {
        const p = g.settings[0].full.split(' ');
        const expected = [...new Set(columns.map((c) => c.map((i) => p[i]).join(' ')))];
        expect(
          g.settings.map((s) => s.full),
          g.key,
        ).toEqual(expected);
      }
      if (system === 'monoclinic')
        expect(
          g.settings.map((s) => s.uniqueAxis),
          g.key,
        ).toEqual(['b', 'c', 'a']);
    }
  });

  it.each(SETTINGS)('%s: one group, half of its class with time reversal', (_, g, s) => {
    const ops = blackWhiteOperations(g.key, s.index);
    expect(ops).toHaveLength(settingLatticeOperations(g.crystalClass, blackWhiteClassSetting(g.key, s.index)).length);
    expect(ops.filter((o) => o.timeReversal)).toHaveLength(ops.length / 2);
    expect(ops[0].timeReversal).toBe(false);
    expect(blackWhiteClassSetting(g.key, s.index)).toBeGreaterThan(0);
  });

  it.each(SETTINGS)('%s: the API gives the data', (_, g, s) => {
    const api = settings(g.key).find((x) => x.index === s.index)!;
    expect(api.fullSymbol).toBe(s.full);
    expect(api.isDefault).toBe(s.isDefault);
    expect(api.uniqueAxis).toBe(s.uniqueAxis);
    expect(symbol(g.key, { setting: s.index, form: 'full' })).toBe(s.full);
    const ops = operations(g.key, { setting: s.index });
    const data = blackWhiteOperations(g.key, s.index);
    expect(ops).toHaveLength(data.length);
    ops.forEach((o, i) => {
      expect(matricesEqual(o.cartesian, data[i].cartesian)).toBe(true);
      expect(o.timeReversal).toBe(data[i].timeReversal);
    });
  });
});
