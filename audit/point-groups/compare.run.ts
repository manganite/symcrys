/**
 * Point-group comparison: birss-app vs stereography (issue #2).
 *
 * Reads both code bases from sibling checkouts (../birss-app, ../stereography next to this
 * repository), compares the 32 crystallographic point groups in all settings stereography offers,
 * and writes report.md next to this file. Run by hand: npm run audit:point-groups. Not part of the
 * build, the tests or CI (CLAUDE.md, "Hard constraints").
 *
 * What is compared, per stereography entry:
 * - the operations as 3×3 matrices, as sets (order irrelevant, tolerance TOL), after mapping
 *   stereography's Cartesian frame onto birss-app's (FRAME below);
 * - against birss-app in ITC mode (the setting that carries the same symbol in ITC mode) and, for
 *   reference, in Birss mode (the setting that carries the same symbol in Birss mode);
 * - symbols (short and full Hermann–Mauguin, Schoenflies) and derived data (crystal system, Laue
 *   class, centrosymmetric, polar, chiral, piezoelectric).
 */
import { writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'vitest';

// --- stereography (JavaScript)
import { POINT_GROUPS as STEREO_GROUPS, HEX_A, HEX_B, buildPointGroup } from '../../../stereography/js/pointgroups.js';
import { FAMILIEN } from '../../../stereography/js/aufstellungen.js';

// --- birss-app (TypeScript)
import {
  GENERATORS,
  getFullGroup,
  getTransformedGenerators,
  ALTERNATE_SETTINGS,
  isCentrosymmetric,
  type Matrix3x3,
} from '../../../birss-app/src/services/symmetryGroups';
import {
  getDefaultSetting,
  getFrameDisplayName,
  getSettingLabels,
  type Convention,
} from '../../../birss-app/src/services/conventionMapping';
import { POINT_GROUPS as BIRSS_GROUPS } from '../../../birss-app/src/data/pointGroups';
import { FULL_HM } from '../../../birss-app/src/data/groupNotation';
import { isPolar, isChiral, isPiezoelectric, getLaueClass } from '../../../birss-app/src/services/propertyFlags';

type Mat = number[][];
type Vec = [number, number, number];

const TOL = 1e-9;
const here = fileURLToPath(new URL('.', import.meta.url));

// ---------------------------------------------------------------- small linear algebra (own code)

const mul = (a: Mat, b: Mat): Mat =>
  a.map((r, i) => b[0].map((_, j) => r.reduce((s, _x, k) => s + a[i][k] * b[k][j], 0)));
const transpose = (a: Mat): Mat => a[0].map((_, j) => a.map((r) => r[j]));
const columns = (a: Vec, b: Vec, c: Vec): Mat => [0, 1, 2].map((i) => [a[i], b[i], c[i]]);
function inverse(m: Mat): Mat {
  const [[a, b, c], [d, e, f], [g, h, i]] = m;
  const A = e * i - f * h;
  const B = -(d * i - f * g);
  const C = d * h - e * g;
  const det = a * A + b * B + c * C;
  return [
    [A / det, -(b * i - c * h) / det, (b * f - c * e) / det],
    [B / det, (a * i - c * g) / det, -(a * f - c * d) / det],
    [C / det, -(a * h - b * g) / det, (a * e - b * d) / det],
  ];
}
const same = (a: Mat, b: Mat): boolean => a.every((r, i) => r.every((x, j) => Math.abs(x - b[i][j]) < TOL));
const clean = (a: Mat): Mat => a.map((r) => r.map((x) => (Math.abs(x) < TOL ? 0 : x)));
const isOrthogonal = (a: Mat): boolean =>
  same(mul(a, transpose(a)), [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ]);

/** Compare two operation sets; returns how many operations each side has that the other lacks. */
function compareSets(s: Mat[], b: Mat[]): { onlyS: number; onlyB: number } {
  const onlyS = s.filter((x) => !b.some((y) => same(x, y))).length;
  const onlyB = b.filter((y) => !s.some((x) => same(x, y))).length;
  return { onlyS, onlyB };
}

// ---------------------------------------------------------------- frames

/**
 * Lattice basis (columns a, b, c) in each code base's Cartesian frame, trigonal and hexagonal
 * groups. stereography: HEX_A, HEX_B exported by js/pointgroups.js (b ∥ y, a at −30°).
 * birss-app: x ∥ a, y ∥ [120] (BIRSS-ITC-CONVENTION-DIVERGENCES.md § 3), so b at +120°.
 * birss-app's lattice basis is not in its code; it is taken from that document.
 * All other systems: the identity. Orthorhombic, tetragonal and cubic: x ∥ a, y ∥ b, z ∥ c in both
 * (stereography header of js/pointgroups.js; birss-app § 3). Monoclinic and triclinic: birss-app
 * uses y ∥ b* (§ 3); the operation sets are invariant under rotations about the unique axis, so the
 * identity is exact for them.
 *
 * Limit: every trigonal and hexagonal point group is invariant under a 60° rotation about z, so
 * the operations confirm R only modulo 60° (a −30° rotation gives the same result). Sign and size
 * of R rest on the two documented bases.
 */
const S3 = Math.sqrt(3);
const STEREO_HEX_BASIS = columns(HEX_A as Vec, HEX_B as Vec, [0, 0, 1]);
const BIRSS_HEX_BASIS = columns([1, 0, 0], [-0.5, S3 / 2, 0], [0, 0, 1]);
/** Maps stereography's Cartesian coordinates onto birss-app's: R = B · S⁻¹. */
const FRAME_HEX = mul(BIRSS_HEX_BASIS, inverse(STEREO_HEX_BASIS));
const IDENTITY: Mat = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];

