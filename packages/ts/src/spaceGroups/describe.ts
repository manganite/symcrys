/**
 * The geometric description of an operation of a plane group, as ITA gives it under "Symmetry
 * operations" (ITA 2016, § 2.1.3.9, pp. 160–161): what it is, its n and sense, where its
 * symmetry element lies and its glide part. Structured data; the symbols such as `g(1/2,1/2) x,x`
 * stay with the applications (docs/conventions.md, "Symmetry directions and elements").
 */

import { safeProduct, safeSum, signedPrimitive } from '../integers.js';
import { shown } from '../checks.js';
import {
  determinant,
  dimensionOf,
  multiplyMatrices,
  rotationOrder,
  trace,
  type ExactOperation,
  type IntMatrix,
} from './affine.js';
import { ZERO, add, multiply, rational, scale, type Rational } from './rational.js';

/**
 * What an operation of a plane group or plane point group is, in ITA's names of the operations:
 * `'reflection'` (in a line, as `'reflection'` of the point groups) and `'glide-reflection'`.
 *
 * @remarks Source: ITA (2016), Table 2.1.2.1, p. 145.
 */
export type PlaneOperationKind = 'identity' | 'translation' | 'rotation' | 'reflection' | 'glide-reflection';

/** One operation of a plane group described geometrically, in the lattice basis. */
export interface PlaneOperationDescription {
  /** What the operation is. */
  readonly kind: PlaneOperationKind;
  /** The n of its linear part (an n-fold rotation): 1 for identity and translation, 2 for a reflection or glide reflection. */
  readonly n: number;
  /** For a rotation with n ≥ 3: `'+'` if it turns a towards b, `'-'` otherwise. */
  readonly sense?: '+' | '-';
  /** For a translation: the translation vector. */
  readonly translation?: readonly Rational[];
  /**
   * For a rotation: its centre. For a mirror or glide: a point of its line, on y = 0 unless the line
   * is parallel to it, then on x = 0. Not reduced modulo the lattice: the centre of `-y,x+1/2` is
   * (−1/4, 1/4).
   */
  readonly location?: readonly Rational[];
  /** For a mirror or glide: the direction of its line, the shortest integer vector, first non-zero component positive. */
  readonly direction?: readonly [number, number];
  /**
   * For a reflection or glide reflection: its axis, the normal of its line in the lattice basis (as
   * the `axis` of a reflection of the point groups is the normal of its plane), its symmetry
   * direction with the sign of its Seitz symbol (ITA 2016 Tables 1.4.2.4, 1.4.2.5, p. 53: `m₁₀`,
   * `m₁₂`): the shortest integer vector along the columns of W − I, first non-zero component
   * positive, which is the Seitz direction for every plane group (tested). Without a metric it is not the perpendicular of `direction`: in a
   * hexagonal basis the normal of a line along [1,0] is [1,2].
   */
  readonly axis?: readonly [number, number];
  /**
   * For a glide: the glide vector (w + W·w)/2, not reduced modulo the lattice. An operation whose
   * glide vector is a non-zero lattice vector is a glide, as it is geometrically, although the
   * symmetry element of its coset is the mirror line, which ITA lists.
   */
  readonly glide?: readonly Rational[];
}

/** The shortest integer vector along the non-zero column of a 2 × 2 matrix of rank 1, first non-zero component positive. */
function primitiveColumn(m: IntMatrix): [number, number] {
  const col = m[0][0] !== 0 || m[1][0] !== 0 ? [m[0][0], m[1][0]] : [m[0][1], m[1][1]];
  return signedPrimitive(col) as [number, number];
}

function power(m: IntMatrix, n: number): IntMatrix {
  let p: IntMatrix = [
    [1, 0],
    [0, 1],
  ];
  for (let k = 0; k < n; k++) {
    // Checked: a value outside the safe integers throws instead of rounding.
    p = multiplyMatrices(p, m);
  }
  return p;
}

