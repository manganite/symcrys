/**
 * The lattices of the plane: the crystal families with their Bravais lattices and cell restrictions,
 * computed from the plane groups and the holohedries (equal to ITA 2016 Table 2.1.1.1, p. 143, block
 * "Two dimensions"), the Laue class of a plane point group
 * (ITA 2016 § 3.2.1.1, p. 720), and the cell functions for d = 2. Internal; the
 * entry point is `symcrys/plane`.
 */

import { FLAT_CELL_RATIO, INTEGER_EPSILON, SINGULAR_RATIO } from '../tolerances.js';
import { checkObject, shown } from '../checks.js';
import type { PlaneSystem } from './planeGroupData.js';
import {
  PLANE_POINT_GROUP_KEYS,
  planePointGroupOperations,
  planePointGroupSettingCount,
  planePointGroupSystem,
  type PlanePointGroupKey,
} from './planePointGroups.js';
import { PLANE_GROUP_KEYS, planeGroupSystem } from './planeGroups.js';

/**
 * A Bravais lattice of the plane, by its ITA symbol: family symbol and centring.
 *
 * @remarks Source: ITA (2016), Table 2.1.1.1, p. 143.
 */
export type PlaneBravaisLattice = 'mp' | 'op' | 'oc' | 'tp' | 'hp';

/** A parameter of a plane cell: the edge lengths a, b and the angle γ between them. */
export type PlaneCellParameter = 'a' | 'b' | 'gamma';

/** The angles of a plane cell fixed by its crystal system, in degrees. */
export interface PlaneFixedAngles {
  /** The angle γ between a and b, where the system fixes it. */
  readonly gamma?: number;
}

/**
 * The restrictions on the cell parameters of a crystal system of the plane.
 *
 * @remarks Source: ITA (2016), Table 2.1.1.1, p. 143.
 */
export interface CellRestrictions {
  /**
   * The parameters to be determined, e.g. `['a']` for square.
   *
   * @remarks Source: the column "Parameters to be determined" of ITA (2016), Table 2.1.1.1.
   */
  readonly parameters: readonly PlaneCellParameter[];
  /** Pairs of parameters that are equal: `[['a', 'b']]` for square and hexagonal. */
  readonly equal: readonly (readonly PlaneCellParameter[])[];
  /** The angles fixed to a value, in degrees: gamma 90 for rectangular and square, 120 for hexagonal; none for oblique. */
  readonly angles: PlaneFixedAngles;
  /**
   * The angles conventionally taken non-acute (≥ 90°): `['gamma']` for oblique.
   *
   * @remarks Source: the footnote § of ITA (2016), Table 2.1.1.1.
   */
  readonly nonAcute: readonly PlaneCellParameter[];
}

/**
 * Vocabulary: the symbol of the crystal family of each crystal system of the plane, the first letter
 * of a Bravais-lattice symbol (ITA 2016 Table 2.1.1.1, p. 143, column "Symbol").
 */
export const PLANE_FAMILY_SYMBOLS: Readonly<Record<PlaneSystem, 'm' | 'o' | 't' | 'h'>> = Object.freeze({
  oblique: 'm',
  rectangular: 'o',
  square: 't',
  hexagonal: 'h',
});

/** The four crystal systems of the plane. */
export const PLANE_SYSTEMS = Object.freeze(Object.keys(PLANE_FAMILY_SYMBOLS) as PlaneSystem[]);

/** The Bravais lattices of a crystal system: the family symbol with the lattice letter of each of its plane groups. */
export function planeBravaisLattices(system: PlaneSystem): PlaneBravaisLattice[] {
  const letters = PLANE_GROUP_KEYS.filter((k) => planeGroupSystem(k) === system).map((k) => k[0]);
  return [...new Set(letters)]
    .sort((a, b) => (a === 'p' ? -1 : b === 'p' ? 1 : 0))
    .map((letter) => `${PLANE_FAMILY_SYMBOLS[system]}${letter}` as PlaneBravaisLattice);
}

/**
 * The holohedry of a crystal system of the plane: of its point groups the Laue class of the highest
 * order, the point symmetry of its lattice (2, 2mm, 4mm, 6mm).
 */
function holohedry(system: PlaneSystem): PlanePointGroupKey {
  const own = PLANE_POINT_GROUP_KEYS.filter((k) => planePointGroupSystem(k) === system);
  const order = (k: PlanePointGroupKey) => planePointGroupOperations(k).length;
  return own.map(planeLaueClass).reduce((a, b) => (order(b) > order(a) ? b : a));
}

