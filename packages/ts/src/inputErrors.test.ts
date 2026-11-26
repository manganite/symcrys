/**
 * Wrong input is a RangeError: every exported function of the three entry points, called
 * with a wrong value in each of its positions, either answers (a predicate such as `isPointGroupKey`
 * answers false) or throws a RangeError; never a TypeError or a plain Error, which mark a fault of
 * symcrys itself. An options object with a key the function does not know, or an options argument
 * that is not an object, is a RangeError too.
 */

import { describe, expect, it } from 'vitest';
import * as classes from './index.js';
import * as magnetic from './magnetic.js';
import * as plane from './plane.js';

const ops = classes.operations('32');
const magneticOps = magnetic.operations("6'/m'mm'");
const basis = classes.latticeBasis('hexagonal');
const piezo = classes.tensorForm('1', 'piezoelectric').basis[0];
const piezoVoigt = classes.toVoigt(piezo, 'piezoelectric', { factors: [2] });
const unit = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];

/** Valid arguments of a call, and the position and the known keys of its options argument. */
interface Call {
  readonly args: readonly unknown[];
  readonly options?: { readonly index: number; readonly keys: readonly string[] };
  /** Options a valid call needs (toVoigt: the factors of a tensor without a default). */
  readonly required?: Readonly<Record<string, unknown>>;
}
const SETTING = ['setting', 'axes', 'uniqueAxis'];
const AXES = ['axes', 'uniqueAxis'];
const TOLERANCE = ['tolerance'];
const call = (args: readonly unknown[], keys?: readonly string[]): Call =>
  keys ? { args, options: { index: args.length, keys } } : { args };

const pointCalls = (o: readonly { readonly cartesian: unknown }[], key: string, property: string) => ({
  pointGroup: call([key]),
  pointGroups: call([]),
  findPointGroup: call([key], AXES),
  isPointGroupKey: call([key]),
  settings: call([key]),
  operations: call([key], SETTING),
  generators: call([key], SETTING),
  symbol: call([key], [...SETTING, 'form']),
  describeOperations: call([key], SETTING),
  describeOperationsOf: call([o], TOLERANCE),
  symmetryDirections: call([key], SETTING),
  siteSymmetry: call([key, [0, 0, 1]], [...SETTING, ...TOLERANCE]),
  siteSymmetryOf: call([o, [0, 0, 1]], TOLERANCE),
  orbit: call([key, { hkl: [1, 0, 0] }], SETTING),
  orbitOf: call([o, [1, 0, 0]], TOLERANCE),
  pointGroupOf: call([o], TOLERANCE),
  isCentrosymmetricOf: call([o], TOLERANCE),
  isEnantiomorphicOf: call([o], TOLERANCE),
  tensorForm: call([key, property], SETTING),
  tensorFormOf: call([o, property], TOLERANCE),
  rotateTensor: call([[1, 0, 0], unit, 'pyroelectric'], TOLERANCE),
  toVoigt: { ...call([piezo, 'piezoelectric'], ['factors', ...TOLERANCE]), required: { factors: [2] } },
  fromVoigt: { ...call([piezoVoigt, 'piezoelectric'], ['factors', ...TOLERANCE]), required: { factors: [2] } },
  allowsProperty: call([key, property]),
  allowedProperties: call([key]),
  allowsPropertyOf: call([o, property], TOLERANCE),
  allowedPropertiesOf: call([o], TOLERANCE),
  holohedry: call(['hexagonal']),
  latticeSystems: call([key]),
  millerIndices: call(['h,h,-2h,l', { h: 3, l: 1 }]),
  faceNormal: call([basis, [1, 0, 0]]),
  crystalFamily: call(['trigonal']),
  latticeBasis: call(['hexagonal']),
  latticeFromParameters: call([{ a: 3, b: 3, c: 5, alpha: 90, beta: 90, gamma: 120 }]),
  latticeParameters: call([basis]),
  metricTensor: call([basis]),
  reciprocalBasis: call([basis]),
  isValidCell: call([{ alpha: 90, beta: 90, gamma: 120 }], ['minVolumeRatio']),
  residualOperations: call([key === '32' ? classes.operations('6/mmm') : magneticOps, basis], TOLERANCE),
  changeOfCoordinates: call([{ linearPart: unit, originShift: [0, 0, 0.5] }, { points: [[0.1, 0.2, 0.3]] }], TOLERANCE),
  cellTransformation: call(['hR', { axes: 'hexagonal', cell: 2 }, { centring: 'C', cell: 3 }]),
  directionFromFourIndices: call([[2, -1, -1, 0]]),
  directionToFourIndices: call([[1, 0, 0]]),
  planeFromFourIndices: call([[1, 0, -1, 0]]),
  planeToFourIndices: call([[1, 0, 0]]),
  reduceIndices: call([[2, 4, 6]]),
  zoneAxis: call([
    [1, 0, 0],
    [0, 1, 0],
  ]),
  angleBetweenDirections: call([basis, [1, 0, 0], [0, 1, 0]]),
  angleBetweenPlanes: call([basis, [1, 0, 0], [0, 1, 0]]),
});

