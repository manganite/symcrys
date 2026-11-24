/**
 * Tensor forms against Birss's Tables 4a–4f (fixture class (a)), an independent second print check
 * of the ITC output: for each of the 32 classes and each rank 0 to 4, polar and axial, the form of
 * the ITC default setting, carried into Birss's frame (testUtils/birssFrame.ts, checked against
 * Birss's Table 3 by pointGroups/birss.reference.test.ts), must be exactly the solution space of the
 * relations Birss prints. Subspace equality: every basis vector satisfies every printed relation, and
 * the dimensions agree. The relations are read from references/birss/
 * (src/testUtils/birssTensorTables.ts), never from symcrys.
 *
 * Birss's Tables 4 are for the 32 classes without time reversal, so `c`-tensors equal `i`-tensors;
 * that is checked here too. Index symmetries are not part of Tables 4 (`intrinsic: 'none'`).
 */

import { describe, expect, it } from 'vitest';
import { POINT_GROUP_KEYS, type PointGroupKey } from '../pointGroups/pointGroups.js';
import {
  CLASS_ROWS,
  T4B,
  T4C,
  T4D,
  T4E,
  T4F_ROW_COUNTS,
  relationRows,
  relations4e,
  relations4f,
  relationsLowRank,
  symbolClass,
  type Relation,
} from '../testUtils/birssTensorTables.js';
import { tensorToBirssFrame } from '../testUtils/birssFrame.js';
import { matrixRank, satisfies } from '../testUtils/rank.js';
import { tensorForm, type TensorKind, type TensorRank } from './tensorForm.js';

const RANKS: TensorRank[] = [0, 1, 2, 3, 4];
const PARITIES: TensorKind[] = ['polar', 'axial'];

function printedRelations(rank: TensorRank, letter: string): Relation[] {
  if (rank === 3) return relations4e(letter);
  if (rank === 4) return relations4f(letter);
  return relationsLowRank(rank, letter);
}

/** The form of the ITC default setting: its basis carried into Birss's frame. */
const birssForm = (key: string, rank: TensorRank, parity: TensorKind, timeParity: 'even' | 'odd' = 'even') => {
  const form = tensorForm(key as PointGroupKey, { rank, kind: parity, timeParity, intrinsic: 'none' });
  return { ...form, basis: form.basis.map((b) => tensorToBirssFrame(key, b, rank)) };
};

describe('Birss Tables 4a–4f: the transcriptions as read', () => {
  it('Table 4a lists the 32 classes, by their keys', () => {
    expect(CLASS_ROWS.map((r) => r.key).sort()).toEqual([...POINT_GROUP_KEYS].sort());
  });

  it('Tables 4b–4f each have the 21 symbol classes A–U', () => {
    for (const t of [T4B, T4C, T4D, T4E]) expect(t.size).toBe(21);
    expect(T4F_ROW_COUNTS).toEqual([21, 21]);
  });
});

describe("Birss Tables 4b–4f: tensor forms of the ITC default setting, in Birss's frame", () => {
  for (const row of CLASS_ROWS) {
    it(`${row.key}: ranks 0–4, polar and axial`, () => {
      for (const rank of RANKS) {
        for (const parity of PARITIES) {
          const what = `${row.key} rank ${rank} ${parity}`;
          const form = birssForm(row.key, rank, parity);
          const letter = symbolClass(row, rank, parity);
          if (letter === null) {
            expect(form.basis, `${what}: Table 4a blank, the tensor vanishes`).toHaveLength(0);
            continue;
          }
          const dim = 3 ** rank;
          const rows = relationRows(printedRelations(rank, letter), dim);
          expect(satisfies(form.basis, rows), `${what} [${letter}]: violates a printed relation`).toBe(true);
          expect(form.basis.length, `${what} [${letter}]: number of independent components`).toBe(
            dim - matrixRank(rows, dim),
          );
        }
      }
    });
  }

  it('c-tensors equal i-tensors for all 32 classes (no time reversal)', () => {
    for (const row of CLASS_ROWS) {
      for (const rank of RANKS) {
        for (const parity of PARITIES) {
          expect(birssForm(row.key, rank, parity, 'odd'), `${row.key} rank ${rank} ${parity}`).toEqual(
            birssForm(row.key, rank, parity, 'even'),
          );
        }
      }
    }
  });
});
