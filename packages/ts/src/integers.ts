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

/** Throws unless `value` is a safe integer. */
export function checkSafeInteger(value: number, what: string): number {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`${what} must be a safe integer, not ${String(value)}`);
  }
  return value;
}

/** The product a·b of two safe integers; throws if it leaves the safe integers. */
export function safeProduct(a: number, b: number): number {
  return checkSafeInteger(a * b, 'An intermediate product');
}

/** The sum a + b of two safe integers; throws if it leaves the safe integers. */
export function safeSum(a: number, b: number): number {
  return checkSafeInteger(a + b, 'An intermediate sum');
}

/** The sum of the products a[i]·b[i] of two lists of safe integers; throws if a value leaves the safe integers. */
export function safeDot(a: readonly number[], b: readonly number[]): number {
  return a.reduce((sum, x, i) => safeSum(sum, safeProduct(x, b[i])), 0);
}
