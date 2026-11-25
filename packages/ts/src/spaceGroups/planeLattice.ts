/**
 * The lattices of the plane: the crystal families with their Bravais lattices and cell restrictions
 * (ITA 2016 Table 2.1.1.1, p. 143, block "Two dimensions"), the Laue class of a plane point group
 * (ITA 2016 § 3.2.1.1, p. 720), and the cell functions for d = 2 (#119, #137 G5). Internal; the
 * entry point is `symcrys/plane`.
 */

import { FLAT_CELL_RATIO, SINGULAR_RATIO } from '../tolerances.js';
import { checkObject, shown } from '../checks.js';
import type { PlaneSystem } from './planeGroupData.js';
import {
  PLANE_POINT_GROUP_KEYS,
  planePointGroupOperations,
  planePointGroupSettingCount,
  type PlanePointGroupKey,
} from './planePointGroups.js';

/** A Bravais lattice of the plane, by its symbol in ITA Table 2.1.1.1: family symbol and centring. */
export type PlaneBravaisLattice = 'mp' | 'op' | 'oc' | 'tp' | 'hp';

/** A parameter of a plane cell: the edge lengths a, b and the angle γ between them. */
export type PlaneCellParameter = 'a' | 'b' | 'gamma';

/** The angles of a plane cell fixed by its crystal system, in degrees. */
export interface PlaneFixedAngles {
  /** The angle γ between a and b, where the system fixes it. */
  readonly gamma?: number;
}

/** The restrictions on the cell parameters of a crystal system of the plane (ITA Table 2.1.1.1). */
export interface CellRestrictions {
  /** The parameters to be determined (column "Parameters to be determined"), e.g. `['a']` for square. */
  readonly parameters: readonly PlaneCellParameter[];
  /** Pairs of parameters that are equal: `[['a', 'b']]` for square and hexagonal. */
  readonly equal: readonly (readonly PlaneCellParameter[])[];
  /** The angles fixed to a value, in degrees: gamma 90 for rectangular and square, 120 for hexagonal; none for oblique. */
  readonly angles: PlaneFixedAngles;
  /** The angles conventionally taken non-acute (≥ 90°), the footnote § of the table: `['gamma']` for oblique. */
  readonly nonAcute: readonly PlaneCellParameter[];
}

/** One crystal family of the plane as Table 2.1.1.1 prints it; each has one crystal system. */
interface PlaneFamily {
  /** The family symbol (column "Symbol"). */
  readonly symbol: 'm' | 'o' | 't' | 'h';
  /** The Bravais lattices. */
  readonly bravaisLattices: readonly PlaneBravaisLattice[];
  readonly restrictions: CellRestrictions;
}

/** ITA 2016 Table 2.1.1.1, p. 143, block "Two dimensions" (references/itc/vol-a-table-2.1.1.1.md). */
export const PLANE_FAMILIES: Readonly<Record<PlaneSystem, PlaneFamily>> = {
  oblique: {
    symbol: 'm',
    bravaisLattices: ['mp'],
    restrictions: { parameters: ['a', 'b', 'gamma'], equal: [], angles: {}, nonAcute: ['gamma'] },
  },
  rectangular: {
    symbol: 'o',
    bravaisLattices: ['op', 'oc'],
    restrictions: { parameters: ['a', 'b'], equal: [], angles: { gamma: 90 }, nonAcute: [] },
  },
  square: {
    symbol: 't',
    bravaisLattices: ['tp'],
    restrictions: { parameters: ['a'], equal: [['a', 'b']], angles: { gamma: 90 }, nonAcute: [] },
  },
  hexagonal: {
    symbol: 'h',
    bravaisLattices: ['hp'],
    restrictions: { parameters: ['a'], equal: [['a', 'b']], angles: { gamma: 120 }, nonAcute: [] },
  },
};

/** The Bravais lattice of a plane group: the family symbol of its system and its lattice letter. */
export function planeBravaisLattice(system: PlaneSystem, groupSymbol: string): PlaneBravaisLattice {
  const family = PLANE_FAMILIES[system];
  const lattice = `${family.symbol}${groupSymbol[0]}` as PlaneBravaisLattice;
  if (!family.bravaisLattices.includes(lattice)) {
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
