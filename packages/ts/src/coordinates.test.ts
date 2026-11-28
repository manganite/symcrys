/**
 * changeOfCoordinates: properties that do not depend on a printed example (the
 * printed ones are in coordinates.reference.test.ts): the inverse pair takes everything back,
 * hu + kv + lw is invariant, the metric is that of the new basis, det P < 0 is allowed, and wrong
 * input is a RangeError.
 */

import { describe, expect, it } from 'vitest';
import * as classes from './index.js';
import * as magnetic from './magnetic.js';
import * as plane from './plane.js';
import type { Mat3, Vec3 } from './linalg.js';

// Rhombohedral → hexagonal axes: a_H = a_R − b_R, b_H = b_R − c_R, c_H = a_R + b_R + c_R (det 3).
const R: Mat3 = [
  [1, 0, 1],
  [-1, 1, 1],
  [0, -1, 1],
];
// q = −P⁻¹p has denominators up to 12, so that the inverse pair is read back exactly.
const p: Vec3 = [0.25, -0.5, 0.5];
const points: Vec3[] = [
  [0.1, 0.2, 0.3],
  [-1.5, 2, 0.75],
];
const directions: Vec3[] = [
  [1, 0, 0],
  [0, 1, 2],
  [3, -1, 1],
];
const planes: Vec3[] = [
  [1, 0, 0],
  [1, 1, 1],
  [2, -1, 3],
];

const closeTo = (x: readonly (readonly number[])[], y: readonly (readonly number[])[]) =>
  expect(x.flat()).toEqual(y.flat().map((v) => expect.closeTo(v, 12)));