const isIdentity = (m: IntMatrix): boolean => m[0][0] === 1 && m[0][1] === 0 && m[1][0] === 0 && m[1][1] === 1;

/**
 * Describes an operation of a plane group; the result is frozen. Throws unless the operation is two-dimensional with the
 * linear part of a crystallographic plane point group (determinant ±1, order 1, 2, 3, 4 or 6).
 */
export function describePlaneOperation(op: ExactOperation): PlaneOperationDescription {
  if (dimensionOf(op) !== 2) {
    throw new RangeError('Not an operation of the plane');
  }
  const w = op.matrix;
  const t = op.translation;
  const det = determinant(w);
  if (det === 1) {
    const n = rotationOrder(trace(w));
    if (n === undefined || !isIdentity(power(w, n))) {
      throw new RangeError(`Not a crystallographic rotation: ${shown(w)}`);
    }
    if (n === 1) {
      return t.every((v) => v[0] === 0)
        ? { kind: 'identity', n: 1 }
        : { kind: 'translation', n: 1, translation: [...t] };
    }
    // The centre p solves (I − W) p = w; det(I − W) = 2 − trace W ≠ 0 for a rotation.
    const a = [
      [1 - w[0][0], -w[0][1]],
      [-w[1][0], 1 - w[1][1]],
    ];
    const d = safeSum(safeProduct(a[0][0], a[1][1]), -safeProduct(a[0][1], a[1][0]));
    const inv = rational(1, d);
    const location = [
      multiply(add(scale(a[1][1], t[0]), scale(-a[0][1], t[1])), inv),
      multiply(add(scale(-a[1][0], t[0]), scale(a[0][0], t[1])), inv),
    ];
    const description: PlaneOperationDescription = { kind: 'rotation', n, location: Object.freeze(location) };
    // The sense: the sign of a × W·a with a = (1, 0), the same in any right-handed basis.
    return Object.freeze(n === 2 ? description : { ...description, sense: w[1][0] > 0 ? '+' : '-' });
  }
  if (det !== -1 || trace(w) !== 0 || !isIdentity(power(w, 2))) {
    throw new RangeError(`Not a crystallographic reflection: ${shown(w)}`);
  }
  // A mirror or glide: W² = I. Glide vector g = (w + W·w)/2, along the line; the line is the set of p with (I − W) p = w − g.
  const wt = [add(scale(w[0][0], t[0]), scale(w[0][1], t[1])), add(scale(w[1][0], t[0]), scale(w[1][1], t[1]))];
  const half = rational(1, 2);
  const glide = [multiply(add(t[0], wt[0]), half), multiply(add(t[1], wt[1]), half)];
  const s = [add(t[0], scale(-1, glide[0])), add(t[1], scale(-1, glide[1]))];
  const direction = primitiveColumn([
    [w[0][0] + 1, w[0][1]],
    [w[1][0], w[1][1] + 1],
  ]);
  const normal = primitiveColumn([
    [w[0][0] - 1, w[0][1]],
    [w[1][0], w[1][1] - 1],
  ]);
  // (I − W) has rank 1; one of its non-zero rows a gives a·p = s_i. A point on y = 0 if the line meets it.
  const a = [
    [1 - w[0][0], -w[0][1]],
    [-w[1][0], 1 - w[1][1]],
  ];
  const i = a[0][0] !== 0 || a[0][1] !== 0 ? 0 : 1;
  const location: Rational[] =
    a[i][0] !== 0 ? [multiply(s[i], rational(1, a[i][0])), ZERO] : [ZERO, multiply(s[i], rational(1, a[i][1]))];
  const line = {
    n: 2,
    location: Object.freeze(location),
    direction: Object.freeze(direction),
    axis: Object.freeze(normal),
  };
  return Object.freeze(
    glide.some((v) => v[0] !== 0)
      ? { kind: 'glide-reflection' as const, ...line, glide: Object.freeze(glide) }
      : { kind: 'reflection' as const, ...line },
  );
}
