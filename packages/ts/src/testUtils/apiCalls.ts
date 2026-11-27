/**
 * The API pins: calls of the public API described as data (entry point, function, arguments) with
 * the answer symcrys gives, for every group and setting of the functions of a key and a sample of
 * the functions of a list (GUIDE.md, "Correctness and tests"). Both languages replay them: the
 * TypeScript test calls the entry points, the Python test the same function through the Python
 * layer by its fixed rules (`packages/python/tests/test_pins.py`). They are behavioural pins
 * (fixture class (c)): they show that the two languages give the same answer to the same call, not
 * that the answer is right, which the reference tests check against print.
 */

import * as classes from '../index.js';
import * as magnetic from '../magnetic.js';
import * as plane from '../plane.js';
import { normalised } from './itcBaseline.js';

/** The three entry points, by the name a caller imports. */
export const ENTRY_POINTS = {
  symcrys: classes as unknown as Record<string, unknown>,
  'symcrys/magnetic': magnetic as unknown as Record<string, unknown>,
  'symcrys/plane': plane as unknown as Record<string, unknown>,
} as const;

export type EntryPoint = keyof typeof ENTRY_POINTS;

/** A call of the public API: a function with its arguments, or a constant (`args` absent). */
export interface ApiCall {
  readonly entry: EntryPoint;
  readonly name: string;
  readonly args?: readonly unknown[];
}

/** A pin: the call and the answer, normalised as the ITC baseline pins are. */
export interface ApiPin extends ApiCall {
  readonly value: unknown;
}

/** The file of the API pins, relative to `packages/ts/src`. */
export const API_PINS_FILE = 'api.pins.json';

/** Exports that are not pinned: the version changes with every release. */
export const UNPINNED = new Set(['VERSION']);

/** The answer of a call, normalised; `undefined` as `null`. */
export function answer(call: ApiCall): unknown {
  const value = ENTRY_POINTS[call.entry][call.name];
  if (call.args === undefined) return normalised(value);
  const result = (value as (...a: unknown[]) => unknown)(...call.args);
  return result === undefined ? null : normalised(result);
}

const unit = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];

const LIST_KEYS = ['1', '2/m', 'mm2', '4mm', '-3m', '6/mmm', 'm-3m'] as const;
const MAGNETIC_LIST_KEYS = ["4'/m'm'm", "321'", "6'/m'mm'", "m'-3'm"] as const;