/**
 * The restrictions on the conventional cell of a crystal system of the plane, computed from its
 * holohedry: the metric tensors G = [[a², ab cos γ], [ab cos γ, b²]] that every operation W of the
 * holohedry keeps (WᵀGW = G) form a linear space; a = b where it has g₁₁ = g₂₂ throughout, γ is
 * fixed where g₁₂ is a fixed multiple of g₁₁ (cos γ = g₁₂/g₁₁, 0 or −1/2), and the parameters to be
 * determined are the others. Convention data: an angle the holohedry leaves free is taken
 * non-acute (ITA 2016 Table 2.1.1.1, p. 143, footnote §).
 */
export function planeCellRestrictions(system: PlaneSystem): CellRestrictions {
  // The conditions on (g11, g12, g22), one row per entry of WᵀGW − G, solved exactly over the integers.
  const rows: number[][] = [];
  for (const op of planePointGroupOperations(holohedry(system))) {
    const [[p, q], [r, s]] = op.matrix;
    // (WᵀGW)_ij = Σ W_ki G_kl W_lj, with G = [[g11, g12], [g12, g22]].
    const entry = (i: number, j: number): number[] => {
      const w = [
        [p, q],
        [r, s],
      ];
      const c = [0, 0, 0];
      for (let k = 0; k < 2; k++)
        for (let l = 0; l < 2; l++) {
          const f = w[k][i] * w[l][j];
          c[k === 0 && l === 0 ? 0 : k === 1 && l === 1 ? 2 : 1] += f;
        }
      c[i === 0 && j === 0 ? 0 : i === 1 && j === 1 ? 2 : 1] -= 1;
      return c;
    };
    rows.push(entry(0, 0), entry(0, 1), entry(1, 1));
  }
  const basis = nullSpace(rows);
  const equalAB = basis.every((g) => g[0] === g[2]);
  // cos γ = g12/√(g11 g22) is the same for every G of the space when g12 = k·g11 with a = b, or g12 = 0.
  const fixedCos = basis.every((g) => g[1] === 0)
    ? 0
    : equalAB && basis.length === 1
      ? basis[0][1] / basis[0][0]
      : undefined;
  const gamma = fixedCos === undefined ? undefined : Math.round((Math.acos(fixedCos) * 180) / Math.PI);
  const parameters: PlaneCellParameter[] = [
    'a',
    ...(equalAB ? [] : ['b' as const]),
    ...(gamma === undefined ? ['gamma' as const] : []),
  ];
  return {
    parameters,
    equal: equalAB ? [['a', 'b']] : [],
    angles: gamma === undefined ? {} : { gamma },
    nonAcute: gamma === undefined ? ['gamma'] : [],
  };
}

/** A basis of the integer null space of a matrix with three columns, by exact elimination. */
function nullSpace(rows: readonly (readonly number[])[]): number[][] {
  const m = rows.map((r) => [...r]);
  const pivots: number[] = [];
  let row = 0;
  for (let col = 0; col < 3 && row < m.length; col++) {
    const p = m.findIndex((r, i) => i >= row && r[col] !== 0);
    if (p < 0) continue;
    [m[row], m[p]] = [m[p], m[row]];
    for (let i = 0; i < m.length; i++) {
      if (i === row || m[i][col] === 0) continue;
      const f = m[i][col];
      const g = m[row][col];
      m[i] = m[i].map((x, j) => x * g - m[row][j] * f);
    }
    pivots.push(col);
    row++;
  }
  const free = [0, 1, 2].filter((c) => !pivots.includes(c));
  return free.map((f) => {
    // One solution per free column: x_f = the product of the pivots, the pivot variables solved.
    const scale = pivots.reduce((s, c, i) => s * m[i][c], 1);
    const x = [0, 0, 0];
    x[f] = scale;
    pivots.forEach((c, i) => {
      x[c] = (-m[i][f] * scale) / m[i][c];
    });
    const sign = x.find((v) => v !== 0)! < 0 ? -1 : 1;
    return x.map((v) => v * sign + 0);
  });
}

/** The Bravais lattice of a plane group: the family symbol of its system and its lattice letter. */
export function planeBravaisLattice(system: PlaneSystem, groupSymbol: string): PlaneBravaisLattice {
  const lattice = `${PLANE_FAMILY_SYMBOLS[system]}${groupSymbol[0]}` as PlaneBravaisLattice;
  if (!planeBravaisLattices(system).includes(lattice)) {
    throw new Error(`The plane group ${groupSymbol} has the lattice ${lattice}, not one of its family`);
  }
  return lattice;
}