const CALLS: Record<string, [Record<string, unknown>, Record<string, Call>]> = {
  symcrys: [
    classes,
    {
      ...pointCalls(ops, '32', 'piezoelectric'),
      wyckoffPositions: call(['32'], SETTING),
      wyckoffPosition: call(['32', [0, 0, 1]], [...SETTING, ...TOLERANCE]),
      crystalForms: call(['32'], SETTING),
    },
  ],
  'symcrys/magnetic': [magnetic, pointCalls(magneticOps, "6'/m'mm'", 'ferromagnetic')],
  'symcrys/plane': [
    plane,
    {
      planeGroup: call(['p4']),
      pointGroup: call(['4mm']),
      planeGroups: call([]),
      pointGroups: call([]),
      isPlaneGroupKey: call(['p4']),
      isPointGroupKey: call(['4mm']),
      findPlaneGroup: call(['p4']),
      findPointGroup: call(['3m1']),
      cellRestrictions: call(['square']),
      latticeFromParameters: call([{ a: 2, b: 2, gamma: 120 }]),
      latticeParameters: call([
        [
          [1, 0],
          [0, 2],
        ],
      ]),
      metricTensor: call([
        [
          [1, 0],
          [0, 2],
        ],
      ]),
      residualOperations: call(
        [
          plane.operations('p4mm'),
          [
            [1, 0],
            [0, 2],
          ],
        ],
        TOLERANCE,
      ),
      reciprocalBasis: call([
        [
          [1, 0],
          [0, 2],
        ],
      ]),
      changeOfCoordinates: call(
        [
          {
            linearPart: [
              [1, 0],
              [0, 1],
            ],
            originShift: [0, 0.5],
          },
          { points: [[0.1, 0.2]] },
        ],
        TOLERANCE,
      ),
      settings: call(['3m']),
      symbol: call(['3m'], ['setting', 'form']),
      operations: call(['p4'], ['setting']),
      generators: call(['p4'], ['setting']),
      describeOperations: call(['p4'], ['setting']),
      describeOperationsOf: call([plane.operations('p4')], TOLERANCE),
      asymmetricUnit: call(['p4']),
      symmetryElements: call(['p4']),
      wyckoffPositions: call(['3m'], ['setting']),
      crystalForms: call(['3m'], ['setting']),
      wyckoffPosition: call(['p4', [0.1, 0.2]], TOLERANCE),
      siteSymmetry: call(['p4', [0.1, 0.2]], TOLERANCE),
      orbit: call(['p4', [0.1, 0.2]], TOLERANCE),
      wyckoffDistances: call(['p4', [0.1, 0.2]], ['basis']),
    },
  ],
};

/** A value that contains itself: JSON cannot write it. */
const circular: Record<string, unknown> = {};
circular.self = circular;

/** Wrong values: of the wrong type, of the wrong shape, not finite, not writable as JSON. */
const WRONG: readonly unknown[] = [
  1n,
  [1n, 0n, 0n],
  circular,
  Symbol('x'),
  new Map([['setting', 2]]),
  undefined,
  null,
  0,
  -1,
  Number.NaN,
  Number.POSITIVE_INFINITY,
  '',
  'x',
  true,
  {},
  [],
  [1],
  [Number.NaN, 0, 0],
  ['a', 'b', 'c'],
  [[1, 2]],
  [{}],
  [null],
  { matrix: 1 },
  () => 1,
];

/**
 * The positions where a wrong value may be answered instead of refused: a predicate answers false
 * (`isPointGroupKey`), a search answers "not found" for a string that names no group
 * (`findPointGroup`), and a list of operations may be empty where it is closed into a group (the
 * group of the identity) or described one by one.
 */
const isEmptyObject = (v: unknown): boolean =>
  typeof v === 'object' && v !== null && Object.getPrototypeOf(v) === Object.prototype && Object.keys(v).length === 0;

