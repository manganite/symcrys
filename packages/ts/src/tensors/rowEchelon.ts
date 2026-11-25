/**
 * Row reduction of real vectors (any length): the reduced row echelon form of a spanning set, and
 * the rank. The tolerances are those of birss-app's `linalg.ts`, where the tensor code comes from.
 */

import { ELIMINATION_EPSILON, PIVOT_EPSILON } from '../tolerances.js';

/**
 * The reduced row echelon form of the span of `vectors` (all of length `dim`), with its pivot
 * columns: one row per independent direction, each with a 1 at its pivot and 0 at every other
 * row's pivot, pivots ascending. The rows are unique for a given span, so the pivots name the free
 * parameters unambiguously: each is the lowest-index component that is independent of the ones
 * before it. For operations with float noise a row can keep entries too small to be a pivot
 * (below `PIVOT_EPSILON`, or `pivotThreshold`) before its pivot, so the pivots are returned rather
 * than read off the rows (#88); entries below `ELIMINATION_EPSILON` are set to zero.
 */
export function rowEchelonWithPivots(
  vectors: readonly (readonly number[])[],
  dim: number,
  pivotThreshold = PIVOT_EPSILON,
): { rows: number[][]; pivots: number[] } {
  const m = vectors.map((v) => Array.from(v));
  const pivots: number[] = [];
  let row = 0;
  for (let c = 0; c < dim && row < m.length; c++) {
    let pivot = row;
    for (let r = row + 1; r < m.length; r++) if (Math.abs(m[r][c]) > Math.abs(m[pivot][c])) pivot = r;
    if (Math.abs(m[pivot][c]) < pivotThreshold) continue;
    [m[row], m[pivot]] = [m[pivot], m[row]];
    const p = m[row][c];
    for (let j = 0; j < dim; j++) m[row][j] /= p;
    for (let r = 0; r < m.length; r++) {
      if (r === row || Math.abs(m[r][c]) < ELIMINATION_EPSILON) continue;
      const f = m[r][c];
      for (let j = 0; j < dim; j++) m[r][j] -= f * m[row][j];
    }
    pivots.push(c);
    row++;
  }
  const rows = m.slice(0, row);
  rows.forEach((r, k) => {
    for (let j = 0; j < dim; j++) {
      if (j === pivots[k]) r[j] = 1;
      else if (pivots.includes(j) || Math.abs(r[j]) < ELIMINATION_EPSILON) r[j] = 0;
    }
  });
  return { rows, pivots };
}

/** The reduced row echelon form of the span of `vectors`, as `rowEchelonWithPivots` gives it, without the pivots. */
export function reducedRowEchelon(vectors: readonly (readonly number[])[], dim: number): number[][] {
  return rowEchelonWithPivots(vectors, dim).rows;
}

/** The number of independent vectors among `vectors` (all of length `dim`). */
export function rank(vectors: readonly (readonly number[])[], dim: number): number {
  return reducedRowEchelon(vectors, dim).length;
}
