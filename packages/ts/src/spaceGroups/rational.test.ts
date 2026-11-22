import { describe, expect, it } from 'vitest';
import {
  add,
  equals,
  formatRational,
  isInteger,
  mod1,
  multiply,
  negate,
  parseRational,
  rational,
  scale,
  subtract,
  toNumber,
} from './rational.js';

describe('rational', () => {
  it('keeps lowest terms with a positive denominator, without negative zero', () => {
    expect(rational(2, 4)).toEqual([1, 2]);
    expect(rational(3, -6)).toEqual([-1, 2]);
    expect(rational(-4, -8)).toEqual([1, 2]);
    expect(Object.is(rational(0, -3)[0], 0)).toBe(true);
    expect(rational(0, -3)).toEqual([0, 1]);
  });

  it('refuses a zero denominator and parts that are not safe integers', () => {
    expect(() => rational(1, 0)).toThrow(RangeError);
    expect(() => rational(0.5, 1)).toThrow(RangeError);
    expect(() => rational(Number.MAX_SAFE_INTEGER + 1, 1)).toThrow(RangeError);
    expect(() => rational(Number.NaN, 1)).toThrow(RangeError);
  });

  it('adds, subtracts, multiplies and negates exactly', () => {
    expect(add(rational(1, 3), rational(1, 6))).toEqual([1, 2]);
    expect(subtract(rational(1, 4), rational(3, 4))).toEqual([-1, 2]);
    expect(multiply(rational(2, 3), rational(3, 4))).toEqual([1, 2]);
    expect(scale(-3, rational(1, 6))).toEqual([-1, 2]);
    expect(negate(rational(2, 3))).toEqual([-2, 3]);
    // 1/3 + 1/3 + 1/3 is exactly 1, which floating point gets right only by luck of rounding.
    expect(add(add(rational(1, 3), rational(1, 3)), rational(1, 3))).toEqual([1, 1]);
  });

  it('reduces modulo 1 into [0, 1), also for negative numbers', () => {
    expect(mod1(rational(-1, 3))).toEqual([2, 3]);
    expect(mod1(rational(5, 4))).toEqual([1, 4]);
    expect(mod1(rational(-2, 1))).toEqual([0, 1]);
    expect(mod1(rational(3, 4))).toEqual([3, 4]);
  });

  it('compares, tests integers and converts to a double', () => {
    expect(equals(rational(2, 6), rational(1, 3))).toBe(true);
    expect(equals(rational(1, 3), rational(-1, 3))).toBe(false);
    expect(isInteger(rational(4, 2))).toBe(true);
    expect(isInteger(rational(1, 2))).toBe(false);
    expect(toNumber(rational(1, 4))).toBe(0.25);
  });

  it('reads and writes the fractions as ITA prints them', () => {
    expect(parseRational('1/2')).toEqual([1, 2]);
    expect(parseRational('-2/3')).toEqual([-2, 3]);
    expect(parseRational('+3/4')).toEqual([3, 4]);
    expect(parseRational('2')).toEqual([2, 1]);
    expect(() => parseRational('1/0')).toThrow(RangeError);
    expect(() => parseRational('0.5')).toThrow(RangeError);
    expect(() => parseRational('x')).toThrow(RangeError);
    expect(formatRational(rational(-1, 2))).toBe('-1/2');
    expect(formatRational(rational(0, 5))).toBe('0');
    expect(formatRational(rational(3, 1))).toBe('3');
  });
});