/** The calls of the functions of a key of one point-group entry point, for every group and setting. */
function pointGroupCalls(entry: 'symcrys' | 'symcrys/magnetic'): ApiCall[] {
  const api = entry === 'symcrys' ? classes : magnetic;
  const keys = api.POINT_GROUP_KEYS as readonly string[];
  const out: ApiCall[] = [];
  const c = (name: string, ...args: unknown[]): void => void out.push({ entry, name, args });
  const properties = Object.keys(api.TENSOR_PROPERTIES);
  for (const key of keys) {
    c('pointGroup', key);
    c('settings', key);
    c('isPointGroupKey', key);
    c('findPointGroup', key);
    // A setting by its symbol, and by the axes or the unique axis, as ITA's headlines name them.
    for (const s of api.settings(key as never)) {
      c('operations', key, {
        setting: s.symbol,
        ...('axes' in s ? { axes: s.axes } : {}),
        ...('uniqueAxis' in s ? { uniqueAxis: s.uniqueAxis } : {}),
      });
      if ('uniqueAxis' in s) c('symmetryDirections', key, { uniqueAxis: s.uniqueAxis });
      if ('axes' in s) {
        c('latticeBasis', key, { axes: s.axes });
        c('findPointGroup', s.symbol, { axes: s.axes });
      }
    }
    c('latticeSystems', key);
    c('allowedProperties', key);
    c('allowsProperty', key, properties[0]);
    for (const name of properties) c('tensorForm', key, name);
    for (const s of api.settings(key as never)) {
      const o = { setting: s.index };
      c('operations', key, o);
      c('generators', key, o);
      for (const form of ['short', 'full', 'schoenflies', 'shubnikov']) c('symbol', key, { ...o, form });
      c('describeOperations', key, o);
      c('symmetryDirections', key, o);
      c('latticeBasis', key, o);
      c('siteSymmetry', key, { uvw: [1, 0, 0] }, o);
      c('siteSymmetry', key, { hkl: [1, 1, 1] }, o);
      c('siteSymmetry', key, { cartesian: [0.3, 0.2, 1] }, { ...o, tolerance: 1e-4 });
      // Near an element: the tolerance decides the answer.
      c('siteSymmetry', key, { cartesian: [0.00004, 0.00001, 1] }, { ...o, tolerance: 1e-4 });
      c('siteSymmetry', key, { cartesian: [1, 1.00005, 0.00002] }, { ...o, tolerance: 1e-4 });
      c('orbit', key, { hkl: [3, 2, 1] }, o);
      c('orbit', key, { uvw: [1, 1, 0] }, o);
      if (entry === 'symcrys') {
        c('wyckoffPositions', key, o);
        c('crystalForms', key, o);
        c('wyckoffPosition', key, { uvw: [1, 1, 0] }, o);
        c('wyckoffPosition', key, { hkl: [1, 0, 1] }, o);
        c('wyckoffPosition', key, { cartesian: [1, 0.00003, 0.00002] }, { ...o, tolerance: 1e-4 });
      }
    }
  }
  const lists = entry === 'symcrys' ? LIST_KEYS : [...LIST_KEYS, ...MAGNETIC_LIST_KEYS];
  for (const key of lists) {
    const ops = api.operations(key as never);
    c('pointGroupOf', ops);
    c('describeOperationsOf', ops);
    c('isCentrosymmetricOf', ops);
    c('isEnantiomorphicOf', ops);
    c('allowedPropertiesOf', ops);
    c('allowsPropertyOf', ops, properties[0], { tolerance: 1e-4 });
    c('siteSymmetryOf', ops, [1, 2, 3]);
    c('orbitOf', ops, [1, 2, 3]);
    c('tensorFormOf', ops, properties[properties.length - 1]);
    c('residualOperations', ops, api.latticeBasis(key as never));
  }
  const hexagonal = api.latticeBasis('6/mmm');
  const piezo = api.tensorForm('1', 'piezoelectric').basis[0];
  c('rotateTensor', piezo, unit, 'piezoelectric');
  c('toVoigt', piezo, 'piezoelectric', { factors: [2] });
  c('fromVoigt', classes.toVoigt(piezo, 'piezoelectric', { factors: [2] }), 'piezoelectric', { factors: [2] });
  c(
    'tensorForm',
    '4mm',
    { rank: 2, kind: 'polar', timeParity: 'even', intrinsic: 'symmetric-first-pair' },
    { setting: 1 },
  );
  c('pointGroups');
  c('holohedry', 'hexagonal');
  c('crystalFamily', 'trigonal');
  c('millerIndices', 'h,h,-2h,l', { h: 3, l: 1 });
  c('faceNormal', hexagonal, [1, 0, 0]);
  c('latticeFromParameters', { a: 3, b: 3, c: 5, alpha: 90, beta: 90, gamma: 120 });
  c('latticeParameters', hexagonal);
  c('metricTensor', hexagonal);
  c('reciprocalBasis', hexagonal);
  c('isValidCell', { alpha: 90, beta: 90, gamma: 120 });
  c('isValidCell', { alpha: 30, beta: 30, gamma: 50 }, { minVolumeRatio: 0.1 });
  c('angleBetweenDirections', hexagonal, [1, 0, 0], [0, 1, 0]);
  c('angleBetweenPlanes', hexagonal, [1, 0, 0], [0, 1, 0]);
  c('directionFromFourIndices', [2, -1, -1, 0]);
  c('directionToFourIndices', [1, 0, 0]);
  c('planeFromFourIndices', [1, 0, -1, 0]);
  c('planeToFourIndices', [1, 0, 0]);
  c('reduceIndices', [2, 4, 6]);
  c('zoneAxis', [1, 0, 0], [0, 1, 0]);
  c('cellTransformation', 'hR', { axes: 'hexagonal', cell: 2 }, { centring: 'C', cell: 3 });
  c('cellTransformation', 'mS', {}, { uniqueAxis: 'c', cellChoice: 2 });
  c(
    'changeOfCoordinates',
    { linearPart: [[0, 1, 1], [1, 0, 1], [1, 1, 0]], originShift: [0, 0, 0.5] }, // prettier-ignore
    {
      points: [[0.1, 0.2, 0.3]],
      directions: [[1, 0, 0]],
      planes: [[1, 1, 1]],
      metric: unit,
      operations: classes.operations('m-3m').map((op) => ({ matrix: op.matrix })),
    },
  );
  for (const name of ['POINT_GROUP_KEYS', 'TENSOR_PROPERTIES', 'LATTICE_SYMMETRY_DIRECTIONS', 'EPSILON']) {
    out.push({ entry, name });
  }
  if (entry === 'symcrys') out.push({ entry, name: 'CRYSTAL_FORM_TYPES' });
  if (entry === 'symcrys/magnetic') {
    for (const name of ['CRYSTAL_CLASS_KEYS', 'GREY_POINT_GROUP_KEYS', 'BLACK_WHITE_POINT_GROUP_KEYS'])
      out.push({ entry, name });
  }
  return out;
}

