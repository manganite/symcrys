import { describe, expect, it } from 'vitest';
import {
  MAX_COSETS,
  applyToPoint,
  closure,
  compose,
  determinant,
  dimensionOf,
  equalModLattice,
  equals,
  formatOperation,
  fromNumber,
  identity,
  inverse,
  parseOperation,
  reduce,
  toPlain,
  trace,
  translation,
  type ExactOperation,
} from './affine.js';
import { rational } from './rational.js';

const op = parseOperation;

/** The closure as a sorted list of coordinate triplets, to compare as a set. */
function closureSet(generators: string[], d?: number): string[] {
  return closure(generators.map(op), d).map(formatOperation).sort();
}

describe('affine operations', () => {
  it('reads and writes coordinate triplets as ITA prints them', () => {
    for (const text of [
      'x,y',
      '-x+1/2,y',
      'x-y,x,z+5/6',
      '-y+1/4,x+3/4,z+1/4',
      '2x,x',
      '-x+y,-x,z+1/3',
      'x+1/2,-y+1/2,-z',
    ]) {
      expect(formatOperation(op(text))).toBe(text);
    }
    expect(op('-x+1/2,y')).toEqual({
      matrix: [
        [-1, 0],
        [0, 1],
      ],
      translation: [rational(1, 2), rational(0)],
    });
    // A constant written before the coordinate, and spaces, are read too.
    expect(formatOperation(op(' 1/2 - x , y '))).toBe('-x+1/2,y');
  });

  it('refuses what is not a coordinate triplet', () => {
    expect(() => op('x,y,z,x')).toThrow(RangeError);
    expect(() => op('x,q')).toThrow(RangeError);
    expect(() => op('x,')).toThrow(RangeError);
    expect(() => op('x,z')).toThrow(RangeError); // z in two dimensions
    expect(() => op('x,y+1/0')).toThrow(RangeError);
    expect(() => op('x/2,y')).toThrow(RangeError);
  });

  it('composes first the right, then the left operation', () => {
    // p2gg (hand-derived): the 2 at the origin, -x,-y, then the glide -x+1/2,y+1/2, maps (x, y) to
    // (-x, -y) and then to (-(-x)+1/2, -y+1/2) = (x+1/2, -y+1/2).
    expect(formatOperation(compose(op('-x+1/2,y+1/2'), op('-x,-y')))).toBe('x+1/2,-y+1/2');
    // The other order: (-x+1/2, y+1/2), then the 2: (x-1/2, -y-1/2).
    expect(formatOperation(compose(op('-x,-y'), op('-x+1/2,y+1/2')))).toBe('x-1/2,-y-1/2');
  });

  it('applies an operation to a point, and the product acts as the two in turn', () => {
    const a = op('-y,x-y,z+1/3');
    const b = op('x+1/2,-y,-z+1/4');
    const p = [rational(1, 5), rational(2, 7), rational(-3, 8)];
    expect(applyToPoint(compose(a, b), p)).toEqual(applyToPoint(a, applyToPoint(b, p)));
    expect(applyToPoint(op('-y,x-y'), [rational(1, 3), rational(2, 3)])).toEqual([rational(-2, 3), rational(-1, 3)]);
  });

  it('inverts exactly, also in three dimensions, and refuses a matrix with determinant other than ±1', () => {
    for (const text of ['-x+1/2,y+1/2', '-y,x-y', 'x-y,-y,-z+1/3', '-y+1/4,x+3/4,z+1/4', 'z,x,y+1/2', '-x,-y,-z']) {
      const a = op(text);
      expect(equals(compose(a, inverse(a)), identity(dimensionOf(a)))).toBe(true);
      expect(equals(compose(inverse(a), a), identity(dimensionOf(a)))).toBe(true);
    }
    expect(() => inverse(op('2x,y'))).toThrow(RangeError);
  });

  it('is associative', () => {
    const [a, b, c] = ['-y,x-y,z+1/3', 'x+1/2,-y,-z+1/4', 'z,x+1/2,y'].map(op);
    expect(equals(compose(compose(a, b), c), compose(a, compose(b, c)))).toBe(true);
  });

  it('reduces the translation modulo 1 and compares modulo the lattice', () => {
    expect(formatOperation(reduce(op('x-1/2,-y-1/2')))).toBe('x+1/2,-y+1/2');
    expect(equalModLattice(op('x-1/2,-y+3/2'), op('x+1/2,-y+1/2'))).toBe(true);
    expect(equalModLattice(op('x+1/2,-y'), op('x+1/2,-y+1/2'))).toBe(false);
    expect(equalModLattice(op('x,y'), op('x,-y'))).toBe(false);
  });

  it('gives determinant and trace of the matrix', () => {
    expect(determinant(op('-y,x-y').matrix)).toBe(1);
    expect(trace(op('-y,x-y').matrix)).toBe(-1); // threefold rotation in the plane: trace 2 cos 120° = −1
    expect(determinant(op('-x,y,z').matrix)).toBe(-1);
    expect(determinant(op('-x').matrix)).toBe(-1);
  });

  it('checks the dimension of an operation', () => {
    expect(dimensionOf(op('x,y'))).toBe(2);
    const bad = { matrix: [[1, 0]], translation: [rational(0)] } as ExactOperation;
    expect(() => dimensionOf(bad)).toThrow(RangeError);
    const fractional = { matrix: [[0.5]], translation: [rational(0)] } as ExactOperation;
    expect(() => dimensionOf(fractional)).toThrow(RangeError);
  });

  it('gives plain data for the API: integer matrix, translation as doubles', () => {
    expect(toPlain(op('-y,x-y,z+1/3'))).toEqual({
      matrix: [
        [0, -1, 0],
        [1, -1, 0],
        [0, 0, 1],
      ],
      translation: [0, 0, 1 / 3],
    });
    expect(fromNumber(1 / 3)).toEqual([1, 3]);
    expect(fromNumber(-0.75)).toEqual([-3, 4]);
    expect(() => fromNumber(0.123)).toThrow(RangeError);
  });
});

