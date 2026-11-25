/**
 * Integer helpers shared by the modules (the one place for them, #101).
 */

/** The greatest common divisor of two integers, not negative; gcd(0, 0) = 0. */
export function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) [x, y] = [y, x % y];
  return x;
}
