/**
 * The geometry of a point group's operations: what each operation is (rotation, mirror, …), about
 * which axis and in which sense, and which symmetry elements lie along each symmetry direction of
 * the full Hermann–Mauguin symbol. Structured data only; symbols such as `3⁺ x,x,x` or `2_z` are
 * left to the applications (docs/conventions.md, "Symmetry directions and elements").
 */

import { AXIS_EPSILON } from '../tolerances.js';
import { SETTING_KEYS, checkOptions } from '../checks.js';
import { det, trace, type Mat3, type Vec3 } from '../linalg.js';
import { crystalFamily } from '../lattice.js';
import type { Operation } from '../operations.js';
import type { Uvw } from '../symmetryDirections.js';
import type { IntMat3 } from './itaOrder.js';
import { itcBasis, itcSetting, itcSymmetryDirections } from './itcData.js';
import { seitzOf, type SeitzTable } from './seitzData.js';
import {
  classSettingOf,
  operations,
  pointGroup,
  settingIndexOf,
  symbol,
  type MagneticPointGroupKey,
  type SettingOptions,
} from './pointGroups.js';

/** What a point operation is; a rotoinversion n̄ is the inversion times the rotation n (n = 3, 4, 6). */
export type OperationKind = 'identity' | 'inversion' | 'rotation' | 'rotoinversion' | 'reflection';

/** A symmetry direction: as a lattice direction [uvw] and as a Cartesian unit vector. */
export interface Axis {
  /**
   * Integer coordinates in the conventional basis: for the axis of an operation with the sign of its
   * Seitz symbol (ITA Tables 1.4.2.1–1.4.2.3), for a symmetry direction with the sign of ITA Table
   * 2.1.3.1.
   */
  readonly lattice: Uvw;
  /**
   * Unit vector in the Cartesian frame of symcrys. Monoclinic: a, b, c taken along x, y, z, exact for
   * the unique axis only (docs/conventions.md, "Symmetry directions and elements").
   */
  readonly cartesian: Vec3;
}

/** One point operation described geometrically. */
export interface OperationDescription {
  /** What the operation is, without time reversal. */
  readonly kind: OperationKind;
  /**
   * The n of the symbol n or n̄ (ITA 2016 § 1.2.1, p. 12: an n-fold rotation): 1 for the identity and the
   * inversion, 2 for a reflection (m = 2̄), otherwise the order of the rotation part.
   */
  readonly n: number;
  /** Rotation axis, rotoinversion axis or the normal of the mirror plane; absent for the identity and the inversion. */
  readonly axis?: Axis;
  /**
   * For n ≥ 3: `'+'` if the rotation part turns by +360°/n about `axis` (counter-clockwise seen
   * from the tip of `axis` looking towards the origin), `'-'` if by −360°/n.
   */
  readonly sense?: '+' | '-';
  /** True if the operation is combined with time reversal (a primed operation). */
  readonly timeReversal: boolean;
}

/** The symmetry elements along one symmetry direction. */
export interface DirectionElements extends Axis {
  /**
   * Highest n of a rotation n about this direction; 1 if there is none. In a magnetic group
   * rotations, rotoinversions and mirrors count with and without time reversal;
   * `describeOperations` tells them apart.
   */
  readonly rotation: number;
  /** Highest n of a rotoinversion n̄ (n = 3, 4, 6) about this direction; 0 if there is none. */
  readonly rotoinversion: number;
  /** True if a mirror plane is perpendicular to this direction. */
  readonly mirror: boolean;
}

/** One position of the full Hermann–Mauguin symbol: its symbol and its symmetry directions. */
export interface SymmetryDirection {
  /** 1-based position in the full symbol. */
  readonly position: number;
  /**
   * The symbol at this position of the full symbol, if the full symbol has this position; for a
   * magnetic group with its primes (`4'/m`).
   */
  readonly symbol?: string;
  /**
   * The symmetry directions of this position (ITA Table 2.1.3.1; for a monoclinic group the
   * direction of the position of the full symbol, of which only the unique axis is in the table),
   * each with the elements along it.
   */
  readonly directions: readonly DirectionElements[];
}

function normalize(v: Vec3): Vec3 {
  const n = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / n, v[1] / n, v[2] / n];
}

