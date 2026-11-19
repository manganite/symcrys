/**
 * Tensor forms in the Birss convention against birss-app (behavioural pins, fixture class (c)): in
 * its Birss mode symcrys gives what birss-app gives, the free parameters included, by name (their
 * components) and order (CLAUDE.md, "ITC output in the ITC convention, Birss output in the Birss
 * convention"). The pins are birss-app's forms reduced with its own `rref` (Q0), captured by
 * audit/birss-app; they detect regressions against birss-app and are not a print anchor.
 */

import { describe, expect, it } from 'vitest';
import { settings, type PointGroupKey } from '../pointGroups/pointGroups.js';
import { BIRSS_APP_REVISION, BIRSS_APP_TENSOR_CLASSES, BIRSS_APP_TENSOR_REVISION } from '../testUtils/birssAppPins.js';
import { tensorForm } from './tensorForm.js';

const TOL = 1e-9;

const indicesOf = (flat: number, rank: number): number[] =>
  Array.from({ length: rank }, (_, k) => Math.floor(flat / 3 ** (rank - 1 - k)) % 3);

describe('tensor forms in the Birss convention = birss-app (pins)', () => {
  it('come from the same birss-app revision as the point-group pins', () => {
    expect(BIRSS_APP_TENSOR_REVISION).toBe(BIRSS_APP_REVISION);
  });

  it('cover the 32 classes, all their settings and 26 specifications each', () => {
    expect(BIRSS_APP_TENSOR_CLASSES).toHaveLength(32);
    for (const c of BIRSS_APP_TENSOR_CLASSES) {
      expect(settings(c.key as PointGroupKey, 'birss').map((s) => s.index)).toEqual(c.settings.map((s) => s.setting));
      for (const s of c.settings) expect(s.forms).toHaveLength(26);
    }
  });

  for (const c of BIRSS_APP_TENSOR_CLASSES) {
    it(`${c.key}: basis and free parameters in every setting`, () => {
      for (const s of c.settings) {
        for (const pin of s.forms) {
          const what = `${c.key} setting ${s.setting} rank ${pin.rank} ${pin.parity} ${pin.intrinsic}`;
          const form = tensorForm(
            c.key as PointGroupKey,
            { rank: pin.rank, parity: pin.parity, timeParity: 'i', intrinsic: pin.intrinsic },
            { convention: 'birss', setting: s.setting },
          );
          expect(form.parameters, `${what}: parameters`).toEqual(pin.parameters.map((p) => indicesOf(p, pin.rank)));
          expect(form.basis.length, `${what}: number of parameters`).toBe(pin.basis.length);
          pin.basis.forEach((row, k) => {
            const want = new Array<number>(3 ** pin.rank).fill(0);
            for (const [i, v] of row) want[i] = v;
            form.basis[k].forEach((x, i) =>
              expect(Math.abs(x - want[i]), `${what}: basis[${k}][${i}]`).toBeLessThan(TOL),
            );
          });
        }
      }
    });
  }
});
