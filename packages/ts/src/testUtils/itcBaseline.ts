/**
 * The output of symcrys in the ITC convention, collected over the public API of all three entry
 * points, as the safety net of the ITC migration (#121, #137): `audit/itc-baseline` writes it as
 * behavioural pins (fixture class (c), CLAUDE.md) from a known-good revision, and
 * `itcBaseline.pins.test.ts` compares the current output with them. A pin that changes during the
 * migration is either an intended change, listed in its PR, or a bug.
 *
 * The collection is written once, here, and used by both: when a later PR renames a function or a
 * field, only the calls below follow it, so that the pinned data keep their shape and a difference
 * is a difference of behaviour. Test-only code.
 */

import * as classes from '../index.js';
import * as magnetic from '../magnetic.js';
import * as plane from '../plane.js';
import type { MagneticPointGroupKey } from '../pointGroups/pointGroups.js';
import type { TensorSpec } from '../tensors/tensorForm.js';

/** A value as pinned: numbers rounded to 12 decimals (no −0), undefined fields left out. */
export function normalised(value: unknown): unknown {
  if (typeof value === 'number') {
    const r = Math.round(value * 1e12) / 1e12;
    return r === 0 ? 0 : r;
  }
  if (Array.isArray(value)) return value.map(normalised);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, normalised(v)]),
    );
  }
  return value;
}

/** Runs `f` and gives its result, or the message of the error it throws, so a thrown error is pinned too. */
function attempt<T>(f: () => T): T | { readonly error: string } {
  try {
    return f();
  } catch (e) {
    return { error: e instanceof Error ? `${e.name}: ${e.message}` : String(e) };
  }
}

/** Directions at which site symmetry, Wyckoff position and orbit are pinned: on and off the elements. */
const DIRECTIONS: readonly (readonly [number, number, number])[] = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
  [1, 1, 0],
  [1, -1, 0],
  [1, 1, 1],
  [2, 1, 0],
  [1, 2, 3],
];

/** Faces (hkl) and lattice directions [uvw] whose orbits are pinned. */
const FACES: readonly (readonly [number, number, number])[] = [
  [3, 2, 1],
  [1, 1, 0],
  [0, 0, 1],
];
const LATTICE_DIRECTIONS: readonly (readonly [number, number, number])[] = [
  [1, 0, 0],
  [1, 1, 1],
];

/** The point-group data of one key in every ITC setting, over the magnetic API (all 122 keys). */
function pointGroupEntry(key: MagneticPointGroupKey) {
  const isClass = classes.isPointGroupKey(key);
  return {
    key,
    pointGroup: magnetic.pointGroup(key),
    allowedProperties: magnetic.allowedProperties(key),
    settings: magnetic.settings(key, 'itc').map((s) => {
      const options = { convention: 'itc', setting: s.index } as const;
      const ops = magnetic.operations(key, options);
      const short = magnetic.symbol(key, options);
      const full = magnetic.symbol(key, { ...options, form: 'full' });
      return {
        setting: s,
        symbol: short,
        fullSymbol: full,
        schoenflies: magnetic.symbol(key, { ...options, form: 'schoenflies' }),
        found: { short: magnetic.findPointGroup(short, 'itc'), full: magnetic.findPointGroup(full, 'itc') },
        operations: ops,
        generators: magnetic.generators(key, options),
        latticeOperations: magnetic.latticeOperations(key, options),
        describeOperations: magnetic.describeOperations(key, options),
        symmetryDirections: magnetic.symmetryDirections(key, options),
        pointGroupOf: magnetic.pointGroupOf(ops),
        describeOperationsOf: magnetic.describeOperationsOf(ops),
        siteSymmetry: DIRECTIONS.map((d) => attempt(() => magnetic.siteSymmetry(ops, d))),
        orbitOf: DIRECTIONS.map((d) => attempt(() => magnetic.orbitOf(ops, d))),
        faceOrbits: FACES.map((hkl) => attempt(() => magnetic.orbit(key, { hkl }, options))),
        directionOrbits: LATTICE_DIRECTIONS.map((uvw) => attempt(() => magnetic.orbit(key, { uvw }, options))),
        // Wyckoff positions and crystal forms: crystallographic API, the 32 classes only.
        ...(isClass
          ? {
              wyckoffPositions: classes.wyckoffPositions(key, options),
              wyckoffPositionOf: DIRECTIONS.map((d) => attempt(() => classes.wyckoffPositionOf(key, d, options))),
              crystalForms: classes.crystalForms(key, options),
            }
          : {}),
      };
    }),
  };
}