const frameFor = (hex: boolean | undefined): Mat => (hex ? FRAME_HEX : IDENTITY);
const toBirssFrame = (op: Mat, R: Mat): Mat => clean(mul(mul(R, op), transpose(R)));

// ---------------------------------------------------------------- pairing

/**
 * stereography entry → birss-app group key, and the ITC symbol birss-app shows for the setting
 * that should carry this entry. The pairing is the hypothesis under test: the setting is looked
 * up by that ITC display name, and the operations then decide whether it holds.
 * Monoclinic: birss-app's display name is the same for both settings; the setting is found by
 * birss-app's axis word (b-unique, c-unique).
 */
const PAIRING: Record<string, { key: string; itcName?: string; mono?: 'b' | 'c' }> = {
  '1': { key: '1' },
  '-1': { key: '-1' },
  '2b': { key: '2', mono: 'b' },
  '2c': { key: '2', mono: 'c' },
  mb: { key: 'm', mono: 'b' },
  mc: { key: 'm', mono: 'c' },
  '2/mb': { key: '2/m', mono: 'b' },
  '2/mc': { key: '2/m', mono: 'c' },
  '222': { key: '222' },
  mm2: { key: 'mm2', itcName: 'mm2' },
  mmm: { key: 'mmm' },
  '4': { key: '4' },
  '-4': { key: '-4' },
  '4/m': { key: '4/m' },
  '422': { key: '422' },
  '4mm': { key: '4mm' },
  '-42m': { key: '-42m', itcName: '-42m' },
  '-4m2': { key: '-42m', itcName: '-4m2' },
  '4/mmm': { key: '4/mmm' },
  '3': { key: '3' },
  '-3': { key: '-3' },
  '321': { key: '32', itcName: '32' },
  '312': { key: '32', itcName: '312' },
  '3m1': { key: '3m', itcName: '3m' },
  '31m': { key: '3m', itcName: '31m' },
  '-3m1': { key: '-3m', itcName: '-3m' },
  '-31m': { key: '-3m', itcName: '-31m' },
  '6': { key: '6' },
  '-6': { key: '-6' },
  '6/m': { key: '6/m' },
  '622': { key: '622' },
  '6mm': { key: '6mm' },
  '-6m2': { key: '-6m2', itcName: '-6m2' },
  '-62m': { key: '-6m2', itcName: '-62m' },
  '6/mmm': { key: '6/mmm' },
  '23': { key: '23' },
  'm-3': { key: 'm-3' },
  '432': { key: '432' },
  '-43m': { key: '-43m' },
  'm-3m': { key: 'm-3m' },
};

const settingCount = (key: string): number => (ALTERNATE_SETTINGS[key]?.length ?? 0) + 1;

/** The birss-app setting that carries this stereography entry in ITC mode. */
function itcSetting(id: string): { setting: number; how: string } {
  const p = PAIRING[id];
  if (p.mono) {
    const word = `${p.mono}-unique`;
    const label = getSettingLabels(p.key, 'itc').find((l) => l.axisWord === word);
    if (!label) throw new Error(`birss-app shows no ${word} setting for ${p.key}`);
    return { setting: label.setting, how: word };
  }
  if (p.itcName) {
    for (let s = 1; s <= settingCount(p.key); s++) {
      if (getFrameDisplayName(p.key, s, 'itc').primary === p.itcName) return { setting: s, how: 'ITC name' };
    }
    throw new Error(`birss-app shows no setting named ${p.itcName} for ${p.key} in ITC mode`);
  }
  return { setting: getDefaultSetting(p.key, 'itc'), how: 'only setting' };
}

