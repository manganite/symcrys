/**
 * Checks of what a caller passes in, shared by the entry points (#137 D2): wrong input is a
 * RangeError that names what is wrong, never a TypeError from deep inside the library.
 */

/** A value for an error message; never throws (BigInt, circular objects, functions). */
export function shown(value: unknown): string {
  if (typeof value === 'number') return String(value);
  if (typeof value === 'function') return 'a function';
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

/** The keys of the options of the functions that choose a setting of a point group. */
export const SETTING_KEYS = ['setting', 'axes', 'uniqueAxis'] as const;
/** The key of the options of the functions that compare numbers of a caller. */
export const TOLERANCE_KEYS = ['tolerance'] as const;

/**
 * Throws unless `options` is undefined or a plain object whose keys are all among `keys`: an
 * options argument of the wrong type and a key the function does not know (a misspelling such as
 * `uniqueaxis`, which would otherwise be ignored) are RangeErrors. The option `convention`, removed
 * in 0.11.0, gets a message of its own.
 */
export function checkOptions(options: unknown, keys: readonly string[], what: string): void {
  if (options === undefined) return;
  if (typeof options !== 'object' || options === null || Array.isArray(options)) {
    throw new RangeError(`${what} takes its options as an object { ${keys.join(', ')} }, not ${shown(options)}`);
  }
  const unknown = Object.keys(options).filter((k) => !keys.includes(k));
  if (unknown.includes('convention')) {
    throw new RangeError(
      'The option convention was removed in symcrys 0.11.0: symcrys follows ITC only (CHANGELOG.md, 0.11.0)',
    );
  }
  if (unknown.length > 0) {
    throw new RangeError(
      `${what} takes the options ${keys.join(', ')}, not ${unknown.map((k) => JSON.stringify(k)).join(', ')}`,
    );
  }
}

/** The options restricted to `keys`, for a function that passes part of its options on. */
export function pick<T extends object>(options: T | undefined, keys: readonly string[]): Partial<T> | undefined {
  if (options === undefined) return undefined;
  return Object.fromEntries(Object.entries(options).filter(([k]) => keys.includes(k))) as Partial<T>;
}

/** Throws unless `v` is an array of `length` finite numbers. */
export function checkNumbers(v: unknown, length: number, what: string): asserts v is readonly number[] {
  if (!Array.isArray(v) || v.length !== length || !v.every((x) => typeof x === 'number' && Number.isFinite(x))) {
    throw new RangeError(`${what} must be ${length} finite numbers, not ${shown(v)}`);
  }
}

/** Throws unless `v` is a plain object (not null, not an array). */
export function checkObject(v: unknown, what: string): asserts v is object {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new RangeError(`${what}, not ${shown(v)}`);
}