/** Index symmetries per rank, as `tensorForm` accepts them. */
const INTRINSIC_BY_RANK: Readonly<Record<number, readonly TensorSpec['intrinsic'][]>> = {
  0: ['none'],
  1: ['none'],
  2: ['none', 'ij', 'jk'],
  3: ['none', 'ij', 'jk'],
  4: ['none', 'ij', 'jk', 'ij_kl', 'voigt'],
};

/** Every tensor specification at the given time parity. */
const specs = (timeParity: 'i' | 'c'): TensorSpec[] =>
  [0, 1, 2, 3, 4].flatMap((rank) =>
    (['polar', 'axial'] as const).flatMap((parity) =>
      INTRINSIC_BY_RANK[rank].map((intrinsic) => ({
        rank: rank as TensorSpec['rank'],
        parity,
        timeParity,
        intrinsic,
      })),
    ),
  );

/** A basis row as [flat index, value] pairs of its nonzero entries. */
const sparse = (row: readonly number[]): [number, number][] =>
  row.flatMap((x, i): [number, number][] => (x === 0 ? [] : [[i, x]]));

/**
 * The tensor forms of one key in every ITC setting: time-even forms for the 32 classes, time-odd
 * forms for the 58 black-and-white groups (the time-even forms of a black-and-white group are those
 * of its class; a grey group allows no time-odd tensor and has the time-even forms of its class).
 */
function tensorEntry(key: MagneticPointGroupKey, timeParity: 'i' | 'c') {
  return {
    key,
    settings: magnetic.settings(key, 'itc').map((s) => ({
      setting: s.index,
      forms: specs(timeParity).map((spec) => {
        const form = magnetic.tensorForm(key, spec, { convention: 'itc', setting: s.index });
        return {
          spec,
          parameters: form.parameters,
          basis: form.basis.map(sparse),
        };
      }),
    })),
  };
}

/** Points of the plane (lattice basis) at which site symmetry, Wyckoff position, orbit and snapping are pinned. */
const POINTS: readonly (readonly [number, number])[] = [
  [0, 0],
  [0.5, 0],
  [0.5, 0.5],
  [0.25, 0.25],
  [1 / 3, 2 / 3],
  [0.3, 0.6],
  [0.1, 0.2],
  [0.21, 0.004],
];

/** The data of one plane group. */
function planeGroupEntry(key: plane.PlaneGroupKey) {
  const ops = plane.operations(key);
  return {
    key,
    planeGroup: plane.planeGroup(key),
    operations: ops,
    generators: plane.generators(key),
    describeOperations: plane.describeOperations(key),
    describeOperationsOf: plane.describeOperationsOf(ops),
    wyckoffPositions: plane.wyckoffPositions(key),
    asymmetricUnit: plane.asymmetricUnit(key),
    symmetryElements: plane.symmetryElements(key),
    points: POINTS.map((p) => ({
      point: p,
      siteSymmetry: attempt(() => plane.siteSymmetry(key, p)),
      wyckoffPositionOf: attempt(() => plane.wyckoffPositionOf(key, p)),
      orbit: attempt(() => plane.orbit(key, p)),
      snapToWyckoffPosition: attempt(() => plane.snapToWyckoffPosition(key, p, { tolerance: 0.02 })),
    })),
  };
}

/** The data of one plane point group in every setting. */
function planePointGroupEntry(key: plane.PointGroupKey) {
  return {
    key,
    pointGroup: plane.pointGroup(key),
    settings: plane.settings(key).map((s) => ({
      setting: s,
      symbol: plane.symbol(key, { setting: s.index }),
      operations: plane.operations(key, { setting: s.index }),
      generators: plane.generators(key, { setting: s.index }),
      describeOperations: plane.describeOperations(key, { setting: s.index }),
    })),
  };
}

/** Cells for the cell functions: one per family, with general angles where the family allows them. */
const CELLS = [
  { a: 5.1, b: 6.2, c: 7.3, alpha: 81, beta: 97, gamma: 103 },
  { a: 5.1, b: 6.2, c: 7.3, alpha: 90, beta: 104, gamma: 90 },
  { a: 5.1, b: 6.2, c: 7.3, alpha: 90, beta: 90, gamma: 90 },
  { a: 4, b: 4, c: 6, alpha: 90, beta: 90, gamma: 90 },
  { a: 3, b: 3, c: 5, alpha: 90, beta: 90, gamma: 120 },
  { a: 4, b: 4, c: 4, alpha: 90, beta: 90, gamma: 90 },
] as const;

