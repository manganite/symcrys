/**
 * ITC symbols of every setting of the 32 crystal classes, with their sources. Expected values for
 * itc.reference.test.ts; independent of the library data (CLAUDE.md, "Anti-circularity").
 *
 * Sources of a symbol (`shortSource`, `fullSource`), by fixture class (CLAUDE.md, "Correctness and
 * provenance"):
 * - (a) `vol-a-table-3.2.3.2`: printed in the headline of the entry in ITA (6th ed.) Table 3.2.3.2,
 *   pp. 745–769; itc.reference.test.ts re-parses references/itc/vol-a-table-3.2.3.2-headlines.md
 *   and fails if a cited symbol is missing. Where the table prints no full symbol, the full symbol
 *   is the short one ("if different", § 3.2.1.2.1, p. 721).
 * - (a) `vol-d-table-1.5.2.3`: ITC Vol. D Table 1.5.2.3 (full Hermann–Mauguin symbols), as
 *   transcribed in manganite/birss-tables (`tools/generate_nomenclature.py`); not yet in
 *   references/ and so not re-parsed: it comes with the magnetic groups (#13).
 * - (b) `derived`: follows from the rule for Hermann–Mauguin symbols, ITA (6th ed.) § 2.1.3.4,
 *   p. 151: positions follow the symmetry directions of Table 2.1.3.1, '1' marks a direction
 *   without symmetry; the monoclinic full symbols 1 2 1 and 1 1 2 name the unique axis b and c
 *   (ITA 5th ed. § 2.2.4.1 (ii), p. 18).
 *
 * `standard` marks the setting symcrys takes as ITC default where a class has several, from
 * `standardSource`; no test re-parses it. ITA describes both orientations of these classes without
 * naming one standard (§ 3.2.1.2.1 (a)–(d), p. 721):
 * - monoclinic unique axis b: ITA (6th ed.) § 2.1.3.3, p. 151, adopts the short symbol of the b-axis
 *   setting as the standard symbol of a monoclinic space-group type;
 * - 321 and 3m1 (twofold axes or mirror normals along a = x): ITC Vol. D § 1.1.4.10.4.4 (group 32:
 *   twofold axis parallel to Ox₁; group 3m: mirror perpendicular to Ox₁), as recorded on #6; -3m1
 *   (full -3 2/m 1) likewise, its Laue class;
 * - -6m2: ITC Vol. D Table 1.5.2.3 and the key decision on #13. ITA Tables 2.1.1.1, 3.2.1.2 and
 *   3.2.2.1 name the class -62m; open question, #17.
 */

export type Source = 'vol-a-table-3.2.3.2' | 'vol-d-table-1.5.2.3' | 'derived';

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

const A3232 = 'vol-a-table-3.2.3.2';
const D1523 = 'vol-d-table-1.5.2.3';
const DERIVED = 'derived';

/** A setting printed with its short (and, if different, full) symbol in ITA Table 3.2.3.2. */
const printed = (short: string, full: string = short, standard = true, standardSource?: string): ItcSettingFixture =>
  standardSource
    ? { short, full, standard, shortSource: A3232, fullSource: A3232, standardSource }
    : { short, full, standard, shortSource: A3232, fullSource: A3232 };

const B_UNIQUE = 'ITA (6th ed.) § 2.1.3.3, p. 151';
const VOL_D_1_1_4 = 'ITC Vol. D § 1.1.4.10.4.4 (#6)';
const VOL_D_1_5_2_3 = 'ITC Vol. D Table 1.5.2.3 (#13; open, #17)';

function monoclinic(short: string, fullB: string, fullC: string): ItcSettingFixture[] {
  return [
    {
      short,
      full: fullB,
      uniqueAxis: 'b',
      standard: true,
      shortSource: A3232,
      fullSource: D1523,
      standardSource: B_UNIQUE,
    },
    { short, full: fullC, uniqueAxis: 'c', standard: false, shortSource: A3232, fullSource: DERIVED },
  ];
}

export const ITC_SETTINGS: Record<string, ItcSettingFixture[]> = {
  '1': [printed('1')],
  '-1': [printed('-1')],
  '2': monoclinic('2', '121', '112'),
  m: monoclinic('m', '1m1', '11m'),
  '2/m': monoclinic('2/m', '1 2/m 1', '1 1 2/m'),
  '222': [printed('222')],
  mm2: [
    { ...printed('mm2'), uniqueAxis: 'c' },
    { short: '2mm', full: '2mm', uniqueAxis: 'a', standard: false, shortSource: DERIVED, fullSource: DERIVED },
    { short: 'm2m', full: 'm2m', uniqueAxis: 'b', standard: false, shortSource: DERIVED, fullSource: DERIVED },
  ],
  mmm: [printed('mmm', '2/m 2/m 2/m')],
  '4': [printed('4')],
  '-4': [printed('-4')],
  '4/m': [printed('4/m')],
  '422': [printed('422')],
  '4mm': [printed('4mm')],
  '-42m': [printed('-42m'), printed('-4m2', '-4m2', false)],
  '4/mmm': [printed('4/mmm', '4/m 2/m 2/m')],
  '3': [printed('3')],
  '-3': [printed('-3')],
  '32': [printed('321', '321', true, VOL_D_1_1_4), printed('312', '312', false)],
  '3m': [printed('3m1', '3m1', true, VOL_D_1_1_4), printed('31m', '31m', false)],
  '-3m': [printed('-3m1', '-3 2/m 1', true, VOL_D_1_1_4), printed('-31m', '-3 1 2/m', false)],
  '6': [printed('6')],
  '-6': [printed('-6')],
  '6/m': [printed('6/m')],
  '622': [printed('622')],
  '6mm': [printed('6mm')],
  '-6m2': [printed('-6m2', '-6m2', true, VOL_D_1_5_2_3), printed('-62m', '-62m', false)],
  '6/mmm': [printed('6/mmm', '6/m 2/m 2/m')],
  '23': [printed('23')],
  'm-3': [printed('m-3', '2/m -3')],
  '432': [printed('432')],
  '-43m': [printed('-43m')],
  'm-3m': [printed('m-3m', '4/m -3 2/m')],
};
