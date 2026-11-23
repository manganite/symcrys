/**
 * Tolerant reading of symbols (#96): the spellings of the overbar, the prime and the Schoenflies
 * subscripts that occur in print, on the web and in pasted text, brought to the one spelling of
 * this library before a symbol is compared (docs/conventions.md, "Reading symbols"). A pure
 * normalisation: it changes how a symbol is written, never which symbol it is. Internal; shared by
 * the entry points. Characters outside ASCII are written as escapes, so that none is invisible.
 */

/**
 * Combining overbar (U+0304) and combining overline (U+0305), and the macron (U+00AF), as the text
 * layer of the ITA 2016 PDFs gives the overbar, each written after the digit it marks.
 */
const OVERBAR_AFTER = /(\d)[\u0304\u0305\u00AF]/g;

/**
 * An overbar written as a word before the digit it marks: `bar3`, `bar{3}`, and LaTeX's `\bar{3}`,
 * `\bar 3`, `\overline{3}`. A space after the digit is kept.
 */
const BAR_WORD = /\\?(?:bar|overline)\s*(?:\{\s*(\d)\s*\}|(\d))/g;

/**
 * Primes: the prime (U+2032), the modifier letter prime (U+02B9) and the right single quotation
 * mark (U+2019), which text editors put for an apostrophe.
 */
const PRIMES = /[\u2032\u02B9\u2019]/g;

/** The minus sign (U+2212) and the hyphens (U+2010, U+2011) as the overbar `-`. */
const MINUS = /[\u2212\u2010\u2011]/g;

/** Unicode subscripts of Schoenflies symbols: the digits, h, v, i, s. */
const SUBSCRIPTS: ReadonlyMap<string, string> = new Map([
  ['\u2080', '0'],
  ['\u2081', '1'],
  ['\u2082', '2'],
  ['\u2083', '3'],
  ['\u2084', '4'],
  ['\u2085', '5'],
  ['\u2086', '6'],
  ['\u2087', '7'],
  ['\u2088', '8'],
  ['\u2089', '9'],
  ['\u2095', 'h'],
  ['\u1D65', 'v'],
  ['\u1D62', 'i'],
  ['\u209B', 's'],
]);
const SUBSCRIPT = /[\u2080-\u2089\u2095\u1D65\u1D62\u209B]/g;

/** LaTeX subscripts of Schoenflies symbols: `C_{3v}`, `C_3v`. */
const LATEX_SUBSCRIPT = /_\{([^{}]*)\}|_/g;

/**
 * A symbol in the spelling of this library, its spaces normalized (trimmed, every run one space):
 * overbars as `-` before the digit, primes as `'`, Schoenflies subscripts as plain characters
 * (Unicode subscripts, LaTeX's `_{3v}` and `_3`).
 */
export function normalizeSymbol(text: string): string {
  return text
    .normalize('NFD')
    .replace(OVERBAR_AFTER, '-$1')
    .replace(BAR_WORD, (_, braced: string | undefined, bare: string | undefined) => `-${braced ?? bare}`)
    .replace(PRIMES, "'")
    .replace(MINUS, '-')
    .replace(SUBSCRIPT, (c) => SUBSCRIPTS.get(c)!)
    .replace(LATEX_SUBSCRIPT, (_, inner: string | undefined) => inner ?? '')
    .trim()
    .replace(/\s+/g, ' ');
}

/** A normalized symbol without spaces. */
export function compactSymbol(text: string): string {
  return normalizeSymbol(text).replace(/ /g, '');
}
