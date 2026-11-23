/**
 * The description of the operations of the 17 plane groups against print (fixture class (a)): the
 * block "Symmetry operations" of ITA (6th ed., 2016) Chapter 2.2, pp. 176–192, re-parsed from
 * references/itc/vol-a-2016-plane-groups.md, both sets for the c groups. The symbols are written
 * here, in the test, from the structured description, by the rules of ITA § 2.1.3.9 (p. 160): the
 * symbol of the operation with its glide part ("a", "b" or "g(...)"), then the location of its
 * symmetry element, a line in parametric form.
 *
 * The normals of the mirror and glide lines against print as well: ITA Table 2.1.3.1 (p. 151, two
 * dimensions; references/itc/vol-a-table-2.1.3.1-plane.md) gives the symmetry directions of each
 * lattice, and the printed full symbol of each group says at which of them it has a mirror or glide
 * line (`m` or `g` in the secondary or tertiary position).
 */

import { describe, expect, it } from 'vitest';
import { readReference, tableRows } from '../testUtils/references.js';
import { applyToPoint, compose, parseOperation, translationOperation, type ExactOperation } from './affine.js';
import { describePlaneOperation, type PlaneOperationDescription } from './describe.js';
import { PLANE_GROUP_KEYS, planeGroupEntry, planeGroupOperations } from './planeGroups.js';
import { planeCellElements } from './cell.js';
import { add, formatRational, rational, scale, type Rational } from './rational.js';

const f = formatRational;

/** c·x + d as ITA writes a coordinate of a line: `x`, `-x`, `2x`, `x+1/2`. */
function affine(c: number, d: Rational): string {
  const lin = c === 1 ? 'x' : c === -1 ? '-x' : `${c}x`;
  if (d[0] === 0) return lin;
  return d[0] < 0 ? `${lin}${f(d)}` : `${lin}+${f(d)}`;
}

function line(d: PlaneOperationDescription): string {
  const [u, v] = d.direction ?? [0, 0];
  const p = d.location ?? [];
  if (u === 0) return `${f(p[0])},y`;
  if (v === 0) return `x,${f(p[1])}`;
  if (p[1][0] !== 0) throw new Error('The location of an oblique line lies on y = 0');
  return `${affine(u, p[0])},${affine(v, rational(0))}`;
}

function symbol(d: PlaneOperationDescription): string {
  switch (d.kind) {
    case 'identity':
      return '1';
    case 'translation':
      return `t(${(d.translation ?? []).map(f).join(',')})`;
    case 'rotation':
      return `${d.n}${d.sense ?? ''} ${(d.location ?? []).map(f).join(',')}`;
    case 'reflection':
      return `m ${line(d)}`;
    case 'glide-reflection': {
      const [gx, gy] = (d.glide ?? []).map(f);
      const letter = gy === '0' && gx === '1/2' ? 'a' : gx === '0' && gy === '1/2' ? 'b' : `g(${gx},${gy})`;
      return `${letter} ${line(d)}`;
    }
  }
}

function printedOperations(): Map<string, string[]> {
  const md = readReference('itc/vol-a-2016-plane-groups.md');
  const out = new Map<string, string[]>();
  for (const section of md.split('\n## ').slice(1)) {
    const key = /^\d+ — (\S+),/.exec(section)?.[1] ?? '';
    const list = (re: RegExp) =>
      (re.exec(section)?.[1] ?? '')
        .split('; ')
        .filter((x) => x !== '')
        .map((x) => x.replace(/^\(\d+\) /, ''));
    out.set(key, [
      ...list(/^Symmetry operations(?: for \(0,0\)\+ set)?: (.*?) *$/m),
      ...list(/^Symmetry operations for \(1\/2,1\/2\)\+ set: (.*?) *$/m),
    ]);
  }
  return out;
}

const PRINTED = printedOperations();

describe('describePlaneOperation against ITA "Symmetry operations"', () => {
  for (const key of PLANE_GROUP_KEYS) {
    it(`${key}: every operation, in ITA's order`, () => {
      expect(planeGroupOperations(key).map((op) => symbol(describePlaneOperation(op)))).toEqual(PRINTED.get(key));
    });
  }
});

const same = (p: readonly Rational[], q: readonly Rational[]) =>
  p.every((v, k) => v[0] === q[k][0] && v[1] === q[k][1]);
const shifts = ['0,0', '1,0', '0,-1', '2,3'].map((t) =>
  translationOperation(t.split(',').map((v) => rational(Number(v)))),
);

/** Checks a description against the operation by invariants that do not depend on how it was computed. */
function checkInvariants(op: ExactOperation, d: PlaneOperationDescription): void {
  const image = (p: readonly Rational[]) => applyToPoint(op, p);
  if (d.kind === 'rotation') {
    const c = d.location ?? [];
    expect(same(image(c), c)).toBe(true); // the centre is fixed
    if (d.n >= 3) {
      // '+': the rotation by +360°/n turns a towards b, i.e. W·a has a positive b component.
      expect(op.matrix[1][0] > 0).toBe(d.sense === '+');
    }
  }
  if (d.kind === 'reflection' || d.kind === 'glide-reflection') {
    const p = d.location ?? [];
    const g = d.glide ?? [rational(0), rational(0)];
    // A point of the line goes to itself shifted by the glide vector.
    expect(same(image(p), [add(p[0], g[0]), add(p[1], g[1])])).toBe(true);
    // The direction is fixed by W, and the glide vector is parallel to it.
    const [u, v] = d.direction ?? [0, 0];
    expect([op.matrix[0][0] * u + op.matrix[0][1] * v, op.matrix[1][0] * u + op.matrix[1][1] * v]).toEqual([u, v]);
    expect(add(scale(v, g[0]), scale(-u, g[1]))[0]).toBe(0);
    expect(u > 0 || (u === 0 && v > 0)).toBe(true);
  }
}