describe('changeOfCoordinates', () => {
  it('the inverse pair (Q, q) takes points, directions, planes and operations back', () => {
    const ops = classes.operations('-3m', { axes: 'rhombohedral' });
    const there = classes.changeOfCoordinates(
      { linearPart: R, originShift: p },
      { points, directions, planes, operations: ops },
    );
    const back = classes.changeOfCoordinates(there.inverse, {
      points: there.points,
      directions: there.directions,
      planes: there.planes,
      operations: there.operations,
    });
    closeTo(back.points!, points);
    closeTo(back.directions!, directions);
    closeTo(back.planes!, planes);
    back.operations!.forEach((op, i) => {
      expect(op.matrix).toEqual(ops[i].matrix);
      // Back with the origin shift: w = 0 again, up to rounding of the doubles.
      op.translation.forEach((t) => expect(t).toBeCloseTo(0, 12));
    });
    closeTo(back.inverse.linearPart, R);
  });

  it('hu + kv + lw is the same before and after (planes with P, directions with P⁻¹)', () => {
    const result = classes.changeOfCoordinates({ linearPart: R }, { directions, planes });
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        const before = planes[i].reduce((s, h, k) => s + h * directions[j][k], 0);
        const after = result.planes![i].reduce((s, h, k) => s + h * result.directions![j][k], 0);
        expect(after).toBeCloseTo(before, 12);
      }
    }
  });

  it('the metric is that of the new basis, and does not depend on the origin shift', () => {
    const basis = classes.latticeFromParameters({ a: 4, b: 4, c: 9, alpha: 90, beta: 90, gamma: 120 });
    const newBasis = basis.map((row) =>
      R[0].map((_, j) => row.reduce((s, x, k) => s + x * R[k][j], 0)),
    ) as unknown as Mat3;
    const result = classes.changeOfCoordinates(
      { linearPart: R, originShift: p },
      { metric: classes.metricTensor(basis) },
    );
    closeTo(result.metric!, classes.metricTensor(newBasis));
  });

  it('the operations of a setting in its other basis: hexagonal → rhombohedral axes of -3m', () => {
    // The obverse rhombohedral basis in the hexagonal one (ITA 2016 Table 1.5.1.1): its P is R⁻¹.
    const hexagonal = classes.operations('-3m');
    const rhombohedral = classes.operations('-3m', { axes: 'rhombohedral' });
    const inverse = classes.changeOfCoordinates({ linearPart: R }, {}).inverse.linearPart;
    const result = classes.changeOfCoordinates({ linearPart: inverse }, { operations: hexagonal });
    expect(result.operations!.map((op) => op.matrix)).toEqual(rhombohedral.map((op) => op.matrix));
    expect(result.operations!.every((op) => op.translation.every((t) => t === 0))).toBe(true);
  });

  it('allows det P < 0 (ITA 2016 § 1.5.1.2, p. 76: preferable, not required)', () => {
    const swap: Mat3 = [
      [0, 1, 0],
      [1, 0, 0],
      [0, 0, 1],
    ];
    const result = classes.changeOfCoordinates(
      { linearPart: swap },
      { points: [[0.1, 0.2, 0.3]], planes: [[1, 2, 3]] },
    );
    expect(result.points).toEqual([[0.2, 0.1, 0.3]]);
    expect(result.planes).toEqual([[2, 1, 3]]);
    expect(result.inverse.linearPart).toEqual(swap);
  });

  it('reads P, p and the operations as fractions within the tolerance; W′ exactly integral', () => {
    const third = 1 / 3;
    const Q = classes.changeOfCoordinates({ linearPart: R }, {}).inverse.linearPart;
    expect(Q[0][0]).toBe(2 / 3);
    const rounded = Q.map((row) => row.map((x) => Math.round(x * 1e8) / 1e8)) as unknown as Mat3;
    const result = classes.changeOfCoordinates(
      { linearPart: rounded, originShift: [third, 0, 0] },
      { operations: classes.operations('-3m') },
    );
    for (const op of result.operations!) for (const x of op.matrix.flat()) expect(Number.isInteger(x)).toBe(true);
    // Within a smaller tolerance than the rounding, 0.66666667 is no longer 2/3: the operations of
    // -3m have no integral matrix in that basis, or the exact products leave the safe integers.
    expect(() =>
      classes.changeOfCoordinates(
        { linearPart: rounded },
        { operations: classes.operations('-3m') },
        { tolerance: 1e-9 },
      ),
    ).toThrow(/^changeOfCoordinates: /);
  });

  it('every result can be passed back: denominators above 12 (review of #173)', () => {
    // The triple cell H₁ with an origin shift of 1/8: q has the denominator 24.
    const H1: Mat3 = [
      [1, 1, 0],
      [-1, 2, 0],
      [0, 0, 1],
    ];
    const there = classes.changeOfCoordinates({ linearPart: H1, originShift: [1 / 8, 0, 0] }, { points });
    expect(there.inverse.originShift[1]).toBe(-1 / 24);
    closeTo(classes.changeOfCoordinates(there.inverse, { points: there.points }).points!, points);
    // A sixfold screw axis in a cell with c tripled: w′ = 1/18, and back.
    const tripled: Mat3 = [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 3],
    ];
    const screw = { matrix: classes.operations('6')[1].matrix, translation: [0, 0, 1 / 6] as Vec3 };
    const once = classes.changeOfCoordinates({ linearPart: tripled }, { operations: [screw] });
    expect(once.operations![0].translation[2]).toBe(1 / 18);
    const back = classes.changeOfCoordinates(once.inverse, { operations: once.operations });
    expect(back.operations![0].translation[2]).toBe(1 / 6);
    // A sixteenfold superstructure: Q has the entry 1/16.
    const sixteen: Mat3 = [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 16],
    ];
    const inverse = classes.changeOfCoordinates({ linearPart: sixteen }, {}).inverse.linearPart;
    expect(inverse[2][2]).toBe(1 / 16);
    expect(classes.changeOfCoordinates({ linearPart: inverse }, {}).inverse.linearPart).toEqual(sixteen);
  });

  it('Borchardt-Ott & Sowa, Section 10.6, Example 2: a′ = a + b, b′ = −a + b, c′ = c', () => {
    // The old a becomes ½a′ − ½b′; the plane (100) becomes (1, −1, 0), (110) becomes (2, 0, 0).
    const P: Mat3 = [
      [1, -1, 0],
      [1, 1, 0],
      [0, 0, 1],
    ];
    const result = classes.changeOfCoordinates(
      { linearPart: P },
      {
        directions: [[1, 0, 0]],
        planes: [
          [1, 0, 0],
          [0, 0, 1],
          [1, 1, 0],
        ],
      },
    );
    expect(result.directions).toEqual([[0.5, -0.5, 0]]);
    expect(result.planes).toEqual([
      [1, -1, 0],
      [0, 0, 1],
      [2, 0, 0],
    ]);
  });

  it('keeps a record of operations as given otherwise: other fields are not carried over', () => {
    const result = classes.changeOfCoordinates(
      { linearPart: R },
      { operations: classes.operations('-3m', { axes: 'rhombohedral' }) },
    );
    expect(Object.keys(result.operations![0]).sort()).toEqual(['matrix', 'translation']);
    // timeReversal: false, accepted in symcrys, is not carried over either.
    const unprimed = classes.operations('-3m', { axes: 'rhombohedral' }).map((op) => ({ ...op, timeReversal: false }));
    const without = classes.changeOfCoordinates({ linearPart: R }, { operations: unprimed as never });
    expect(Object.keys(without.operations![0]).sort()).toEqual(['matrix', 'translation']);
  });

  it('carries the time reversal of each operation through in the magnetic API, not cartesian', () => {
    const given = magnetic.operations("-3'm", { axes: 'rhombohedral' });
    const result = magnetic.changeOfCoordinates({ linearPart: R }, { operations: given });
    expect(Object.keys(result.operations![0]).sort()).toEqual(['matrix', 'timeReversal', 'translation']);
    expect(result.operations!.map((op) => op.timeReversal)).toEqual(given.map((op) => op.timeReversal));
    expect(result.operations!.some((op) => op.timeReversal)).toBe(true);
    // The spatial part is that of the crystallographic API.
    const spatial = classes.changeOfCoordinates(
      { linearPart: R },
      { operations: given.map(({ matrix }) => ({ matrix })) },
    );
    expect(result.operations!.map(({ matrix, translation }) => ({ matrix, translation }))).toEqual(spatial.operations);
    expect(Object.isFrozen(result.operations![0])).toBe(true);
    // Without timeReversal in the list, the result is spatial, as before.
    const none = magnetic.changeOfCoordinates(
      { linearPart: R },
      { operations: given.map(({ matrix }) => ({ matrix })) },
    );
    expect(Object.keys(none.operations![0]).sort()).toEqual(['matrix', 'translation']);
    // An empty list stays empty.
    expect(magnetic.changeOfCoordinates({ linearPart: R }, { operations: [] }).operations).toEqual([]);
  });

  it('gives operations of the magnetic API that the functions of the matrices W take again', () => {
    // -3'm on rhombohedral axes, carried to hexagonal axes by R and back by its inverse.
    const given = magnetic.operations("-3'm", { axes: 'rhombohedral' });
    const there = magnetic.changeOfCoordinates({ linearPart: R }, { operations: given });
    const back = magnetic.changeOfCoordinates(
      { linearPart: there.inverse.linearPart },
      { operations: there.operations },
    );
    expect(back.operations!.map((op) => [op.matrix, op.timeReversal])).toEqual(
      given.map((op) => [op.matrix, op.timeReversal]),
    );
    // On hexagonal axes every operation keeps the hexagonal metric, each with its time reversal.
    const kept = magnetic.residualOperations(
      there.operations! as readonly { matrix: Mat3; timeReversal: boolean }[],
      magnetic.latticeBasis("-3'm"),
    );
    expect(kept.map((op) => op.timeReversal)).toEqual(given.map((op) => op.timeReversal));
  });

  it('refuses a list in the magnetic API in which some operations have timeReversal and others not', () => {
    const op = { matrix: magnetic.operations('1')[0].matrix, translation: [0, 0, 0] as Vec3 };
    const I = op.matrix;
    expect(() =>
      magnetic.changeOfCoordinates({ linearPart: I }, { operations: [{ ...op, timeReversal: true }, op] }),
    ).toThrow(
      /operation 0 has timeReversal and operation 1 has not: give timeReversal for every operation or for none/,
    );
    expect(() =>
      magnetic.changeOfCoordinates({ linearPart: I }, { operations: [op, { ...op, timeReversal: false }] }),
    ).toThrow(/operation 1 has timeReversal and operation 0 has not/);
    // A value that is no boolean is named as such first.
    expect(() =>
      magnetic.changeOfCoordinates({ linearPart: I }, { operations: [op, { ...op, timeReversal: 'yes' } as never] }),
    ).toThrow(/timeReversal must be true, false or absent/);
  });

  it('gives only the quantities asked for, frozen', () => {
    const result = classes.changeOfCoordinates({ linearPart: R }, { points });
    expect(Object.keys(result).sort()).toEqual(['inverse', 'points']);
    expect(Object.isFrozen(result.points![0])).toBe(true);
    expect(Object.isFrozen(result.inverse.linearPart[0])).toBe(true);
  });

  it('refuses a singular P, null, wrong shapes, unknown fields, det W ≠ ±1 and a W′ that is not integral', () => {
    const f = classes.changeOfCoordinates;
    expect(() =>
      f(
        {
          linearPart: [
            [1, 1, 0],
            [1, 1, 0],
            [0, 0, 1],
          ],
        },
        {},
      ),
    ).toThrow(/singular/);
    expect(() => f({ linearPart: R, originShift: null as never }, {})).toThrow(/3 numbers/);
    expect(() => f({ linearPart: R }, { operations: [{ matrix: R as never, translation: null as never }] })).toThrow(
      RangeError,
    );
    expect(() =>
      f(
        { linearPart: R },
        {
          operations: [
            {
              matrix: [
                [2, 0, 0],
                [0, 1, 0],
                [0, 0, 1],
              ],
            },
          ],
        },
      ),
    ).toThrow(/det W = ±1/);
    expect(() =>
      f(
        {
          linearPart: [
            [1e300, 0, 0],
            [0, 1, 0],
            [0, 0, 1],
          ],
        },
        {},
      ),
    ).toThrow(/^changeOfCoordinates: /);
    expect(() =>
      f(
        {
          linearPart: [
            [1, 0],
            [0, 1],
          ] as never,
        },
        {},
      ),
    ).toThrow(/3 × 3/);
    expect(() => f({ linearPart: R, originShift: [0, 0] as never }, {})).toThrow(/3 numbers/);
    expect(() => f({ linearPart: R }, { points: [[1, 2]] as never })).toThrow(/vectors of 3/);
    expect(() => f({ linearPart: R }, { vectors: [] } as never)).toThrow(/unknown quantity/);
    expect(() => f({ linearPart: R, shift: [0, 0, 0] } as never, {})).toThrow(/unknown field/);
    const doubled: Mat3 = [
      [2, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ];
    expect(() => f({ linearPart: doubled }, { operations: classes.operations('4') })).toThrow(/no integral matrix/);
    expect(() =>
      f(
        { linearPart: R },
        {
          operations: [
            {
              matrix: [
                [0.5, 0, 0],
                [0, 1, 0],
                [0, 0, 1],
              ],
            },
          ],
        },
      ),
    ).toThrow(/integer entries/);
  });
});

