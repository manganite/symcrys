/**
 * Property tensors against a further print (fixture class (a)): Newnham, Properties of Materials
 * (2005), Tables 8.1 (pyroelectric, p. 53), 9.1 (dielectric constant, p. 64), 13.1 (elastic
 * stiffnesses, pp. 108–109), 14.3 (pyromagnetic, p. 133), 14.4 (magnetoelectric, p. 140) and 14.5
 * (piezomagnetic, pp. 144–145), re-parsed from references/newnham/tables-8.1-9.1-13.1-14.3-14.4-14.5.md
 * with the errata read from the same file (symbols that name no group as printed, or the other
 * orientation of the group than the printed matrix, read as ITC Vol. D prints the same matrices). Newnham's
 * axes are those of the ITC default settings for the crystal classes (§ 4.3 and Table 4.2, pp. 25–26);
 * a magnetic group is compared in the setting its printed symbol names (`m'2'm`, `2mm`), as
 * `findPointGroup` reads it.
 *
 * The Voigt matrices are compared with `toVoigt` of the computed forms with Newnham's factors: none
 * for the stiffnesses (§ 13.2, p. 105, ½(c11 − c12)), those of d for the piezomagnetic matrix
 * (−2Q22, −2Q11), so the tests check the factors as well.
 */

import { describe, expect, it } from 'vitest';
import * as classes from '../index.js';
import * as magnetic from '../magnetic.js';
import { printedSpace, sameSpace } from '../testUtils/printedMatrix.js';
import { readReference, section, tableRows } from '../testUtils/references.js';

const FILE = readReference('newnham/tables-8.1-9.1-13.1-14.3-14.4-14.5.md');
const rowsOf = (heading: string) => tableRows(section(FILE, heading)).slice(1);

/** The errata: per table a printed symbol and how it is read. */
const ERRATA = rowsOf('## Errata');

const OTHERS = ['All others', 'Other magnetic groups', 'All other magnetic groups'];

/** The printed group names of a list, the Curie groups left out, with the errata of `table` applied. */
function namesOf(printed: string, table: string): string[] {
  return printed
    .split(',')
    .map((g) => g.trim())
    .filter((g) => !g.includes('∞') && !OTHERS.includes(g))
    .map((g) => ERRATA.find(([t, p]) => t === table && p === g)?.[2] ?? g);
}

/** The crystal classes of a printed list, as keys. */
function classKeysOf(printed: string): classes.PointGroupKey[] {
  return namesOf(printed, '').map((g) => {
    const found = classes.findPointGroup(g);
    if (!found) throw new Error(`Newnham: no class ${g}`);
    return found.key;
  });
}

/** The magnetic groups of a printed list, with the setting each symbol names. */
function magneticGroupsOf(printed: string, table: string): { key: magnetic.PointGroupKey; setting: number }[] {
  return namesOf(printed, table).map((g) => {
    const found = magnetic.findPointGroup(g);
    if (!found) throw new Error(`Newnham: no magnetic group ${g}`);
    return { key: found.key, setting: found.setting! };
  });
}

/** The 90 magnetic point groups of Newnham's tables: all but the grey groups. */
const NINETY = magnetic.POINT_GROUP_KEYS.filter((k) => magnetic.pointGroup(k).type !== 'II');

const flat = (voigt: readonly number[] | readonly (readonly number[])[]) => (voigt as number[][]).flat();

describe('Newnham Table 8.1: pyroelectric coefficients', () => {
  const rows = rowsOf('## Table 8.1');
  const named = rows.flatMap((r) => classKeysOf(r[0]));

  it('lists the ten pyroelectric classes once; the others have none', () => {
    expect(named).toHaveLength(10);
    expect(new Set(named).size).toBe(10);
    for (const key of classes.POINT_GROUP_KEYS.filter((k) => !named.includes(k)))
      expect(classes.tensorForm(key, 'pyroelectric').basis, key).toEqual([]);
  });

  for (const [groups, matrix] of rows) {
    it(groups, () => {
      for (const key of classKeysOf(groups))
        expect(sameSpace(classes.tensorForm(key, 'pyroelectric').basis, printedSpace(matrix), 3), key).toBe(true);
    });
  }
});

