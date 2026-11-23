/**
 * Tolerant reading of symbols (#96): the spellings of the overbar, the prime and the Schoenflies
 * subscripts that occur in print, on the web and in pasted text, brought to the one spelling of
 * this library before a symbol is compared (docs/conventions.md, "Reading symbols"). A pure
 * normalisation: it changes how a symbol is written, never which symbol it is. Internal; shared by
 * the entry points.
 */

/** Combining overbar (U+0304) and combining overline (U+0305), written after the digit they mark. */
const COMBINING_OVERBAR = /(\d)[̄̅]/g;

/**
 * An overbar written as a word: `bar3`, `bar{3}`, and LaTeX `\bar{3}`, `\bar 3`, `\overline{3}`,
 * each before the digit it marks.
 */
const BAR_WORD = /\\?(?:bar|overline)\s*\{?\s*(\d)\s*\}?/g;

/**
 * Primes: the prime ′ (U+2032), the modifier letter prime ʹ (U+02B9) and the right single quotation
 * mark ’ (U+2019), which text editors put for an apostrophe.
 */
const PRIMES = /[′ʹ’]/g;

/** The minus sign − (U+2212) and the hyphens (U+2010, U+2011) as the overbar `-`. */
const MINUS = /[−‐‑]/g;

/** Unicode subscripts of Schoenflies symbols (`C₃ᵥ`, `D₄ₕ`, `Cᵢ`, `Cₛ`). */
const SUBSCRIPTS: Readonly<Record<string, string>> = {
  '₀': '0',
  '₁': '1',
  '₂': '2',
  '₃': '3',
  '₄': '4',
  '₅': '5',
  '₆': '6',
  '₇': '7',
  '₈': '8',
  '₉': '9',
  ₕ: 'h',
  ᵥ: 'v',
  ᵢ: 'i',
  ₛ: 's',
};
const SUBSCRIPT = new RegExp(`[${Object.keys(SUBSCRIPTS).join('')}]`, 'g');

/**
 * A symbol in the spelling of this library, its spaces normalized (trimmed, every run one space):
 * overbars as `-` before the digit, primes as `'`, Schoenflies subscripts as plain characters.
 */
export function normalizeSymbol(text: string): string {
  return text
    .normalize('NFD')
    .replace(COMBINING_OVERBAR, '-$1')
    .replace(BAR_WORD, '-$1')
    .replace(PRIMES, "'")
    .replace(MINUS, '-')
    .replace(SUBSCRIPT, (c) => SUBSCRIPTS[c]!)
    .trim()
    .replace(/\s+/g, ' ');
}

/** A normalized symbol without spaces. */
export function compactSymbol(text: string): string {
  return normalizeSymbol(text).replace(/ /g, '');
}
