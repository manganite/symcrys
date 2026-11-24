/**
 * The lattices of the plane against print (fixture class (a)): ITA (6th ed., 2016) Table 2.1.1.1,
 * p. 143, block "Two dimensions" (references/itc/vol-a-table-2.1.1.1.md), and the Patterson
 * symmetry of the 17 plane groups as printed in their headlines (Chapter 2.2,
 * references/itc/vol-a-2016-plane-groups.md).
 *
 * The Laue class is computed (the point group with the twofold rotation added, ITA § 3.2.1.1,
 * p. 720); print anchors it twice: the boxed point groups of each row are the Laue classes, and the
 * printed Patterson symmetry of every plane group is the symmorphic group of its lattice with the
 * Laue class of its point group.
 */

import { describe, expect, it } from 'vitest';
import * as plane from '../plane.js';
import { expectHeader, readReference, section, tableRows } from '../testUtils/references.js';

const rows = tableRows(section(readReference('itc/vol-a-table-2.1.1.1.md'), '## Two dimensions'));
expectHeader(rows, [
  'Crystal family',
  'Symbol',
  'Crystal system',
  'Crystallographic point groups',
  'No. of space groups',
  'Restrictions on cell parameters',
  'Parameters to be determined',
  'Bravais lattices',
]);

interface PrintedFamily {
  readonly system: plane.PlaneSystem;
  readonly symbol: string;
  readonly pointGroups: readonly { readonly key: string; readonly box?: 'L' | 'H' }[];
  readonly count: number;
  readonly restrictions: string;
  readonly parameters: string;
  readonly lattices: readonly string[];
}

const PRINT: readonly PrintedFamily[] = rows.slice(1).map((r) => ({
  system: r[2].toLowerCase() as plane.PlaneSystem,
  symbol: r[1],
  pointGroups: r[3].split(',').map((t) => {
    const m = /^(\S+)(?: \((L|H)\))?$/.exec(t.trim());
    if (!m) throw new Error(`Point group cell: ${t}`);
    return m[2] ? { key: m[1], box: m[2] as 'L' | 'H' } : { key: m[1] };
  }),
  count: Number(r[4]),
  restrictions: r[5],
  parameters: r[6],
  lattices: r[7].split(',').map((t) => t.trim()),
}));

describe('ITA Table 2.1.1.1, two dimensions', () => {
  it('has the four families with the ten point groups and the 17 plane groups', () => {
    expect(PRINT.map((f) => f.system)).toEqual(['oblique', 'rectangular', 'square', 'hexagonal']);
    expect(PRINT.flatMap((f) => f.pointGroups.map((g) => g.key)).sort()).toEqual([...plane.POINT_GROUP_KEYS].sort());
    expect(PRINT.reduce((n, f) => n + f.count, 0)).toBe(17);
  });

  it('the crystal system of each point group and plane group, and the number of plane groups', () => {
    for (const f of PRINT) {
      for (const g of f.pointGroups)
        expect(plane.pointGroup(g.key as plane.PointGroupKey).crystalSystem).toBe(f.system);
      expect(plane.planeGroups().filter((g) => g.crystalSystem === f.system)).toHaveLength(f.count);
    }
  });

  it('cellRestrictions gives the printed restrictions and parameters', () => {
    for (const f of PRINT) {
      const equal: string[][] = [];
      const angles: Record<string, number> = {};
      if (f.restrictions !== 'None') {
        for (const part of f.restrictions.split(';').map((t) => t.trim())) {
          const angle = /^gamma = (\d+) deg$/.exec(part);
          const pair = /^(a|b) = (a|b)$/.exec(part);
          if (angle) angles.gamma = Number(angle[1]);
          else if (pair) equal.push([pair[1], pair[2]]);
          else throw new Error(`Restriction: ${part}`);
        }
      }
      const parameters = f.parameters.split(',').map((t) => t.trim());
      const nonAcute = parameters.filter((t) => t.endsWith(' (c)')).map((t) => t.replace(' (c)', ''));
      expect(plane.cellRestrictions(f.system), f.system).toEqual({
        parameters: parameters.map((t) => t.replace(' (c)', '')),
        equal,
        angles,
        nonAcute,
      });
    }
  });

  it('the Bravais lattice of each plane group is one of its family, and every printed lattice occurs', () => {
    for (const f of PRINT) {
      const groups = plane.planeGroups().filter((g) => g.crystalSystem === f.system);
      for (const g of groups) {
        expect(f.lattices, g.key).toContain(g.bravaisLattice);
        expect(g.bravaisLattice).toBe(`${f.symbol}${g.key[0]}`);
      }
      expect(new Set(groups.map((g) => g.bravaisLattice))).toEqual(new Set(f.lattices));
    }
  });

  it('the boxed point groups are the Laue classes: each point group has one of its row, the boxed ones themselves', () => {
    const boxed = PRINT.flatMap((f) => f.pointGroups.filter((g) => g.box).map((g) => g.key));
    expect(new Set(plane.pointGroups().map((g) => g.laueClass))).toEqual(new Set(boxed));
    for (const f of PRINT) {
      const own = f.pointGroups.filter((g) => g.box).map((g) => g.key);
      for (const g of f.pointGroups) {
        const laue = plane.pointGroup(g.key as plane.PointGroupKey).laueClass;
        expect(own, g.key).toContain(laue);
        if (g.box) expect(laue, g.key).toBe(g.key);
      }
    }
  });
});

describe('Patterson symmetry (ITA Chapter 2.2 headlines)', () => {
  const printed = new Map(
    [
      ...readReference('itc/vol-a-2016-plane-groups.md').matchAll(
        /^## \d+ — (\S+), p\. \d+\n(?:.*\n)*?Patterson symmetry: (\S+)/gm,
      ),
    ].map((m) => [m[1], m[2]]),
  );

  it('is printed for all 17 groups and given by planeGroup as printed', () => {
    expect(printed.size).toBe(17);
    for (const g of plane.planeGroups()) expect(g.pattersonSymmetry, g.key).toBe(printed.get(g.key));
  });

  it('is the symmorphic group of the lattice of the group with the Laue class of its point group', () => {
    for (const g of plane.planeGroups()) {
      const patterson = plane.planeGroup(g.pattersonSymmetry);
      expect(patterson.key[0], g.key).toBe(g.key[0]);
      expect(patterson.pointGroup, g.key).toBe(plane.pointGroup(g.pointGroup).laueClass);
      // Symmorphic: the operations of the (0,0)+ set have no translation.
      const ops = plane.operations(patterson.key);
      const primitive = ops.slice(0, ops.length / (1 + patterson.centring.length));
      expect(
        primitive.every((op) => op.translation.every((t) => t === 0)),
        patterson.key,
      ).toBe(true);
    }
  });
});
