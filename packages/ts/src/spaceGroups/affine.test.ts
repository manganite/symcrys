import { describe, expect, it } from 'vitest';
import {
  MAX_COSETS,
  applyToPoint,
  closure,
  compose,
  cosetsByGenerators,
  determinant,
  dimensionOf,
  equalModLattice,
  formatOperation,
  checkUnimodular,
  identity,
  inverse,
  parseOperation,
  operationsEqual,
  reduceModLattice,
  toPlain,
  trace,
  translationOperation,
  type ExactOperation,
} from './affine.js';
import { rational } from './rational.js';

const op = parseOperation;

/** The closure as a sorted list of coordinate triplets, to compare as a set. */
function closureSet(generators: string[]): string[] {
  return closure(generators.map(op)).map(formatOperation).sort();
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
    // A stray sign is an error, not skipped.
    expect(() => op('--x,y')).toThrow(RangeError);
    expect(() => op('x+,y')).toThrow(RangeError);
    expect(() => op('x+-1/2,y')).toThrow(RangeError);
    expect(() => op('+-x,y')).toThrow(RangeError);
    expect(() => op('x++y,y')).toThrow(RangeError);
    // A term without a sign after the first one ("2/3x" is 2/3 followed by x).
    expect(() => op('2/3x,y')).toThrow(RangeError);
    expect(() => op('x,')).toThrow(RangeError);
  });

  it('reads one-dimensional operations', () => {
    expect(formatOperation(op('-x+1/2'))).toBe('-x+1/2');
    expect(formatOperation(inverse(op('-x+1/2')))).toBe('-x+1/2');
    expect(closure([op('-x')]).map(formatOperation)).toEqual(['x', '-x']);
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
      expect(operationsEqual(compose(a, inverse(a)), identity(dimensionOf(a)))).toBe(true);
      expect(operationsEqual(compose(inverse(a), a), identity(dimensionOf(a)))).toBe(true);
    }
    expect(() => inverse(op('2x,y'))).toThrow(RangeError);
    expect(() => checkUnimodular(op('-y,-y'))).toThrow(RangeError);
  });

  it('is associative', () => {
    const [a, b, c] = ['-y,x-y,z+1/3', 'x+1/2,-y,-z+1/4', 'z,x+1/2,y'].map(op);
    expect(operationsEqual(compose(compose(a, b), c), compose(a, compose(b, c)))).toBe(true);
  });

  it('reduces the translation modulo 1 and compares modulo the lattice', () => {
    expect(formatOperation(reduceModLattice(op('x-1/2,-y-1/2')))).toBe('x+1/2,-y+1/2');
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
    const tooLarge = { matrix: [[2 ** 53]], translation: [rational(0)] } as ExactOperation;
    expect(() => dimensionOf(tooLarge)).toThrow(RangeError);
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
  });
});

