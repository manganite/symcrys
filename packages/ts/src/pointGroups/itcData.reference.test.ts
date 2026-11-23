/**
 * The exact ITC class data (itcData.ts) against print (fixture class (a)): ITA (6th ed.) Table
 * 3.2.3.2, pp. 745–769, re-parsed from references/itc/. For each of the 40 entries without
 * rhombohedral axes, the operations built from ITA's selected generators are the printed general
 * position, as integer matrices in the conventional basis and in the printed order; the symbols and
 * the crystal system and Schoenflies symbol are those of the headline.
 */

import { describe, expect, it } from 'vitest';
import { expectHeader, readReference, tableRows, notRhombohedral } from '../testUtils/references.js';
import { ITC_CLASSES, itcLatticeOperations } from './itcData.js';

const headlineRows = tableRows(readReference('itc/vol-a-table-3.2.3.2-headlines.md'));
expectHeader(headlineRows, ['System', 'Short', 'Full', 'Schoenflies', 'Axes', 'Page']);
const positionRows = tableRows(readReference('itc/vol-a-table-3.2.3.2-general-positions.md')).filter(notRhombohedral);
expectHeader(positionRows, ['Short', 'Axes', 'Page', 'Multiplicity', 'General position']);

/** One printed coordinate, e.g. `-x+y`, as a row of W: the coefficients of x, y, z. */
function coefficients(expr: string): number[] {
  const row = [0, 0, 0];
  const terms = expr.match(/[+-]?[xyz]/g) ?? [];
  if (!expr || terms.join('').replace(/^\+/, '') !== expr) throw new Error(`Unreadable coordinate: ${expr}`);
  for (const t of terms) row['xyz'.indexOf(t.slice(-1))] += t.startsWith('-') ? -1 : 1;
  return row;
}

/** A printed triplet as the integer matrix W. */
const matrixOf = (triplet: string): number[][] => triplet.split(',').map(coefficients);

/** The setting of the class data that an entry names: its short symbol, and its unique axis if monoclinic. */
function settingOf(short: string, axes: string) {
  const axis = /^unique axis (b|c)$/.exec(axes)?.[1];
  return ITC_CLASSES.flatMap((c) =>
    c.settings.filter((s) => s.short === short && (axis === undefined || s.uniqueAxis === axis)).map((s) => ({ c, s })),
  );
}

describe('ITA Table 3.2.3.2 against the exact class data', () => {
  const entries = positionRows.slice(1);

  it('names every setting of the class data once, except 2mm, m2m and unique axis a, which ITA does not list', () => {
    const named = entries.flatMap((r) => settingOf(r[0], r[1]).map(({ c, s }) => `${c.key}#${s.index}`));
    const all = ITC_CLASSES.flatMap((c) => c.settings.filter((s) => !s.from).map((s) => `${c.key}#${s.index}`));
    expect(named.sort()).toEqual(all.sort());
  });

  it.each(entries.map((r) => [`${r[0]} ${r[1]}`.trim(), r] as const))(
    '%s: the printed general position, in printed order',
    (_, r) => {
      const [{ c, s }] = settingOf(r[0], r[1]);
      expect(itcLatticeOperations(c.key, s.index).map((w) => w.map((row) => [...row]))).toEqual(
        r[4].split(/\s+/).map(matrixOf),
      );
    },
  );

  it.each(
    headlineRows
      .slice(1)
      .filter((h) => !/rhombohedral/i.test(h[4]))
      .map((h) => [`${h[1]} ${h[4]}`.trim(), h] as const),
  )('%s: symbols, crystal system and Schoenflies symbol of the headline', (_, h) => {
    const matches = settingOf(h[1], h[4]);
    expect(matches).toHaveLength(1);
    const [{ c, s }] = matches;
    expect(c.crystalSystem).toBe(h[0].toLowerCase());
    expect(c.schoenflies).toBe(h[3]);
    // The table prints a full symbol only where it differs from the short one, and none for the monoclinic classes.
    if (h[2]) expect(s.full).toBe(h[2]);
    else if (c.crystalSystem !== 'monoclinic') expect(s.full.replace(/ /g, '')).toBe(s.short);
  });
});
