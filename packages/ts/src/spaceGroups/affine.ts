/**
 * Exact affine operations of plane and space groups, x' = W·x + w in the lattice basis (ITA
 * notation (W, w)): the matrix W with integer entries and determinant ±1, the translation w with
 * rational components. Written for any dimension d from 1 to 3 (2 for the plane groups, 3 for the
 * space groups). CLAUDE.md, "Plane groups (and later space groups)".
 */

import { shown } from '../checks.js';
import {
  ZERO,
  add,
  checkSafeInteger,
  formatRational,
  isInteger,
  mod1,
  negate,
  parseRational,
  rationalsEqual,
  safeProduct,
  safeSum,
  scale,
  subtract,
  toNumber,
  type Rational,
} from './rational.js';

/** An integer matrix of size d × d, rows first. */
export type IntMatrix = readonly (readonly number[])[];

/** An exact operation (W, w): x' = W·x + w, in the lattice basis. */
export interface ExactOperation {
  /** The linear part W: integer entries; an operation of a group has determinant ±1. */
  readonly matrix: IntMatrix;
  /** The translation part w, one rational per axis. */
  readonly translation: readonly Rational[];
}

/** The plain form of an operation at the API: integer matrix, translation as the nearest doubles. */
export interface PlainOperation {
  /** The linear part W, integer entries, rows first. */
  readonly matrix: number[][];
  /** The translation part w as doubles (1/3 as the nearest double). */
  readonly translation: number[];
}

/**
 * The default bound on the cosets of a closure: no plane group has more than 12 cosets of the
 * integer translations, no space group in its conventional cell more than 192 (Fm-3m: 48 × 4). A
 * closure in a larger cell (a supercell, a subgroup of index k) passes a larger bound.
 */
export const MAX_COSETS = 192;

/** The coordinate names in ITA's coordinate triplets. */
const COORDINATES = ['x', 'y', 'z'] as const;

function checkDimension(d: number): number {
  if (!Number.isInteger(d) || d < 1 || d > 3) {
    throw new RangeError(`The dimension must be 1, 2 or 3, not ${String(d)}`);
  }
  return d;
}

/** The dimension d of an operation; throws unless it is consistent (d = 1 to 3, integer matrix). */
export function dimensionOf(op: ExactOperation): number {
  const d = op.matrix.length;
  if (d < 1 || d > 3 || op.translation.length !== d || op.matrix.some((row) => row.length !== d)) {
    throw new RangeError(`Not an operation of dimension 1 to 3: ${shown(op)}`);
  }
  for (const row of op.matrix) {
    for (const v of row) {
      checkSafeInteger(v, 'A matrix entry');
    }
  }
  return d;
}

/** The identity of dimension d. */
export function identity(d: number): ExactOperation {
  checkDimension(d);
  return {
    matrix: Array.from({ length: d }, (_, i) => Array.from({ length: d }, (_, j) => (i === j ? 1 : 0))),
    translation: Array.from({ length: d }, () => ZERO),
  };
}

/** The pure translation by t, an operation (I, t). */
export function translationOperation(t: readonly Rational[]): ExactOperation {
  return { matrix: identity(t.length).matrix, translation: [...t] };
}

function applyMatrix(m: IntMatrix, v: readonly Rational[]): Rational[] {
  return m.map((row) => row.reduce<Rational>((sum, mij, j) => add(sum, scale(mij, v[j])), ZERO));
}

function multiplyMatrices(a: IntMatrix, b: IntMatrix): number[][] {
  return a.map((row) =>
    b[0].map((_, j) => row.reduce((sum, aik, k) => safeSum(sum, safeProduct(aik, b[k][j])), 0) + 0),
  );
}

