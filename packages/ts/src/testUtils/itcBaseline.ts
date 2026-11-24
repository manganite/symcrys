/**
 * The output of symcrys in the ITC convention, collected over the public API of all three entry
 * points, as the safety net of the ITC migration (#121, #137): `audit/itc-baseline` writes it as
 * behavioural pins (fixture class (c), CLAUDE.md) from a known-good revision, and
 * `itcBaseline.pins.test.ts` compares the current output with them. A pin that changes during the
 * migration is either an intended change, listed in its PR, or a bug.
 *
 * Every pin is one entry `{ id, value }`, one line in the file, so that a change of behaviour shows
 * as the few entries it touches. A setting is named in an id by its full symbol, not by its index,
 * so that a renumbering of the settings (#137, A4) changes only the entries that hold the index; a
 * setting with rhombohedral axes adds "(rhombohedral axes)". The collection is written once, here, and used by both the capture and the test: when a later PR
 * renames a function or a field, only the calls below follow it, and the ids and values keep their
 * shape. Test-only code.
 */

import * as classes from '../index.js';
import * as magnetic from '../magnetic.js';
import * as plane from '../plane.js';
import type { MagneticPointGroupKey } from '../pointGroups/pointGroups.js';
import type { TensorSpec } from '../tensors/tensorForm.js';

/** One pin: what was asked (`id`) and what symcrys answered. */
export interface Pin {
  readonly id: string;
  readonly value: unknown;
}

/**
 * A value as pinned and compared: numbers rounded to 12 decimals (no −0), then through JSON, so that
 * what is compared is exactly what a file holds (undefined fields dropped, undefined in arrays null).
 */
export function normalised(value: unknown): unknown {
  const round = (v: unknown): unknown => {
    if (typeof v === 'number') {
      const r = Math.round(v * 1e12) / 1e12;
      return r === 0 ? 0 : r;
    }
    if (Array.isArray(v)) return v.map(round);
    if (v !== null && typeof v === 'object')
      return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, round(x)]));
    return v;
  };
  const json = JSON.stringify(round(value));
  return json === undefined ? null : JSON.parse(json);
}

/** Runs `f` and gives its result, or the name and message of the error it throws, so errors are pinned too. */
function attempt(f: () => unknown): unknown {
  try {
    const result = f();
    return result === undefined ? { undefined: true } : result;
  } catch (e) {
    return { error: e instanceof Error ? `${e.name}: ${e.message}` : String(e) };
  }
}

/** Collects pins: `add(id, f)` pins the result (or the error) of `f`. */
function collector(): { readonly pins: Pin[]; add: (id: string, f: () => unknown) => void } {
  const pins: Pin[] = [];
  return { pins, add: (id, f) => pins.push({ id, value: normalised(attempt(f)) }) };
}

type V3 = readonly [number, number, number];

/** Directions at which site symmetry, Wyckoff position and orbit are pinned: on and off the elements. */
const DIRECTIONS: readonly V3[] = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
  [1, 1, 0],
  [1, -1, 0],
  [1, 1, 1],
  [2, 1, 0],
  [1, 2, 3],
];

/** Directions just off an element, for the tolerance of 10⁻⁴: within it, and outside the default 10⁻⁶. */
const NEAR_DIRECTIONS: readonly V3[] = [
  [1, 0.00003, 0.00002],
  [0.00004, 0.00001, 1],
  [1, 1.00005, 0.00002],
  [1, 1.00002, 0.99996],
];

/** Faces (hkl) and lattice directions [uvw] whose orbits are pinned. */
const FACES: readonly V3[] = [
  [3, 2, 1],
  [1, 1, 0],
  [0, 0, 1],
];
const LATTICE_DIRECTIONS: readonly V3[] = [
  [1, 0, 0],
  [1, 1, 1],
];

/** Symbols as a caller may write them: tolerant spellings, other conventions, wrong input. */
const SEARCHED_SYMBOLS = [
  'm3m',
  'm-3m',
  'm 3 m',
  '4/m 2/m 2/m',
  '-6 m 2',
  '-62m',
  '-6bar m2',
  "4'/mmm'",
  "m'-3'm",
  'Oh',
  '6/mmm1',
  '',
  'xyz',
];

