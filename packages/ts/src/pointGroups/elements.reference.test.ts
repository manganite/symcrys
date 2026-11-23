/**
 * describeOperations against print (fixture class (a)): the symbols of the symmetry operations in
 * the space-group tables of ITA (5th ed., 2006), one symmorphic P group per ITC setting
 * (references/itc/vol-a-2006-symmetry-operations.md).
 *
 * Each printed line is turned into a matrix with the independent algebra of testUtils, by the
 * definitions of ITA § 11.1.2 (pp. 810–811): the axis direction is the direction of increasing
 * parameter of the printed location, `+` a counter-clockwise rotation seen from its tip, a
 * rotoinversion the rotation followed by the inversion. These matrices must be exactly the
 * operations of the setting, line (n) must be the n-th triplet of the general position in ITA
 * (6th ed.) Table 3.2.3.2, and the library's description of each operation must name what is
 * printed: kind, n, sense and, for n ≥ 3, the printed direction including its sign. The
 * transcription also holds ITA's "Generators selected"; `generators` must give the printed triplets
 * at those numbers, in printed order, in the ITC convention (they also fix the order of `operations`).
 */

import { describe, expect, it } from 'vitest';
import { I3, inverse, mirrorNormal, mul, neg, rotationAbout, sameM, type M } from '../testUtils/independentGroups.js';
import { expectHeader, readReference, tableRows, notRhombohedral } from '../testUtils/references.js';
import { describeOperations } from './elements.js';
import { findPointGroup, generators, operations, pointGroup, settings, type PointGroupKey } from './pointGroups.js';

/** Columns a, b, c of the #6 frame, typed here independently of src/lattice.ts. */
const HEXAGONAL: M = [
  [1, -1 / 2, 0],
  [0, Math.sqrt(3) / 2, 0],
  [0, 0, 1],
];
const basis = (key: PointGroupKey): M =>
  ['trigonal', 'hexagonal'].includes(pointGroup(key).crystalSystem) ? HEXAGONAL : I3;
const times = (m: M, v: number[]): number[] =>
  mul(
    m,
    v.map((x) => [x]),
  ).map((r) => r[0]);
const cross = (a: number[], b: number[]): number[] => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const unit = (v: number[]): number[] => {
  const n = Math.hypot(v[0], v[1], v[2]);
  return v.map((x) => x / n);
};
const parallel = (a: readonly number[], b: readonly number[]): boolean =>
  Math.abs(Math.abs(unit([...a]).reduce((s, x, i) => s + x * unit([...b])[i], 0)) - 1) < 1e-9;

// --- The transcription ----------------------------------------------------------------------------

interface PrintedOperation {
  n: number;
  symbol: string;
  location: string;
}
interface Entry {
  cls: string;
  axis?: 'b' | 'c';
  heading: string;
  /** Numbers of the operations ITA selects as generators, in printed order. */
  generators: number[];
  ops: PrintedOperation[];
}

const ENTRIES: Entry[] = (() => {
  const text = readReference('itc/vol-a-2006-symmetry-operations.md');
  const entries: Entry[] = [];
  let skipping = false;
  for (const line of text.split('\n')) {
    if (skipping && !line.startsWith('## ')) continue;
    // The R groups with rhombohedral axes are taken up with the rhombohedral settings (#121, step 6c).
    if (/^## \S+, rhombohedral axes — /.test(line)) {
      skipping = true;
      continue;
    }
    const h = /^## (\S+)(?:, unique axis (b|c))? — No\. \d+, \S+, p\. \d+$/.exec(line);
    if (h) {
      skipping = false;
      entries.push({
        cls: h[1],
        ...(h[2] ? { axis: h[2] as 'b' | 'c' } : {}),
        heading: line.slice(3),
        generators: [],
        ops: [],
      });
      continue;
    }
    const g = /^Generators selected \(p\. \d+\): (.+)$/.exec(line);
    if (g) {
      entries.at(-1)!.generators = g[1] === 'none' ? [] : [...g[1].matchAll(/\((\d+)\)/g)].map((m) => Number(m[1]));
      continue;
    }
    if (line.startsWith('## ')) throw new Error(`Unreadable heading: ${line}`);
    const o = /^\((\d+)\) (\S+)(?: (.+))?$/.exec(line);
    if (o) entries.at(-1)!.ops.push({ n: Number(o[1]), symbol: o[2], location: o[3] ?? '' });
  }
  return entries;
})();

/** The ITC setting an entry describes. */
function settingOf(e: Entry): { key: PointGroupKey; setting: number } {
  if (e.axis) {
    const key = e.cls as PointGroupKey;
    const s = settings(key).find((x) => x.uniqueAxis === e.axis);
    if (!s) throw new Error(`${e.heading}: no setting with unique axis ${e.axis}`);
    return { key, setting: s.index };
  }
  const found = findPointGroup(e.cls);
  if (!found) throw new Error(`${e.heading}: unknown symbol`);
  return found;
}

/**
 * A printed location `x,-x,0`, `2x,x,z`, `-x,y,x`, …: for each free parameter, the lattice vector
 * it moves along (coefficients of the parameter in the three coordinates).
 */
function parameterVectors(location: string): number[][] {
  const comps = location.split(',');
  if (comps.length !== 3) throw new Error(`Unreadable location: ${location}`);
  const params: Record<string, number[]> = {};
  comps.forEach((c, i) => {
    if (c === '0') return;
    const m = /^(-?)(2?)([xyz])$/.exec(c);
    if (!m) throw new Error(`Unreadable coordinate ${c} in ${location}`);
    params[m[3]] ??= [0, 0, 0];
    params[m[3]][i] = (m[1] ? -1 : 1) * (m[2] ? 2 : 1);
  });
  return ['x', 'y', 'z'].filter((p) => p in params).map((p) => params[p]);
}