/** The determinant of an integer matrix of size 1 to 3. */
export function determinant(m: IntMatrix): number {
  checkDimension(m.length);
  const p = safeProduct;
  if (m.length === 1) return m[0][0];
  if (m.length === 2) return safeSum(p(m[0][0], m[1][1]), -p(m[0][1], m[1][0]));
  const minor = (i: number, j: number, k: number, l: number): number =>
    safeSum(p(m[1][i], m[2][j]), -p(m[1][k], m[2][l]));
  return safeSum(safeSum(p(m[0][0], minor(1, 2, 2, 1)), -p(m[0][1], minor(0, 2, 2, 0))), p(m[0][2], minor(0, 1, 1, 0)));
}

/** The trace of an integer matrix. */
export function trace(m: IntMatrix): number {
  return m.reduce((sum, row, i) => safeSum(sum, row[i]), 0);
}

/** Throws unless det W = ±1, as for every operation of a crystallographic group. */
export function checkUnimodular(op: ExactOperation): void {
  dimensionOf(op);
  const det = determinant(op.matrix);
  if (det !== 1 && det !== -1) {
    throw new RangeError(`Determinant ${det} is not ±1: ${shown(op.matrix)}`);
  }
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
  checkUnimodular(op);
  const d = op.matrix.length;
  const m = op.matrix;
  const det = determinant(m);
  let inv: number[][];
  if (d === 1) {
    inv = [[det]];
  } else if (d === 2) {
    inv = [
      [m[1][1] * det, -m[0][1] * det],
      [-m[1][0] * det, m[0][0] * det],
    ];
  } else {
    // The adjugate divided by det, i.e. multiplied by det = ±1: inv[i][j] = cofactor(j, i).
    const cofactor = (i: number, j: number): number => {
      const r = [0, 1, 2].filter((k) => k !== i);
      const s = [0, 1, 2].filter((k) => k !== j);
      const minor = safeSum(safeProduct(m[r[0]][s[0]], m[r[1]][s[1]]), -safeProduct(m[r[0]][s[1]], m[r[1]][s[0]]));
      return ((i + j) % 2 === 0 ? minor : -minor) * det;
    };
    inv = [0, 1, 2].map((i) => [0, 1, 2].map((j) => cofactor(j, i)));
  }
  inv = inv.map((row) => row.map((v) => v + 0));
  return { matrix: inv, translation: applyMatrix(inv, op.translation).map(negate) };
}

/** The operation with its translation reduced modulo 1 into [0, 1): the representative of its coset. */
export function reduceModLattice(op: ExactOperation): ExactOperation {
  return { matrix: op.matrix, translation: op.translation.map(mod1) };
}

function matricesEqual(a: IntMatrix, b: IntMatrix): boolean {
  return a.length === b.length && a.every((row, i) => row.length === b[i].length && row.every((v, j) => v === b[i][j]));
}

/** True if a and b are the same operation, translation included. */
export function operationsEqual(a: ExactOperation, b: ExactOperation): boolean {
  return (
    matricesEqual(a.matrix, b.matrix) &&
    a.translation.length === b.translation.length &&
    a.translation.every((t, i) => rationalsEqual(t, b.translation[i]))
  );
}

/** True if a and b differ by an integer lattice translation: the same coset of the integer translations. */
export function equalModLattice(a: ExactOperation, b: ExactOperation): boolean {
  return (
    matricesEqual(a.matrix, b.matrix) &&
    a.translation.length === b.translation.length &&
    a.translation.every((t, i) => isInteger(subtract(t, b.translation[i])))
  );
}

/** Options of `closure`. */
export interface ClosureOptions {
  /** The dimension; needed only for an empty list of generators. */
  readonly dimension?: number;
  /** The largest number of cosets allowed, `MAX_COSETS` by default. */
  readonly maxCosets?: number;
}

/**
 * The group generated by `generators` together with the integer translations, as one operation per
 * coset of the integer translations (translations in [0, 1)). The identity comes first, the others
 * in the order in which the closure finds them (breadth first, each found operation multiplied by
 * the generators from the left); this order has no meaning of its own. A centring translation is
 * passed as a generator. Throws if a generator has a determinant other than ±1 or the closure
 * exceeds `maxCosets`, which no crystallographic group in its conventional cell does.
 */