/** The cell, index and lattice functions of the crystallographic API on a fixed set of inputs. */
function cellEntries() {
  const families = ['orthorhombic', 'tetragonal', 'hexagonal', 'cubic'] as const;
  const systems = ['triclinic', 'monoclinic', 'orthorhombic', 'tetragonal', 'trigonal', 'hexagonal', 'cubic'] as const;
  return {
    latticeBasis: families.map((f) => classes.latticeBasis(f)),
    crystalFamily: systems.map((s) => classes.crystalFamily(s)),
    holohedry: systems.map((s) => classes.holohedry(s)),
    LATTICE_SYMMETRY_DIRECTIONS: classes.LATTICE_SYMMETRY_DIRECTIONS,
    cells: CELLS.map((p) => {
      const basis = classes.latticeFromParameters(p);
      return {
        parameters: p,
        basis,
        latticeParameters: classes.latticeParameters(basis),
        metricTensor: classes.metricTensor(basis),
        reciprocalBasis: classes.reciprocalBasis(basis),
        isValidCell: classes.isValidCell(p),
        angleBetweenDirections: classes.angleBetweenDirections(basis, [1, 0, 0], [1, 1, 1]),
        angleBetweenPlanes: classes.angleBetweenPlanes(basis, [1, 0, 0], [1, 1, 1]),
        residualOperations: classes.residualOperations(classes.latticeOperations('m-3m'), basis).length,
      };
    }),
    changeOfAxes: [
      [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
      ],
      [
        [1, -1, 0],
        [1, 1, 0],
        [0, 0, 1],
      ],
      [
        [0, 1, 0],
        [1, 0, 0],
        [0, 0, 1],
      ],
    ].map((P) => attempt(() => classes.changeOfAxes(P as unknown as Parameters<typeof classes.changeOfAxes>[0]))),
    indices: {
      reduceIndices: classes.reduceIndices([4, -2, 6]),
      planeToFourIndices: classes.planeToFourIndices([1, 2, 3]),
      planeFromFourIndices: classes.planeFromFourIndices([1, 2, -3, 4]),
      directionToFourIndices: classes.directionToFourIndices([1, 0, 0]),
      directionFromFourIndices: classes.directionFromFourIndices([2, -1, -1, 0]),
      zoneAxis: [classes.zoneAxis([1, 0, 0], [0, 1, 0]), classes.zoneAxis([1, 0, 0], [2, 0, 0])],
    },
  };
}

/** The point-group pins: every key of the magnetic API (the 32 classes first), the tables of both APIs. */
export function collectPointGroups() {
  return {
    tables: {
      crystalFormTypes: classes.CRYSTAL_FORM_TYPES,
      tensorProperties: magnetic.TENSOR_PROPERTIES,
      classTensorProperties: classes.TENSOR_PROPERTIES,
    },
    cell: cellEntries(),
    groups: magnetic.POINT_GROUP_KEYS.map(pointGroupEntry),
  };
}

/** The tensor pins: time-even forms of the 32 classes, time-odd forms of the 58 black-and-white groups. */
export function collectTensors() {
  const keys = magnetic.POINT_GROUP_KEYS;
  return {
    classes: keys.filter((k) => magnetic.pointGroup(k).type === 'I').map((k) => tensorEntry(k, 'i')),
    magnetic: keys.filter((k) => magnetic.pointGroup(k).type === 'III').map((k) => tensorEntry(k, 'c')),
  };
}

/** The plane pins: the 17 plane groups and the 10 plane point groups. */
export function collectPlane() {
  return {
    planeGroups: plane.PLANE_GROUP_KEYS.map(planeGroupEntry),
    pointGroups: plane.POINT_GROUP_KEYS.map(planePointGroupEntry),
  };
}

/** The pin files, relative to packages/ts/src, with what each holds. */
export const ITC_BASELINE_FILES = {
  pointGroups: 'pointGroups/itcBaseline.pins.json',
  tensors: 'tensors/itcBaseline.pins.json',
  plane: 'spaceGroups/itcBaseline.pins.json',
} as const;