interface Expected {
  matrix: M;
  kind: string;
  order: number;
  sense?: '+' | '-';
  /** Lattice direction of an axis, or Cartesian normal of a mirror. */
  direction?: number[];
  cartesian?: number[];
}

/** The operation a printed line names, by ITA § 11.1.2. */
function expected(p: PrintedOperation, b: M): Expected {
  if (p.symbol === '1') return { matrix: I3, kind: 'identity', order: 1 };
  if (p.symbol === '-1') {
    expect(p.location).toBe('0,0,0');
    return { matrix: neg(I3), kind: 'inversion', order: 1 };
  }
  const [axisPart, point] = p.location.split('; ');
  if (p.symbol === 'm') {
    const v = parameterVectors(axisPart);
    expect(v).toHaveLength(2);
    const normal = unit(cross(times(b, v[0]), times(b, v[1])));
    return { matrix: mirrorNormal(normal), kind: 'mirror', order: 2, cartesian: normal };
  }
  const s = /^(-?)([2346])([+-]?)$/.exec(p.symbol);
  if (!s) throw new Error(`Unreadable symbol ${p.symbol}`);
  const v = parameterVectors(axisPart);
  expect(v).toHaveLength(1);
  const u = unit(times(b, v[0]));
  const n = Number(s[2]);
  expect(s[3] === '').toBe(n === 2); // a sense is printed exactly for n ≥ 3
  const r = rotationAbout(u, (s[3] === '-' ? -1 : 1) / n);
  if (s[1]) {
    expect(point).toBe('0,0,0');
    return { matrix: neg(r), kind: 'rotoinversion', order: n, sense: s[3] as '+' | '-', direction: v[0], cartesian: u };
  }
  expect(point).toBeUndefined();
  return {
    matrix: r,
    kind: 'rotation',
    order: n,
    ...(n > 2 ? { sense: s[3] as '+' | '-' } : {}),
    direction: v[0],
    cartesian: u,
  };
}

// --- ITA Table 3.2.3.2 (6th ed.): general positions --------------------------------------------

const GENERAL = (() => {
  const rows = tableRows(readReference('itc/vol-a-table-3.2.3.2-general-positions.md')).filter(notRhombohedral);
  expectHeader(rows, ['Short', 'Axes', 'Page', 'Multiplicity', 'General position']);
  return rows.slice(1);
})();

/** A coordinate triplet `-x+y,-x,z` as the matrix W acting on fractional coordinates. */
function tripletMatrix(t: string): M {
  return t.split(',').map((expr) => {
    const row = [0, 0, 0];
    for (const m of expr.matchAll(/([+-]?)([xyz])/g)) row['xyz'.indexOf(m[2])] += m[1] === '-' ? -1 : 1;
    return row;
  });
}

function generalPosition(e: Entry): M[] {
  const axes = e.axis ? `unique axis ${e.axis}` : '';
  const row = GENERAL.find((r) => r[0] === e.cls && (r[1] === axes || r[1] === 'hexagonal axes'));
  if (!row) throw new Error(`${e.heading}: not in Table 3.2.3.2`);
  return row[4].split(' ').map(tripletMatrix);
}

// --- Tests ----------------------------------------------------------------------------------------

describe('describeOperations against the symmetry operations printed in ITA', () => {
  it('covers every ITC setting that ITA lists, 40 entries', () => {
    expect(ENTRIES).toHaveLength(40);
    expect(new Set(ENTRIES.map((e) => JSON.stringify(settingOf(e)))).size).toBe(40);
  });

  it.each(ENTRIES.map((e) => [e.heading, e] as const))('%s', (_h, e) => {
    const { key, setting } = settingOf(e);
    const b = basis(key);
    const ops = operations(key, { setting });
    const descriptions = describeOperations(key, { setting });
    expect(e.ops.map((p) => p.n)).toEqual(ops.map((_, i) => i + 1));

    const general = generalPosition(e);
    expect(general).toHaveLength(e.ops.length);
    const used = new Set<number>();
    e.ops.forEach((p, i) => {
      const x = expected(p, b);
      // line (n) is the n-th triplet of the general position (W in lattice coordinates)
      expect(sameM(x.matrix, mul(mul(b, general[i]), inverse(b)))).toBe(true);
      // and exactly one operation of the setting, the n-th: operations() keeps ITA's numbering
      const hits = ops.map((o, k) => (sameM(x.matrix, o.matrix) ? k : -1)).filter((k) => k >= 0);
      expect(hits).toEqual([i]);
      expect(used.has(hits[0])).toBe(false);
      used.add(hits[0]);

      const d = descriptions[hits[0]];
      expect([d.kind, d.order, d.sense]).toEqual([x.kind, x.order, x.sense]);
      if (x.cartesian) expect(parallel(d.axis!.cartesian, x.cartesian)).toBe(true);
      if (x.direction && x.order > 2) expect([...d.axis!.lattice]).toEqual(x.direction);
      else if (x.direction) expect(parallel(d.axis!.lattice, x.direction)).toBe(true);
    });
    expect(used.size).toBe(ops.length);

    // generators() gives ITA's selected generators, line (n) of each printed n, in printed order
    const g = generators(key, { setting });
    expect(g).toHaveLength(e.generators.length);
    e.generators.forEach((n, j) => expect(sameM(mul(mul(b, general[n - 1]), inverse(b)), g[j].matrix)).toBe(true));
  });
});
