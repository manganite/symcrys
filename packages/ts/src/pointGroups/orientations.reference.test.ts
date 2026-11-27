/**
 * The settings of the classes and black-and-white groups against print (fixture class (a)): the
 * inventory of the orientations ITC prints, references/itc/orientations.md ("Printed
 * occurrences"; ITC Vol. D 2013 and ITA 2016, pages in the file). Every printed orientation is a
 * further setting of its group, and every further setting with hexagonal or orthogonal axes is
 * printed somewhere (GUIDE.md, "ITC as the standard": an orientation is a setting if ITC prints the
 * symbol of the group in it). The settings with rhombohedral axes are those of ITA Table 3.2.3.2
 * (checked with the Wyckoff positions) and of the classes they belong to.
 */

import { describe, expect, it } from 'vitest';
import * as magnetic from '../magnetic.js';
import { readReference, section, tableRows } from '../testUtils/references.js';

const text = readReference('itc/orientations.md');
const rows = tableRows(section(text, '## Printed occurrences')).slice(1);

describe('ITC: the orientations printed outside the standard one', () => {
  it('has the printed occurrences, each of a group symcrys knows', () => {
    expect(rows.length).toBeGreaterThan(100);
    for (const [group] of rows) expect(magnetic.isPointGroupKey(group), group).toBe(true);
  });

  it('every printed orientation is a further setting of its group', () => {
    for (const [group, printed, full] of rows) {
      const setting = magnetic.settings(group as magnetic.PointGroupKey).find((s) => s.fullSymbol === full);
      expect(setting, `${group}: ${printed} (${full})`).toBeDefined();
      expect(setting!.isDefault, `${group}: ${full} is the default`).toBe(false);
    }
  });

  it('every further setting of a class or black-and-white group without rhombohedral axes is printed', () => {
    const printed = new Set(rows.map(([group, , full]) => `${group}|${full}`));
    for (const key of magnetic.POINT_GROUP_KEYS) {
      if (magnetic.pointGroup(key).type === 'II') continue;
      for (const s of magnetic.settings(key)) {
        if (s.isDefault || s.axes === 'rhombohedral') continue;
        expect(printed.has(`${key}|${s.fullSymbol}`), `${key} setting ${s.index}: ${s.fullSymbol}`).toBe(true);
      }
    }
  });
});