/** Inputs that must fail, each with the call that gets it. */
function errorPins(add: (id: string, f: () => unknown) => void): void {
  add('error: classes.operations unknown key', () => classes.operations('7' as never));
  add('error: classes.operations magnetic key', () => classes.operations("4'mm'" as never));
  add('error: classes.operations setting 9', () => classes.operations('mm2', { setting: 9 }));
  add('error: magnetic.operations setting 0', () => magnetic.operations('2', { setting: 0 }));
  add('error: classes.tensorForm time-odd', () =>
    classes.tensorForm('4mm', { rank: 1, kind: 'axial', intrinsic: 'none', timeParity: 'odd' } as never),
  );
  add('error: classes.tensorForm voigt at rank 3', () =>
    classes.tensorForm('4mm', { rank: 3, kind: 'polar', intrinsic: 'symmetric-pairs-exchangeable' }),
  );
  add('error: classes.allowsProperty time-odd name', () => classes.allowsProperty('4mm', 'ferromagnetic' as never));
  add('error: classes.siteSymmetry zero vector', () => classes.siteSymmetryOf(classes.operations('4mm'), [0, 0, 0]));
  add('error: classes.siteSymmetry tolerance 0', () =>
    classes.siteSymmetryOf(classes.operations('4mm'), [0, 0, 1], { tolerance: 0 }),
  );
  add('error: classes.tensorFormOf not orthogonal', () =>
    classes.tensorFormOf(
      [
        {
          cartesian: [
            [2, 0, 0],
            [0, 1, 0],
            [0, 0, 1],
          ],
        },
      ],
      'piezoelectric',
    ),
  );
  add('error: classes.isCentrosymmetricOf infinite group', () => {
    const c = Math.cos(0.1);
    const s = Math.sin(0.1);
    return classes.isCentrosymmetricOf([
      {
        cartesian: [
          [c, -s, 0],
          [s, c, 0],
          [0, 0, 1],
        ],
      },
    ]);
  });
  add('error: magnetic.tensorFormOf without time reversal', () =>
    magnetic.tensorFormOf(classes.operations('4mm') as never, 'ferromagnetic'),
  );
  add('error: plane.operations point group key with setting 3', () => plane.operations('3m', { setting: 3 }));
  add('error: plane.siteSymmetry point group key', () => plane.siteSymmetry('4mm' as never, [0, 0]));
  add('error: plane.siteSymmetry tolerance 0.5', () => plane.siteSymmetry('p4', [0, 0], { tolerance: 0.5 }));
  add('error: plane.describeOperationsOf det 2', () =>
    plane.describeOperationsOf([
      {
        matrix: [
          [2, 0],
          [0, 1],
        ],
        translation: [0, 0],
      },
    ]),
  );
}

/**
 * Descriptions in the shape of the pins (captured before #121 step 7c, #137 C2): `order` for `n`,
 * `'mirror'` for `'reflection'`, `'glide'` for `'glide-reflection'`.
 */
const oldDescriptions = (list: readonly { readonly kind: string; readonly n: number; readonly axis?: unknown }[]) =>
  list.map(({ kind, n, axis, ...rest }) => ({
    kind: kind === 'reflection' ? 'mirror' : kind === 'glide-reflection' ? 'glide' : kind,
    order: n,
    ...rest,
    // The plane groups gave the axis of a reflection as `normal` (before #121 step 7d, #137 C3).
    ...(axis === undefined ? {} : Array.isArray(axis) ? { normal: axis } : { axis }),
  }));

/** A Wyckoff position of a class with its first printed point only, as `coordinates` was up to #121 step 7d. */
const oldWyckoff = <W extends { readonly coordinates: readonly string[] }>({ coordinates, ...rest }: W) => ({
  ...rest,
  coordinates: coordinates[0],
});

/** A point group in the shape of the pins (before #121 step 7c): `chiral` for `enantiomorphic`. */
const oldPointGroup = ({ enantiomorphic, ...rest }: { readonly enantiomorphic: boolean }) => ({
  ...rest,
  chiral: enantiomorphic,
});

/** Symmetry elements in the shape of the pins (before #121 step 7c): `rotations` with `order`. */
const oldElements = ({ rotationPoints, lines }: plane.SymmetryElements) => ({
  rotations: rotationPoints.map(({ n, point }) => ({ order: n, point })),
  lines: lines
    .map(({ axis, point, ...rest }) => ({ ...rest, normal: axis, segment: clipToCell(point, rest.direction) }))
    .filter((l) => l.segment !== undefined)
    .sort(
      (a, b) =>
        a.direction[0] - b.direction[0] ||
        a.direction[1] - b.direction[1] ||
        a.segment![0][1] - b.segment![0][1] ||
        a.segment![0][0] - b.segment![0][0],
    ),
});