const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** [uvw] in the basis `b` (columns a, b, c) as a Cartesian unit vector, with the direction itself. */
function axisOf(b: Mat3, uvw: Uvw): Axis {
  const v: Vec3 = [
    b[0][0] * uvw[0] + b[0][1] * uvw[1] + b[0][2] * uvw[2],
    b[1][0] * uvw[0] + b[1][1] * uvw[1] + b[1][2] * uvw[2],
    b[2][0] * uvw[0] + b[2][1] * uvw[1] + b[2][2] * uvw[2],
  ];
  return Object.freeze({ lattice: uvw, cartesian: Object.freeze(normalize(v)) as unknown as Vec3 });
}

/** The proper rotation part of a matrix and its order n (1 for the identity). */
function rotationPart(m: Mat3): { r: Mat3; n: number } {
  const r = det(m) > 0 ? m : (m.map((row) => row.map((v) => -v)) as unknown as Mat3);
  const cos = Math.max(-1, Math.min(1, (trace(r) - 1) / 2));
  const angle = Math.acos(cos);
  const n = angle < AXIS_EPSILON ? 1 : Math.round((2 * Math.PI) / angle);
  if (![1, 2, 3, 4, 6].includes(n)) throw new Error(`Not a crystallographic operation (rotation order ${n})`);
  return { r, n };
}

/** The axis of a proper rotation of order n ≥ 2 (sign arbitrary for n = 2). */
export function rotationAxis(r: Mat3, n: number): Vec3 {
  if (n === 2) {
    // r + 1 has rank 1; its columns are parallel to the axis.
    let best: Vec3 = [0, 0, 0];
    let size = 0;
    for (let j = 0; j < 3; j++) {
      const col: Vec3 = [r[0][j] + (j === 0 ? 1 : 0), r[1][j] + (j === 1 ? 1 : 0), r[2][j] + (j === 2 ? 1 : 0)];
      const l = Math.hypot(col[0], col[1], col[2]);
      if (l > size) {
        size = l;
        best = col;
      }
    }
    return normalize(best);
  }
  return normalize(axialVector(r));
}

/** (r − rᵀ)/2 as a vector: sin θ times the unit axis for a rotation by θ. */
export const axialVector = (r: Mat3): Vec3 => [
  (r[2][1] - r[1][2]) / 2,
  (r[0][2] - r[2][0]) / 2,
  (r[1][0] - r[0][1]) / 2,
];

function findAxis(axes: readonly Axis[], u: Vec3, what: string): Axis {
  const a = axes.find((x) => Math.abs(Math.abs(dot(x.cartesian, u)) - 1) < AXIS_EPSILON);
  if (!a) throw new Error(`${what}: axis [${u.map((v) => v.toFixed(4)).join(', ')}] is not a symmetry direction`);
  return a;
}

const parallel = (a: Vec3, b: Vec3): boolean => Math.abs(Math.abs(dot(a, b)) - 1) < AXIS_EPSILON;

/**
 * An operation described geometrically. Its axis lies along a symmetry direction of the setting and
 * carries the sign of the operation's Seitz symbol (ITA 2016 Tables 1.4.2.1–1.4.2.3; "Pure ITC",
 * #114), which for n ≥ 3 fixes what the sense refers to; the sense, computed from the matrix, is
 * checked against the printed one.
 */
function describe(
  op: Operation,
  axes: readonly Axis[],
  basis: Mat3,
  table: SeitzTable,
  what: string,
): OperationDescription {
  const proper = det(op.cartesian) > 0;
  const { r, n } = rotationPart(op.cartesian);
  const timeReversal = op.timeReversal;
  if (n === 1) return Object.freeze({ kind: proper ? 'identity' : 'inversion', n: 1, timeReversal });
  const direction = findAxis(axes, rotationAxis(r, n), what);
  const seitz = seitzOf(table, op.matrix as unknown as IntMat3);
  if (!seitz?.axis) throw new Error(`${what}: no Seitz symbol for the matrix ${JSON.stringify(op.matrix)}`);
  // A frozen copy: the result must not share the table's array (every result frozen, #137 C4).
  const signed = axisOf(basis, Object.freeze([...seitz.axis]) as unknown as Uvw);
  if (!parallel(signed.cartesian, direction.cartesian)) {
    throw new Error(`${what}: the Seitz direction [${seitz.axis.join(',')}] is not along the axis of the operation`);
  }
  // The object of the symmetry direction where the signs agree, so that the two match by identity there.
  const axis = dot(signed.cartesian, direction.cartesian) > 0 ? direction : signed;
  const kind: OperationKind = proper ? 'rotation' : n === 2 ? 'reflection' : 'rotoinversion';
  if (n === 2) return Object.freeze({ kind, n: 2, axis, timeReversal });
  const sense = dot(axialVector(r), axis.cartesian) > 0 ? '+' : '-';
  if (sense !== seitz.sense) throw new Error(`${what}: the sense ${sense} differs from the Seitz symbol's`);
  return Object.freeze({ kind, n, axis, sense, timeReversal });
}