/**
 * The birss-app setting that carries the same symbol in Birss mode. Where the two conventions
 * attach a symbol to different frames, its operations differ from the ITC ones; that is expected
 * exactly for the groups in BIRSS-ITC-CONVENTION-DIVERGENCES.md § 7B and § 7C.
 * Monoclinic: same short symbol for both settings; Birss's standard is setting 1 (c-unique).
 */
function birssSetting(id: string): number {
  const p = PAIRING[id];
  if (p.mono || !p.itcName) return getDefaultSetting(p.key, 'birss');
  for (let s = 1; s <= settingCount(p.key); s++) {
    if (getFrameDisplayName(p.key, s, 'birss').primary === p.itcName) return s;
  }
  throw new Error(`birss-app shows no setting named ${p.itcName} for ${p.key} in Birss mode`);
}

const birssOps = (key: string, setting: number): Mat[] =>
  getFullGroup(getTransformedGenerators(key, setting), key).map((m: Matrix3x3) => clean(m.m));

// ---------------------------------------------------------------- data from both sides

const SYSTEM_EN: Record<string, string> = {
  triklin: 'Triclinic',
  monoklin: 'Monoclinic',
  orthorhombisch: 'Orthorhombic',
  tetragonal: 'Tetragonal',
  trigonal: 'Trigonal',
  hexagonal: 'Hexagonal',
  kubisch: 'Cubic',
};

interface Row {
  id: string;
  key: string;
  itc: { setting: number; how: string; name: string; isDefault: boolean };
  birssSetting: number;
  order: { s: number; b: number };
  opsItc: { onlyS: number; onlyB: number };
  opsBirss: { onlyS: number; onlyB: number };
  symbols: { sHm: string; sSetting?: string; sFull: string; sSf: string; bFull: string; bSf?: string };
  props: Record<string, { s: string | boolean; b: string | boolean }>;
}

function build(): Row[] {
  if (Object.keys(PAIRING).length !== STEREO_GROUPS.length) throw new Error('PAIRING does not cover stereography');
  return STEREO_GROUPS.map(
    (g: { id: string; hm: string; setting?: string; full: string; sf: string; hex?: boolean }) => {
      const info = buildPointGroup(g.id);
      const R = frameFor(g.hex);
      const sOps = (info.ops as Mat[]).map((op) => toBirssFrame(op, R));
      const { key } = PAIRING[g.id];
      const { setting, how } = itcSetting(g.id);
      const bOpsItc = birssOps(key, setting);
      const bSettingBirss = birssSetting(g.id);
      const bOpsBirss = birssOps(key, bSettingBirss);
      const bRecord = BIRSS_GROUPS.find((r) => r.name === key);
      if (!bRecord) throw new Error(`birss-app has no group ${key}`);
      return {
        id: g.id,
        key,
        itc: {
          setting,
          how,
          name: getFrameDisplayName(key, setting, 'itc').primary,
          isDefault: getDefaultSetting(key, 'itc') === setting,
        },
        birssSetting: bSettingBirss,
        order: { s: sOps.length, b: bOpsItc.length },
        opsItc: compareSets(sOps, bOpsItc),
        opsBirss: compareSets(sOps, bOpsBirss),
        symbols: {
          sHm: g.hm,
          sSetting: g.setting,
          sFull: g.full,
          sSf: g.sf,
          bFull: FULL_HM[key],
          bSf: bRecord.schoenflies,
        },
        props: {
          system: { s: SYSTEM_EN[info.system], b: bRecord.crystalSystem },
          laue: { s: info.laue, b: getLaueClass(key) },
          centro: { s: info.centro, b: isCentrosymmetric(key) },
          polar: { s: info.polar, b: isPolar(key) },
          chiral: { s: info.chiral, b: isChiral(key) },
          piezo: { s: info.piezo, b: isPiezoelectric(key) },
        },
      };
    },
  );
}

// ---------------------------------------------------------------- report

const ok = (x: { onlyS: number; onlyB: number }): string =>
  x.onlyS === 0 && x.onlyB === 0 ? '✓' : `✗ (${x.onlyS}/${x.onlyB})`;
