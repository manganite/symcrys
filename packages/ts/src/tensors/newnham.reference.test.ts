/**
 * Property tensors against a further print (fixture class (a)): Newnham, Properties of Materials
 * (2005), Tables 12.2 (piezoelectric matrices, pp. 91–92), 30.1 (gyration tensors, p. 330) and 30.2
 * (the properties of the acentric classes, p. 332), re-parsed from
 * references/newnham/tables-12.2-30.1-30.2.md, with the erratum of −4 in Table 12.2 read as noted
 * there. Newnham's axes (§ 4.3, the IEEE settings) are those of the ITC default settings for these
 * forms, so the printed forms are compared in the default setting.
 *
 * Table 12.2 is printed in Voigt's notation with the factors of the piezoelectric d (d_122 = ½d_16,
 * p. 90): it is compared with `toVoigt(…, { factors: [2] })` of the computed form, which checks the
 * factors as well (−2d11, −2d22).
 */

import { describe, expect, it } from 'vitest';
import * as classes from '../index.js';
import { matrixRank } from '../testUtils/rank.js';
import { readReference, section, tableRows } from '../testUtils/references.js';

const FILE = readReference('newnham/tables-12.2-30.1-30.2.md');

/** The crystal classes of a printed list of groups (the Curie groups left out), as keys. */
function keysOf(printed: string): classes.PointGroupKey[] {
  return printed
    .split(',')
    .map((g) => g.trim())
    .filter((g) => !g.includes('∞') && g !== 'All others')
    .map((g) => {
      const found = classes.findPointGroup(g);
      if (!found) throw new Error(`Newnham: no class ${g}`);
      return found.key;
    });
}

/** The spanning vectors of a printed matrix, one per coefficient symbol. */
function printedSpace(matrix: string): number[][] {
  const cells = matrix.split(';').map((row) => row.trim().split(/\s+/));
  const width = cells[0].length;
  const vectors = new Map<string, number[]>();
  cells.forEach((row, i) =>
    row.forEach((cell, j) => {
      if (cell === '0') return;
      const m = /^(-?)(\d?)([dg]\d\d)$/.exec(cell);
      if (!m) throw new Error(`Newnham: unreadable cell ${cell}`);
      if (!vectors.has(m[3])) vectors.set(m[3], new Array<number>(cells.length * width).fill(0));
      vectors.get(m[3])![i * width + j] = (m[1] ? -1 : 1) * Number(m[2] || 1);
    }),
  );
  return [...vectors.values()];
}

const sameSpace = (a: readonly (readonly number[])[], b: readonly (readonly number[])[], dim: number) =>
  matrixRank(a, dim) === matrixRank(b, dim) && matrixRank([...a, ...b], dim) === matrixRank(a, dim);

/** The corrections of the section "Errata" of the transcription. */
const ERRATA: Readonly<Record<string, { matrix: string; count: string }>> = {
  '-4': { matrix: '0 0 0 d14 -d15 0; 0 0 0 d15 d14 0; d31 -d31 0 0 0 d36', count: '4' },
};

describe('Newnham Table 12.2: piezoelectric matrices', () => {
  const rows = tableRows(section(FILE, '## Table 12.2')).slice(1);

  it('covers the 32 crystal classes once', () => {
    const keys = rows.flatMap((r) => keysOf(r[0]));
    expect([...keys].sort()).toEqual([...classes.POINT_GROUP_KEYS].sort());
  });

  for (const [groups, printedMatrix, printedCount] of rows) {
    it(groups, () => {
      const { matrix, count } = ERRATA[groups] ?? { matrix: printedMatrix, count: printedCount };
      const printed = printedSpace(matrix);
      expect(printed.length, 'symbols').toBe(count === '' ? 0 : Number(count));
      for (const key of keysOf(groups)) {
        const voigt = classes
          .tensorForm(key, 'piezoelectric')
          .basis.map((t) => (classes.toVoigt(t, 'piezoelectric', { factors: [2] }) as number[][]).flat());
        expect(sameSpace(voigt, printed, 18), key).toBe(true);
      }
    });
  }
});

describe('Newnham Table 30.1: gyration tensors (optical activity)', () => {
  const rows = tableRows(section(FILE, '## Table 30.1')).slice(1);
  const named = rows.filter((r) => r[0] !== 'All others').flatMap((r) => keysOf(r[0]));

  for (const [groups, matrix] of rows) {
    it(groups, () => {
      const printed = printedSpace(matrix);
      const keys =
        groups === 'All others' ? classes.POINT_GROUP_KEYS.filter((k) => !named.includes(k)) : keysOf(groups);
      for (const key of keys) {
        const basis = classes.tensorForm(key, 'gyrotropic').basis;
        expect(sameSpace(basis, printed, 9), key).toBe(true);
      }
    });
  }
});

describe('Newnham Table 30.2: optical activity, enantiomorphism, piezo- and pyroelectricity', () => {
  const rows = tableRows(section(FILE, '## Table 30.2')).slice(1);

  it('lists the 21 acentric classes; the others have none of the four', () => {
    const keys = rows.map((r) => keysOf(r[0])[0]);
    expect(keys).toHaveLength(21);
    expect([...keys].sort()).toEqual(
      classes.POINT_GROUP_KEYS.filter((k) => !classes.pointGroup(k).centrosymmetric).sort(),
    );
    for (const key of classes.POINT_GROUP_KEYS.filter((k) => !keys.includes(k))) {
      expect(
        classes.allowedProperties(key).filter((p) => p !== 'ferroaxial'),
        key,
      ).toEqual([]);
      expect(classes.pointGroup(key).enantiomorphic, key).toBe(false);
    }
  });

  for (const [printed, o, e, p, pStar] of rows) {
    it(printed, () => {
      const key = keysOf(printed)[0];
      expect(classes.allowsProperty(key, 'gyrotropic'), 'O').toBe(o === 'O');
      expect(classes.pointGroup(key).enantiomorphic, 'E').toBe(e === 'E');
      expect(classes.allowsProperty(key, 'piezoelectric'), 'P').toBe(p === 'P');
      expect(classes.allowsProperty(key, 'pyroelectric'), 'P*').toBe(pStar === 'P*');
    });
  }

  it('the counts printed beside the table: O 15, E 11, P 20, P* 10', () => {
    const count = (column: number, mark: string) => rows.filter((r) => r[column] === mark).length;
    expect([count(1, 'O'), count(2, 'E'), count(3, 'P'), count(4, 'P*')]).toEqual([15, 11, 20, 10]);
  });
});