const display = (v: unknown): string => {
  try {
    return typeof v === 'symbol' || typeof v === 'bigint' ? String(v) : (JSON.stringify(v) ?? String(v));
  } catch {
    return 'circular';
  }
};

const MAY_ANSWER: Readonly<Record<string, (position: number, value: unknown) => boolean>> = {
  isPointGroupKey: () => true,
  isPlaneGroupKey: () => true,
  // An empty record of quantities transforms none of them.
  changeOfCoordinates: (p, v) => p === 1 && isEmptyObject(v),
  // `{}` is the standard cell.
  cellTransformation: (p, v) => p > 0 && isEmptyObject(v),
  findPlaneGroup: (p, v) => p === 0 && typeof v === 'string',
  reduceIndices: (p, v) => Array.isArray(v) && v.length > 0 && v.every((x) => Number.isSafeInteger(x) && x !== 0),
  findPointGroup: (p, v) => p === 0 && typeof v === 'string',
  pointGroupOf: (p, v) => p === 0 && Array.isArray(v) && v.length === 0,
  describeOperationsOf: (p, v) => p === 0 && Array.isArray(v) && v.length === 0,
  tensorFormOf: (p, v) => p === 0 && Array.isArray(v) && v.length === 0,
  isCentrosymmetricOf: (p, v) => p === 0 && Array.isArray(v) && v.length === 0,
  isEnantiomorphicOf: (p, v) => p === 0 && Array.isArray(v) && v.length === 0,
  allowsPropertyOf: (p, v) => p === 0 && Array.isArray(v) && v.length === 0,
  allowedPropertiesOf: (p, v) => p === 0 && Array.isArray(v) && v.length === 0,
  residualOperations: (p, v) => p === 0 && Array.isArray(v) && v.length === 0,
  siteSymmetryOf: (p, v) => p === 0 && Array.isArray(v) && v.length === 0,
  orbitOf: (p, v) => p === 0 && Array.isArray(v) && v.length === 0,
};

/** The outcome of a call: 'ok', 'RangeError', or the name and message of another error. */
function outcome(f: (...a: unknown[]) => unknown, args: readonly unknown[]): string {
  try {
    f(...args);
    return 'ok';
  } catch (e) {
    if (e instanceof RangeError) return 'RangeError';
    return `${(e as Error)?.name}: ${(e as Error)?.message}`;
  }
}

describe('wrong input is a RangeError', () => {
  for (const [entry, [module, calls]] of Object.entries(CALLS)) {
    it(`${entry}: the table covers every exported function`, () => {
      const functions = Object.keys(module).filter((k) => typeof module[k] === 'function');
      expect(functions.filter((f) => !(f in calls))).toEqual([]);
    });

    for (const [name, c] of Object.entries(calls)) {
      const f = module[name] as (...a: unknown[]) => unknown;
      it(`${entry} ${name}: valid arguments answer, wrong ones throw a RangeError`, () => {
        const valid = c.required && c.options ? [...c.args.slice(0, c.options.index), c.required] : c.args;
        expect(outcome(f, valid), 'valid arguments').toBe('ok');
        const bad: string[] = [];
        const positions = c.args.length + (c.options ? 1 : 0);
        for (let i = 0; i < positions; i++) {
          for (const w of WRONG) {
            // An omitted or empty options argument is valid.
            if (i >= c.args.length && (w === undefined || isEmptyObject(w))) continue;
            const args = [...c.args];
            args[i] = w;
            const result = outcome(f, args);
            const mayAnswer = MAY_ANSWER[name]?.(i, w) ?? false;
            if (result !== 'RangeError' && !(result === 'ok' && mayAnswer)) {
              bad.push(`argument ${i} = ${display(w)}: ${result}`);
            }
          }
        }
        expect(bad).toEqual([]);
      });

      if (c.options) {
        const { index, keys } = c.options;
        it(`${entry} ${name}: refuses an unknown option key and options that are not an object`, () => {
          for (const options of [
            { bogus: 1 },
            { [keys[0]]: undefined, typo: 1 },
            'setting',
            3,
            [],
            null,
            new Map([[keys[0], 1]]),
            new Date(0),
          ]) {
            const args = [...c.args];
            args[index] = options;
            expect(outcome(f, args), JSON.stringify(options)).toBe('RangeError');
          }
          // Every known key is accepted (undefined means "not given").
          const args = [...c.args];
          args[index] = Object.fromEntries(keys.map((k) => [k, c.required?.[k]]));
          expect(outcome(f, args)).toBe('ok');
        });
      }
    }
  }
});
