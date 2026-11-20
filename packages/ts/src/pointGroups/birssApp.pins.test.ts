/**
 * The Birss convention against birss-app (behavioural pins, fixture class (c)): in its Birss mode
 * symcrys gives what birss-app shows (maintainer, 2026-11-18; docs/conventions.md, "Birss
 * convention and birss-app"). The pins are captured from birss-app by audit/birss-app; they detect
 * regressions against birss-app's behaviour and are not a print anchor.
 *
 * For each of the 122 magnetic point groups (the 32 crystal classes included) and each setting: the
 * generators and the operations in birss-app's order with their time reversal, the Birss symbol
 * and default setting, the type and the crystal class, the property flags, and the operation
 * symbols birss-app writes, rebuilt here from `describeOperations` with birss-app's labelling rules
 * (`birssAppSymbol` below), so that the description carries exactly what birss-app's strings say.
 *
 * birss-app's keys are the Birss short symbols of its default settings; symcrys's keys are ITC
 * short symbols (docs/conventions.md, "Keys"). They differ for two groups, named in
 * `SYMCRYS_KEY` (testUtils/birssAppPins.ts).
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Vec3 } from '../linalg.js';
import { BIRSS_APP_GROUPS, BIRSS_APP_REVISION, SYMCRYS_KEY, birssAppSettings } from '../testUtils/birssAppPins.js';
import { describeOperations, type OperationDescription } from './elements.js';
import { isCentrosymmetric, isChiral, isPolar, laueClass } from './properties.js';
import {
  MAGNETIC_POINT_GROUP_KEYS,
  crystalClassOf,
  generators,
  isMagneticPointGroupKey,
  operations,
  pointGroup,
  settings,
  symbol,
  type MagneticPointGroupKey,
} from './pointGroups.js';

const TOL = 1e-9;
const sameMatrix = (a: readonly (readonly number[])[], b: readonly (readonly number[])[]) =>
  a.every((r, i) => r.every((x, j) => Math.abs(x - b[i][j]) < TOL));

/**
 * birss-app's axis label (formatMatrixSymbol, formatAxis) for an axis it has already normalised.
 * Covers exact crystallographic directions only (one tolerance, no decimal fallback); it throws
 * where birss-app's rules would need more.
 */
function axisLabel(v: Vec3): string {
  const max = Math.max(...v.map(Math.abs));
  const [x, y, z] = v.map((c) => c / max);
  const zero = (c: number) => Math.abs(c) < 1e-6;
  if (!zero(x) ? x < 0 : !zero(y) ? y < 0 : z < 0) throw new Error(`axis ${v.join(',')} not normalised as birss-app`);
  if (zero(y) && zero(z)) return 'x';
  if (zero(x) && zero(z)) return 'y';
  if (zero(x) && zero(y)) return 'z';
  if (zero(z)) {
    let angle = Math.round((Math.atan2(y, x) * 180) / Math.PI);
    if (angle < 0) angle += 180;
    if (angle === 180) angle = 0;
    return `${angle}°`;
  }
  for (let mult = 1; mult <= 6; mult++) {
    const r = [x, y, z].map((c) => c * mult);
    if (r.every((c) => Math.abs(c - Math.round(c)) < 1e-6)) return `[${r.map((c) => Math.round(c)).join('')}]`;
  }
  throw new Error(`axis ${v.join(',')} has no small integer form`);
}

/** The symbol birss-app writes for an operation, rebuilt from symcrys's description of it. */
function birssAppSymbol(d: OperationDescription): string {
  const prime = d.timeReversal ? "'" : '';
  if (d.kind === 'identity') return `1${prime}`;
  if (d.kind === 'inversion') return `-1${prime}`;
  const base = d.kind === 'mirror' ? 'm' : d.kind === 'rotoinversion' ? `-${d.order}` : `${d.order}`;
  const sign = d.sense === '+' ? '⁺' : d.sense === '-' ? '⁻' : '';
  return `${base}_${axisLabel(d.axis!.cartesian)}${sign}${prime}`;
}