describe('Newnham Table 9.1: dielectric constant', () => {
  const rows = rowsOf('## Table 9.1');
  const spec = { rank: 2, kind: 'polar', intrinsic: 'symmetric-first-pair' } as const;
  const COUNTS: Record<string, number> = {
    'Six coefficients': 6,
    'Four coefficients': 4,
    'Three coefficients': 3,
    'Two coefficients': 2,
    'One coefficient': 1,
  };

  it('covers the 32 crystal classes once', () => {
    const keys = rows.flatMap((r) => classKeysOf(r[1]));
    expect([...keys].sort()).toEqual([...classes.POINT_GROUP_KEYS].sort());
  });

  for (const [system, groups, matrix, count] of rows) {
    it(`${system}: ${groups}`, () => {
      const printed = printedSpace(matrix);
      expect(printed.length, 'symbols').toBe(COUNTS[count]);
      for (const key of classKeysOf(groups))
        expect(sameSpace(classes.tensorForm(key, spec).basis, printed, 9), key).toBe(true);
    });
  }
});

describe('Newnham Table 13.1: elastic stiffnesses', () => {
  const rows = rowsOf('## Table 13.1');
  const spec = { rank: 4, kind: 'polar', intrinsic: 'symmetric-pairs-exchangeable' } as const;

  it('covers the 32 crystal classes once', () => {
    const keys = rows.flatMap((r) => classKeysOf(r[1]));
    expect([...keys].sort()).toEqual([...classes.POINT_GROUP_KEYS].sort());
  });

  for (const [system, groups, matrix] of rows) {
    it(`${system}: ${groups}`, () => {
      for (const key of classKeysOf(groups)) {
        const voigt = classes
          .tensorForm(key, spec)
          .basis.map((t) => flat(classes.toVoigt(t, spec, { factors: [1, 1] })));
        expect(sameSpace(voigt, printedSpace(matrix), 36), key).toBe(true);
      }
    });
  }
});

/**
 * A magnetic table: every printed row against the computed form in the setting of its symbol, the
 * groups not named against zero, and the number of groups named against the printed count.
 */
function magneticTable(
  heading: string,
  property: 'ferromagnetic' | 'magnetoelectric' | 'piezomagnetic',
  count: number,
  dim: number,
  matrixOf: (basis: readonly (readonly number[])[]) => number[][],
) {
  const table = heading.replace('## Table ', '');
  const rows = rowsOf(heading);
  const named = rows.filter((r) => !OTHERS.includes(r[0])).flatMap((r) => magneticGroupsOf(r[0], table));

  it(`names ${count} groups, each once; the others of the 90 have none`, () => {
    const keys = named.map((g) => g.key);
    expect(keys).toHaveLength(count);
    expect(new Set(keys).size).toBe(count);
    for (const key of NINETY.filter((k) => !keys.includes(k)))
      expect(magnetic.tensorForm(key, property).basis, key).toEqual([]);
  });

  for (const [groups, matrix] of rows.filter((r) => !OTHERS.includes(r[0]))) {
    it(groups, () => {
      for (const { key, setting } of magneticGroupsOf(groups, table)) {
        const basis = matrixOf(magnetic.tensorForm(key, property, { setting }).basis);
        expect(sameSpace(basis, printedSpace(matrix), dim), `${key} setting ${setting}`).toBe(true);
      }
    });
  }

  it('the row of the others is zero', () => {
    const others = rows.filter((r) => OTHERS.includes(r[0]));
    expect(others).toHaveLength(1);
    expect(printedSpace(others[0][1])).toEqual([]);
  });
}

describe('Newnham Table 14.3: pyromagnetic coefficients (the 31 pyromagnetic groups)', () => {
  magneticTable('## Table 14.3', 'ferromagnetic', 31, 3, (b) => b.map((t) => [...t]));
});

describe('Newnham Table 14.4: magnetoelectric matrices ("only 58 of the 90", p. 139)', () => {
  magneticTable('## Table 14.4', 'magnetoelectric', 58, 9, (b) => b.map((t) => [...t]));
});

describe('Newnham Table 14.5: piezomagnetic matrices ("66 are piezomagnetic", p. 144)', () => {
  magneticTable('## Table 14.5', 'piezomagnetic', 66, 18, (b) =>
    b.map((t) => flat(magnetic.toVoigt(t, 'piezomagnetic', { factors: [2] }))),
  );
});

describe('Newnham: errata', () => {
  for (const [table, printed, readAs] of ERRATA) {
    it(`${table}: ${printed} → ${readAs}`, () => {
      const lists = rowsOf(`## Table ${table}`).map((r) => r[0].split(',').map((g) => g.trim()));
      expect(
        lists.some((l) => l.includes(printed)),
        'printed in the table',
      ).toBe(true);
      const read = magnetic.findPointGroup(readAs);
      expect(read, 'the reading names a group').toBeDefined();
      // As printed, the symbol names no group or another setting of the same group.
      const asPrinted = magnetic.findPointGroup(printed);
      if (asPrinted) {
        expect(asPrinted.key).toBe(read!.key);
        expect(asPrinted.setting).not.toBe(read!.setting);
      }
    });
  }
});
