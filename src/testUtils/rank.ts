/**
 * Rank of a set of vectors, by Gaussian elimination with partial pivoting (test-only code). Kept
 * apart from the library's row reduction, so that the expected dimensions of the print tests do
 * not rest on the code under test.
 */

export function matrixRank(vectors: readonly (readonly number[])[], dim: number): number {
  const m = vectors.map((v) => [...v]);
  let rank = 0;
  for (let c = 0; c < dim && rank < m.length; c++) {
    let p = rank;
    for (let r = rank + 1; r < m.length; r++) if (Math.abs(m[r][c]) > Math.abs(m[p][c])) p = r;
    if (Math.abs(m[p][c]) < 1e-7) continue;
    [m[rank], m[p]] = [m[p], m[rank]];
    for (let r = 0; r < m.length; r++) {
      if (r === rank) continue;
      const f = m[r][c] / m[rank][c];
      if (f !== 0) for (let j = 0; j < dim; j++) m[r][j] -= f * m[rank][j];
    }
    rank++;
  }
  return rank;
}

/** True if every vector of `basis` satisfies every row (r·v = 0 within `tol`). */
export function satisfies(
  basis: readonly (readonly number[])[],
  rows: readonly (readonly number[])[],
  tol = 1e-6,
): boolean {
  return basis.every((v) => rows.every((r) => Math.abs(r.reduce((s, a, i) => s + a * v[i], 0)) < tol));
}