/**
 * The segment of the line p + λd in the cell [0, 1]², in the order of d, or undefined if it has no
 * length there: the lines of `symmetryElements` were clipped to the cell up to #121 step 10b.
 */
function clipToCell(p: readonly number[], d: readonly number[]): number[][] | undefined {
  let lo = -Infinity;
  let hi = Infinity;
  for (let k = 0; k < 2; k++) {
    if (d[k] === 0) {
      if (p[k] < -1e-12 || p[k] > 1 + 1e-12) return undefined;
      continue;
    }
    const a = -p[k] / d[k];
    const b = (1 - p[k]) / d[k];
    lo = Math.max(lo, Math.min(a, b));
    hi = Math.min(hi, Math.max(a, b));
  }
  if (hi - lo <= 1e-12) return undefined;
  return [lo, hi].map((l) =>
    [p[0] + l * d[0], p[1] + l * d[1]].map((v) => (Math.abs(v - Math.round(v)) < 1e-12 ? Math.round(v) : v)),
  );
}

/** The asymmetric unit in the shape of the pins (before #121 step 10b): the vertices, and per edge its inequality. */
const oldUnit = ({ vertices, inequalities, edges }: plane.AsymmetricUnit) => ({
  vertices,
  inequalities: edges.map((e) => inequalities[e]),
});

/** Operations in the shape of the pins of `operations` (captured before #121 step 6d): the Cartesian matrices. */
const cartesianPins = (ops: readonly magnetic.Operation[]) =>
  ops.map((op) => ({ matrix: op.cartesian, timeReversal: op.timeReversal }));

/** Operations in the shape of the pins of `latticeOperations` (removed in #121 step 6d): the matrices W. */
const latticePins = (ops: readonly magnetic.Operation[]) =>
  ops.map((op) => ({ matrix: op.matrix, timeReversal: op.timeReversal }));

/**
 * A setting in an id: its full symbol, and for rhombohedral axes that, since `3` and `-3` have the
 * same full symbol with both axes.
 */
const settingName = (s: { readonly fullSymbol: string; readonly axes?: string }): string =>
  s.axes === 'rhombohedral' ? `${s.fullSymbol} (rhombohedral axes)` : s.fullSymbol;