const matrixKey = (m: readonly (readonly number[])[]): string => m.map((r) => r.join(',')).join(';');

/**
 * The Laue class of a plane point group: the point group with the twofold rotation added, which is
 * the symmetry centre of the plane ("its Laue class is obtained if a symmetry centre is added to its
 * point group", ITA 2016 § 3.2.1.1, p. 720). One of the six Laue classes 2, 2mm, 4, 4mm, 6, 6mm.
 */
export function planeLaueClass(key: PlanePointGroupKey): PlanePointGroupKey {
  const ops = planePointGroupOperations(key).map((op) => op.matrix);
  const wanted = new Set([...ops, ...ops.map((m) => m.map((r) => r.map((x) => -x + 0)))].map(matrixKey));
  for (const k of PLANE_POINT_GROUP_KEYS) {
    for (let s = 1; s <= planePointGroupSettingCount(k); s++) {
      const have = new Set(planePointGroupOperations(k, s).map((op) => matrixKey(op.matrix)));
      if (have.size === wanted.size && [...wanted].every((m) => have.has(m))) return k;
    }
  }
  throw new Error(`No Laue class for the plane point group ${key}`);
}

// --- cells ------------------------------------------------------------------------------------------

/** A 2 × 2 matrix, as two rows: a basis has the columns a and b. */
export type Mat2 = readonly [readonly [number, number], readonly [number, number]];

/** The parameters of a plane cell: the edge lengths a, b and the angle γ between them in degrees. */
export interface LatticeParameters {
  /** Edge length a. */
  readonly a: number;
  /** Edge length b. */
  readonly b: number;
  /** Angle γ between a and b, in degrees. */
  readonly gamma: number;
}

const DEG = Math.PI / 180;

/** cos of an angle in degrees, exact at the angles of the plane lattices (60°, 90°, 120°, …). */
function cosDeg(x: number): number {
  const exact: Record<number, number> = { 0: 1, 60: 0.5, 90: 0, 120: -0.5, 180: -1 };
  return x in exact ? exact[x] : Math.cos(x * DEG);
}

/**
 * The Cartesian basis of a plane cell as the columns of a 2 × 2 matrix: a along x, b at γ from a
 * towards +y, so the basis is right-handed. Throws a RangeError for an edge that is not a positive
 * finite number, for γ outside (0°, 180°), and for a cell that is flat within rounding (sin γ, the
 * ratio V/(ab), at most 10⁻⁶, as the cells of the point groups).
 */
export function planeLatticeFromParameters(p: LatticeParameters, who: string): Mat2 {
  checkObject(p, `${who} takes the parameters { a, b, gamma }`);
  for (const name of ['a', 'b'] as const) {
    const x = p[name];
    if (!(typeof x === 'number' && Number.isFinite(x) && x > 0)) {
      throw new RangeError(`${who}: edge ${name} must be a positive number, not ${shown(x)}`);
    }
  }
  const g = p.gamma;
  if (!(typeof g === 'number' && Number.isFinite(g) && g > 0 && g < 180)) {
    throw new RangeError(`${who}: gamma must be an angle in degrees between 0 and 180, not ${shown(g)}`);
  }
  const c = cosDeg(g);
  const s = Math.sqrt(1 - c * c);
  if (!(s > FLAT_CELL_RATIO))
    throw new RangeError(`${who}: gamma ${g}° gives no cell (a and b parallel within rounding)`);
  const basis: Mat2 = [
    [p.a + 0, p.b * c + 0],
    [0, p.b * s + 0],
  ];
  // Edges so large or small that the cell cannot be computed with are refused as by the basis check.
  planeBasisColumns(basis, who);
  return basis;
}

/**
 * The columns a, b of a basis, checked: two rows of two finite numbers, and regular by the criterion
 * of the point groups (`isSingular`): the product of the column lengths finite and not zero, the
 * determinant above 10⁻⁹ of it, so that no later product overflows or vanishes.
 */
