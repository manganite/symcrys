/**
 * Exact affine operations of plane and space groups, x' = W·x + w in the lattice basis (ITA
 * notation (W, w)): the matrix W with integer entries, the translation w with rational components.
 * Written for any dimension d (2 for the plane groups, 3 for the space groups). CLAUDE.md, "Plane
 * groups (and later space groups)".
 */

import {
  ZERO,
  add,
  equals as rationalsEqual,
  formatRational,
  isInteger,
  mod1,
  negate,
  parseRational,
  rational,
  scale,
  subtract,
  toNumber,
  type Rational,
} from './rational.js';

/** An integer matrix of size d × d, rows first. */
export type IntMatrix = readonly (readonly number[])[];

/** An exact operation (W, w): x' = W·x + w, in the lattice basis. */
export interface ExactOperation {
  /** The linear part W: integer entries, determinant ±1. */
  readonly matrix: IntMatrix;
  /** The translation part w, one rational per axis. */
  readonly translation: readonly Rational[];
}

/**
 * No plane group has more than 12 cosets of the integer translations, no space group in its
 * conventional cell more than 192 (Fm-3m: 48 × 4); a closure beyond this is a data error.
 */
export const MAX_COSETS = 192;

/** The coordinate names in ITA's coordinate triplets. */
const COORDINATES = ['x', 'y', 'z'] as const;

/** The dimension d of an operation; throws unless it is consistent (d = 1 to 3). */
export function dimensionOf(op: ExactOperation): number {
  const d = op.matrix.length;
  if (d < 1 || d > 3 || op.translation.length !== d || op.matrix.some((row) => row.length !== d)) {
    throw new RangeError(`Not a ${d}-dimensional operation: ${JSON.stringify(op)}`);
  }
  for (const row of op.matrix) {
    for (const v of row) {
      if (!Number.isSafeInteger(v)) {
        throw new RangeError(`Matrix entries must be integers, not ${String(v)}`);
      }
    }
  }
  return d;
}

/** The identity of dimension d. */
export function identity(d: number): ExactOperation {
  return {
    matrix: Array.from({ length: d }, (_, i) => Array.from({ length: d }, (_, j) => (i === j ? 1 : 0))),
    translation: Array.from({ length: d }, () => ZERO),
  };
}

/** The pure translation by t. */
export function translation(t: readonly Rational[]): ExactOperation {
  return { matrix: identity(t.length).matrix, translation: [...t] };
}

function applyMatrix(m: IntMatrix, v: readonly Rational[]): Rational[] {
  return m.map((row) => row.reduce<Rational>((sum, mij, j) => add(sum, scale(mij, v[j])), ZERO));
}

function multiplyMatrices(a: IntMatrix, b: IntMatrix): number[][] {
  return a.map((row) => b[0].map((_, j) => row.reduce((sum, aik, k) => sum + aik * b[k][j], 0) + 0));
}

/** The determinant of an integer matrix of size 1 to 3. */
export function determinant(m: IntMatrix): number {
  if (m.length === 1) return m[0][0];
  if (m.length === 2) return m[0][0] * m[1][1] - m[0][1] * m[1][0];
  return (
    m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
    m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
    m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0])
  );
}

/** The trace of an integer matrix. */
export function trace(m: IntMatrix): number {
  return m.reduce((sum, row, i) => sum + row[i], 0);
}

/** The image of the point x (rational coordinates) under the operation, W·x + w. */
export function applyToPoint(op: ExactOperation, x: readonly Rational[]): Rational[] {
  return applyMatrix(op.matrix, x).map((v, i) => add(v, op.translation[i]));
}

/** The product a·b: first b, then a; (W_a, w_a)(W_b, w_b) = (W_a W_b, W_a w_b + w_a). */
export function compose(a: ExactOperation, b: ExactOperation): ExactOperation {
  return {
    matrix: multiplyMatrices(a.matrix, b.matrix),
    translation: applyMatrix(a.matrix, b.translation).map((v, i) => add(v, a.translation[i])),
  };
}

/** The inverse (W⁻¹, −W⁻¹w); throws unless det W = ±1, so that W⁻¹ is an integer matrix. */
export function inverse(op: ExactOperation): ExactOperation {
  const d = dimensionOf(op);
  const m = op.matrix;
  const det = determinant(m);
  if (det !== 1 && det !== -1) {
    throw new RangeError(`Determinant ${det} is not ±1: ${JSON.stringify(m)}`);
  }
  let inv: number[][];
  if (d === 1) {
    inv = [[det]];
  } else if (d === 2) {
    inv = [
      [m[1][1] * det, -m[0][1] * det],
      [-m[1][0] * det, m[0][0] * det],
    ];
  } else {
    // Adjugate divided by det (= multiplied, since det = ±1): inv[i][j] = cofactor(j, i).
    const c = (i: number, j: number): number => {
      const r = [0, 1, 2].filter((k) => k !== i);
      const s = [0, 1, 2].filter((k) => k !== j);
      const minor = m[r[0]][s[0]] * m[r[1]][s[1]] - m[r[0]][s[1]] * m[r[1]][s[0]];
      return ((i + j) % 2 === 0 ? minor : -minor) * det;
    };
    inv = [0, 1, 2].map((i) => [0, 1, 2].map((j) => c(j, i)));
  }
  inv = inv.map((row) => row.map((v) => v + 0));
  return { matrix: inv, translation: applyMatrix(inv, op.translation).map(negate) };
}

/** The operation with its translation reduced modulo 1 into [0, 1): the representative of its coset. */
export function reduce(op: ExactOperation): ExactOperation {
  return { matrix: op.matrix, translation: op.translation.map(mod1) };
}