/** The point-group pins of one key of the magnetic API (all 122), and of the crystallographic API for the 32 classes. */
function pointGroupPins(add: (id: string, f: () => unknown) => void, key: MagneticPointGroupKey): void {
  const isClass = classes.isPointGroupKey(key);
  add(`${key}: magnetic.pointGroup`, () => oldPointGroup(magnetic.pointGroup(key)));
  add(`${key}: magnetic.allowedProperties`, () => magnetic.allowedProperties(key));
  add(`${key}: magnetic.settings`, () => magnetic.settings(key));
  if (isClass) {
    add(`${key}: classes.pointGroup`, () => oldPointGroup(classes.pointGroup(key)));
    add(`${key}: classes.allowedProperties`, () => classes.allowedProperties(key));
    add(`${key}: classes.settings`, () => classes.settings(key));
  }
  for (const s of magnetic.settings(key)) {
    const options = { setting: s.index } as const;
    const id = (what: string) => `${key} | ${settingName(s)}: ${what}`;
    const ops = magnetic.operations(key, options);
    add(id('setting index'), () => s.index);
    for (const form of ['short', 'full', 'schoenflies'] as const) {
      const sym = magnetic.symbol(key, { ...options, form });
      add(id(`magnetic.symbol ${form}`), () => sym);
      add(id(`magnetic.findPointGroup(${form})`), () => magnetic.findPointGroup(sym));
      if (isClass) {
        const classSymbol = classes.symbol(key, { ...options, form });
        add(id(`classes.symbol ${form}`), () => classSymbol);
        add(id(`classes.findPointGroup(${form})`), () => classes.findPointGroup(classSymbol));
      }
    }
    // Since #121 step 6d an operation is { matrix, cartesian, timeReversal }; the pins keep the shape
    // they were captured in: `operations` and `generators` as the Cartesian matrices, the lattice
    // operations as the matrices W (formerly `latticeOperations`).
    add(id('magnetic.operations'), () => cartesianPins(ops));
    add(id('magnetic.generators'), () => cartesianPins(magnetic.generators(key, options)));
    add(id('magnetic.latticeOperations'), () => latticePins(ops));
    add(id('magnetic.describeOperations'), () => oldDescriptions(magnetic.describeOperations(key, options)));
    add(id('magnetic.symmetryDirections'), () => magnetic.symmetryDirections(key, options));
    add(id('magnetic.pointGroupOf(operations)'), () => magnetic.pointGroupOf(ops));
    add(id('magnetic.describeOperationsOf(operations)'), () => oldDescriptions(magnetic.describeOperationsOf(ops)));
    add(id('magnetic.isCentrosymmetricOf, isChiralOf'), () => [
      magnetic.isCentrosymmetricOf(ops),
      magnetic.isEnantiomorphicOf(ops),
    ]);
    add(id('magnetic.allowedPropertiesOf(operations)'), () => magnetic.allowedPropertiesOf(ops));
    for (const d of DIRECTIONS) {
      add(id(`magnetic.siteSymmetry [${d}]`), () => magnetic.siteSymmetryOf(ops, d));
      add(id(`magnetic.orbitOf [${d}]`), () => magnetic.orbitOf(ops, d));
    }
    for (const d of NEAR_DIRECTIONS) {
      add(id(`magnetic.siteSymmetry [${d}] tolerance 1e-4`), () =>
        magnetic.siteSymmetryOf(ops, d, { tolerance: 1e-4 }),
      );
      add(id(`magnetic.orbitOf [${d}] tolerance 1e-4`), () => magnetic.orbitOf(ops, d, { tolerance: 1e-4 }));
    }
    for (const hkl of FACES) add(id(`magnetic.orbit (${hkl})`), () => magnetic.orbit(key, { hkl }, options));
    for (const uvw of LATTICE_DIRECTIONS)
      add(id(`magnetic.orbit [${uvw}]`), () => magnetic.orbit(key, { uvw }, options));
    if (isClass) {
      const classOps = classes.operations(key, options);
      add(id('classes.operations'), () => classOps.map((op) => ({ matrix: op.cartesian })));
      add(id('classes.generators'), () => classes.generators(key, options).map((op) => ({ matrix: op.cartesian })));
      add(id('classes.describeOperations'), () => oldDescriptions(classes.describeOperations(key, options)));
      add(id('classes.wyckoffPositions'), () => classes.wyckoffPositions(key, options).map(oldWyckoff));
      add(id('classes.crystalForms'), () => classes.crystalForms(key, options));
      for (const d of DIRECTIONS) {
        add(id(`classes.wyckoffPositionOf [${d}]`), () => oldWyckoff(classes.wyckoffPosition(key, d, options)));
      }
      for (const d of NEAR_DIRECTIONS) {
        add(id(`classes.wyckoffPositionOf [${d}] tolerance 1e-4`), () =>
          oldWyckoff(classes.wyckoffPosition(key, d, { ...options, tolerance: 1e-4 })),
        );
      }
    }
  }
}

/** Index symmetries per rank, by the names of the pins (up to #121 step 9a, #137 E2). */
const INTRINSIC_BY_RANK: Readonly<Record<number, readonly string[]>> = {
  0: ['none'],
  1: ['none'],
  2: ['none', 'ij', 'jk'],
  3: ['none', 'ij', 'jk'],
  4: ['none', 'ij', 'jk', 'ij_kl', 'voigt'],
};

/** The names of the pins and the names since #121 step 9a (#137 E1, E2). */
const NEW_INTRINSIC: Readonly<Record<string, TensorSpec['intrinsic']>> = {
  none: 'none',
  ij: 'symmetric-first-pair',
  jk: 'symmetric-last-pair',
  ij_kl: 'symmetric-pairs',
  voigt: 'symmetric-pairs-exchangeable',
};
const OLD_INTRINSIC: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(NEW_INTRINSIC).map(([old, now]) => [now, old]),
);
const NEW_TIME_PARITY = { i: 'even', c: 'odd' } as const;
const OLD_TIME_PARITY: Readonly<Record<string, string>> = { even: 'i', odd: 'c' };

