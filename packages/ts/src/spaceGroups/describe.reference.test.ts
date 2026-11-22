/**
 * The description of the operations of the 17 plane groups against print (fixture class (a)): the
 * block "Symmetry operations" of ITA (6th ed., 2016) Chapter 2.2, pp. 176–192, re-parsed from
 * references/itc/vol-a-2016-plane-groups.md, both sets for the c groups. The symbols are written
 * here, in the test, from the structured description, by the rules of ITA § 2.1.3.9 (p. 160): the
 * symbol of the operation with its glide part ("a", "b" or "g(...)"), then the location of its
 * symmetry element, a line in parametric form.
 */

import { describe, expect, it } from 'vitest';
import { readReference } from '../testUtils/references.js';
import { parseOperation } from './affine.js';
import { describePlaneOperation, type PlaneOperationDescription } from './describe.js';
import { PLANE_GROUP_KEYS, planeGroupOperations } from './planeGroups.js';
import { formatRational, rational, type Rational } from './rational.js';

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
      return `${d.order}${d.sense ?? ''} ${(d.location ?? []).map(f).join(',')}`;
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

describe('describePlaneOperation', () => {
  it('describes a glide reflection with a glide that is a lattice vector as a glide reflection', () => {
    // m 0,y followed by t(0,1): x' = -x, y' = y + 1, geometrically a glide along the mirror.
    expect(describePlaneOperation(parseOperation('-x,y+1')).kind).toBe('glide-reflection');
  });

  it('refuses what is no operation of a plane group', () => {
    expect(() => describePlaneOperation(parseOperation('-x,-y,z'))).toThrow(RangeError);
    expect(() => describePlaneOperation(parseOperation('x+y,y'))).toThrow(RangeError); // a shear, trace 2
    expect(() => describePlaneOperation(parseOperation('-x+y,-y'))).toThrow(RangeError); // trace -2, not of order 2
    expect(() => describePlaneOperation(parseOperation('-x+y,y'))).not.toThrow(); // (5) of p3m1, m x,2x
    expect(() => describePlaneOperation(parseOperation('-x+y,y+x'))).toThrow(RangeError); // det -2
  });
});