/**
 * The symcrys key of a group birss-app names differently: D2h(C2h) and D6h(D3h), whose ITC short
 * symbols (ITC Vol. D Table 1.5.2.3) differ from Birss's (docs/conventions.md, "Keys").
 */
function symcrysKey(birssAppKey: string): MagneticPointGroupKey {
  const key = SYMCRYS_KEY[birssAppKey] ?? birssAppKey;
  if (!isMagneticPointGroupKey(key)) throw new Error(`No symcrys key for birss-app's ${birssAppKey}`);
  return key;
}

describe('Birss convention = birss-app (pins)', () => {
  it('docs/conventions.md names the birss-app revision the pins come from', () => {
    const docs = readFileSync(new URL('../../../../docs/conventions.md', import.meta.url), 'utf8');
    expect(docs).toContain(`birss-app ${BIRSS_APP_REVISION.split(' ')[0]}`);
  });

  it('covers the 122 groups and all their settings', () => {
    expect(BIRSS_APP_GROUPS).toHaveLength(122);
    expect(new Set(BIRSS_APP_GROUPS.map((g) => symcrysKey(g.key)))).toEqual(new Set(MAGNETIC_POINT_GROUP_KEYS));
    expect(BIRSS_APP_GROUPS.filter((g) => g.type === 'I')).toHaveLength(32);
    expect(BIRSS_APP_GROUPS.filter((g) => g.type === 'II')).toHaveLength(32);
    expect(BIRSS_APP_GROUPS.filter((g) => g.type === 'III')).toHaveLength(58);
    for (const g of BIRSS_APP_GROUPS) {
      const key = symcrysKey(g.key);
      expect(
        birssAppSettings(
          key,
          settings(key, 'birss').map((s) => s.index),
        ),
      ).toEqual(g.settings.map((s) => s.setting));
    }
  });

  for (const g of BIRSS_APP_GROUPS) {
    const key = symcrysKey(g.key);
    describe(g.key, () => {
      it('type, crystal class, default settings, symbols and properties', () => {
        expect(pointGroup(key).type).toBe(g.type);
        expect(crystalClassOf(key)).toBe(g.crystalClass);
        expect(settings(key, 'birss').find((s) => s.isDefault)?.index).toBe(g.defaultSetting);
        // The key of birss-app is the Birss symbol of its default setting.
        expect(symbol(key, { convention: 'birss' })).toBe(g.key);
        // birss-app's ITC mode takes the same frame as default as symcrys's ITC convention.
        expect(settings(key, 'itc').find((s) => s.isDefault)?.index).toBe(g.itcDefaultSetting);
        for (const s of g.settings) expect(symbol(key, { convention: 'birss', setting: s.setting })).toBe(s.symbol);
        expect([isCentrosymmetric(key), isPolar(key), isChiral(key), laueClass(key)]).toEqual([
          g.centrosymmetric,
          g.polar,
          g.chiral,
          g.laueClass,
        ]);
      });

      it.each(g.settings.map((s) => [s.setting, s] as const))('setting %i', (setting, s) => {
        const options = { convention: 'birss', setting } as const;
        const gens = generators(key, options);
        expect(gens).toHaveLength(s.generators.length);
        s.generators.forEach((m, i) => expect(sameMatrix(gens[i].matrix, m)).toBe(true));
        expect(gens.map((x) => x.timeReversal)).toEqual(s.generatorTimeReversal);

        const ops = operations(key, options);
        expect(ops).toHaveLength(s.operations.length);
        s.operations.forEach((m, i) => expect(sameMatrix(ops[i].matrix, m)).toBe(true));
        expect(ops.map((x) => x.timeReversal)).toEqual(s.operationTimeReversal);

        const symbols = describeOperations(key, options).map(birssAppSymbol);
        expect([...symbols].sort()).toEqual([...s.operationSymbols].sort());
        const generatorSymbols = gens.map(
          (x) => symbols[ops.findIndex((o) => o.timeReversal === x.timeReversal && sameMatrix(o.matrix, x.matrix))],
        );
        expect(generatorSymbols).toEqual(s.generatorSymbols);
      });
    });
  }
});