/** A specification in the shape of the pins: parity, 'i'/'c', the index symmetries by their old names. */
const oldSpec = ({ kind, timeParity, intrinsic, ...rest }: Partial<TensorSpec>) => ({
  ...rest,
  parity: kind,
  ...(timeParity === undefined ? {} : { timeParity: OLD_TIME_PARITY[timeParity] }),
  intrinsic: intrinsic === undefined ? undefined : OLD_INTRINSIC[intrinsic],
});
/** A table of named properties in the shape of the pins. */
const oldProperties = (table: Readonly<Record<string, { readonly spec: Partial<TensorSpec> }>>) =>
  Object.fromEntries(Object.entries(table).map(([name, p]) => [name, { ...p, spec: oldSpec(p.spec) }]));

/** Every tensor specification at the given time parity, with its label in the names of the pins. */
const specs = (timeParity: 'i' | 'c'): { label: string; spec: TensorSpec }[] =>
  [0, 1, 2, 3, 4].flatMap((rank) =>
    (['polar', 'axial'] as const).flatMap((kind) =>
      INTRINSIC_BY_RANK[rank].map((intrinsic) => ({
        label: `${rank} ${kind} ${timeParity} ${intrinsic}`,
        spec: {
          rank: rank as TensorSpec['rank'],
          kind,
          timeParity: NEW_TIME_PARITY[timeParity],
          intrinsic: NEW_INTRINSIC[intrinsic],
        },
      })),
    ),
  );

/** A row as [flat index, value] pairs of its nonzero entries. */
const sparse = (row: readonly number[]): [number, number][] =>
  row.flatMap((x, i): [number, number][] => (x === 0 ? [] : [[i, x]]));

/** A tensor form as pinned: rank, parameters, and basis and relations as sparse rows. */
const formPin = (form: magnetic.TensorForm) => ({
  rank: form.rank,
  parameters: form.parameters,
  basis: form.basis.map(sparse),
  relations: form.relations.map(sparse),
});

/**
 * The tensor forms of one key in every ITC setting: time-even forms for the 32 classes, time-odd
 * forms for the 58 black-and-white groups (the time-even forms of a black-and-white group are those
 * of its class; a grey group allows no time-odd tensor and has the time-even forms of its class).
 */
function tensorPins(add: (id: string, f: () => unknown) => void, key: MagneticPointGroupKey, timeParity: 'i' | 'c') {
  for (const s of magnetic.settings(key)) {
    for (const { label, spec } of specs(timeParity)) {
      add(`${key} | ${settingName(s)}: ${label}`, () => formPin(magnetic.tensorForm(key, spec, { setting: s.index })));
    }
  }
}

/** The tensor functions on a list of operations and the rotation of a tensor. */
function tensorFunctionPins(add: (id: string, f: () => unknown) => void): void {
  const rotation = magnetic.operations('6/mmm')[1].cartesian;
  const piezo = magnetic.tensorForm('6mm', 'piezoelectric');
  add('rotateTensor piezoelectric of 6mm, first basis row, by the second operation of 6/mmm', () =>
    magnetic.rotateTensor(piezo.basis[0], rotation, 'piezoelectric'),
  );
  add('rotateTensor axial rank 2 by a mirror', () =>
    classes.rotateTensor([1, 2, 3, 4, 5, 6, 7, 8, 9], classes.operations('m')[1].cartesian, {
      rank: 2,
      kind: 'axial',
      intrinsic: 'none',
    }),
  );
  for (const key of ['4mm', '-6m2', 'm-3m'] as const) {
    const ops = classes.generators(key);
    add(`classes.tensorFormOf(generators of ${key}) piezoelectric`, () =>
      formPin(classes.tensorFormOf(ops, 'piezoelectric') as magnetic.TensorForm),
    );
    add(`classes.allowsPropertyOf(generators of ${key}) pyroelectric`, () =>
      classes.allowsPropertyOf(ops, 'pyroelectric'),
    );
    add(`classes.allowedPropertiesOf(generators of ${key})`, () => classes.allowedPropertiesOf(ops));
  }
}

/** Points of the plane (lattice basis) for site symmetry, Wyckoff position and orbit. */
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

