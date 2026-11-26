/**
 * Checks of what a caller passes in, shared by the entry points: wrong input is a
 * RangeError that names what is wrong, never a TypeError from deep inside the library.
 */

/**
 * A value for an error message; never throws: numbers as written (NaN, Infinity), BigInt with its
 * `n`, a function or symbol by its kind, and a value with a cycle as such.
 */
export function shown(value: unknown): string {
  if (typeof value === 'number') return String(value);
  if (typeof value === 'bigint') return `${value}n`;
  if (typeof value === 'function') return 'a function';
  if (typeof value === 'symbol') return 'a symbol';
  try {
    return (
      JSON.stringify(value, (_, v: unknown) =>
        typeof v === 'bigint'
          ? `${v}n`
          : typeof v === 'symbol'
            ? 'a symbol'
            : typeof v === 'number' && !Number.isFinite(v)
              ? String(v)
              : v,
      ) ?? String(value)
    );
  } catch {
    return 'a value that contains itself';
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
  if (!isPlainObject(options)) {
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

/** True for a plain object: `{ … }` or one without a prototype, not an array, a Map or a Date. */
export function isPlainObject(v: unknown): v is Record<string, unknown> {
  if (typeof v !== 'object' || v === null) return false;
  const proto = Object.getPrototypeOf(v) as unknown;
  return proto === Object.prototype || proto === null;
}

/** Throws unless `v` is a plain object. */
export function checkObject(v: unknown, what: string): asserts v is object {
  if (!isPlainObject(v)) throw new RangeError(`${what}, not ${shown(v)}`);
}
