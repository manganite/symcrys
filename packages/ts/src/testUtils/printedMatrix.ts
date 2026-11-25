/**
 * Reading a property matrix as print writes it (test-only code): rows separated by `;`, entries by
 * spaces, each entry `0`, a coefficient with its sign and factor (`d14`, `-c25`, `-2Q22`, `p1`) or
 * `1/2(c11-c12)`. Used by the Newnham print checks.
 */

import { matrixRank } from './rank.js';

/** The terms of one printed entry, as pairs of coefficient symbol and factor. */
function terms(cell: string): [string, number][] {
  if (cell === '0') return [];
  const single = /^(-?)(\d*)([A-Za-z]\d{1,2})$/.exec(cell);
  if (single) return [[single[3], (single[1] ? -1 : 1) * Number(single[2] || 1)]];
  const half = /^1\/2\(([A-Za-z]\d{1,2})-([A-Za-z]\d{1,2})\)$/.exec(cell);
  if (half)
    return [
      [half[1], 0.5],
      [half[2], -0.5],
    ];
  throw new Error(`unreadable printed entry ${cell}`);
}

/**
 * The spanning vectors of a printed matrix, one per coefficient symbol, over the entries read row by
 * row.
 */
export function printedSpace(matrix: string): number[][] {
  const cells = matrix
    .split(';')
    .map((row) => row.trim().split(/\s+/))
    .flat();
  const vectors = new Map<string, number[]>();
  cells.forEach((cell, i) => {
    for (const [symbol, factor] of terms(cell)) {
      if (!vectors.has(symbol)) vectors.set(symbol, new Array<number>(cells.length).fill(0));
      vectors.get(symbol)![i] += factor;
    }
  });
  return [...vectors.values()];
}

/** True if the two sets of vectors in `dim` dimensions span the same space. */
export const sameSpace = (a: readonly (readonly number[])[], b: readonly (readonly number[])[], dim: number): boolean =>
  matrixRank(a, dim) === matrixRank(b, dim) && matrixRank([...a, ...b], dim) === matrixRank(a, dim);