/** Points near special positions and near the crossing of two lines, for snapping and tolerances. */
const NEAR_POINTS: readonly (readonly [number, number])[] = [
  [0.012, 0.007],
  [0.51, 0.008],
  [0.49, 0.493],
  [0.335, 0.664],
  [0.26, 0.245],
  [0.3, 0.008],
  [0.008, 0.3],
  [0.252, 0.749],
];

/** The pins of one plane group. */
function planeGroupPins(add: (id: string, f: () => unknown) => void, key: plane.PlaneGroupKey): void {
  const ops = plane.operations(key);
  // The pins carry the field fullSymbol, removed in #121 step 10c (#137 F4): now symbol(key, { form: 'full' }).
  add(`${key}: planeGroup`, () => ({
    ...plane.planeGroup(key),
    fullSymbol: plane.symbol(key, { form: 'full' }),
    order: plane.operations(key).length,
  }));
  add(`${key}: operations`, () => ops);
  add(`${key}: generators`, () => plane.generators(key));
  add(`${key}: describeOperations`, () => oldDescriptions(plane.describeOperations(key)));
  add(`${key}: describeOperationsOf(operations)`, () => oldDescriptions(plane.describeOperationsOf(ops)));
  add(`${key}: wyckoffPositions`, () => plane.wyckoffPositions(key));
  add(`${key}: asymmetricUnit`, () => oldUnit(plane.asymmetricUnit(key)));
  add(`${key}: symmetryElements`, () =>
    oldElements(
      plane.symmetryElements(key, {
        box: [
          [0, 0],
          [1, 1],
        ],
      }),
    ),
  );
  for (const p of POINTS) {
    add(`${key}: siteSymmetry (${p})`, () => plane.siteSymmetry(key, p));
    add(`${key}: wyckoffPositionOf (${p})`, () => plane.wyckoffPosition(key, p));
    // Bare points before #121 step 7d (#137 C4).
    add(`${key}: orbit (${p})`, () => plane.orbit(key, p).map((e) => e.point));
  }
  for (const p of NEAR_POINTS) {
    for (const tolerance of [0.005, 0.02]) {
      add(`${key}: siteSymmetry (${p}) tolerance ${tolerance}`, () => plane.siteSymmetry(key, p, { tolerance }));
      add(`${key}: wyckoffPositionOf (${p}) tolerance ${tolerance}`, () =>
        plane.wyckoffPosition(key, p, { tolerance }),
      );
    }
  }
}

