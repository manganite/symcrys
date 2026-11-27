/**
 * The keys of the point groups: the 32 crystal classes (type I), the 32 grey groups (type II) and
 * the 58 black-and-white groups (type III), the 122 magnetic point groups (docs/conventions.md,
 * "Keys"). Their data are in classData.ts and blackWhiteData.ts.
 */

import { IDENTITY } from '../linalg.js';
import type { CartesianOperation } from '../operations.js';

/** Keys of the 32 crystal classes: the ITC short symbol of the class (docs/conventions.md, "Keys"). */
export const POINT_GROUP_KEYS = Object.freeze([
  '1',
  '-1',
  '2',
  'm',
  '2/m',
  '222',
  'mm2',
  'mmm',
  '4',
  '-4',
  '4/m',
  '422',
  '4mm',
  '-42m',
  '4/mmm',
  '3',
  '-3',
  '32',
  '3m',
  '-3m',
  '6',
  '-6',
  '6/m',
  '622',
  '6mm',
  '-6m2',
  '6/mmm',
  '23',
  'm-3',
  '432',
  '-43m',
  'm-3m',
] as const);

/** The key of one of the 32 crystal classes (`POINT_GROUP_KEYS`). */
// `Extract<…, string>` is the same type; written so, the documentation (TypeDoc) names it instead of
// listing the 32 keys at every use.
export type PointGroupKey = Extract<(typeof POINT_GROUP_KEYS)[number], string>;

/** Keys of the 32 grey groups: the key of the crystal class followed by `1'`. */
export type GreyPointGroupKey = `${PointGroupKey}1'`;

/** Keys of the 32 grey groups, in the order of the crystal classes. */
export const GREY_POINT_GROUP_KEYS: readonly GreyPointGroupKey[] = Object.freeze(
  POINT_GROUP_KEYS.map((key): GreyPointGroupKey => `${key}1'`),
);

/**
 * Keys of the 58 black-and-white groups: their ITC short Hermann–Mauguin symbols, in ITC's order
 * (docs/conventions.md, "Keys").
 *
 * @remarks Source: ITC Vol. D (2013), Table 1.5.2.3.
 */
export const BLACK_WHITE_POINT_GROUP_KEYS = Object.freeze([
  "-1'",
  "2'",
  "m'",
  "2'/m'",
  "2/m'",
  "2'/m",
  "2'2'2",
  "m'm'2",
  "2'm'm",
  "mm'm'",
  "m'm'm'",
  "mmm'",
  "4'",
  "-4'",
  "4'/m",
  "4/m'",
  "4'/m'",
  "4'22'",
  "42'2'",
  "4'mm'",
  "4m'm'",
  "-4'2m'",
  "-4'm2'",
  "-42'm'",
  "4'/mmm'",
  "4/mm'm'",
  "4/m'm'm'",
  "4/m'mm",
  "4'/m'm'm",
  "-3'",
  "32'",
  "3m'",
  "-3m'",
  "-3'm'",
  "-3'm",
  "6'",
  "-6'",
  "6'/m'",
  "6/m'",
  "6'/m",
  "6'22'",
  "62'2'",
  "6'mm'",
  "6m'm'",
  "-6'2m'",
  "-6'm2'",
  "-6m'2'",
  "6'/m'mm'",
  "6/mm'm'",
  "6/m'm'm'",
  "6/m'mm",
  "6'/mmm'",
  "m'-3'",
  "4'32'",
  "-4'3m'",
  "m-3m'",
  "m'-3'm'",
  "m'-3'm",
] as const);

/** The key of one of the 58 black-and-white magnetic point groups. */
// `Extract<…, string>`: the same type, named by the documentation (see `PointGroupKey`).
export type BlackWhitePointGroupKey = Extract<(typeof BLACK_WHITE_POINT_GROUP_KEYS)[number], string>;

/** Keys of all 122 magnetic point groups: the 32 crystal classes, the 32 grey groups, the 58 black-and-white groups. */
export type MagneticPointGroupKey = PointGroupKey | GreyPointGroupKey | BlackWhitePointGroupKey;

/**
 * Keys of the 122 magnetic point groups: the 32 crystal classes (white groups), the 32 grey groups
 * and the 58 black-and-white groups, in this order (docs/conventions.md, "Keys").
 */
export const MAGNETIC_POINT_GROUP_KEYS: readonly MagneticPointGroupKey[] = Object.freeze([
  ...POINT_GROUP_KEYS,
  ...GREY_POINT_GROUP_KEYS,
  ...BLACK_WHITE_POINT_GROUP_KEYS,
]);

/** Time reversal alone: the identity combined with time reversal (1'). */
export const TIME_REVERSAL: CartesianOperation = Object.freeze({ cartesian: IDENTITY, timeReversal: true });

/** Schoenflies symbol of a grey group: that of its class with the subscript R (ITC Vol. D, Table 1.5.2.1). */
export const greySchoenflies = (classSymbol: string): string => `${classSymbol}R`;
