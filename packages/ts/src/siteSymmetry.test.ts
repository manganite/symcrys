/**
 * The site symmetry of a direction under a list of operations against a tolerance (#235): the
 * stabiliser is a subgroup, a tolerance below the accuracy of the operations is refused, and the
 * tolerance measures the distance to the symmetry element. The tests marked `it.fails` fail on
 * 0.15.0 and are the safety net of #234; the fix removes the mark.
 */

import { describe, expect, it } from 'vitest';
import * as classes from './index.js';
import * as magnetic from './magnetic.js';
import type { Mat3, Vec3 } from './linalg.js';
import { noisy, numbersIn, operatorDistance, seededRandom } from './testUtils/noise.js';

const I: Mat3 = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];
const unit = (v: readonly number[]): Vec3 => {
  const n = Math.hypot(...v);
  return v.map((x) => x / n) as unknown as Vec3;
};
/** The largest operator distance of the caller's operations from the exact ones, index for index. */
const deviation = (given: readonly { cartesian: Mat3 }[], exact: readonly { cartesian: Mat3 }[]) =>
  Math.max(...given.map((op, i) => operatorDistance(op.cartesian, exact[i].cartesian)));

describe('#235: a tolerance below the accuracy of the operations', () => {
  const almostIdentity = [{ cartesian: [[1.000001, 0, 0], [0, 1, 0], [0, 0, 1]] as unknown as Mat3 }]; // prettier-ignore

  it('siteSymmetryOf refuses it and names the tolerance and the deviation (10⁻⁶)', () => {
    let error: unknown;
    try {
      classes.siteSymmetryOf(almostIdentity, [1, 0, 0], { tolerance: 1e-8 });
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(RangeError);
    const named = numbersIn((error as Error).message);
    expect(named).toContain(1e-8);
    // The deviation, 10⁻⁶, written to a few digits.
    expect(named.some((x) => Math.abs(x / 1e-6 - 1) < 0.05)).toBe(true);
  });

  // The noisy 4mm of the issue: entries moved by up to 2·10⁻⁶, direction along the fourfold axis.
  const exact4mm = classes.operations('4mm');
  const noisy4mm = noisy(exact4mm, 2e-6, seededRandom(7));
  const dev = deviation(noisy4mm, exact4mm);

  it('setup: the noisy 4mm deviates by more than 10⁻⁶ and less than 10⁻⁵', () => {
    expect(dev).toBeGreaterThan(1e-6);
    expect(dev).toBeLessThan(1e-5);
  });

  for (const tolerance of [1e-8, 1e-6]) {
    it(`siteSymmetryOf refuses the noisy 4mm at the tolerance ${tolerance}, naming the deviation`, () => {
      let error: unknown;
      try {
        classes.siteSymmetryOf(noisy4mm, [0, 0, 1], { tolerance });
      } catch (e) {
        error = e;
      }
      expect(error).toBeInstanceOf(RangeError);
      const named = numbersIn((error as Error).message);
      expect(named).toContain(tolerance);
      // The deviation is measured against the exact group nearest to the list, which need not be the
      // group in the standard orientation that dev is measured against; it lies within a factor 2.
      expect(named.some((x) => x !== tolerance && x > 0.5 * dev && x < 2 * dev)).toBe(true);
    });
  }

  it('at the default tolerance the fourfold axis has the site symmetry 4mm, multiplicity 1', () => {
    // ITA (2016) Table 3.2.3.2, 4mm, p. 750: position 1 a 4mm 0,0,z.
    const site = classes.siteSymmetryOf(noisy4mm, [0, 0, 1]);
    expect(site.operations).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(site.multiplicity).toBe(1);
  });

  it('an exact group turned by 2·10⁻⁶ is not refused: [0, 0, 1] lies in one mirror plane only', () => {
    // 4mm turned about x by 2·10⁻⁶ rad: the fourfold axis and the diagonal mirrors move 2·10⁻⁶ and
    // 1.4·10⁻⁶ away from [0, 0, 1], the mirror −x, y, z (operation (6), index 5) still contains it.
    const t = 2e-6;
    const R: Mat3 = [
      [1, 0, 0],
      [0, Math.cos(t), -Math.sin(t)],
      [0, Math.sin(t), Math.cos(t)],
    ];
    const mul = (a: Mat3, b: Mat3): Mat3 =>
      a.map((row) => b[0].map((_, j) => row[0] * b[0][j] + row[1] * b[1][j] + row[2] * b[2][j])) as unknown as Mat3;
    const Rt = R[0].map((_, j) => R.map((row) => row[j])) as unknown as Mat3;
    const turned = exact4mm.map((op) => ({ cartesian: mul(mul(R, op.cartesian), Rt) }));
    expect(classes.siteSymmetryOf(turned, [0, 0, 1], { tolerance: 1e-6 }).operations).toEqual([0, 5]);
  });
});

describe('#235: the tolerance measures the distance to the symmetry element', () => {
  // 7.5·10⁻⁶ from the element at the default tolerance 10⁻⁵: on the element by its distance; the
  // image under a mirror or a twofold rotation lies twice as far, 1.5·10⁻⁵.
  const nearMirror = unit([1, 7.5e-6, 0]); // the mirror of m is normal to y (−y in its operation)
  const nearAxis = unit([7.5e-6, 1, 0]); // the twofold axis of 2 is y (unique axis b)

  it('setup: m mirrors y, 2 turns about y', () => {
    expect(classes.operations('m')[1].cartesian).toEqual([
      [1, 0, 0],
      [0, -1, 0],
      [0, 0, 1],
    ]);
    expect(classes.operations('2')[1].cartesian).toEqual([
      [-1, 0, 0],
      [0, 1, 0],
      [0, 0, -1],
    ]);
  });

  it('siteSymmetry of a key: a direction 7.5·10⁻⁶ from the mirror of m lies on it', () => {
    expect(classes.siteSymmetry('m', { cartesian: nearMirror }).multiplicity).toBe(1);
  });
  it('siteSymmetryOf: a direction 7.5·10⁻⁶ from the mirror of m lies on it', () => {
    expect(classes.siteSymmetryOf(classes.operations('m'), nearMirror).multiplicity).toBe(1);
  });
  it('siteSymmetry of a key: a direction 7.5·10⁻⁶ from the axis of 2 lies on it', () => {
    expect(classes.siteSymmetry('2', { cartesian: nearAxis }).multiplicity).toBe(1);
  });
  it('siteSymmetryOf: a direction 7.5·10⁻⁶ from the axis of 2 lies on it', () => {
    expect(classes.siteSymmetryOf(classes.operations('2'), nearAxis).multiplicity).toBe(1);
  });

  it('mm2: within the tolerance of both mirrors but not of their axis, the nearer mirror', () => {
    // 0.80·10⁻⁵ from the mirror normal to x, 0.85·10⁻⁵ from the one normal to y, 1.17·10⁻⁵ from the
    // twofold axis z: the most special element within 10⁻⁵ is a mirror, the nearer one −x, y, z.
    const ops = classes.operations('mm2');
    const mirrorX = ops.findIndex((op) => op.cartesian[0][0] === -1 && op.cartesian[1][1] === 1);
    const site = classes.siteSymmetryOf(ops, unit([0.8e-5, 0.85e-5, 1]));
    expect(site.operations).toEqual([0, mirrorX]);
    expect(site.multiplicity).toBe(2);
  });
});

describe('#235: the site symmetry of a noisy list is a subgroup (all groups)', () => {
  // At each tolerance either a RangeError, allowed only for noisy operations and a tolerance below
  // their deviation (within the factor 2 of the measure), or a subgroup with these properties.
  it('identity included, closed, |orbit| · |stabiliser| = |G|, images of norm 1, a partition', () => {
    const random = seededRandom(5);
    const found: string[] = [];
    const directions: Vec3[] = [unit([0.3, 0.4, 0.86]), [0, 0, 1], [1, 0, 0], unit([1, 1, 0]), unit([1, 1, 1])];
    for (const key of magnetic.POINT_GROUP_KEYS) {
      const exact = magnetic.operations(key);
      // The product table of the exact group, by index.
      const same = (a: Mat3, b: Mat3) => a.every((row, i) => row.every((v, j) => Math.abs(v - b[i][j]) < 1e-9));
      const mul = (a: Mat3, b: Mat3): Mat3 =>
        a.map((row) => b[0].map((_, j) => row[0] * b[0][j] + row[1] * b[1][j] + row[2] * b[2][j])) as unknown as Mat3;
      const index = (m: Mat3, t: boolean) => exact.findIndex((op) => op.timeReversal === t && same(op.cartesian, m));
      for (const amplitude of [0, 1e-7, 1e-6]) {
        const given = noisy(exact, amplitude, random);
        const dev = deviation(given, exact);
        for (const [tolerance, v] of [1e-8, 1e-6, 1e-5].flatMap((t) => directions.map((d) => [t, d] as const))) {
          const where = `${key} ${amplitude} ${tolerance} ${v.map((x) => x.toFixed(2)).join(',')}`;
          let site;
          try {
            site = magnetic.siteSymmetryOf(given, v, { tolerance });
          } catch (e) {
            if (!(e instanceof RangeError && amplitude > 0 && tolerance < 2 * dev))
              found.push(`${where}: ${String(e)}`);
            continue;
          }
          const H = site.operations;
          if (!H.some((i) => same(exact[i].cartesian, I) && !exact[i].timeReversal))
            found.push(`${where}: no identity`);
          for (const a of H)
            for (const b of H) {
              const k = index(
                mul(exact[a].cartesian, exact[b].cartesian),
                exact[a].timeReversal !== exact[b].timeReversal,
              );
              if (!H.includes(k)) found.push(`${where}: not closed`);
            }
          const orbit = magnetic.orbitOf(given, v, { tolerance });
          if (orbit.length * H.length !== exact.length) found.push(`${where}: |orbit| · |H| ≠ |G|`);
          for (const pole of orbit)
            if (Math.abs(Math.hypot(...pole.direction) - 1) > 1e-12) found.push(`${where}: an image of norm ≠ 1`);
          const all = orbit.flatMap((p) => p.operations).sort((a, b) => a - b);
          if (all.join() !== exact.map((_, i) => i).join()) found.push(`${where}: no partition`);
        }
      }
    }
    expect(found.slice(0, 10)).toEqual([]);
  });
});

describe('#235: orbitOf below the accuracy of the operations', () => {
  it('orbitOf refuses a tolerance below the deviation, as siteSymmetryOf', () => {
    const ops = [{ cartesian: [[1.000001, 0, 0], [0, 1, 0], [0, 0, 1]] as unknown as Mat3 }]; // prettier-ignore
    expect(() => classes.orbitOf(ops, [1, 0, 0], { tolerance: 1e-8 })).toThrow(RangeError);
  });
});

describe('#235: what the review of #244 found', () => {
  it('a noisy list that is a group at the default tolerance is not refused for its closure', () => {
    // Entries moved by ±2·10⁻⁶ in a fixed pattern: the list is a group within 10⁻⁵ and deviates by
    // 6·10⁻⁶; closing it again from generators would pile up the errors of products of products.
    const ops = classes.operations('4mm').map((o, k) => ({
      cartesian: o.cartesian.map((r, i) => r.map((v, j) => v + 2e-6 * ((k + i + j) % 2 ? 1 : -1))) as unknown as Mat3,
    }));
    // ITA (2016) Table 3.2.3.2, 4mm, p. 750: position 1 a 4mm 0,0,z.
    expect(classes.siteSymmetryOf(ops, [0, 0, 1]).operations).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(classes.orbitOf(ops, [0, 0, 1])).toHaveLength(1);
  });

  it('noisy lists of every group at errors of 3·10⁻⁶ are taken at the default tolerance', () => {
    const random = seededRandom(11);
    const refused: string[] = [];
    for (const key of magnetic.POINT_GROUP_KEYS) {
      const exact = magnetic.operations(key);
      const given = noisy(exact, 3e-6, random);
      // Below the default tolerance 10⁻⁵ unless the deviation of the list exceeds it.
      if (deviation(given, exact) >= 5e-6) continue;
      try {
        magnetic.siteSymmetryOf(given, [0.3, 0.4, 0.86]);
      } catch (e) {
        refused.push(`${key}: ${String(e)}`);
      }
    }
    expect(refused).toEqual([]);
  });

  it('the inversion is no element: a tolerance just below 1 gives a direction, not NaN', () => {
    const site = classes.siteSymmetry(
      '-1',
      { cartesian: [0.25217342376708984, -0.4891653060913086, 0.4031553529202938] },
      { tolerance: 1 - 2 ** -53 },
    );
    expect(site.operations).toEqual([0]);
    expect(site.direction.every((x) => Number.isFinite(x))).toBe(true);
  });
});