describe('closure', () => {
  it('p2gg: the 2 and a glide give four cosets (hand-derived above)', () => {
    expect(closureSet(['-x,-y', '-x+1/2,y+1/2'])).toEqual(['-x+1/2,y+1/2', '-x,-y', 'x+1/2,-y+1/2', 'x,y']);
  });

  it('c2mm: a centring translation is a generator and doubles the cosets', () => {
    expect(closureSet(['-x,-y', '-x,y', 'x+1/2,y+1/2'])).toEqual(
      ['x,y', '-x,-y', '-x,y', 'x,-y', 'x+1/2,y+1/2', '-x+1/2,-y+1/2', '-x+1/2,y+1/2', 'x+1/2,-y+1/2'].sort(),
    );
  });

  it('starts with the identity and gives one representative per coset, translations in [0, 1)', () => {
    const ops = closure(['-y,x-y', '-x,-y', '-y,-x'].map(op));
    expect(formatOperation(ops[0])).toBe('x,y');
    // p6mm: point group 6mm of order 12, six rotations (det +1) and six reflections (det −1).
    expect(ops).toHaveLength(12);
    expect(ops.filter((o) => determinant(o.matrix) === 1)).toHaveLength(6);
    for (const o of ops) {
      for (const t of o.translation) {
        expect(t[0] >= 0 && t[0] < t[1]).toBe(true);
      }
    }
  });

  it('is closed: every product of two representatives is one of them modulo the lattice', () => {
    const ops = closure(['-x,-y', '-x+1/2,y+1/2', 'x+1/2,y+1/2'].map(op));
    for (const a of ops) {
      for (const b of ops) {
        expect(ops.some((c) => equalModLattice(c, compose(a, b)))).toBe(true);
      }
    }
  });

  it('works in three dimensions: P2₁2₁2₁ (hand-derived)', () => {
    // (3) -x,y+1/2,-z+1/2 first, then (2) -x+1/2,-y,z+1/2: (x+1/2, -y-1/2, -z+1) ≡ x+1/2,-y+1/2,-z.
    expect(closureSet(['-x+1/2,-y,z+1/2', '-x,y+1/2,-z+1/2'])).toEqual(
      ['x,y,z', '-x+1/2,-y,z+1/2', '-x,y+1/2,-z+1/2', 'x+1/2,-y+1/2,-z'].sort(),
    );
  });

  it('reaches the largest group, Fm-3m with 48 × 4 = 192 cosets, and no further', () => {
    const fm3m = ['z,x,y', '-y,x,z', '-x,-y,-z', 'x,y+1/2,z+1/2', 'x+1/2,y,z+1/2'].map(op);
    expect(closure(fm3m)).toHaveLength(MAX_COSETS);
    // A translation by 1/3 on top would triple the cosets.
    expect(() => closure([...fm3m, translation([rational(1, 3), rational(0), rational(0)])])).toThrow(RangeError);
  });

  it('refuses generators of infinite order and mixed dimensions; an empty list needs the dimension', () => {
    expect(() => closure([op('x+y,y')])).toThrow(RangeError); // a shear: no crystallographic group
    expect(() => closure([op('-x,-y'), op('-x,-y,z')])).toThrow(RangeError);
    expect(() => closure([])).toThrow(RangeError);
    expect(closure([], 2).map(formatOperation)).toEqual(['x,y']);
  });
});
