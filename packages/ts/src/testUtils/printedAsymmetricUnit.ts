/**
 * Reading the block "Asymmetric unit" as ITA prints it for the plane groups (test-only code), e.g.
 * `0 <= x <= 1/2; y <= min(1 - x, (1 + x)/2)`, in the notation of
 * references/itc/vol-a-2016-plane-groups.md: the inequalities a·x + b·y ≤ c in printed order, a
 * double inequality and a `min` giving one each. Used by the reference tests, which compare the
 * stored inequalities of planeGroupData.ts with the print.
 */

import { gcd, safeProduct } from '../integers.js';
import { type Inequality } from '../spaceGroups/planeGroupData.js';
import { ONE, ZERO, add, multiply, parseRational, rational, type Rational } from '../spaceGroups/rational.js';

/** A linear expression c₀ + cx·x + cy·y. */
type Linear = readonly [cx: Rational, cy: Rational, c0: Rational];

const linAdd = (p: Linear, q: Linear): Linear => [add(p[0], q[0]), add(p[1], q[1]), add(p[2], q[2])];
const linScale = (k: Rational, p: Linear): Linear => [multiply(k, p[0]), multiply(k, p[1]), multiply(k, p[2])];
const isConstant = (p: Linear): boolean => p[0][0] === 0 && p[1][0] === 0;

/**
 * Reads a linear expression as ITA prints the bounds of an asymmetric unit: `x`, `2/3`, `1/2 - x`,
 * `(1 + y)/2`, `x/2`, `2x`. Throws on anything else.
 */
function parseLinear(text: string): Linear {
  const s = text.replace(/\s+/g, '');
  let i = 0;
  const fail = (): never => {
    throw new RangeError(`Cannot read the linear expression "${text}"`);
  };
  function number(): Rational | undefined {
    const m = /^\d+(?:\/\d+)?/.exec(s.slice(i));
    if (!m) return undefined;
    i += m[0].length;
    return parseRational(m[0]);
  }
  function factor(): Linear {
    if (s[i] === '(') {
      i++;
      const e = sum();
      if (s[i++] !== ')') fail();
      return e;
    }
    const k = number();
    if (s[i] === 'x' || s[i] === 'y') {
      const v = s[i++];
      const c = k ?? ONE;
      return v === 'x' ? [c, ZERO, ZERO] : [ZERO, c, ZERO];
    }
    if (k === undefined) return fail();
    return [ZERO, ZERO, k];
  }
  function term(): Linear {
    let e = factor();
    while (s[i] === '/') {
      i++;
      const d = number() ?? fail();
      e = linScale(rational(d[1], d[0]), e);
    }
    return e;
  }
  function sum(): Linear {
    let sign = 1;
    if (s[i] === '-' || s[i] === '+') sign = s[i++] === '-' ? -1 : 1;
    let e = linScale(rational(sign), term());
    while (s[i] === '+' || s[i] === '-') {
      const k = s[i++] === '-' ? -1 : 1;
      e = linAdd(e, linScale(rational(k), term()));
    }
    return e;
  }
  const e = sum();
  if (i !== s.length) fail();
  return e;
}

/** p ≤ 0 as an inequality with integer coefficients without a common factor. */
function toInequality(p: Linear): Inequality {
  const lcm = p.reduce((l, r) => safeProduct(l, r[1]) / gcd(l, r[1]), 1);
  const [a, b, c0] = p.map((r) => safeProduct(r[0], lcm / r[1]));
  const g = gcd(gcd(a, b), c0) || 1;
  return [a / g + 0, b / g + 0, -c0 / g + 0];
}

/** Reads the printed block "Asymmetric unit" into its inequalities, in printed order. */
export function parseAsymmetricUnit(text: string): Inequality[] {
  const out: Inequality[] = [];
  for (const clause of text.split(';')) {
    const sides = clause.split('<=').map((side) => {
      const m = /^\s*min\((.*)\)\s*$/.exec(side);
      if (!m) return [parseLinear(side)];
      // min(A, B): split at the comma outside parentheses.
      let depth = 0;
      const inner = m[1];
      for (let k = 0; k < inner.length; k++) {
        if (inner[k] === '(') depth++;
        else if (inner[k] === ')') depth--;
        else if (inner[k] === ',' && depth === 0)
          return [parseLinear(inner.slice(0, k)), parseLinear(inner.slice(k + 1))];
      }
      throw new RangeError(`Cannot read "${side}"`);
    });
    if (sides.length < 2) throw new RangeError(`Not an inequality: "${clause}"`);
    for (let k = 0; k + 1 < sides.length; k++) {
      for (const lhs of sides[k]) {
        for (const rhs of sides[k + 1]) {
          const p = linAdd(lhs, linScale(rational(-1), rhs));
          if (isConstant(p)) throw new RangeError(`No variable in "${clause}"`);
          out.push(toInequality(p));
        }
      }
    }
  }
  return out;
}
