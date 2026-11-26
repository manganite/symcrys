/**
 * Integer helpers shared by the modules (the one place for them).
 */

/**
 * The greatest common divisor of two integers, not negative; gcd(0, 0) = 0. Throws for a number that
 * is not finite (the loop would not end); every caller passes safe integers.
 */
export function gcd(a: number, b: number): number {
  if (!(Number.isFinite(a) && Number.isFinite(b))) throw new Error(`gcd of ${String(a)} and ${String(b)}`);
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) [x, y] = [y, x % y];
  return x;
}