describe('changeOfCoordinates of symcrys/plane', () => {
  // The plane hexagonal cell → the triple cell H₁ (the block of ITA 2016 Table 1.5.1.1, p. 79).
  const P: plane.Mat2 = [
    [1, 1],
    [-1, 2],
  ];

  it('transforms in 2 × 2, and the inverse pair takes everything back', () => {
    const ops = plane.operations('p6mm');
    const there = plane.changeOfCoordinates(
      { linearPart: P, originShift: [0.5, 0] },
      { points: [[0.1, 0.2]], directions: [[1, 0]], planes: [[1, 2]], operations: ops },
    );
    const back = plane.changeOfCoordinates(there.inverse, {
      points: there.points,
      directions: there.directions,
      planes: there.planes,
      operations: there.operations,
    });
    closeTo(back.points!, [[0.1, 0.2]]);
    closeTo(back.directions!, [[1, 0]]);
    closeTo(back.planes!, [[1, 2]]);
    back.operations!.forEach((op, i) => {
      expect(op.matrix).toEqual(ops[i].matrix);
      op.translation.forEach((t, k) => expect(t).toBeCloseTo(ops[i].translation[k], 12));
    });
  });

  it('the metric of the hexagonal cell becomes that of the triple cell: |a′| = |b′| = √3 a, γ = 120°', () => {
    const g = plane.metricTensor(plane.latticeFromParameters({ a: 1, b: 1, gamma: 120 }));
    const result = plane.changeOfCoordinates({ linearPart: P }, { metric: g });
    closeTo(result.metric!, [
      [3, -1.5],
      [-1.5, 3],
    ]);
  });
});