const fmtMat = (m: Mat): string =>
  '[' +
  m.map((r) => r.map((x) => (Math.abs(x) < TOL ? '0' : x.toFixed(4).replace(/\.?0+$/, ''))).join(' ')).join('; ') +
  ']';
/** Commit of a sibling checkout, marked "(uncommitted changes)" when its working tree is dirty. */
function rev(repo: string): string {
  const git = (...args: string[]) =>
    execFileSync('git', ['-C', `${here}../../../${repo}`, ...args], { encoding: 'utf8' }).trim();
  const dirty = git('status', '--porcelain') !== '' ? ' (uncommitted changes)' : '';
  return git('log', '-1', '--format=%h (%cs)') + dirty;
}

/** How many hexagonal-axis entries differ in ITC mode when stereography's frame is mapped by R instead. */
function frameProbe(R: Mat): number {
  return STEREO_GROUPS.filter((g: { id: string; hex?: boolean }) => g.hex).filter((g: { id: string }) => {
    const ops = (buildPointGroup(g.id).ops as Mat[]).map((op) => toBirssFrame(op, R));
    const diff = compareSets(ops, birssOps(PAIRING[g.id].key, itcSetting(g.id).setting));
    return diff.onlyS > 0 || diff.onlyB > 0;
  }).length;
}

