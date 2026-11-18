/**
 * The Birss convention against birss-app (behavioural pins, fixture class (c)): in its Birss mode
 * symcrys gives what birss-app shows (maintainer, 2026-11-18; docs/conventions.md, "Birss
 * convention and birss-app"). The pins are captured from birss-app by audit/birss-app; they detect
 * regressions against birss-app's behaviour and are not a print anchor.
 *
 * Per class and setting: the generators and the operations in birss-app's order, the Birss symbol
 * and default setting, the property flags, and the operation symbols birss-app writes, rebuilt here
 * from `describeOperations` with birss-app's labelling rules (`birssAppSymbol` below), so that the
 * description carries exactly what birss-app's strings say.
 */

import { describe, expect, it } from 'vitest';
import type { Vec3 } from '../linalg.js';
import { BIRSS_APP_CLASSES } from './birssApp.pins.fixtures.js';
import { describeOperations, type OperationDescription } from './elements.js';
import { isCentrosymmetric, isChiral, isPolar, laueClass } from './properties.js';
import { generators, operations, settings, symbol, type PointGroupKey } from './pointGroups.js';

const TOL = 1e-9;
const sameMatrix = (a: readonly (readonly number[])[], b: readonly (readonly number[])[]) =>
  a.every((r, i) => r.every((x, j) => Math.abs(x - b[i][j]) < TOL));

/** birss-app's axis label (formatMatrixSymbol, formatAxis) for an axis it has already normalised. */
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

describe('Birss convention = birss-app (pins)', () => {
  it('covers the 32 classes and all their settings', () => {
    expect(BIRSS_APP_CLASSES).toHaveLength(32);
    for (const c of BIRSS_APP_CLASSES) {
      expect(settings(c.key as PointGroupKey, 'birss').map((s) => s.index)).toEqual(c.settings.map((s) => s.setting));
    }
  });

  for (const c of BIRSS_APP_CLASSES) {
    const key = c.key as PointGroupKey;
    describe(key, () => {
      it('default setting, symbols and properties', () => {
        expect(settings(key, 'birss').find((s) => s.isDefault)?.index).toBe(c.defaultSetting);
        for (const s of c.settings) expect(symbol(key, { convention: 'birss', setting: s.setting })).toBe(s.symbol);
        expect([isCentrosymmetric(key), isPolar(key), isChiral(key), laueClass(key)]).toEqual([
          c.centrosymmetric,
          c.polar,
          c.chiral,
          c.laueClass,
        ]);
      });

      it.each(c.settings.map((s) => [s.setting, s] as const))('setting %i', (setting, s) => {
        const options = { convention: 'birss', setting } as const;
        const gens = generators(key, options);
        expect(gens).toHaveLength(s.generators.length);
        s.generators.forEach((g, i) => expect(sameMatrix(gens[i].matrix, g)).toBe(true));

        const ops = operations(key, options);
        expect(ops).toHaveLength(s.operations.length);
        s.operations.forEach((o, i) => expect(sameMatrix(ops[i].matrix, o)).toBe(true));

        const symbols = describeOperations(key, options).map(birssAppSymbol);
        expect([...symbols].sort()).toEqual([...s.operationSymbols].sort());
        const generatorSymbols = gens.map((g) => symbols[ops.findIndex((o) => sameMatrix(o.matrix, g.matrix))]);
        expect(generatorSymbols).toEqual(s.generatorSymbols);
      });
    });
  }
});