interface Analysis {
  readonly descriptions: readonly OperationDescription[];
  readonly directions: readonly SymmetryDirection[];
}

const cache = new Map<string, Analysis>();

function analysis(key: MagneticPointGroupKey, options?: SettingOptions): Analysis {
  const ops = operations(key, options); // checks key and setting
  const setting = settingIndexOf(key, options);
  const cacheKey = `${key}#${setting}`;
  const hit = cache.get(cacheKey);
  if (hit) return hit;

  const family = crystalFamily(pointGroup(key).crystalSystem);
  // The basis and the symmetry directions of the setting: for rhombohedral axes those of ITA Table
  // 2.1.3.1 for rhombohedral axes; monoclinic and triclinic a, b, c along x, y, z, exact for the
  // unique axis, the only symmetry direction that carries an element (itcData.ts, `itcBasis`).
  const c = classSettingOf(key, options);
  const basis = itcBasis(c.key, c.index);
  const positions = itcSymmetryDirections(c.key, c.index).map((dirs) => dirs.map((d) => axisOf(basis, d)));
  const all = positions.flat();
  const what = `Point group ${key}`;
  const table: SeitzTable =
    family !== 'hexagonal'
      ? 'cubic'
      : itcSetting(c.key, c.index).axes === 'rhombohedral'
        ? 'rhombohedral'
        : 'hexagonal';
  const descriptions = Object.freeze(ops.map((op) => describe(op, all, basis, table, what)));

  // The full symbol of a grey group ends in 1', which is no position of the symbol.
  const tokens =
    family === 'triclinic'
      ? []
      : symbol(key, { ...options, form: 'full' })
          .split(' ')
          .filter((t) => t !== "1'");
  const directions = Object.freeze(
    positions.map((axes, i) => {
      const elements = axes.map((a) => {
        const on = descriptions.filter((d) => d.axis !== undefined && parallel(d.axis.cartesian, a.cartesian));
        const max = (kind: OperationKind, none: number) =>
          on.filter((d) => d.kind === kind).reduce((m, d) => Math.max(m, d.n), none);
        return Object.freeze({
          ...a,
          rotation: max('rotation', 1),
          rotoinversion: max('rotoinversion', 0),
          mirror: on.some((d) => d.kind === 'reflection'),
        });
      });
      const position: SymmetryDirection =
        tokens[i] === undefined
          ? { position: i + 1, directions: Object.freeze(elements) }
          : { position: i + 1, symbol: tokens[i], directions: Object.freeze(elements) };
      return Object.freeze(position);
    }),
  );
  const result = { descriptions, directions };
  cache.set(cacheKey, result);
  return result;
}

/**
 * Each operation of the point group described geometrically, in the order of `operations` for
 * the same key and options. An axis lies along a symmetry direction and has the sign of the
 * operation's Seitz symbol (ITA 6th ed., Tables 1.4.2.1–1.4.2.3, p. 52), e.g. [1, 1, 0] for 2₁₁₀ in
 * the hexagonal family, where ITA Table 2.1.3.1 lists [1̄, 1̄, 0]; for n ≥ 3 the sign fixes what the
 * sense refers to.
 */
export function describeOperations(
  key: MagneticPointGroupKey,
  options?: SettingOptions,
): readonly OperationDescription[] {
  checkOptions(options, SETTING_KEYS, 'describeOperations');
  return analysis(key, options).descriptions;
}

/**
 * The positions of the full Hermann–Mauguin symbol in the requested setting, each with its
 * symmetry directions (ITA Table 2.1.3.1; monoclinic: the directions a, b, c of the full symbol,
 * of which only the unique axis is in the table) and the symmetry elements along them. All positions of the
 * crystal family are listed (for rhombohedral axes the two of that row of the table), also those the
 * symbol of the class leaves out (then without `symbol`); the triclinic family has none. A direction
 * has the sign of ITA Table 2.1.3.1, the axis of an operation along it that of its Seitz symbol, so
 * the two are parallel and may be opposite: match them by direction, up to sign.
 */
export function symmetryDirections(key: MagneticPointGroupKey, options?: SettingOptions): readonly SymmetryDirection[] {
  checkOptions(options, SETTING_KEYS, 'symmetryDirections');
  return analysis(key, options).directions;
}
