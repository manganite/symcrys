/**
 * ITC operations against print (fixture class (a)): the general positions of ITA (6th ed.) Table
 * 3.2.3.2, pp. 745–769, re-parsed from references/itc/vol-a-table-3.2.3.2-general-positions.md.
 *
 * Each coordinate triplet is an operation W in the lattice basis; with the frame decided on #6
 * (x ∥ a, z ∥ c, y = z × x; typed here, not imported) it becomes the Cartesian matrix B·W·B⁻¹.
 * The printed set must be exactly the operations of the matching ITC setting of symcrys.
 */

import { describe, expect, it } from 'vitest';
import { close, inverse, mul, sameGroup, sameM, type M, type RefOp } from '../testUtils/independentGroups.js';
import { expectHeader, readReference, tableRows } from '../testUtils/references.js';
import { POINT_GROUP_KEYS, operations, settings, type PointGroupKey } from './pointGroups.js';

/**
 * Lattice basis for all but the hexagonal family. For monoclinic and triclinic it stands in for the
 * real oblique cell: their operations only negate the plane perpendicular to the unique axis (or
 * every direction), so B·W·B⁻¹ does not depend on the cell angles.
 */
const ORTHONORMAL: M = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];
/** Columns a, b, c: a = x, b at 120° from a in the xy plane, c = z. */
const HEXAGONAL: M = [
  [1, -1 / 2, 0],
  [0, Math.sqrt(3) / 2, 0],
  [0, 0, 1],
];

// --- The transcriptions ---------------------------------------------------------------------------

const headlineRows = tableRows(readReference('itc/vol-a-table-3.2.3.2-headlines.md'));
expectHeader(headlineRows, ['System', 'Short', 'Full', 'Schoenflies', 'Axes', 'Page']);

const positionRows = tableRows(readReference('itc/vol-a-table-3.2.3.2-general-positions.md'));
expectHeader(positionRows, ['Short', 'Axes', 'Page', 'Multiplicity', 'General position']);

/** One coordinate, e.g. `-x+y`, as the row of W: the coefficients of x, y, z. */
function coefficients(expr: string): number[] {
  if (!expr) throw new Error('Empty coordinate');
  const row = [0, 0, 0];
  const terms = expr.match(/[+-]?[xyz]/g) ?? [];
  if (terms.join('').replace(/^\+/, '') !== expr) throw new Error(`Unreadable coordinate: ${expr}`);
  for (const t of terms) row['xyz'.indexOf(t.slice(-1))] += t.startsWith('-') ? -1 : 1;
  return row;
}

/** A triplet `x̃,ỹ,z̃` as the matrix W in the lattice basis. */
function latticeMatrix(triplet: string): M {
  const parts = triplet.split(',');
  if (parts.length !== 3) throw new Error(`Not a triplet: ${triplet}`);
  return parts.map(coefficients);
}

interface Entry {
  short: string;
  axes: string;
  system: string;
  page: number;
  multiplicity: number;
  triplets: string[];
}

const ENTRIES: Entry[] = positionRows.slice(1).map((r) => {
  const headline = headlineRows.find((h) => h[1] === r[0] && h[4] === r[1]);
  if (!headline) throw new Error(`No headline for ${r[0]} ${r[1]}`);
  if (headline[5] !== r[2]) throw new Error(`Page of ${r[0]} differs from the headline`);
  return {
    short: r[0],
    axes: r[1],
    system: headline[0].toLowerCase(),
    page: Number(r[2]),
    multiplicity: Number(r[3]),
    triplets: r[4].split(/\s+/),
  };
});

function cartesian(e: Entry): RefOp[] {
  const b = e.system === 'trigonal' || e.system === 'hexagonal' ? HEXAGONAL : ORTHONORMAL;
  const bInv = inverse(b);
  return e.triplets.map((t) => ({ m: mul(mul(b, latticeMatrix(t)), bInv), t: false }));
}

/** The ITC setting of symcrys named by the entry: same short symbol, and the same unique axis if monoclinic. */
function settingOf(e: Entry): { key: PointGroupKey; index: number }[] {
  const axis = /^unique axis (b|c)$/.exec(e.axes)?.[1];
  return POINT_GROUP_KEYS.flatMap((key) =>
    settings(key, 'itc')
      .filter((s) => s.symbol === e.short && (axis === undefined || s.uniqueAxis === axis))
      .map((s) => ({ key, index: s.index })),
  );
}

describe('ITA Table 3.2.3.2: general positions', () => {
  it('has the 40 entries with hexagonal or no special axes, each once', () => {
    expect(ENTRIES).toHaveLength(40);
    expect(new Set(ENTRIES.map((e) => `${e.short}|${e.axes}`)).size).toBe(40);
  });

  it('covers every ITC setting of symcrys except 2mm and m2m, which ITA does not list', () => {
    const covered = new Set(ENTRIES.flatMap((e) => settingOf(e).map((s) => `${s.key}#${s.index}`)));
    const all = POINT_GROUP_KEYS.flatMap((key) =>
      settings(key, 'itc')
        .filter((s) => s.symbol !== '2mm' && s.symbol !== 'm2m')
        .map((s) => `${key}#${s.index}`),
    );
    expect([...covered].sort()).toEqual(all.sort());
  });

  for (const e of ENTRIES) {
    const label = `${e.short}${e.axes ? ` (${e.axes})` : ''}, p. ${e.page}`;
    it(`${label}: ${e.multiplicity} distinct operations forming a group`, () => {
      expect(e.triplets).toHaveLength(e.multiplicity);
      const ops = cartesian(e);
      // Distinct as matrices, not only as strings (`y-x` and `-x+y` are the same coordinate).
      for (let i = 0; i < ops.length; i++) {
        for (let j = i + 1; j < ops.length; j++) {
          expect(sameM(ops[i].m, ops[j].m), `${e.triplets[i]} = ${e.triplets[j]}`).toBe(false);
        }
      }
      expect(close(ops)).toHaveLength(e.multiplicity);
    });

    it(`${label}: the printed operations are those of the ITC setting`, () => {
      const matches = settingOf(e);
      expect(matches).toHaveLength(1);
      const ops = operations(matches[0].key, { convention: 'itc', setting: matches[0].index });
      expect(sameGroup(cartesian(e), ops)).toBe(true);
    });
  }
});