function matricesEqual(a: IntMatrix, b: IntMatrix): boolean {
  return a.length === b.length && a.every((row, i) => row.length === b[i].length && row.every((v, j) => v === b[i][j]));
}

/** Equal operations (exactly). */
export function equals(a: ExactOperation, b: ExactOperation): boolean {
  return (
    matricesEqual(a.matrix, b.matrix) &&
    a.translation.length === b.translation.length &&
    a.translation.every((t, i) => rationalsEqual(t, b.translation[i]))
  );
}

/** Equal up to an integer lattice translation: the same coset of the integer translations. */
export function equalModLattice(a: ExactOperation, b: ExactOperation): boolean {
  return (
    matricesEqual(a.matrix, b.matrix) &&
    a.translation.length === b.translation.length &&
    a.translation.every((t, i) => isInteger(subtract(t, b.translation[i])))
  );
}

/**
 * The group generated by `generators` together with the integer translations, as one operation per
 * coset of the integer translations (translations in [0, 1)), the identity first and the others in
 * the order in which the closure finds them. A centring translation is passed as a generator.
 * Throws if the closure exceeds `MAX_COSETS`, which no crystallographic group does.
 */
export function closure(
  generators: readonly ExactOperation[],
  d = generators.length > 0 ? dimensionOf(generators[0]) : 0,
): ExactOperation[] {
  if (d < 1) {
    throw new RangeError('The dimension of an empty list of generators must be given');
  }
  for (const g of generators) {
    if (dimensionOf(g) !== d) {
      throw new RangeError(`Generators of different dimension: ${d} and ${dimensionOf(g)}`);
    }
  }
  const result: ExactOperation[] = [identity(d)];
  for (let i = 0; i < result.length; i++) {
    for (const g of generators) {
      const product = reduce(compose(g, result[i]));
      if (!result.some((op) => equalModLattice(op, product))) {
        if (result.length >= MAX_COSETS) {
          throw new RangeError(
            `The closure exceeds ${MAX_COSETS} cosets: the generators form no crystallographic group`,
          );
        }
        result.push(product);
      }
    }
  }
  return result;
}

/** One row of a coordinate triplet, e.g. `-x+y+1/3`: integer coefficients and a rational constant. */
function parseRow(text: string, d: number, whole: string): { coefficients: number[]; constant: Rational } {
  const coefficients = Array.from({ length: d }, () => 0);
  let constant: Rational = ZERO;
  const terms = text.replace(/\s/g, '').match(/[+-]?[^+-]+/g);
  if (!terms) {
    throw new RangeError(`Empty coordinate in "${whole}"`);
  }
  for (const term of terms) {
    const m = /^([+-]?)(\d*)([xyz]?)$/.exec(term) ?? /^([+-]?)(\d+\/\d+)()$/.exec(term);
    if (!m || (m[2] === '' && m[3] === '')) {
      throw new RangeError(`Cannot read "${term}" in "${whole}"`);
    }
    const sign = m[1] === '-' ? -1 : 1;
    if (m[3] === '') {
      constant = add(constant, scale(sign, parseRational(m[2])));
    } else {
      const k = COORDINATES.indexOf(m[3] as (typeof COORDINATES)[number]);
      if (k >= d) {
        throw new RangeError(`Coordinate ${m[3]} in a ${d}-dimensional triplet "${whole}"`);
      }
      coefficients[k] += sign * (m[2] === '' ? 1 : Number(m[2]));
    }
  }
  return { coefficients, constant };
}

/**
 * Reads an operation from its coordinate triplet as ITA prints it in the general position, e.g.
 * `-x+1/2,y` (plane) or `-y,x-y,z+1/3` (space), with `-x` for x̄. The dimension is the number of
 * coordinates.
 */
export function parseOperation(text: string): ExactOperation {
  const parts = text.split(',');
  const d = parts.length;
  if (d < 1 || d > 3) {
    throw new RangeError(`Not a coordinate triplet: "${text}"`);
  }
  const rows = parts.map((p) => parseRow(p, d, text));
  return { matrix: rows.map((r) => r.coefficients), translation: rows.map((r) => r.constant) };
}

/** Writes an operation as ITA prints its coordinate triplet, e.g. `-x+1/2,y`, `x-y,x,z+5/6`. */
export function formatOperation(op: ExactOperation): string {
  const d = dimensionOf(op);
  return op.matrix
    .map((row, i) => {
      let s = '';
      row.forEach((c, j) => {
        if (c === 0) return;
        const name = COORDINATES[j];
        const magnitude = Math.abs(c) === 1 ? name : `${Math.abs(c)}${name}`;
        s += c < 0 ? `-${magnitude}` : s === '' ? magnitude : `+${magnitude}`;
      });
      const t = op.translation[i];
      if (t[0] !== 0) {
        const f = formatRational(t);
        s += t[0] < 0 || s === '' ? f : `+${f}`;
      }
      return s === '' ? '0' : s;
    })
    .slice(0, d)
    .join(',');
}

/** The operation as plain data for the API: integer matrix, translation as the nearest doubles. */
export function toPlain(op: ExactOperation): { matrix: number[][]; translation: number[] } {
  return { matrix: op.matrix.map((row) => [...row]), translation: op.translation.map(toNumber) };
}

/** A rational from a plain number with a denominator up to `maxDenominator` (12 by default), or throws. */
export function fromNumber(value: number, maxDenominator = 12): Rational {
  for (let den = 1; den <= maxDenominator; den++) {
    const num = Math.round(value * den);
    if (Math.abs(num / den - value) < 1e-9) {
      return rational(num, den);
    }
  }
  throw new RangeError(`${value} is no fraction with a denominator up to ${maxDenominator}`);
}