describe('closure', () => {
  // The expected sets of p2gg, c2mm and P2₁2₁2₁ are derived by hand in the comments (class (b));
  // they are also the general positions printed in ITA 2016, plane groups 8 and 9 (pp. 183, 184).
  it('p2gg: the 2 and a glide give four cosets (hand-derived above)', () => {
    expect(closureSet(['-x,-y', '-x+1/2,y+1/2'])).toEqual(['-x+1/2,y+1/2', '-x,-y', 'x+1/2,-y+1/2', 'x,y']);
  });

  it('c2mm: a centring translation is a generator and doubles the cosets', () => {
    expect(closureSet(['-x,-y', '-x,y', 'x+1/2,y+1/2'])).toEqual(
      ['x,y', '-x,-y', '-x,y', 'x,-y', 'x+1/2,y+1/2', '-x+1/2,-y+1/2', '-x+1/2,y+1/2', 'x+1/2,-y+1/2'].sort(),
    );
  });

  it('starts with the identity and gives one representative per coset, translations in [0, 1)', () => {
    // p6mm from ITA's selected generators (2), (4), (7); expected: the general position printed in
    // ITA 2016, plane group 17 (p. 192), class (a).
    const ops = closure(['-y,x-y', '-x,-y', '-y,-x'].map(op));
    expect(formatOperation(ops[0])).toBe('x,y');
    expect(ops.map(formatOperation).sort()).toEqual(
      [
        'x,y',
        '-y,x-y',
        '-x+y,-x',
        '-x,-y',
        'y,-x+y',
        'x-y,x',
        '-y,-x',
        '-x+y,y',
        'x,x-y',
        'y,x',
        'x-y,-y',
        '-x,-x+y',
      ].sort(),
    );
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
    expect(() => closure([...fm3m, translationOperation([rational(1, 3), rational(0), rational(0)])])).toThrow(
      RangeError,
    );
  });

  it('takes a bound on the cosets', () => {
    // p4mm with a translation by a/3, hence also b/3: 9 translations modulo the lattice times the
    // 8 operations of 4mm = 72 cosets (hand count).
    const gens = ['-x,-y', '-y,x', '-x,y', 'x+1/3,y'].map(op);
    expect(closure(gens)).toHaveLength(72);
    expect(() => closure(gens, { maxCosets: 50 })).toThrow(RangeError);
  });

  it('refuses generators of infinite order, singular ones and mixed dimensions', () => {
    expect(() => closure([op('x+y,y')])).toThrow(RangeError); // a shear: no crystallographic group
    expect(() => closure([op('0,0')])).toThrow(RangeError); // singular: closes into a monoid
    expect(() => closure([op('-y,-y')])).toThrow(RangeError); // a typo for -y,-x
    expect(() => closure([op('-x,-y'), op('-x,-y,z')])).toThrow(RangeError);
  });

  it('needs the dimension for an empty list, and checks it', () => {
    expect(() => closure([])).toThrow(RangeError);
    expect(() => closure([], { dimension: 5 })).toThrow(RangeError);
    expect(() => closure([], { dimension: 2.5 })).toThrow(RangeError);
    expect(closure([], { dimension: 2 }).map(formatOperation)).toEqual(['x,y']);
  });
});

describe('cosetsByGenerators', () => {
  it('builds the group coset by coset, in the order of its generators', () => {
    // 4mm from the fourfold rotation and a mirror: 1, 4, 2, 4³, then the mirror times each.
    const list = cosetsByGenerators([op('-y,x,z'), op('-x,y,z')], 3, 48).map(formatOperation);
    expect(list).toEqual(['x,y,z', '-y,x,z', '-x,-y,z', 'y,-x,z', '-x,y,z', 'y,x,z', 'x,-y,z', '-y,-x,z']);
    // A centring: p2 in a centred cell, with the translation 1/2,1/2, has 4 cosets modulo the lattice.
    expect(cosetsByGenerators([op('-x,-y'), op('x+1/2,y+1/2')], 2, 12)).toHaveLength(4);
  });

  it('refuses generators that do not give a group coset by coset', () => {
    // A threefold rotation about [111] does not normalise the group of a fourfold rotation about z:
    // its cosets of that group are 12 operations, and they are not closed (the group is 432, of order 24).
    expect(() => cosetsByGenerators([op('-y,x,z'), op('z,x,y')], 3, 48)).toThrow(/give no group/);
    // A generator of infinite order modulo the lattice (a shear) is stopped at the largest order.
    expect(() => cosetsByGenerators([op('x+y,y,z')], 3, 48)).toThrow(/at most 48/);
  });

  it.fails('refuses more operations than the largest order, also in the last batch (#261)', () => {
    // 4mm has 8 operations: the mirror adds 4 to the 4 of the fourfold rotation, past the largest
    // order 6, in one batch after which the length is not checked.
    expect(() => cosetsByGenerators([op('-y,x,z'), op('-x,y,z')], 3, 6)).toThrow(/at most 6/);
  });

  it.fails('refuses a list that holds a coset twice (#261)', () => {
    // With three or more generators, the list built from the first ones need not be a group, and the
    // cosets of the next by it can overlap. These generators of the plane give 8 entries for the 6
    // operations of 3m: two cosets occur twice.
    expect(() => cosetsByGenerators(['-y,-x', 'x,x-y', '-x+y,y'].map(op), 2, 24)).toThrow(/twice|give no group/);
  });
});