describe('changeOfCoordinates: a linear part that is not rational within the tolerance', () => {
  const c = Math.cos(Math.PI / 6);
  const s = Math.sin(Math.PI / 6);
  const rotation: Mat3 = [
    [c, -s, 0],
    [s, c, 0],
    [0, 0, 1],
  ];
  it('refuses a rotation by 30°, and names rotateTensor in 3D only', () => {
    for (const tolerance of [1e-3, 1e-5, 1e-6]) {
      expect(() =>
        classes.changeOfCoordinates({ linearPart: rotation }, { points: [[0.1, 0.2, 0.3]] }, { tolerance }),
      ).toThrow(/not rational within the tolerance.*rotateTensor/);
    }
    const flat: plane.Mat2 = [
      [c, -s],
      [s, c],
    ];
    expect(() => plane.changeOfCoordinates({ linearPart: flat }, { points: [[0.1, 0.2]] })).toThrow(
      /not rational within the tolerance \S+: its entry [^;]*\)$/,
    );
  });

  it('reads a fraction to rounding as itself at any tolerance (1/3, 2/3, 1/16)', () => {
    const third: Mat3 = [
      [2 / 3, -1 / 3, -1 / 3],
      [1 / 3, 1 / 3, -2 / 3],
      [1 / 3, 1 / 3, 1 / 3],
    ];
    const sixteenth: Mat3 = [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1 / 16],
    ];
    for (const tolerance of [1e-5, 1e-3, 1e-2, 0.05, 0.09]) {
      const r = classes.changeOfCoordinates({ linearPart: third }, { points: [[1 / 3, 1 / 3, 1 / 3]] }, { tolerance });
      expect(r.inverse.linearPart[0][0]).toBe(1);
      const t = classes.changeOfCoordinates({ linearPart: sixteenth }, { points: [[0, 0, 0.5]] }, { tolerance });
      expect(t.points![0][2]).toBe(8);
    }
  });
});