function report(rows: Row[]): string {
  const angle = (Math.atan2(FRAME_HEX[1][0], FRAME_HEX[0][0]) * 180) / Math.PI;
  const L: string[] = [];
  L.push('# Point groups: birss-app vs stereography', '');
  L.push(`Generated by \`audit/point-groups/compare.run.ts\` (npm run audit:point-groups), issue #2.`, '');
  L.push(`- birss-app ${rev('birss-app')}`, `- stereography ${rev('stereography')}`, '');
  L.push('## Frames', '');
  L.push(
    `Trigonal and hexagonal: stereography's Cartesian frame maps onto birss-app's by R = ${fmtMat(FRAME_HEX)}, ` +
      `a rotation by ${angle.toFixed(6)}° about z (orthogonal: ${isOrthogonal(FRAME_HEX) ? 'yes' : 'NO'}). ` +
      'stereography puts b ∥ y, birss-app a ∥ x. All other systems: the identity. ' +
      'stereography operations are compared after M → R M Rᵀ. R is computed from the two lattice bases ' +
      "(birss-app's from BIRSS-ITC-CONVENTION-DIVERGENCES.md § 3, as its code holds none). The operations " +
      'confirm R only modulo 60°: every trigonal and hexagonal point group is invariant under a 60° rotation ' +
      `about z. Check in ITC mode: with Rᵀ (−30°) ${frameProbe(transpose(FRAME_HEX))} entries differ, ` +
      `without any rotation ${frameProbe(IDENTITY)}.`,
    '',
  );

  L.push('## Operations', '');
  L.push(
    'One row per stereography entry. "ITC" compares with birss-app in ITC mode (setting found by the ITC symbol birss-app ' +
      'shows, or b-/c-unique for monoclinic); "Birss" with the setting that carries the same symbol in Birss mode ' +
      '(monoclinic: Birss standard, c-unique), so that a difference shows a symbol the two conventions attach to ' +
      'different frames. ✗ (m/n): m operations only in stereography, n only in birss-app.',
    '',
  );
  L.push(
    '| stereography | birss-app key | setting (ITC) | ITC name in birss-app | ITC default? | order S/B | ITC | setting (Birss) | Birss |',
  );
  L.push('|---|---|---|---|---|---|---|---|---|');
  for (const r of rows) {
    L.push(
      `| ${r.id} | ${r.key} | ${r.itc.setting} (${r.itc.how}) | ${r.itc.name} | ${r.itc.isDefault ? 'yes' : 'no'} | ` +
        `${r.order.s}/${r.order.b} | ${ok(r.opsItc)} | ${r.birssSetting} | ${ok(r.opsBirss)} |`,
    );
  }
  L.push('');

  L.push('## Settings', '');
  L.push(
    `stereography offers two settings for: ${Object.values(FAMILIEN)
      .map((f) => (f as string[]).join('/'))
      .join(', ')}, and monoclinic b/c; the first listed is shown first (monoclinic: b).`,
  );
  L.push('');
  L.push(
    'Labels differ, not operations: in ITC mode birss-app names the settings with the short symbols 32, 3m, -3m ' +
      'where stereography writes 321, 3m1, -3m1.',
  );
  L.push('');
  L.push('| birss-app key | settings (Birss names) | ITC names | default Birss | default ITC |');
  L.push('|---|---|---|---|---|');
  const keys = [...new Set(rows.map((r) => r.key))].filter((k) => settingCount(k) > 1);
  for (const k of keys) {
    const n = settingCount(k);
    const names = (c: Convention) =>
      Array.from({ length: n }, (_, i) => getFrameDisplayName(k, i + 1, c).primary).join(', ');
    L.push(
      `| ${k} | ${names('birss')} | ${names('itc')} | ${getDefaultSetting(k, 'birss')} | ${getDefaultSetting(k, 'itc')} |`,
    );
  }
  L.push('');

  L.push('## Symbols', '');
  L.push(
    '| stereography | HM (setting) | full HM | Schoenflies | birss-app key | full HM (birss-app, setting 1) | Schoenflies |',
  );
  L.push('|---|---|---|---|---|---|---|');
  for (const r of rows) {
    const s = r.symbols;
    const sfMark = s.sSf === s.bSf ? '' : ' ≠';
    L.push(
      `| ${r.id} | ${s.sHm}${s.sSetting ? ` (${s.sSetting})` : ''} | ${s.sFull} | ${s.sSf}${sfMark} | ${r.key} | ${s.bFull ?? '—'} | ${s.bSf ?? '—'} |`,
    );
  }
  L.push('');

  // Overbar: both code bases write it as a leading '-' in data; look for any other spelling.
  const symbolStrings = [
    ...rows.flatMap((r) => [r.id, r.symbols.sHm, r.symbols.sSetting ?? '', r.symbols.sFull]),
    ...rows.flatMap((r) => [r.key, r.itc.name, r.symbols.bFull ?? '']),
  ];
  const otherBars = symbolStrings.filter((t) => /\u0305|\u00af|\u0304|\u2212|\\bar|overline/.test(t));
  const barred = symbolStrings.filter((t) => t.includes('-'));
  L.push(
    'Overbar: both code bases write it as a leading `-` in their data (' +
      `${barred.length} of ${symbolStrings.length} symbol strings above contain one; other spellings found: ` +
      `${otherBars.length ? otherBars.join(', ') : 'none'}). The bar on the cubic 3 is kept on both sides (m-3, m-3m). ` +
      "birss-app's full HM symbols are one string per group key, for its setting 1 (c-unique for monoclinic; " +
      'for 32 the string 321 sits on the frame that ITC names 312).',
    '',
  );

  L.push('## Derived data', '');
  const propNames = Object.keys(rows[0].props);
  L.push(`| stereography | ${propNames.join(' | ')} |`);
  L.push(`|---|${propNames.map(() => '---').join('|')}|`);
  for (const r of rows) {
    const cells = propNames.map((p) => {
      const { s, b } = r.props[p];
      return s === b ? String(s) : `✗ S ${String(s)} / B ${String(b)}`;
    });
    L.push(`| ${r.id} | ${cells.join(' | ')} |`);
  }
  L.push('');

  const itcBad = rows.filter((r) => ok(r.opsItc) !== '✓' || r.order.s !== r.order.b);
  const birssDiff = rows.filter((r) => ok(r.opsBirss) !== '✓');
  const propBad = rows.flatMap((r) =>
    propNames.filter((p) => r.props[p].s !== r.props[p].b).map((p) => `${r.id}: ${p}`),
  );
  const sfBad = rows
    .filter((r) => r.symbols.sSf !== r.symbols.bSf)
    .map((r) => `${r.id} (${r.symbols.sSf} / ${r.symbols.bSf})`);
  L.push('## Summary', '');
  L.push(`- Entries compared: ${rows.length} (32 classes, ${rows.length - 32} additional settings).`);
  L.push(
    `- Operations, ITC mode: ${rows.length - itcBad.length} match, ${itcBad.length} differ${itcBad.length ? `: ${itcBad.map((r) => r.id).join(', ')}` : ''}.`,
  );
  L.push(
    `- Operations, Birss mode (same symbol): ${birssDiff.length} differ: ${birssDiff.map((r) => r.id).join(', ') || 'none'}.`,
  );
  L.push(`- Derived data differing: ${propBad.join('; ') || 'none'}.`);
  L.push(`- Schoenflies differing: ${sfBad.join('; ') || 'none'}.`);
  L.push('');
  return L.join('\n');
}

describe('point-group audit', () => {
  it('writes report.md', () => {
    if (!GENERATORS['m-3m']) throw new Error('birss-app GENERATORS not loaded');
    writeFileSync(`${here}report.md`, report(build()));
  });
});
