/**
 * Freezing of results: every result of the API is frozen, nested arrays and objects included
 * (#137 C4), so that a caller who wants to change one copies it. Internal.
 */

/** `value`, frozen with everything it holds (plain arrays and objects). */
export function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const v of Object.values(value)) deepFreeze(v);
    Object.freeze(value);
  }
  return value;
}