/** The pins of one plane point group in every setting. */
function planePointGroupPins(add: (id: string, f: () => unknown) => void, key: plane.PointGroupKey): void {
  add(`${key}: pointGroup`, () => plane.pointGroup(key));
  // `default` before #121 step 7d (#137 C4).
  add(`${key}: settings`, () => plane.settings(key).map(({ isDefault, ...rest }) => ({ ...rest, default: isDefault })));
  for (const s of plane.settings(key)) {
    const id = (what: string) => `${key} | ${s.symbol}: ${what}`;
    add(id('symbol'), () => plane.symbol(key, { setting: s.index }));
    add(id('operations'), () => plane.operations(key, { setting: s.index }));
    add(id('generators'), () => plane.generators(key, { setting: s.index }));
    add(id('describeOperations'), () => oldDescriptions(plane.describeOperations(key, { setting: s.index })));
  }
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

/** The cell, index, lattice and list functions of the crystallographic API on fixed inputs. */
function generalPins(add: (id: string, f: () => unknown) => void): void {
  add('classes.POINT_GROUP_KEYS', () => classes.POINT_GROUP_KEYS);
  add('magnetic.POINT_GROUP_KEYS', () => magnetic.POINT_GROUP_KEYS);
  add('classes.pointGroups', () => classes.pointGroups().map(oldPointGroup));
  add('magnetic.pointGroups', () => magnetic.pointGroups().map(oldPointGroup));
  add('classes.isPointGroupKey', () => ['32', "321'", '-62m', 'x'].map((k) => classes.isPointGroupKey(k)));
  add('magnetic.isPointGroupKey', () => ['32', "321'", '-62m', 'x'].map((k) => magnetic.isPointGroupKey(k)));
  add('CRYSTAL_FORM_TYPES', () => classes.CRYSTAL_FORM_TYPES);
  add('magnetic.TENSOR_PROPERTIES', () => oldProperties(magnetic.TENSOR_PROPERTIES));
  add('classes.TENSOR_PROPERTIES', () => oldProperties(classes.TENSOR_PROPERTIES));
  add('LATTICE_SYMMETRY_DIRECTIONS', () => classes.LATTICE_SYMMETRY_DIRECTIONS);
  for (const symbol of SEARCHED_SYMBOLS) {
    add(`classes.findPointGroup ${JSON.stringify(symbol)}`, () => classes.findPointGroup(symbol));
    add(`magnetic.findPointGroup ${JSON.stringify(symbol)}`, () => magnetic.findPointGroup(symbol));
  }
  for (const f of ['orthorhombic', 'tetragonal', 'hexagonal', 'cubic'] as const) {
    add(`latticeBasis ${f}`, () => classes.latticeBasis(f));
  }
  for (const s of [
    'triclinic',
    'monoclinic',
    'orthorhombic',
    'tetragonal',
    'trigonal',
    'hexagonal',
    'cubic',
  ] as const) {
    add(`crystalFamily, holohedry ${s}`, () => [classes.crystalFamily(s), classes.holohedry(s)]);
  }
  for (const p of CELLS) {
    const id = `cell ${p.a} ${p.b} ${p.c} ${p.alpha} ${p.beta} ${p.gamma}`;
    const basis = classes.latticeFromParameters(p);
    add(`${id}: latticeFromParameters`, () => basis);
    add(`${id}: latticeParameters`, () => classes.latticeParameters(basis));
    add(`${id}: metricTensor`, () => classes.metricTensor(basis));
    add(`${id}: reciprocalBasis`, () => classes.reciprocalBasis(basis));
    add(`${id}: isValidCell`, () => classes.isValidCell(p));
    add(`${id}: angles`, () => [
      classes.angleBetweenDirections(basis, [1, 0, 0], [1, 1, 1]),
      classes.angleBetweenPlanes(basis, [1, 0, 0], [1, 1, 1]),
    ]);
    add(`${id}: residualOperations of m-3m`, () =>
      classes.residualOperations(classes.operations('m-3m'), basis).map((op) => ({ matrix: op.matrix })),
    );
  }
  const P = [
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
  ];
  P.forEach((m, i) =>
    add(`changeOfAxes ${i}`, () => classes.changeOfAxes(m as unknown as Parameters<typeof classes.changeOfAxes>[0])),
  );
  add('reduceIndices', () => classes.reduceIndices([4, -2, 6]));
  add('planeToFourIndices', () => classes.planeToFourIndices([1, 2, 3]));
  add('planeFromFourIndices', () => classes.planeFromFourIndices([1, 2, -3, 4]));
  add('directionToFourIndices', () => classes.directionToFourIndices([1, 0, 0]));
  add('directionFromFourIndices', () => classes.directionFromFourIndices([2, -1, -1, 0]));
  add('zoneAxis', () => [classes.zoneAxis([1, 0, 0], [0, 1, 0]), classes.zoneAxis([1, 0, 0], [2, 0, 0])]);
}

/** The point-group pins: general functions and tables, errors, then every key of the magnetic API. */
export function collectPointGroups(): Pin[] {
  const { pins, add } = collector();
  generalPins(add);
  errorPins(add);
  for (const key of magnetic.POINT_GROUP_KEYS) pointGroupPins(add, key);
  return pins;
}

/** The tensor pins: functions on lists and rotation, time-even forms of the classes, time-odd forms of the black-and-white groups. */
export function collectTensors(): Pin[] {
  const { pins, add } = collector();
  tensorFunctionPins(add);
  for (const key of magnetic.POINT_GROUP_KEYS) {
    const type = magnetic.pointGroup(key).type;
    if (type === 'I') tensorPins(add, key, 'i');
    if (type === 'III') tensorPins(add, key, 'c');
  }
  return pins;
}

/** The plane pins: the 17 plane groups and the 10 plane point groups. */
export function collectPlane(): Pin[] {
  const { pins, add } = collector();
  for (const key of plane.PLANE_GROUP_KEYS) planeGroupPins(add, key);
  for (const key of plane.POINT_GROUP_KEYS) planePointGroupPins(add, key);
  return pins;
}

/** The pin files, relative to packages/ts/src. */
export const ITC_BASELINE_FILES = {
  pointGroups: 'pointGroups/itcBaseline.pins.json',
  tensors: 'tensors/itcBaseline.pins.json',
  plane: 'spaceGroups/itcBaseline.pins.json',
} as const;