export function closure(generators: readonly ExactOperation[], options: ClosureOptions = {}): ExactOperation[] {
  const d = checkDimension(options.dimension ?? (generators.length > 0 ? dimensionOf(generators[0]) : 0));
  const maxCosets = options.maxCosets ?? MAX_COSETS;
  for (const g of generators) {
    if (dimensionOf(g) !== d) {
      throw new RangeError(`Generators of different dimension: ${d} and ${dimensionOf(g)}`);
    }
    checkUnimodular(g);
  }
  const result: ExactOperation[] = [identity(d)];
  for (let i = 0; i < result.length; i++) {
    for (const g of generators) {
      const product = reduceModLattice(compose(g, result[i]));
      if (!result.some((op) => equalModLattice(op, product))) {
        if (result.length >= maxCosets) {
          throw new RangeError(
            `The closure exceeds ${maxCosets} cosets: the generators form no crystallographic group`,
          );
        }
        result.push(product);
      }
    }
  }
  return result;
}

/**
 * The terms of one coordinate of a triplet. A term is a sign followed by an integer coefficient and
 * a coordinate, or by a rational; only the first term may omit its sign. The terms must cover the
 * whole text, so that a stray sign (`--x`, `x+`) is an error rather than skipped.
 */
const TERM = /([+-]?)(?:(\d*)([xyz])|(\d+(?:\/\d+)?))/y;

/** One row of a coordinate triplet, e.g. `-x+y+1/3`: integer coefficients and a rational constant. */
function parseRow(text: string, d: number, whole: string): { coefficients: number[]; constant: Rational } {
  const coefficients = Array.from({ length: d }, () => 0);
  let constant: Rational = ZERO;
  const s = text.replace(/\s/g, '');
  if (s === '') {
    throw new RangeError(`Empty coordinate in "${whole}"`);
  }
  TERM.lastIndex = 0;
  let first = true;
  while (TERM.lastIndex < s.length) {
    const start = TERM.lastIndex;
    const m = TERM.exec(s);
    if (!m || m.index !== start || (!first && m[1] === '')) {
      throw new RangeError(`Cannot read "${s.slice(start)}" in "${whole}"`);
    }
    first = false;
    const sign = m[1] === '-' ? -1 : 1;
    if (m[3] !== undefined) {
      const k = COORDINATES.indexOf(m[3] as (typeof COORDINATES)[number]);
      if (k >= d) {
        throw new RangeError(`Coordinate ${m[3]} in a ${d}-dimensional triplet "${whole}"`);
      }
      const c = m[2] === '' ? 1 : checkSafeInteger(Number(m[2]), 'A coefficient');
      coefficients[k] = safeSum(coefficients[k], sign * c);
    } else {
      constant = add(constant, scale(sign, parseRational(m[4])));
    }
  }
  return { coefficients, constant };
}

/**
 * Reads an operation from its coordinate triplet as ITA prints it in the general position, e.g.
 * `-x+1/2,y` (plane) or `-y,x-y,z+1/3` (space), with `-x` for x̄. The dimension is the number of
 * coordinates. Integer coefficients other than ±1 (as in `2x,x` of a Wyckoff position) are read; a
 * group operation is checked for det ±1 where it is used (`closure`, `inverse`).
 */
export function parseOperation(text: string): ExactOperation {
  const parts = text.split(',');
  const d = parts.length;
  if (d > 3) {
    throw new RangeError(`Not a coordinate triplet: "${text}"`);
  }
  const rows = parts.map((p) => parseRow(p, d, text));
  return { matrix: rows.map((r) => r.coefficients), translation: rows.map((r) => r.constant) };
}

/** Writes an operation as ITA prints its coordinate triplet, e.g. `-x+1/2,y`, `x-y,x,z+5/6`. */
export function formatOperation(op: ExactOperation): string {
  dimensionOf(op);
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
    .join(',');
}

/** The operation as plain data for the API: integer matrix, translation as the nearest doubles. */
export function toPlain(op: ExactOperation): PlainOperation {
  return { matrix: op.matrix.map((row) => [...row]), translation: op.translation.map(toNumber) };
}