describe('describePlaneOperation: invariants', () => {
  for (const key of PLANE_GROUP_KEYS) {
    it(`${key}: every operation, also shifted by lattice translations`, () => {
      for (const op of planeGroupOperations(key)) {
        for (const t of shifts) {
          const shifted = compose(t, op);
          checkInvariants(shifted, describePlaneOperation(shifted));
        }
      }
    });
  }
});

describe('describePlaneOperation', () => {
  it('describes an operation whose glide vector is a lattice vector as a glide', () => {
    // m 0,y followed by t(0,1): x' = -x, y' = y + 1, geometrically a glide along the mirror line x = 0.
    expect(describePlaneOperation(parseOperation('-x,y+1'))).toEqual({
      kind: 'glide-reflection',
      n: 2,
      location: [rational(0), rational(0)],
      direction: [0, 1],
      normal: [1, 0],
      glide: [rational(0), rational(1)],
    });
  });

  it('gives lines along the axes with the shortest direction and a point on x = 0 or y = 0', () => {
    // m 1/4,y of p2mg: line x = 1/4 along b, met by y = 0 at (1/4, 0).
    expect(describePlaneOperation(parseOperation('-x+1/2,y'))).toEqual({
      kind: 'reflection',
      n: 2,
      location: [rational(1, 4), rational(0)],
      direction: [0, 1],
      normal: [1, 0],
    });
    // a x,1/4 of p2gg: line y = 1/4 along a, parallel to y = 0, so its point is on x = 0.
    expect(describePlaneOperation(parseOperation('x+1/2,-y+1/2'))).toEqual({
      kind: 'glide-reflection',
      n: 2,
      location: [rational(0), rational(1, 4)],
      direction: [1, 0],
      normal: [0, 1],
      glide: [rational(1, 2), rational(0)],
    });
  });

  it('gives rotation centres unreduced, also away from the origin', () => {
    // -y,x+1/2: (I − W)p = w with W = 4+ gives p = (−1/4, 1/4); check: W·p + w = (−1/4, −1/4 + 1/2).
    expect(describePlaneOperation(parseOperation('-y,x+1/2'))).toEqual({
      kind: 'rotation',
      n: 4,
      sense: '+',
      location: [rational(-1, 4), rational(1, 4)],
    });
  });

  it('refuses a linear part of no plane point group', () => {
    expect(() => describePlaneOperation(parseOperation('-x,-y,z'))).toThrow(RangeError);
    expect(() => describePlaneOperation(parseOperation('x+y,y'))).toThrow(RangeError); // a shear, trace 2
    expect(() => describePlaneOperation(parseOperation('-x+y,-y'))).toThrow(RangeError); // trace -2, not of order 2
    expect(() => describePlaneOperation(parseOperation('-x+y,y'))).not.toThrow(); // (5) of p3m1, m x,2x
    expect(() => describePlaneOperation(parseOperation('-x+y,y+x'))).toThrow(RangeError); // det -2
  });
});

describe('normals of mirror and glide lines against ITA Table 2.1.3.1 and the full symbols', () => {
  const rows = tableRows(readReference('itc/vol-a-table-2.1.3.1-plane.md')).slice(1);
  /** Printed directions such as `{[1-1], [12]}`, each with its first non-zero component positive. */
  const directions = (cell: string): string[] =>
    [...cell.matchAll(/\[(-?\d)(-?\d)\]/g)].map((m) => {
      const v = [Number(m[1]), Number(m[2])];
      const sign = v[0] < 0 || (v[0] === 0 && v[1] < 0) ? -1 : 1;
      return `${sign * v[0] + 0},${sign * v[1] + 0}`;
    });
  const lattice = Object.fromEntries(rows.map((r) => [r[0].toLowerCase(), [directions(r[2]), directions(r[3])]]));

  it('reads the four lattices', () => {
    expect(Object.keys(lattice)).toEqual(['oblique', 'rectangular', 'square', 'hexagonal']);
    expect(lattice.hexagonal).toEqual([
      ['1,0', '0,1', '1,1'],
      ['1,-1', '1,2', '2,1'],
    ]);
  });

  it.each(PLANE_GROUP_KEYS)('%s: the normals are the printed directions where the full symbol has m or g', (key) => {
    const entry = planeGroupEntry(key);
    // The full symbol: lattice letter, then primary (rotation), secondary and tertiary positions.
    const positions = entry.fullSymbol.slice(1).split('');
    const expected = new Set<string>();
    positions.slice(1).forEach((c, i) => {
      if (c === 'm' || c === 'g') for (const d of lattice[entry.system][i]) expected.add(d);
    });
    const fromOperations = new Set<string>();
    for (const op of planeGroupOperations(key)) {
      const d = describePlaneOperation(op);
      if (d.kind === 'reflection' || d.kind === 'glide-reflection') {
        const n = d.normal ?? [0, 0];
        fromOperations.add(n.join(','));
        // Independent of the rule that computes it: W maps the normal onto its negative and the direction onto itself.
        const w = op.matrix;
        expect([w[0][0] * n[0] + w[0][1] * n[1], w[1][0] * n[0] + w[1][1] * n[1]]).toEqual([0 - n[0], 0 - n[1]]);
        const u = d.direction ?? [0, 0];
        expect([w[0][0] * u[0] + w[0][1] * u[1], w[1][0] * u[0] + w[1][1] * u[1]]).toEqual([u[0], u[1]]);
      }
    }
    expect([...fromOperations].sort()).toEqual([...expected].sort());
    const fromCell = new Set(planeCellElements(key).lines.map((l) => l.normal.join(',')));
    expect([...fromCell].sort()).toEqual([...expected].sort());
  });
});
