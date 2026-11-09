/**
 * ITC short symbols of every setting of the 32 crystal classes, with their sources. Expected values
 * for itc.reference.test.ts; independent of the library data (CLAUDE.md, "Anti-circularity").
 *
 * Fixture classes (CLAUDE.md, "Correctness and provenance"):
 * - (a) printed: the symbol appears in the cited table (re-parsed by itc.reference.test.ts, which
 *   fails if a row cited here is missing from the transcription);
 * - (b) derived: the symbol follows from the rule for Hermann–Mauguin symbols in ITA (5th ed.,
 *   § 2.2.4.1, printed p. 18): positions follow the symmetry directions of Table 2.1.3.1 (5th ed.
 *   Table 2.2.4.1), '1' marks a direction without symmetry, and the monoclinic full symbols 1 2 1
 *   and 1 1 2 name the unique axis b and c.
 *
 * `standard` marks ITC's standard setting where a class has several:
 * - monoclinic b-unique: ITA (5th ed.) § 2.2.3, printed p. 17, adopts the b-axis setting for the
 *   standard short symbol;
 * - 321 and 3m1 (twofold axes or mirror normals along a = x): ITC Vol. D, § 1.1.4.10.4.4 (group
 *   32: twofold axis parallel to Ox₁; group 3m: mirror perpendicular to Ox₁), as recorded on #6;
 * - -3m1 and -6m2: ITC Vol. D Table 1.5.2.3 (full symbol -3 2/m 1; -6m2), as transcribed in
 *   birss-tables, and the key decision on #13. ITA Table 2.1.1.1 prints D3h as -62m (see
 *   docs/conventions.md, "Keys").
 */

export type Source = 'table-3.2.2.2' | 'vol-a-table-2.1.1.1' | 'derived';

export interface ItcSettingFixture {
  readonly short: string;
  readonly uniqueAxis?: 'a' | 'b' | 'c';
  readonly standard: boolean;
  readonly source: Source;
}

const one = (short: string, source: Source = 'vol-a-table-2.1.1.1'): ItcSettingFixture[] => [
  { short, standard: true, source },
];

export const ITC_SETTINGS: Record<string, ItcSettingFixture[]> = {
  '1': one('1'),
  '-1': one('-1'),
  '2': [
    { short: '2', uniqueAxis: 'b', standard: true, source: 'table-3.2.2.2' },
    { short: '2', uniqueAxis: 'c', standard: false, source: 'table-3.2.2.2' },
  ],
  m: [
    { short: 'm', uniqueAxis: 'b', standard: true, source: 'table-3.2.2.2' },
    { short: 'm', uniqueAxis: 'c', standard: false, source: 'table-3.2.2.2' },
  ],
  '2/m': [
    { short: '2/m', uniqueAxis: 'b', standard: true, source: 'derived' },
    { short: '2/m', uniqueAxis: 'c', standard: false, source: 'derived' },
  ],
  '222': one('222'),
  mm2: [
    { short: 'mm2', uniqueAxis: 'c', standard: true, source: 'table-3.2.2.2' },
    { short: '2mm', uniqueAxis: 'a', standard: false, source: 'derived' },
    { short: 'm2m', uniqueAxis: 'b', standard: false, source: 'derived' },
  ],
  mmm: one('mmm'),
  '4': one('4'),
  '-4': one('-4'),
  '4/m': one('4/m'),
  '422': one('422'),
  '4mm': one('4mm'),
  '-42m': [
    { short: '-42m', standard: true, source: 'table-3.2.2.2' },
    { short: '-4m2', standard: false, source: 'table-3.2.2.2' },
  ],
  '4/mmm': one('4/mmm'),
  '3': one('3'),
  '-3': one('-3'),
  '32': [
    { short: '321', standard: true, source: 'table-3.2.2.2' },
    { short: '312', standard: false, source: 'table-3.2.2.2' },
  ],
  '3m': [
    { short: '3m1', standard: true, source: 'table-3.2.2.2' },
    { short: '31m', standard: false, source: 'table-3.2.2.2' },
  ],
  '-3m': [
    { short: '-3m1', standard: true, source: 'derived' },
    { short: '-31m', standard: false, source: 'derived' },
  ],
  '6': one('6'),
  '-6': one('-6'),
  '6/m': one('6/m'),
  '622': one('622'),
  '6mm': one('6mm'),
  '-6m2': [
    { short: '-6m2', standard: true, source: 'table-3.2.2.2' },
    { short: '-62m', standard: false, source: 'table-3.2.2.2' },
  ],
  '6/mmm': one('6/mmm'),
  '23': one('23'),
  'm-3': one('m-3'),
  '432': one('432'),
  '-43m': one('-43m'),
  'm-3m': one('m-3m'),
};