export function planeBasisColumns(basis: unknown, who: string): [readonly number[], readonly number[]] {
  const ok =
    Array.isArray(basis) &&
    basis.length === 2 &&
    basis.every(
      (row) => Array.isArray(row) && row.length === 2 && row.every((x) => typeof x === 'number' && Number.isFinite(x)),
    );
  if (!ok) throw new RangeError(`${who}: the basis must be a 2 × 2 matrix of finite numbers, not ${shown(basis)}`);
  const b = basis as unknown as Mat2;
  const bound = Math.hypot(b[0][0], b[1][0]) * Math.hypot(b[0][1], b[1][1]);
  const det = b[0][0] * b[1][1] - b[0][1] * b[1][0];
  if (!(Number.isFinite(bound) && bound > 0 && Math.abs(det) > SINGULAR_RATIO * bound)) {
    throw new RangeError(`${who}: singular basis ${shown(basis)}`);
  }
  return [
    [b[0][0], b[1][0]],
    [b[0][1], b[1][1]],
  ];
}

/** The parameters a, b, γ of a basis (columns a, b), independent of its orientation and handedness. */
export function planeLatticeParameters(basis: unknown, who: string): LatticeParameters {
  const [a, b] = planeBasisColumns(basis, who);
  const cross = a[0] * b[1] - a[1] * b[0];
  const dot = a[0] * b[0] + a[1] * b[1];
  return { a: Math.hypot(a[0], a[1]), b: Math.hypot(b[0], b[1]), gamma: Math.atan2(Math.abs(cross), dot) / DEG + 0 };
}

/** The metric tensor G = AᵀA of a basis A (columns a, b). */
export function planeMetricTensor(basis: unknown, who: string): Mat2 {
  const [a, b] = planeBasisColumns(basis, who);
  const dot = (u: readonly number[], v: readonly number[]) => u[0] * v[0] + u[1] * v[1] + 0;
  return [
    [dot(a, a), dot(a, b)],
    [dot(b, a), dot(b, b)],
  ];
}

/**
 * The operations of a list whose integer matrix W keeps the metric of a cell, WᵀGW = G, compared
 * relative to the largest entry of G within `tolerance`; the list is taken as it is and the kept
 * operations are the ones of the list, in its order (the plane form of `residualOperations` of
 * cell.ts). Throws a RangeError for a list that is not one, an operation without a 2 × 2
 * matrix of integers (`matrix`, not a Cartesian matrix) and a basis as `planeBasisColumns`.
 */
export function planeResidualOperations<T extends { readonly matrix: readonly (readonly number[])[] }>(
  operations: readonly T[],
  basis: unknown,
  tolerance: number,
  who: string,
): T[] {
  const g = planeMetricTensor(basis, who);
  if (!Array.isArray(operations)) throw new RangeError(`${who}: operations must be a list`);
  operations.forEach((op, i) => {
    const m = (op as { readonly matrix?: unknown } | null)?.matrix;
    const ok =
      Array.isArray(m) &&
      m.length === 2 &&
      m.every((r) => Array.isArray(r) && r.length === 2 && r.every((x) => typeof x === 'number' && Number.isFinite(x)));
    if (!ok) throw new RangeError(`${who}: operation ${i} has no 2 × 2 matrix of finite numbers`);
    // W is an integer matrix in the lattice basis; anything else would give a wrong answer.
    if (!(m as number[][]).every((r) => r.every((x) => Math.abs(x - Math.round(x)) < INTEGER_EPSILON))) {
      throw new RangeError(
        `${who}: the matrix of operation ${i} is not an integer matrix in the lattice basis: ${shown(m)}`,
      );
    }
  });
  const scale = Math.max(...g.flat().map(Math.abs));
  return operations.filter(({ matrix: w }) => {
    // (WᵀGW)_ij = Σ_kl W_ki G_kl W_lj
    for (let i = 0; i < 2; i++)
      for (let j = 0; j < 2; j++) {
        let s = 0;
        for (let k = 0; k < 2; k++) for (let l = 0; l < 2; l++) s += w[k][i] * g[k][l] * w[l][j];
        if (!(Math.abs(s - g[i][j]) < tolerance * scale)) return false;
      }
    return true;
  });
}

/** The reciprocal basis A⁻ᵀ of a basis A (columns a, b) as the columns a*, b*, with a_i · a*_j = δ_ij. */
export function planeReciprocalBasis(basis: unknown, who: string): Mat2 {
  const [a, b] = planeBasisColumns(basis, who);
  const det = a[0] * b[1] - a[1] * b[0];
  // A = [[a0, b0], [a1, b1]]; A⁻¹ = [[b1, -b0], [-a1, a0]] / det; A⁻ᵀ = [[b1, -a1], [-b0, a0]] / det.
  return [
    [b[1] / det + 0, -a[1] / det + 0],
    [-b[0] / det + 0, a[0] / det + 0],
  ];
}
