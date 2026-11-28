/**
 * The geometry of a point group's operations: what each operation is (rotation, mirror, …), about
 * which axis and in which sense, and which symmetry elements lie along each symmetry direction of
 * the full Hermann–Mauguin symbol. Structured data only; symbols such as `3⁺ x,x,x` or `2_z` are
 * left to the applications (docs/conventions.md, "Symmetry directions and elements").
 */

import { SETTING_KEYS, checkOptions } from '../checks.js';
import { dot, type Mat3, type Vec3 } from '../linalg.js';
import { crystalFamily } from '../lattice.js';
import type { Operation } from '../operations.js';
import type { Uvw } from '../symmetryDirections.js';
import { settingBasis, settingSymmetryDirections } from './classData.js';
import { axialVector, elementOf, elementsAlong, normalize, parallel } from './rotations.js';
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
   * Seitz symbol, for a symmetry direction with the sign ITA gives the lattice symmetry direction.
   *
   * @remarks Source: ITA (2016), Tables 1.4.2.1–1.4.2.3 (Seitz symbols) and Table 2.1.3.1 (symmetry
   * directions).
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
   * The n of the symbol n or n̄ (n for an n-fold rotation): 1 for the identity and the inversion, 2
   * for a reflection (m = 2̄), otherwise the order of the rotation part.
   *
   * @remarks Source: ITA (2016), § 1.2.1, p. 12.
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
   * The symmetry directions of this position, each with the elements along it; for a monoclinic
   * group the direction a, b or c of the position of the full symbol, of which only the unique axis
   * is a lattice symmetry direction.
   *
   * @remarks Source: ITA (2016), Table 2.1.3.1 (the lattice symmetry directions).
   */
  readonly directions: readonly DirectionElements[];
}

/** [uvw] in the basis `b` (columns a, b, c) as a Cartesian unit vector, with the direction itself. */
function axisOf(b: Mat3, uvw: Uvw): Axis {
  const v: Vec3 = [
    b[0][0] * uvw[0] + b[0][1] * uvw[1] + b[0][2] * uvw[2],
    b[1][0] * uvw[0] + b[1][1] * uvw[1] + b[1][2] * uvw[2],
    b[2][0] * uvw[0] + b[2][1] * uvw[1] + b[2][2] * uvw[2],
  ];
  return Object.freeze({ lattice: uvw, cartesian: Object.freeze(normalize(v)) as unknown as Vec3 });
}

function findAxis(axes: readonly Axis[], u: Vec3, what: string): Axis {
  const a = axes.find((x) => parallel(x.cartesian, u));
  if (!a) throw new Error(`${what}: axis [${u.map((v) => v.toFixed(4)).join(', ')}] is not a symmetry direction`);
  return a;
}

/**
 * The direction of a Seitz symbol: the lattice symmetry direction of ITA Table 2.1.3.1, reversed
 * where none of its components is positive. This gives every subscript of ITA 2016 Tables
 * 1.4.2.1–1.4.2.3 (p. 52), which print [110] and [210] for the hexagonal directions [1̄1̄0] and
 * [2̄1̄0] and keep [1̄11̄], [1̄01] (tested against the tables).
 */
const seitzDirection = (uvw: Uvw): Uvw =>
  uvw.some((x) => x > 0) ? uvw : (Object.freeze(uvw.map((x) => -x + 0)) as unknown as Uvw);

/**
 * An operation described geometrically. Its axis lies along a symmetry direction of the setting and
 * carries the sign of the operation's Seitz symbol (`seitzDirection`), which for n ≥ 3 fixes what
 * the sense refers to; the sense is computed from the matrix.
 */
function describe(op: Operation, axes: readonly Axis[], basis: Mat3, what: string): OperationDescription {
  const { kind, n, rotation, axis: found } = elementOf(op.cartesian);
  const timeReversal = op.timeReversal;
  if (found === undefined) return Object.freeze({ kind, n: 1, timeReversal });
  const direction = findAxis(axes, found, what);
  const seitz = seitzDirection(direction.lattice);
  // The object of the symmetry direction where the signs agree, so that the two match by identity there.
  const axis = seitz === direction.lattice ? direction : axisOf(basis, seitz);
  if (n === 2) return Object.freeze({ kind, n: 2, axis, timeReversal });
  const sense = dot(axialVector(rotation), axis.cartesian) > 0 ? '+' : '-';
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
  // unique axis, the only symmetry direction that carries an element (classData.ts, `settingBasis`).
  const c = classSettingOf(key, options);
  const basis = settingBasis(c.key, c.index);
  const positions = settingSymmetryDirections(c.key, c.index).map((dirs) => dirs.map((d) => axisOf(basis, d)));
  const all = positions.flat();
  const what = `Point group ${key}`;
  const descriptions = Object.freeze(ops.map((op) => describe(op, all, basis, what)));
  const geometric = descriptions.map((d) => ({ kind: d.kind, n: d.n, axis: d.axis?.cartesian }));

  // The full symbol of a grey group ends in 1', which is no position of the symbol.
  const tokens =
    family === 'triclinic'
      ? []
      : symbol(key, { ...options, form: 'full' })
          .split(' ')
          .filter((t) => t !== "1'");
  const directions = Object.freeze(
    positions.map((axes, i) => {
      const elements = axes.map((a) => Object.freeze({ ...a, ...elementsAlong(geometric, a.cartesian) }));
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
 * operation's Seitz symbol, e.g. [1, 1, 0] for 2₁₁₀ in the hexagonal family, whose lattice symmetry
 * direction is [1̄, 1̄, 0]; for n ≥ 3 the sign fixes what the sense refers to.
 *
 * @remarks Source: ITA (6th ed., 2016), Tables 1.4.2.1–1.4.2.3, p. 52 (the Seitz symbols), and
 * Table 2.1.3.1 (the lattice symmetry direction [1̄, 1̄, 0]).
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
 * symmetry directions (monoclinic: the directions a, b, c of the full symbol, of which only the
 * unique axis is a lattice symmetry direction) and the symmetry elements along them. All positions
 * of the crystal family are listed (for rhombohedral axes the two positions of the rhombohedral
 * lattice), also those the symbol of the class leaves out (then without `symbol`); the triclinic
 * family has none. A direction has the sign ITA gives the lattice symmetry direction, the axis of an operation
 * along it that of its Seitz symbol, so the two are parallel and may be opposite: match them by
 * direction, up to sign.
 *
 * @remarks Source: ITA (2016), Table 2.1.3.1 (the symmetry directions, their signs, and the row for
 * rhombohedral axes).
 */
export function symmetryDirections(key: MagneticPointGroupKey, options?: SettingOptions): readonly SymmetryDirection[] {
  checkOptions(options, SETTING_KEYS, 'symmetryDirections');
  return analysis(key, options).directions;
}