/** The calls of `symcrys/plane`, for every plane group and plane point group. */
function planeCalls(): ApiCall[] {
  const entry = 'symcrys/plane';
  const out: ApiCall[] = [];
  const c = (name: string, ...args: unknown[]): void => void out.push({ entry, name, args });
  for (const key of plane.PLANE_GROUP_KEYS) {
    c('planeGroup', key);
    c('isPlaneGroupKey', key);
    c('findPlaneGroup', key);
    c('operations', key);
    c('generators', key);
    c('symbol', key, { form: 'full' });
    c('describeOperations', key);
    c('describeOperationsOf', plane.operations(key));
    c('wyckoffPositions', key);
    c('asymmetricUnit', key);
    // About 10⁻⁴ off a special position: the tolerance decides the answer.
    for (const tolerance of [1e-5, 1e-3]) {
      c('siteSymmetry', key, { point: [0.50008, 0.00006] }, { tolerance });
      c('wyckoffPosition', key, { point: [0.50008, 0.00006] }, { tolerance });
      c('orbit', key, { point: [0.50008, 0.00006] }, { tolerance });
    }
    c('symmetryElements', key);
    c('symmetryElements', key, { box: [[0, 0], [1, 1]] }); // prettier-ignore
    for (const point of [
      [0.1, 0.23],
      [0.5, 0],
      [1 / 3, 2 / 3],
    ]) {
      // prettier-ignore
      c('siteSymmetry', key, { point });
      c('wyckoffPosition', key, { point });
      c('orbit', key, { point });
      c('wyckoffDistances', key, { point });
    }
    c('wyckoffDistances', key, { point: [0.1, 0.23] }, { basis: [[2, 0], [0, 3]] }); // prettier-ignore
    c('residualOperations', plane.operations(key), [[1, 0], [0, 1.5]]); // prettier-ignore
    c('settings', key);
    c('pointGroupOf', plane.operations(key));
    c('planeGroupOf', plane.operations(key));
    c('planeGroupOf', plane.generators(key));
    for (const point of [
      [0.1, 0.23],
      [0.5, 0],
    ]) {
      c('siteSymmetryOf', plane.operations(key), { point });
      c('orbitOf', plane.operations(key), { point });
    }
    c('siteSymmetryOf', plane.operations(key), { uv: [1, 1] });
    c('orbitOf', plane.operations(key), { hk: [1, 2] });
  }
  for (const key of plane.POINT_GROUP_KEYS) {
    c('pointGroup', key);
    c('isPointGroupKey', key);
    c('settings', key);
    for (const s of plane.settings(key)) {
      const o = { setting: s.index };
      c('findPointGroup', s.symbol);
      c('symbol', key, o);
      c('operations', key, o);
      c('generators', key, o);
      c('describeOperations', key, o);
      c('wyckoffPositions', key, o);
      c('crystalForms', key, o);
      c('pointGroupOf', plane.operations(key, o));
      for (const input of [
        { uv: [1, 0] },
        { uv: [1, 1] },
        { uv: [1, 2] },
        { hk: [1, 0] },
        { hk: [1, 1] },
        { hk: [1, 2] },
      ]) {
        c('siteSymmetry', key, input, o);
        c('wyckoffPosition', key, input, o);
        c('orbit', key, input, o);
      }
      c('siteSymmetryOf', plane.operations(key, o), { hk: [1, 0] });
      c('orbitOf', plane.operations(key, o), { uv: [1, 2] });
    }
  }
  c('planeGroups');
  c('pointGroups');
  for (const system of ['oblique', 'rectangular', 'square', 'hexagonal']) c('cellRestrictions', system);
  const basis = plane.latticeFromParameters({ a: 2, b: 3, gamma: 100 });
  c('latticeFromParameters', { a: 2, b: 3, gamma: 100 });
  c('latticeParameters', basis);
  c('metricTensor', basis);
  c('reciprocalBasis', basis);
  c(
    'changeOfCoordinates',
    { linearPart: [[1, 1], [-1, 1]], originShift: [0, 0.5] }, // prettier-ignore
    {
      points: [[0.1, 0.2]],
      operations: plane.operations('p4mm').map((op) => ({ matrix: op.matrix, translation: op.translation })),
    },
  );
  for (const name of ['PLANE_GROUP_KEYS', 'POINT_GROUP_KEYS', 'CRYSTAL_FORM_TYPES', 'EPSILON'])
    out.push({ entry, name });
  return out;
}

/** Every call of the API pins, in a fixed order. */
export function apiCalls(): readonly ApiCall[] {
  return [...pointGroupCalls('symcrys'), ...pointGroupCalls('symcrys/magnetic'), ...planeCalls()];
}
