/**
 * ITC symbols of every setting of the 32 crystal classes, with their sources. Expected values for
 * itc.reference.test.ts; independent of the library data (CLAUDE.md, "Anti-circularity").
 *
 * Sources of a symbol (`shortSource`, `fullSource`), by fixture class (CLAUDE.md, "Correctness and
 * provenance"):
 * - (a) `table-3.2.2.2`, `vol-a-table-2.1.1.1`: printed in that table; itc.reference.test.ts
 *   re-parses the transcription in references/itc/ and fails if a cited row is missing;
 * - (a) `vol-d-table-1.5.2.3`: ITC Vol. D Table 1.5.2.3 (full Hermann–Mauguin symbols), as
 *   transcribed in manganite/birss-tables (`tools/generate_nomenclature.py`); not yet in
 *   references/ and so not re-parsed: it comes with the magnetic groups (#13);
 * - (b) `derived`: follows from the rule for Hermann–Mauguin symbols in ITA (5th ed., § 2.2.4.1,
 *   printed p. 18): positions follow the symmetry directions of Table 2.1.3.1 (5th ed. Table
 *   2.2.4.1), '1' marks a direction without symmetry, and the monoclinic full symbols 1 2 1 and
 *   1 1 2 name the unique axis b and c.
 *
 * `standard` marks ITC's standard setting where a class has several, from `standardSource`; no test
 * re-parses it:
 * - monoclinic unique axis b: ITA (5th ed.) § 2.2.3, printed p. 17, adopts the b-axis setting for
 *   the standard short symbol;
 * - 321 and 3m1 (twofold axes or mirror normals along a = x): ITC Vol. D § 1.1.4.10.4.4 (group 32:
 *   twofold axis parallel to Ox₁; group 3m: mirror perpendicular to Ox₁), as recorded on #6;
 * - -3m1 and -6m2: ITC Vol. D Table 1.5.2.3 (full symbols -3 2/m 1 and -6m2) and the key decision
 *   on #13. ITA Table 2.1.1.1 prints D3h as -62m (open question, #17).
 */

export type Source = 'table-3.2.2.2' | 'vol-a-table-2.1.1.1' | 'vol-d-table-1.5.2.3' | 'derived';

export interface ItcSettingFixture {
  readonly short: string;
  /** Full symbol, written as in the source (positions may run together, as in `321`). */
  readonly full: string;
  readonly uniqueAxis?: 'a' | 'b' | 'c';
  readonly standard: boolean;
  readonly shortSource: Source;
  readonly fullSource: Source;
  readonly standardSource?: string;
}

const T3222 = 'table-3.2.2.2';
const A2111 = 'vol-a-table-2.1.1.1';
const D1523 = 'vol-d-table-1.5.2.3';
const DERIVED = 'derived';

/** A class with one setting: short symbol from ITA Table 2.1.1.1, full symbol from Vol. D 1.5.2.3. */
const one = (short: string, full: string): ItcSettingFixture[] => [
  { short, full, standard: true, shortSource: A2111, fullSource: D1523 },
];

const B_UNIQUE = 'ITA (5th ed.) § 2.2.3, p. 17';
const VOL_D_1_1_4 = 'ITC Vol. D § 1.1.4.10.4.4 (#6)';
const VOL_D_1_5_2_3 = 'ITC Vol. D Table 1.5.2.3 (#13)';

export const ITC_SETTINGS: Record<string, ItcSettingFixture[]> = {
  '1': one('1', '1'),
  '-1': one('-1', '-1'),
  '2': [
    {
      short: '2',
      full: '121',
      uniqueAxis: 'b',
      standard: true,
      shortSource: T3222,
      fullSource: D1523,
      standardSource: B_UNIQUE,
    },
    { short: '2', full: '112', uniqueAxis: 'c', standard: false, shortSource: T3222, fullSource: DERIVED },
  ],
  m: [
    {
      short: 'm',
      full: '1m1',
      uniqueAxis: 'b',
      standard: true,
      shortSource: T3222,
      fullSource: D1523,
      standardSource: B_UNIQUE,
    },
    { short: 'm', full: '11m', uniqueAxis: 'c', standard: false, shortSource: T3222, fullSource: DERIVED },
  ],
  '2/m': [
    {
      short: '2/m',
      full: '1 2/m 1',
      uniqueAxis: 'b',
      standard: true,
      shortSource: A2111,
      fullSource: D1523,
      standardSource: B_UNIQUE,
    },
    { short: '2/m', full: '1 1 2/m', uniqueAxis: 'c', standard: false, shortSource: A2111, fullSource: DERIVED },
  ],
  '222': one('222', '222'),
  mm2: [
    { short: 'mm2', full: 'mm2', uniqueAxis: 'c', standard: true, shortSource: T3222, fullSource: D1523 },
    { short: '2mm', full: '2mm', uniqueAxis: 'a', standard: false, shortSource: DERIVED, fullSource: DERIVED },
    { short: 'm2m', full: 'm2m', uniqueAxis: 'b', standard: false, shortSource: DERIVED, fullSource: DERIVED },
  ],
  mmm: one('mmm', '2/m 2/m 2/m'),
  '4': one('4', '4'),
  '-4': one('-4', '-4'),
  '4/m': one('4/m', '4/m'),
  '422': one('422', '422'),
  '4mm': one('4mm', '4mm'),
  '-42m': [
    { short: '-42m', full: '-42m', standard: true, shortSource: T3222, fullSource: D1523 },
    { short: '-4m2', full: '-4m2', standard: false, shortSource: T3222, fullSource: T3222 },
  ],
  '4/mmm': one('4/mmm', '4/m 2/m 2/m'),
  '3': one('3', '3'),
  '-3': one('-3', '-3'),
  '32': [
    {
      short: '321',
      full: '321',
      standard: true,
      shortSource: T3222,
      fullSource: D1523,
      standardSource: VOL_D_1_1_4,
    },
    { short: '312', full: '312', standard: false, shortSource: T3222, fullSource: T3222 },
  ],
  '3m': [
    {
      short: '3m1',
      full: '3m1',
      standard: true,
      shortSource: T3222,
      fullSource: D1523,
      standardSource: VOL_D_1_1_4,
    },
    { short: '31m', full: '31m', standard: false, shortSource: T3222, fullSource: T3222 },
  ],
  '-3m': [
    {
      short: '-3m1',
      full: '-3 2/m 1',
      standard: true,
      shortSource: DERIVED,
      fullSource: D1523,
      standardSource: VOL_D_1_5_2_3,
    },
    { short: '-31m', full: '-3 1 2/m', standard: false, shortSource: DERIVED, fullSource: DERIVED },
  ],
  '6': one('6', '6'),
  '-6': one('-6', '-6'),
  '6/m': one('6/m', '6/m'),
  '622': one('622', '622'),
  '6mm': one('6mm', '6mm'),
  '-6m2': [
    {
      short: '-6m2',
      full: '-6m2',
      standard: true,
      shortSource: T3222,
      fullSource: D1523,
      standardSource: VOL_D_1_5_2_3,
    },
    { short: '-62m', full: '-62m', standard: false, shortSource: T3222, fullSource: T3222 },
  ],
  '6/mmm': one('6/mmm', '6/m 2/m 2/m'),
  '23': one('23', '23'),
  'm-3': one('m-3', '2/m -3'),
  '432': one('432', '432'),
  '-43m': one('-43m', '-43m'),
  'm-3m': one('m-3m', '4/m -3 2/m'),
};