describe('changeOfCoordinates: what the review before 0.15.0 found', () => {
  const I: Mat3 = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
  it('takes an origin shift and translations that are no fractions to rounding as they are', () => {
    const c = classes.changeOfCoordinates(
      { linearPart: I, originShift: [0.3333, 0.1234, 1 / 3] },
      { points: [[0.5, 0.5, 0.5]], operations: [{ matrix: I, translation: [0.1234, 0, 0] }] },
    );
    const [x, y, z] = c.points![0];
    expect(x).toBeCloseTo(0.1667, 14);
    expect(y).toBeCloseTo(0.3766, 14);
    expect(z).toBe(0.5 - 1 / 3);
    expect(c.operations![0].translation[0]).toBeCloseTo(0.1234, 15);
    expect(c.inverse.originShift[1]).toBeCloseTo(-0.1234, 15);
  });

  it('refuses time reversal in symcrys and a timeReversal that is not a boolean in both entry points', () => {
    const op = { matrix: I, translation: [0, 0, 0] };
    expect(() =>
      classes.changeOfCoordinates({ linearPart: I }, { operations: [{ ...op, timeReversal: true } as never] }),
    ).toThrow(/magnetic/);
    expect(() =>
      magnetic.changeOfCoordinates({ linearPart: I }, { operations: [{ ...op, timeReversal: 'yes' } as never] }),
    ).toThrow(/timeReversal must be true, false or absent/);
    expect(
      magnetic.changeOfCoordinates({ linearPart: I }, { operations: [{ ...op, timeReversal: true } as never] })
        .operations,
    ).toHaveLength(1);
  });
});
