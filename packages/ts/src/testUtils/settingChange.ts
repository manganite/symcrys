/**
 * Patterns of a printed setting carried into another setting by a change of basis P (test-only
 * code), with (a′, b′, c′) = (a, b, c)·P (ITA 2016 eq. (1.5.1.4), p. 76): a point x has the
 * coordinates x′ = P⁻¹·x, a face h the indices h′ = h·P. The free parameters of a pattern are
 * coordinates (or indices) themselves and are carried alike, so that each keeps the name of its new
 * axis (`0,y,z` with P of cab becomes `x,0,z`). Linear algebra only, nothing from the library's row
 * reduction or notation, so that a comparison with the library does not rest on the code under test.
 */

import { inverse, mul, type M } from './independentGroups.js';

const transpose = (m: M): M => [0, 1, 2].map((i) => [0, 1, 2].map((j) => m[j][i]));
/** Without −0, so that equal patterns compare equal. */
const clean = (m: M): M => m.map((row) => row.map((x) => x + 0));

/** One component of a pattern (`-x`, `2k`, `0`, `1`) as its coefficients of the letters, or a number. */
function component(text: string, letters: string): { coefficients: number[]; constant: number } {
  const coefficients = [0, 0, 0];
  let constant = 0;
  const terms = text.match(/[+-]?\d*[a-z]|[+-]?\d+/g) ?? [];
  if (terms.join('').replace(/^\+/, '') !== text) throw new Error(`Unreadable component: ${text}`);
  for (const t of terms) {
    const m = /^([+-]?)(\d*)([a-z]?)$/.exec(t);
    if (!m) throw new Error(`Unreadable term: ${t}`);
    const value = (m[1] === '-' ? -1 : 1) * (m[2] === '' ? 1 : Number(m[2]));
    if (m[3] === '') constant += value;
    else {
      const i = letters.indexOf(m[3]);
      if (i < 0) throw new Error(`Unknown letter ${m[3]} in ${text}`);
      coefficients[i] += value;
    }
  }
  return { coefficients, constant };
}

/**
 * A pattern of three components as a matrix (row i: the coefficients of the letters in component
 * i) or, without letters, as a vector.
 */
export function readPattern(pattern: string, letters: string): { matrix?: M; vector?: number[] } {
  const parts = pattern.split(',').map((p) => component(p, letters));
  if (parts.length !== 3) throw new Error(`Not three components: ${pattern}`);
  if (parts.every((p) => p.coefficients.every((c) => c === 0))) return { vector: parts.map((p) => p.constant) };
  if (parts.some((p) => p.constant !== 0)) throw new Error(`A constant beside letters: ${pattern}`);
  return { matrix: parts.map((p) => p.coefficients) };
}

/** A coordinate triplet carried by P: M′ = P⁻¹·M·P. */
export function carryCoordinates(pattern: string, p: M): M {
  const { matrix } = readPattern(pattern, 'xyz');
  if (!matrix) throw new Error(`A point, not a direction: ${pattern}`);
  return clean(mul(mul(inverse(p), matrix), p));
}

/** Miller indices carried by P: as a column, h′ = Pᵀ·h, the parameters alike, F′ = Pᵀ·F·P⁻ᵀ. */
export function carryFace(pattern: string, p: M): { matrix?: M; vector?: number[] } {
  const { matrix, vector } = readPattern(pattern, 'hkl');
  const pt = transpose(p);
  if (vector) return { vector: pt.map((row) => row[0] * vector[0] + row[1] * vector[1] + row[2] * vector[2] + 0) };
  return { matrix: clean(mul(mul(pt, matrix!), inverse(pt))) };
}

/**
 * An oriented site-symmetry symbol of three positions, one per axis, carried by P: position i of the
 * new symbol is the position j of the old one with a′ᵢ = ±aⱼ (P[j][i] ≠ 0).
 */
export function carrySymbol(symbol: string, p: M): string {
  if (symbol === '1') return symbol;
  if (symbol.length !== 3) throw new Error(`Not a symbol of three positions: ${symbol}`);
  return [0, 1, 2]
    .map((i) => {
      const j = [0, 1, 2].filter((k) => p[k][i] !== 0);
      if (j.length !== 1) throw new Error('P is not a signed permutation');
      return symbol[j[0]];
    })
    .join('');
}
