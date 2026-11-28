/**
 * Exact rational numbers for the translations of space and plane groups (docs/conventions.md,
 * "Plane groups"). A rational is a pair [numerator, denominator] of safe integers with
 * a positive denominator and no common factor, so that two equal numbers have equal pairs. Every
 * intermediate product is checked: a result outside the safe integers throws instead of rounding.
 */

import { MAX_FRACTION_DEPTH } from '../tolerances.js';
import { shown } from '../checks.js';
import { checkSafeInteger, gcd, safeProduct, safeSum } from '../integers.js';

/** A rational number n/d: d > 0, gcd(n, d) = 1, both safe integers. */
export type Rational = readonly [numerator: number, denominator: number];

/** The rational 0. */
export const ZERO: Rational = [0, 1];

/** The rational 1. */
export const ONE: Rational = [1, 1];

/** The rational n/d in lowest terms; throws if d is 0 or a part is not a safe integer. */
export function rational(numerator: number, denominator = 1): Rational {
  checkSafeInteger(numerator, 'Numerator');
  checkSafeInteger(denominator, 'Denominator');
  if (denominator === 0) {
    throw new RangeError('Denominator must not be 0');
  }
  const g = gcd(numerator, denominator);
  const sign = denominator < 0 ? -1 : 1;
  // `+ 0` turns −0 into 0, so that equal numbers have equal pairs.
  return [(sign * numerator) / g + 0, (sign * denominator) / g];
}

/** The sum a + b. */
export function add(a: Rational, b: Rational): Rational {
  return rational(safeSum(safeProduct(a[0], b[1]), safeProduct(b[0], a[1])), safeProduct(a[1], b[1]));
}

/** The difference a − b. */
export function subtract(a: Rational, b: Rational): Rational {
  return add(a, negate(b));
}

/** The product a·b. */
export function multiply(a: Rational, b: Rational): Rational {
  return rational(safeProduct(a[0], b[0]), safeProduct(a[1], b[1]));
}

/** The product of an integer k and a rational a. */
export function scale(k: number, a: Rational): Rational {
  return rational(safeProduct(k, a[0]), a[1]);
}

/** The negative −a. */
export function negate(a: Rational): Rational {
  return rational(-a[0], a[1]);
}

/** True if a and b are the same number. */
export function rationalsEqual(a: Rational, b: Rational): boolean {
  return a[0] === b[0] && a[1] === b[1];
}

/** True if a is an integer. */
export function isInteger(a: Rational): boolean {
  return a[1] === 1;
}

/** The representative of a modulo 1, in [0, 1). */
export function mod1(a: Rational): Rational {
  const r = ((a[0] % a[1]) + a[1]) % a[1];
  return rational(r, a[1]);
}

/** The nearest double. */
export function toNumber(a: Rational): number {
  return a[0] / a[1];
}

/** Reads a rational as ITA prints it: an integer or a fraction such as `1/2` or `-2/3`. */
export function parseRational(text: string): Rational {
  const m = /^([+-]?\d+)(?:\/(\d+))?$/.exec(text.trim());
  if (!m) {
    throw new RangeError(`Not a rational number: "${text}"`);
  }
  return rational(Number(m[1]), m[2] === undefined ? 1 : Number(m[2]));
}

/** Writes a rational as ITA prints it: `0`, `1`, `-1/2`, `2/3`. */
export function formatRational(a: Rational): string {
  return a[1] === 1 ? String(a[0]) : `${a[0]}/${a[1]}`;
}

/** The largest denominator of a fraction read from a number (`nearestFraction`). */
export const MAX_DENOMINATOR = 12;

/**
 * The fraction with a denominator of at most `MAX_DENOMINATOR` within `tolerance` of a number from
 * a caller, e.g. a translation or an entry of a transformation matrix (`what` names it in the
 * messages). Two such fractions can lie as close as 1/132 (1/11 and 1/12): a value within the
 * tolerance of two different ones is refused, not read as either.
 */
export function nearestFraction(value: unknown, tolerance: number, what: string): Rational {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const found: Rational[] = [];
    for (let d = 1; d <= MAX_DENOMINATOR; d++) {
      for (const n of [Math.floor(value * d), Math.ceil(value * d)]) {
        if (!Number.isSafeInteger(n) || Math.abs(value - n / d) >= tolerance) continue;
        const r = rational(n, d);
        if (!found.some((f) => f[0] === r[0] && f[1] === r[1])) found.push(r);
      }
    }
    if (found.length === 1) return found[0];
    if (found.length > 1) {
      throw new RangeError(
        `The ${what} ${shown(value)} lies within ${tolerance} of ${found.map((f) => `${f[0]}/${f[1]}`).join(' and ')}: pass a smaller tolerance`,
      );
    }
  }
  throw new RangeError(
    `Not within ${tolerance} of a ${what} with a denominator of at most ${MAX_DENOMINATOR}: ${shown(value)}`,
  );
}

/**
 * The simplest fraction (smallest denominator) strictly within `tolerance` of a number from a
 * caller, found by descending the Stern–Brocot tree (continued fractions): unique, and exactly n/d
 * for the double nearest to n/d as long as two fractions of denominators up to d lie more than
 * twice the tolerance apart (d up to about 220 at the tolerance 10⁻⁵). `what` names the number in
 * the messages. Throws a RangeError for a value that is not a finite number, and where the fraction
 * leaves the safe integers.
 */
export function simplestFraction(value: unknown, tolerance: number, what: string): Rational {
  if (!(typeof value === 'number' && Number.isFinite(value))) {
    throw new RangeError(`The ${what} must be a finite number, not ${shown(value)}`);
  }
  const simplest = (lo: number, hi: number, depth: number): Rational => {
    // The simplest fraction in the open interval (lo, hi), lo < hi.
    if (lo < 0 && hi > 0) return ZERO;
    if (hi <= 0) return negate(simplest(-hi, -lo, depth));
    if (depth > MAX_FRACTION_DEPTH)
      throw new RangeError(`The ${what} ${shown(value)} has no fraction within ${tolerance}`);
    const f = Math.floor(lo);
    if (f + 1 < hi) return rational(checkSafeInteger(f + 1, `The ${what}`));
    // lo and hi lie in [f, f + 1]: f + 1/y with y in (1/(hi − f), 1/(lo − f)).
    const inner = simplest(1 / (hi - f), lo === f ? Infinity : 1 / (lo - f), depth + 1);
    return add(rational(checkSafeInteger(f, `The ${what}`)), rational(inner[1], inner[0]));
  };
  return simplest(value - tolerance, value + tolerance, 0);
}
