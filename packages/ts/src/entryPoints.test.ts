/**
 * The two entry points (docs/conventions.md, "Two entry points"): `index.ts`, the crystallographic
 * API for the 32 crystal classes without time reversal, and `magnetic.ts`, the magnetic API for the
 * 122 magnetic point groups. Checked here: the two export the same names; the crystallographic API
 * returns nothing about time reversal and refuses every question that involves it; and where both
 * can be asked, they agree: a time-even question has the same answer for a crystal class, its white
 * group and its grey group.
 */

import { representativeFace } from './pointGroups/wyckoff.js';
import { describe, expect, it } from 'vitest';
import pkg from '../package.json' with { type: 'json' };
import * as classes from './index.js';
import * as magnetic from './magnetic.js';
import * as plane from './plane.js';
import * as wyckoff from './pointGroups/wyckoff.js';

const MAGNETIC_API = /symcrys\/magnetic/;

/** The crystallographic API takes keys of crystal classes; tests pass it other keys on purpose. */
const asClass = (key: string) => key as classes.PointGroupKey;

describe('the entry points', () => {
  it('are both entries of the package', () => {
    expect(Object.keys(pkg.exports)).toEqual(['.', './magnetic', './plane', './package.json']);
  });

  it('export the same names; only the Wyckoff positions and the crystal forms are crystallographic alone', () => {
    const onlyClasses = ['CRYSTAL_FORM_TYPES', 'crystalForms', 'wyckoffPosition', 'wyckoffPositions'];
    expect(Object.keys(classes).sort()).toEqual([...Object.keys(magnetic), ...onlyClasses].sort());
    for (const name of Object.keys(magnetic) as (keyof typeof magnetic)[]) {
      expect(typeof classes[name], name).toBe(typeof magnetic[name]);
    }
  });

  it('share the version', () => {
    expect(magnetic.VERSION).toBe(classes.VERSION);
  });
});

describe('keys', () => {
  it('32 crystal classes here, 122 magnetic point groups there, the classes first', () => {
    expect(classes.POINT_GROUP_KEYS).toHaveLength(32);
    expect(magnetic.POINT_GROUP_KEYS).toHaveLength(122);
    expect(magnetic.POINT_GROUP_KEYS.slice(0, 32)).toEqual(classes.POINT_GROUP_KEYS);
    expect(classes.pointGroups().map((g) => g.key)).toEqual(classes.POINT_GROUP_KEYS);
    expect(magnetic.pointGroups().map((g) => g.key)).toEqual(magnetic.POINT_GROUP_KEYS);
  });

  it('a magnetic key is a key of the magnetic API only', () => {
    for (const key of magnetic.POINT_GROUP_KEYS) {
      expect(magnetic.isPointGroupKey(key)).toBe(true);
      expect(classes.isPointGroupKey(key), key).toBe(magnetic.pointGroup(key).type === 'I');
    }
    expect(classes.findPointGroup("321'")).toBeUndefined();
    expect(classes.findPointGroup("4'/mmm'")).toBeUndefined();
    expect(magnetic.findPointGroup("321'")?.key).toBe("321'");
    expect(magnetic.findPointGroup("4'/mmm'")?.key).toBe("4'/mmm'");
    expect(classes.findPointGroup('321')).toEqual(magnetic.findPointGroup('321'));
  });

  it('a crystal class has no type and is its own class; a magnetic point group has both', () => {
    for (const key of classes.POINT_GROUP_KEYS) {
      const g = classes.pointGroup(key);
      const m = magnetic.pointGroup(key);
      expect(Object.keys(g).sort()).toEqual([
        'centrosymmetric',
        'crystalSystem',
        'enantiomorphic',
        'key',
        'laueClass',
        'order',
        'polar',
      ]);
      expect(Object.keys(m).sort()).toEqual([...Object.keys(g), 'crystalClass', 'type'].sort());
      expect(m.type).toBe('I');
      expect(m.crystalClass).toBe(key);
      // The fixed properties of a class are those of its white group.
      const { type: _type, crystalClass: _crystalClass, ...shared } = m;
      expect(g).toEqual(shared);
      expect(classes.pointGroup(key)).toBe(g);
      expect(Object.isFrozen(g)).toBe(true);
    }
    classes.pointGroups().forEach((g, i) => expect(g).toBe(classes.pointGroup(classes.POINT_GROUP_KEYS[i])));
  });

  it('a class is found by the symbol of each of its settings', () => {
    for (const key of classes.POINT_GROUP_KEYS) {
      // A rhombohedral symbol (`32`, `3 2`) is, without spaces, the key, which gives the default.
      for (const setting of classes.settings(key).filter((s) => s.axes !== 'rhombohedral')) {
        for (const hm of [setting.symbol, setting.fullSymbol]) {
          const found = classes.findPointGroup(hm);
          const what = `${hm} (${key})`;
          expect(found?.key, what).toBe(key);
          const again = classes.settings(key)[found!.setting - 1];
          expect([again.symbol, again.fullSymbol], what).toContain(hm);
        }
      }
    }
    // D3h: the symbol of setting 2 (docs/conventions.md, "Keys").
    expect(classes.findPointGroup('-62m')).toEqual({ key: '-6m2', setting: 2 });
    // The convention argument, removed in 0.11.0, is refused in both entry points.
    for (const api of [classes, magnetic]) {
      expect(() => (api.settings as (...args: unknown[]) => unknown)('32', 'birss')).toThrow(RangeError);
      expect(() => (api.findPointGroup as (...args: unknown[]) => unknown)('32', 'birss')).toThrow(RangeError);
    }
  });
});

describe('the crystallographic API returns nothing about time reversal', () => {
  it('operations and generators are the matrices W and the Cartesian matrices of the white group, in its order', () => {
    for (const key of classes.POINT_GROUP_KEYS) {
      for (const { index: setting } of classes.settings(key)) {
        const options = { setting };
        for (const list of ['operations', 'generators'] as const) {
          const ops = classes[list](key, options);
          const white = magnetic[list](key, options);
          const what = `${list} of ${key}, setting ${setting}`;
          expect(ops, what).toHaveLength(white.length);
          ops.forEach((op, i) => {
            expect(Object.keys(op), what).toEqual(['matrix', 'cartesian']);
            expect(op.matrix, what).toBe(white[i].matrix);
            expect(op.cartesian, what).toBe(white[i].cartesian);
            expect(white[i].timeReversal, what).toBe(false);
            expect(Object.isFrozen(op), what).toBe(true);
          });
          expect(Object.isFrozen(ops), what).toBe(true);
          expect(classes[list](key, options), what).toBe(ops);
        }
      }
    }
  });

  it('descriptions of operations have no time reversal and are otherwise those of the white group', () => {
    for (const key of classes.POINT_GROUP_KEYS) {
      const described = classes.describeOperations(key);
      const white = magnetic.describeOperations(key);
      expect(described.map((d) => ({ ...d, timeReversal: false }))).toEqual(white);
      for (const d of described) expect('timeReversal' in d).toBe(false);
      expect(classes.describeOperations(key)).toBe(described);
      expect(classes.symmetryDirections(key)).toBe(magnetic.symmetryDirections(key));
    }
  });

  it('settings, symbols and the properties of the operations are those of the white group', () => {
    for (const key of classes.POINT_GROUP_KEYS) {
      expect(classes.settings(key)).toEqual(magnetic.settings(key));
      for (const form of ['short', 'full'] as const) {
        expect(classes.symbol(key, { form })).toBe(magnetic.symbol(key, { form }));
      }
      // Schoenflies: ITA's in the crystallographic API, ITC Vol. D's in the magnetic API (#137 B3),
      // which differ for -3 only.
      const ita = classes.symbol(key, { form: 'schoenflies' });
      expect(magnetic.symbol(key, { form: 'schoenflies' })).toBe(key === '-3' ? 'S6' : ita);
      if (key === '-3') expect(ita).toBe('C3i');
      // … and for a list of operations: the same answers as the fields, and as the magnetic API.
      const g = classes.pointGroup(key);
      for (const list of ['operations', 'generators'] as const) {
        expect(classes.isCentrosymmetricOf(classes[list](key)), `${key} ${list}`).toBe(g.centrosymmetric);
        expect(classes.isEnantiomorphicOf(classes[list](key)), `${key} ${list}`).toBe(g.enantiomorphic);
        expect(magnetic.isCentrosymmetricOf(magnetic[list](key)), `${key} ${list}`).toBe(g.centrosymmetric);
        expect(magnetic.isEnantiomorphicOf(magnetic[list](key)), `${key} ${list}`).toBe(g.enantiomorphic);
        expect(classes.allowsPropertyOf(classes[list](key), 'pyroelectric'), `${key} ${list}`).toBe(g.polar);
      }
    }
  });

  it('the holohedry of a lattice system is the same function in both; the lattice systems agree', () => {
    expect(classes.holohedry).toBe(magnetic.holohedry);
    for (const key of classes.POINT_GROUP_KEYS)
      expect(magnetic.latticeSystems(key)).toEqual(classes.latticeSystems(key));
    // A magnetic group has the lattice systems of its crystal class.
    for (const key of magnetic.POINT_GROUP_KEYS) {
      expect(magnetic.latticeSystems(key)).toEqual(classes.latticeSystems(magnetic.pointGroup(key).crystalClass));
    }
    expect(() => classes.latticeSystems("32'" as classes.PointGroupKey)).toThrow(RangeError);
  });

  it('Wyckoff positions and site symmetry take their options', () => {
    for (const key of classes.POINT_GROUP_KEYS) {
      for (const { index: setting } of classes.settings(key)) {
        const positions = classes.wyckoffPositions(key, { setting });
        expect(positions, `${key}, setting ${setting}`).toBe(wyckoff.wyckoffPositions(key, { setting }));
        const special = positions[positions.length - 1];
        const direction = representativeFace(key, setting, special.millerIndices).cartesian;
        expect(classes.wyckoffPosition(key, direction, { setting }).letter).toBe(special.letter);
      }
    }
    // 32: the twofold axes lie along other directions in the two settings.
    expect(classes.wyckoffPositions('32', { setting: 1 })).not.toEqual(classes.wyckoffPositions('32', { setting: 2 }));
    // A direction 0.06° off the fourfold axis of 4mm: general by default, on the axis within 10⁻².
    const off = [0.001, 0.0005, 1] as const;
    const ops = classes.operations('4mm');
    expect(classes.siteSymmetryOf(ops, off).multiplicity).toBe(8);
    expect(classes.siteSymmetryOf(ops, off, { tolerance: 1e-2 }).multiplicity).toBe(1);
    expect(classes.wyckoffPosition('4mm', off).letter).toBe('d');
    expect(classes.wyckoffPosition('4mm', off, { tolerance: 1e-2 }).letter).toBe('a');
  });

  it('the named properties are those of time-even tensors, their specifications without time parity', () => {
    const timeEven = Object.entries(magnetic.TENSOR_PROPERTIES).filter(([, p]) => p.spec.timeParity === 'even');
    expect(Object.keys(classes.TENSOR_PROPERTIES)).toEqual(timeEven.map(([name]) => name));
    expect(Object.keys(classes.TENSOR_PROPERTIES)).toEqual([
      'pyroelectric',
      'ferroaxial',
      'piezoelectric',
      'gyrotropic',
    ]);
    expect(Object.keys(magnetic.TENSOR_PROPERTIES)).toHaveLength(8);
    for (const [name, p] of timeEven) {
      const { timeParity: _timeParity, ...spec } = p.spec;
      const own = classes.TENSOR_PROPERTIES[name as classes.TensorPropertyName];
      expect(own).toEqual({ spec, description: p.description, source: p.source });
      expect(Object.isFrozen(own) && Object.isFrozen(own.spec)).toBe(true);
      expect(`${own.description} ${own.source}`).not.toMatch(/time/i);
    }
  });
});

describe('the crystallographic API refuses what involves time reversal', () => {
  const GREY = "321'";
  const BLACK_WHITE = "4'/mmm'";

  it('a magnetic point group, in every function that takes a key', () => {
    const byKey: ((key: classes.PointGroupKey) => unknown)[] = [
      classes.pointGroup,
      classes.settings,
      classes.operations,
      classes.generators,
      classes.symbol,
      classes.describeOperations,
      classes.symmetryDirections,
      classes.wyckoffPositions,
      (key) => classes.wyckoffPosition(key, [0, 0, 1]),
      classes.crystalForms,
      (key) => classes.orbit(key, { hkl: [1, 0, 0] }),
      (key) => classes.tensorForm(key, 'piezoelectric'),
      (key) => classes.allowsProperty(key, 'piezoelectric'),
      classes.allowedProperties,
    ];
    for (const f of byKey) {
      for (const key of [GREY, BLACK_WHITE]) {
        expect(() => f(asClass(key)), `${f.name} ${key}`).toThrow(RangeError);
        expect(() => f(asClass(key)), `${f.name} ${key}`).toThrow(MAGNETIC_API);
        expect(() => f(asClass(key)), `${f.name} ${key}`).toThrow(/magnetic point group, not a crystal class/);
      }
      expect(() => f(asClass('5')), f.name).toThrow(/Unknown point group key: "5"/);
      expect(() => f(asClass('5')), f.name).not.toThrow(MAGNETIC_API);
    }
  });

  it('the property of a time-odd tensor', () => {
    const ops = classes.operations('3');
    for (const name of ['ferromagnetic', 'ferrotoroidic', 'magnetoelectric', 'piezomagnetic']) {
      const odd = name as classes.TensorPropertyName;
      const calls = [
        () => classes.allowsProperty('3', odd),
        () => classes.allowsPropertyOf(ops, odd),
        () => classes.tensorForm('3', odd),
        () => classes.tensorFormOf(ops, odd),
        () => classes.rotateTensor([0, 0, 1], classes.operations('3')[1].cartesian, odd),
      ];
      for (const call of calls) {
        expect(call, name).toThrow(RangeError);
        expect(call, name).toThrow(MAGNETIC_API);
        expect(call, name).toThrow(/time-odd tensor/);
      }
    }
    expect(() => classes.allowsProperty('3', 'magnetic' as classes.TensorPropertyName)).toThrow(
      /Unknown tensor property: "magnetic" \(known: pyroelectric, ferroaxial, piezoelectric, gyrotropic\)/,
    );
    expect(() => classes.allowsProperty('3', { rank: 1 } as unknown as classes.TensorPropertyName)).toThrow(
      /Unknown tensor property/,
    );
  });

  it("a time-odd tensor specification; time parity 'even' is accepted", () => {
    const vector = { rank: 1, kind: 'axial', intrinsic: 'none' } as const;
    const odd = { ...vector, timeParity: 'odd' } as classes.TensorSpec;
    const even = { ...vector, timeParity: 'even' } as classes.TensorSpec;
    expect(() => classes.tensorForm('3', odd)).toThrow(MAGNETIC_API);
    expect(() => classes.tensorFormOf(classes.operations('3'), odd)).toThrow(MAGNETIC_API);
    expect(() => classes.rotateTensor([0, 0, 1], classes.operations('3')[1].cartesian, odd)).toThrow(MAGNETIC_API);
    expect(classes.tensorForm('3', even)).toBe(classes.tensorForm('3', vector));
    expect(() => classes.tensorForm('3', { ...vector, timeParity: 'x' } as classes.TensorSpec)).toThrow(
      /The time parity of a tensor is 'even' or 'odd', not "x"/,
    );
    expect(() => classes.tensorForm('3', null as unknown as classes.TensorSpec)).toThrow(/Not a tensor specification/);
  });

  it('an operation combined with time reversal; an operation of the magnetic API without is accepted', () => {
    const grey = magnetic.operations(GREY);
    const white = magnetic.operations('32');
    const calls = [
      (ops: readonly classes.Operation[]) => classes.siteSymmetryOf(ops, [0, 0, 1]),
      (ops: readonly classes.Operation[]) => classes.orbitOf(ops, [1, 2, 3]),
      (ops: readonly classes.Operation[]) => classes.pointGroupOf(ops),
      (ops: readonly classes.Operation[]) => classes.describeOperationsOf(ops),
      (ops: readonly classes.Operation[]) => classes.tensorFormOf(ops, 'piezoelectric'),
      (ops: readonly classes.Operation[]) => classes.allowsPropertyOf(ops, 'piezoelectric'),
      (ops: readonly classes.Operation[]) => classes.allowedPropertiesOf(ops),
      (ops: readonly classes.Operation[]) => classes.isCentrosymmetricOf(ops),
      (ops: readonly classes.Operation[]) => classes.isEnantiomorphicOf(ops),
    ];
    const marked = (timeReversal: unknown) => [{ ...white[0], timeReversal } as classes.Operation];
    for (const call of calls) {
      expect(() => call(grey)).toThrow(RangeError);
      expect(() => call(grey)).toThrow(/Operation 6 is combined with time reversal/);
      expect(() => call(grey)).toThrow(MAGNETIC_API);
      expect(call(white)).toEqual(call(classes.operations('32')));
      // Neither true nor false nor absent: an error, not "no time reversal".
      for (const value of [1, 'true', null, 0]) {
        expect(() => call(marked(value)), JSON.stringify(value)).toThrow(
          /Operation 0: timeReversal must be false or absent/,
        );
      }
    }
  });
});

describe('every function for a list of Cartesian operations refuses a matrix that is not orthogonal', () => {
  // A stretch is no point operation; a function that took it would give a result that looks valid
  // and is wrong (siteSymmetry did so up to 0.8.0).
  const stretch = {
    cartesian: [
      [2, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ],
  } as const;
  const notOrthogonal = /Operation 0 is not an orthogonal \(Cartesian\) matrix/;
  it('in the crystallographic API', () => {
    const ops = [stretch] as unknown as readonly classes.Operation[];
    for (const call of [
      () => classes.siteSymmetryOf(ops, [1, 0, 0]),
      () => classes.siteSymmetryOf(ops, [0, 1, 0]),
      () => classes.orbitOf(ops, [1, 2, 3]),
      () => classes.pointGroupOf(ops),
      () => classes.describeOperationsOf(ops),
      () => classes.tensorFormOf(ops, 'piezoelectric'),
      () => classes.allowsPropertyOf(ops, 'piezoelectric'),
      () => classes.allowedPropertiesOf(ops),
      () => classes.isCentrosymmetricOf(ops),
      () => classes.isEnantiomorphicOf(ops),
    ]) {
      expect(call).toThrow(RangeError);
      expect(call).toThrow(notOrthogonal);
    }
  });
  it('within the tolerance of the call: operations rounded to 4 decimals pass with tolerance 10⁻⁴', () => {
    // 6/mmm (order 24): [001] has site symmetry 6mm (order 12), [100] mm2 (order 4); ITA 6th ed.
    // Table 3.2.3.2, multiplicities 2 and 6.
    const rounded = classes.operations('6/mmm').map((op) => ({
      cartesian: op.cartesian.map((row) => row.map((x) => Math.round(x * 1e4) / 1e4)),
    })) as unknown as readonly classes.Operation[];
    expect(() => classes.siteSymmetryOf(rounded, [0, 0, 1])).toThrow(/not an orthogonal/);
    expect(classes.siteSymmetryOf(rounded, [0, 0, 1], { tolerance: 1e-4 }).multiplicity).toBe(2);
    expect(classes.siteSymmetryOf(rounded, [1, 0, 0], { tolerance: 1e-4 }).multiplicity).toBe(6);
    expect(() => classes.orbitOf(rounded, [1, 0, 0])).toThrow(/not an orthogonal/);
    expect(classes.orbitOf(rounded, [1, 0, 0], { tolerance: 1e-4 })).toHaveLength(6);
  });
  it('in the magnetic API', () => {
    const ops = [{ ...stretch, timeReversal: false }] as unknown as readonly magnetic.Operation[];
    for (const call of [
      () => magnetic.siteSymmetryOf(ops, [1, 0, 0]),
      () => magnetic.siteSymmetryOf(ops, [0, 1, 0]),
      () => magnetic.orbitOf(ops, [1, 2, 3]),
      () => magnetic.pointGroupOf(ops),
      () => magnetic.describeOperationsOf(ops),
      () => magnetic.tensorFormOf(ops, 'pyroelectric'),
      () => magnetic.allowsPropertyOf(ops, 'pyroelectric'),
      () => magnetic.allowedPropertiesOf(ops),
      () => magnetic.isCentrosymmetricOf(ops),
      () => magnetic.isEnantiomorphicOf(ops),
    ]) {
      expect(call).toThrow(RangeError);
      expect(call).toThrow(notOrthogonal);
    }
  });
});

describe('every function for a list of Cartesian operations reads cartesian, and refuses a record without it (#94)', () => {
  // The lattice matrix W of 6/mmm passed as the only matrix of an operation: refused with a hint,
  // never read as a Cartesian matrix.
  const latticeOnly = /Operation 0 has no Cartesian matrix.*field matrix is the matrix W in the lattice basis/;
  it('in the crystallographic API', () => {
    const ops = classes
      .operations('6/mmm')
      .map((op) => ({ matrix: op.matrix })) as unknown as readonly classes.Operation[];
    for (const call of [
      () => classes.siteSymmetryOf(ops, [1, 0, 0]),
      () => classes.orbitOf(ops, [1, 2, 3]),
      () => classes.pointGroupOf(ops),
      () => classes.describeOperationsOf(ops),
      () => classes.tensorFormOf(ops, 'piezoelectric'),
      () => classes.allowsPropertyOf(ops, 'piezoelectric'),
      () => classes.allowedPropertiesOf(ops),
      () => classes.isCentrosymmetricOf(ops),
      () => classes.isEnantiomorphicOf(ops),
    ]) {
      expect(call).toThrow(RangeError);
      expect(call).toThrow(latticeOnly);
    }
    // Not a record at all: a RangeError, not a TypeError.
    expect(() => classes.siteSymmetryOf([null as never], [1, 0, 0])).toThrow(RangeError);
    expect(() => classes.tensorFormOf([7 as never], 'piezoelectric')).toThrow(RangeError);
    // A record as operations() gives it passes as it is.
    expect(classes.pointGroupOf(classes.operations('-6m2', { setting: 2 }))).toEqual({ key: '-6m2', setting: 2 });
  });
  it('in the magnetic API', () => {
    const ops = magnetic
      .operations("6/m'mm")
      .map((op) => ({ matrix: op.matrix, timeReversal: op.timeReversal })) as unknown as readonly magnetic.Operation[];
    for (const call of [
      () => magnetic.siteSymmetryOf(ops, [1, 0, 0]),
      () => magnetic.orbitOf(ops, [1, 2, 3]),
      () => magnetic.pointGroupOf(ops),
      () => magnetic.describeOperationsOf(ops),
      () => magnetic.tensorFormOf(ops, 'pyroelectric'),
      () => magnetic.allowsPropertyOf(ops, 'pyroelectric'),
      () => magnetic.allowedPropertiesOf(ops),
      () => magnetic.isCentrosymmetricOf(ops),
      () => magnetic.isEnantiomorphicOf(ops),
    ]) {
      expect(call).toThrow(RangeError);
      expect(call).toThrow(latticeOnly);
    }
    // A record with cartesian and timeReversal only is enough.
    const cartesianOnly = magnetic
      .operations("6/m'mm")
      .map((op) => ({ cartesian: op.cartesian, timeReversal: op.timeReversal }));
    expect(magnetic.pointGroupOf(cartesianOnly)).toEqual({ key: "6/m'mm", setting: 1 });
  });
});

describe('the magnetic API asks every operation whether it is combined with time reversal', () => {
  // Without the check, an operation without `timeReversal` is composed as if it had it in every
  // second product: the inversion alone then "allows" a polar vector.
  const calls = [
    (ops: readonly magnetic.Operation[]) => magnetic.tensorFormOf(ops, 'pyroelectric'),
    (ops: readonly magnetic.Operation[]) => magnetic.allowsPropertyOf(ops, 'pyroelectric'),
    (ops: readonly magnetic.Operation[]) => magnetic.allowedPropertiesOf(ops),
    (ops: readonly magnetic.Operation[]) => magnetic.isCentrosymmetricOf(ops),
    (ops: readonly magnetic.Operation[]) => magnetic.isEnantiomorphicOf(ops),
    (ops: readonly magnetic.Operation[]) => magnetic.pointGroupOf(ops),
    (ops: readonly magnetic.Operation[]) => magnetic.describeOperationsOf(ops),
  ];
  const asMagnetic = (ops: readonly unknown[]) => ops as readonly magnetic.Operation[];

  it('operations of the crystallographic API are refused, not read as a white group', () => {
    for (const key of ['-1', 'm-3m', '32'] as const) {
      for (const list of [classes.generators(key), classes.operations(key)]) {
        for (const call of calls) {
          expect(() => call(asMagnetic(list)), key).toThrow(RangeError);
          expect(() => call(asMagnetic(list)), key).toThrow(
            /Operation 0: timeReversal must be true or false, not undefined/,
          );
        }
      }
    }
    const inversion = classes.generators('-1')[0].cartesian;
    for (const value of [1, 'false', null]) {
      expect(() => calls[0](asMagnetic([{ cartesian: inversion, timeReversal: value }]))).toThrow(
        /timeReversal must be true or false/,
      );
    }
  });

  it('with the answer given, the form is that of the group: inversion forbids a polar vector, 1̄′ does not', () => {
    const inversion = classes.generators('-1')[0].cartesian;
    expect(magnetic.tensorFormOf([{ cartesian: inversion, timeReversal: false }], 'pyroelectric').basis).toHaveLength(
      0,
    );
    expect(magnetic.tensorFormOf([{ cartesian: inversion, timeReversal: true }], 'pyroelectric').basis).toHaveLength(0);
    expect(magnetic.tensorFormOf([{ cartesian: inversion, timeReversal: true }], 'magnetoelectric').basis).toHaveLength(
      9,
    );
    expect(magnetic.tensorFormOf(magnetic.generators('-1'), 'pyroelectric')).toEqual(
      magnetic.tensorForm('-1', 'pyroelectric'),
    );
  });
});

describe('the types keep the two entry points apart', () => {
  // Each line marked @ts-expect-error must fail the type check (gate `typecheck`); at run time it
  // throws or gives undefined, which this test does not look at.
  const attempt = (f: () => unknown): void => {
    try {
      f();
    } catch {
      // refused at run time as well
    }
  };

  it('what the crystallographic API returns has no time reversal', () => {
    // @ts-expect-error an operation of a crystal class has no timeReversal
    attempt(() => classes.operations('32')[0].timeReversal);
    // @ts-expect-error nor has its description
    attempt(() => classes.describeOperations('32')[0].timeReversal);
    // @ts-expect-error a crystal class has no type
    attempt(() => classes.pointGroup('32').type);
    // @ts-expect-error the table has no time-odd property
    attempt(() => classes.TENSOR_PROPERTIES.magnetoelectric);
    // @ts-expect-error a specification has no time parity
    attempt(() => classes.TENSOR_PROPERTIES.piezoelectric.spec.timeParity);
    // @ts-expect-error a class in a setting is not generic in the key
    const _magnetic: classes.PointGroupInSetting<"4'/mmm'"> | undefined = undefined;
    expect(_magnetic).toBeUndefined();
  });

  it('what involves time reversal is not accepted by the crystallographic API', () => {
    // @ts-expect-error the key of a magnetic point group
    attempt(() => classes.pointGroup("321'"));
    // @ts-expect-error the name of a time-odd property
    attempt(() => classes.allowsProperty('32', 'magnetoelectric'));
    // @ts-expect-error a time-odd specification
    attempt(() => classes.tensorForm('32', { rank: 1, kind: 'axial', timeParity: 'odd', intrinsic: 'none' }));
    const magneticSpec: magnetic.TensorSpec = { rank: 1, kind: 'polar', timeParity: 'even', intrinsic: 'none' };
    // @ts-expect-error a specification of the magnetic API, whose time parity may be 'odd'
    attempt(() => classes.tensorForm('32', magneticSpec));
    // @ts-expect-error operations of the magnetic API, which may be combined with time reversal
    attempt(() => classes.tensorFormOf(magnetic.operations("321'"), 'piezoelectric'));
    // @ts-expect-error also for the site symmetry
    attempt(() => classes.siteSymmetryOf(magnetic.operations('32'), [0, 0, 1]));
    // Accepted: time parity 'even' and no time reversal, stated.
    attempt(() => classes.tensorForm('32', { rank: 1, kind: 'polar', timeParity: 'even', intrinsic: 'none' }));
    attempt(() =>
      classes.tensorFormOf([{ cartesian: classes.operations('1')[0].cartesian, timeReversal: false }], 'pyroelectric'),
    );
  });

  it('what lacks time reversal is not accepted by the magnetic API', () => {
    // @ts-expect-error operations of the crystallographic API do not say whether they have time reversal
    attempt(() => magnetic.tensorFormOf(classes.operations('32'), 'piezoelectric'));
    // @ts-expect-error a specification without time parity
    attempt(() => magnetic.tensorForm('32', { rank: 1, kind: 'polar', intrinsic: 'none' }));
    // @ts-expect-error the Wyckoff positions are crystallographic
    attempt(() => magnetic.wyckoffPositions('32'));
  });
});

describe('a time-even question has one answer: class, white group and grey group agree', () => {
  const grey = (key: classes.PointGroupKey) => `${key}1'` as magnetic.PointGroupKey;
  const SPECS: classes.TensorSpec[] = [
    ...Object.values(classes.TENSOR_PROPERTIES).map((p) => p.spec),
    { rank: 2, kind: 'polar', intrinsic: 'symmetric-first-pair' },
    { rank: 3, kind: 'axial', intrinsic: 'none' },
  ];

  it('forms of time-even tensors, in every setting', { timeout: 60_000 }, () => {
    for (const key of classes.POINT_GROUP_KEYS) {
      for (const { index: setting } of classes.settings(key)) {
        for (const spec of SPECS) {
          const form = classes.tensorForm(key, spec, { setting });
          const magneticSpec = { ...spec, timeParity: 'even' } as const;
          expect(form).toBe(magnetic.tensorForm(key, magneticSpec, { setting }));
          expect(form).toEqual(magnetic.tensorForm(grey(key), magneticSpec, { setting }));
          expect(classes.tensorFormOf(classes.operations(key, { setting }), spec)).toEqual(form);
        }
      }
    }
  });

  it('allowed properties: those of the grey group; the white group may allow time-odd ones in addition', () => {
    const timeEven = Object.keys(classes.TENSOR_PROPERTIES);
    for (const key of classes.POINT_GROUP_KEYS) {
      const allowed = classes.allowedProperties(key);
      expect(allowed, key).toEqual(magnetic.allowedProperties(grey(key)));
      expect(allowed, key).toEqual(magnetic.allowedProperties(key).filter((name) => timeEven.includes(name)));
      expect(classes.allowedPropertiesOf(classes.operations(key)), key).toEqual(allowed);
      for (const name of allowed) expect(classes.allowsProperty(key, name)).toBe(true);
    }
  });

  it('quartz: class 32, grey group 321′; the white group 32 is another crystal', () => {
    expect(classes.allowedProperties('32')).toEqual(['piezoelectric', 'gyrotropic']);
    expect(magnetic.allowedProperties("321'")).toEqual(['piezoelectric', 'gyrotropic']);
    expect(magnetic.allowedProperties('32')).toEqual([
      'piezoelectric',
      'gyrotropic',
      'magnetoelectric',
      'piezomagnetic',
    ]);
  });

  it('the point group of a list: the class, and the white group of its operations', () => {
    for (const key of classes.POINT_GROUP_KEYS) {
      for (const { index: setting, axes } of classes.settings(key)) {
        // Rhombohedral axes have the Cartesian operations of setting 1: the same frame.
        const found = { key, setting: axes === 'rhombohedral' ? 1 : setting };
        expect(classes.pointGroupOf(classes.operations(key, { setting }))).toEqual(found);
        const white = magnetic.operations(key, { setting });
        expect(magnetic.pointGroupOf(white)).toEqual(found);
        expect(classes.describeOperationsOf(classes.operations(key, { setting }))).toEqual(
          magnetic.describeOperationsOf(white).map(({ timeReversal: _t, ...d }) => d),
        );
      }
    }
    expect(magnetic.pointGroupOf(magnetic.operations("321'"))).toEqual({ key: "321'", setting: 1 });
  });

  it('orbits agree', () => {
    for (const key of classes.POINT_GROUP_KEYS) {
      for (const { index: setting } of classes.settings(key)) {
        expect(classes.orbit(key, { hkl: [3, 2, 1] }, { setting })).toEqual(
          magnetic.orbit(key, { hkl: [3, 2, 1] }, { setting }),
        );
        const ops = classes.operations(key, { setting });
        expect(classes.orbitOf(ops, [3, 2, 1])).toEqual(
          magnetic.orbitOf(magnetic.operations(key, { setting }), [3, 2, 1]),
        );
      }
    }
  });

  it('site symmetry does not depend on time reversal', () => {
    for (const key of ['32', '4mm', 'm-3m'] as const) {
      for (const direction of [
        [0, 0, 1],
        [1, 0, 0],
        [1, 2, 3],
      ] as const) {
        const site = classes.siteSymmetryOf(classes.operations(key), direction);
        expect(site).toEqual(magnetic.siteSymmetryOf(magnetic.operations(key), direction));
        expect(magnetic.siteSymmetryOf(magnetic.operations(grey(key)), direction).multiplicity).toBe(site.multiplicity);
      }
    }
  });
});

describe('siteSymmetry of a key (#137 C1)', () => {
  it('is siteSymmetryOf of the operations of the key in the same setting, in both entry points', () => {
    const directions: classes.Vec3[] = [
      [0, 0, 1],
      [1, 0, 0],
      [1, 1, 0],
      [1, 2, 3],
    ];
    for (const key of magnetic.POINT_GROUP_KEYS) {
      for (const s of magnetic.settings(key)) {
        for (const d of directions) {
          const ops = magnetic.operations(key, { setting: s.index });
          expect(magnetic.siteSymmetry(key, d, { setting: s.index }), `${key} ${s.index}`).toEqual(
            magnetic.siteSymmetryOf(ops, d),
          );
        }
      }
    }
    for (const key of classes.POINT_GROUP_KEYS) {
      expect(classes.siteSymmetry(key, [1, 1, 0])).toEqual(classes.siteSymmetryOf(classes.operations(key), [1, 1, 0]));
    }
    // The criteria and the tolerance as options.
    // A criterion reaches the operations: [100] lies on the twofold axis of unique axis a only.
    expect(classes.siteSymmetry('2', [1, 0, 0]).multiplicity).toBe(2);
    expect(classes.siteSymmetry('2', [1, 0, 0], { uniqueAxis: 'a' }).multiplicity).toBe(1);
    expect(classes.siteSymmetry('4mm', [1, 1.00004, 3], { tolerance: 1e-4 }).multiplicity).toBe(4);
    expect(() => classes.siteSymmetry("4'mm'" as never, [0, 0, 1])).toThrow(/magnetic API/);
    expect(() => classes.siteSymmetry('4mm', [0, 0, 0])).toThrow(RangeError);
  });
});

describe('every result is frozen, nested values included (#137 C4)', () => {
  /** The paths of the values in `x` that are not frozen. */
  const unfrozen = (x: unknown, path = '.'): string[] => {
    if (x === null || typeof x !== 'object') return [];
    return [
      ...(Object.isFrozen(x) ? [] : [path]),
      ...Object.entries(x).flatMap(([k, v]) => unfrozen(v, `${path}${k}.`)),
    ];
  };
  const basis = classes.latticeFromParameters({ a: 3, b: 3, c: 5, alpha: 90, beta: 90, gamma: 120 });
  const ops = classes.operations('32');
  const point: Record<string, unknown[]> = {
    pointGroup: ['32'],
    pointGroups: [],
    findPointGroup: ['32'],
    settings: ['32'],
    operations: ['32'],
    generators: ['32'],
    describeOperations: ['32'],
    symmetryDirections: ['32'],
    siteSymmetry: ['32', [0, 0, 1]],
    siteSymmetryOf: [ops, [0, 0, 1]],
    orbit: ['32', { hkl: [1, 0, 0] }],
    orbitOf: [ops, [1, 0, 0]],
    pointGroupOf: [ops],
    describeOperationsOf: [ops],
    tensorForm: ['32', 'piezoelectric'],
    rotateTensor: [[1, 0, 0], ops[1].cartesian, 'pyroelectric'],
    allowedProperties: ['32'],
    latticeSystems: ['32'],
    millerIndices: ['h,h,-2h,l', { h: 3, l: 1 }],
    faceNormal: [basis, [1, 0, 0]],
    latticeBasis: ['hexagonal'],
    latticeFromParameters: [{ a: 3, b: 3, c: 5, alpha: 90, beta: 90, gamma: 120 }],
    latticeParameters: [basis],
    metricTensor: [basis],
    reciprocalBasis: [basis],
    residualOperations: [classes.operations('6/mmm'), basis],
    toVoigt: [classes.tensorForm('1', 'piezoelectric').basis[0], 'piezoelectric', { factors: [2] }],
    fromVoigt: [
      classes.toVoigt(classes.tensorForm('1', 'piezoelectric').basis[0], 'piezoelectric', { factors: [2] }),
      'piezoelectric',
      { factors: [2] },
    ],
    changeOfCoordinates: [
      {
        linearPart: [
          [1, 0, 1],
          [-1, 1, 1],
          [0, -1, 1],
        ],
        originShift: [0, 0, 0.5],
      },
      {
        points: [[0.1, 0.2, 0.3]],
        metric: classes.metricTensor(basis),
        operations: classes.operations('-3', { axes: 'rhombohedral' }),
      },
    ],
    directionFromFourIndices: [[2, -1, -1, 0]],
    directionToFourIndices: [[1, 0, 0]],
    planeFromFourIndices: [[1, 0, -1, 0]],
    planeToFourIndices: [[1, 0, 0]],
    reduceIndices: [[2, 4, 6]],
    zoneAxis: [
      [1, 0, 0],
      [0, 1, 0],
    ],
  };
  const classOnly: Record<string, unknown[]> = {
    wyckoffPositions: ['32'],
    wyckoffPosition: ['32', [0, 0, 1]],
    crystalForms: ['32'],
    tensorFormOf: [ops, 'piezoelectric'],
    allowedPropertiesOf: [ops],
  };
  const planeCalls: Record<string, unknown[]> = {
    planeGroup: ['p4'],
    pointGroup: ['4mm'],
    planeGroups: [],
    pointGroups: [],
    findPlaneGroup: ['p 4 m m'],
    findPointGroup: ['31m'],
    cellRestrictions: ['square'],
    changeOfCoordinates: [
      {
        linearPart: [
          [1, 1],
          [-1, 2],
        ],
      },
      { points: [[0.1, 0.2]], operations: plane.operations('p6') },
    ],
    latticeFromParameters: [{ a: 2, b: 2, gamma: 120 }],
    latticeParameters: [
      [
        [1, 0],
        [0, 2],
      ],
    ],
    metricTensor: [
      [
        [1, 0],
        [0, 2],
      ],
    ],
    reciprocalBasis: [
      [
        [1, 0],
        [0, 2],
      ],
    ],
    residualOperations: [
      plane.operations('p4mm'),
      [
        [1, 0],
        [0, 2],
      ],
    ],
    settings: ['3m'],
    operations: ['p4'],
    generators: ['p4'],
    describeOperations: ['p4gm'],
    describeOperationsOf: [plane.operations('p4')],
    wyckoffPositions: ['p4'],
    siteSymmetry: ['p4', [0, 0]],
    wyckoffPosition: ['p4', [0, 0]],
    wyckoffDistances: ['p4', [0.01, 0]],
    orbit: ['p4', [0.1, 0.2]],
    asymmetricUnit: ['p4'],
    symmetryElements: ['p4gm'],
  };
  const call = (module: Record<string, unknown>, name: string, args: unknown[]) =>
    (module[name] as (...a: unknown[]) => unknown)(...args);
  it('in the crystallographic API', () => {
    for (const [name, args] of Object.entries({ ...point, ...classOnly })) {
      expect(unfrozen(call(classes, name, args)), name).toEqual([]);
    }
  });
  it('in the magnetic API', () => {
    const magneticOps = magnetic.operations('32');
    for (const [name, args] of Object.entries(point)) {
      const a =
        name === 'residualOperations'
          ? [magnetic.operations('6/mmm'), basis]
          : args.map((x) => (x === ops ? magneticOps : x));
      expect(unfrozen(call(magnetic, name, a)), name).toEqual([]);
    }
  });
  it('in symcrys/plane', () => {
    for (const [name, args] of Object.entries(planeCalls)) expect(unfrozen(call(plane, name, args)), name).toEqual([]);
  });
  it('covers every export: each function is called above or returns a primitive; every constant is frozen', () => {
    const primitive = new Set([
      'allowsProperty',
      'allowsPropertyOf',
      'angleBetweenDirections',
      'angleBetweenPlanes',
      'crystalFamily',
      'holohedry',
      'isCentrosymmetricOf',
      'isEnantiomorphicOf',
      'isPlaneGroupKey',
      'isPointGroupKey',
      'isValidCell',
      'symbol',
    ]);
    const check = (module: Record<string, unknown>, called: Record<string, unknown[]>, what: string) => {
      for (const [name, value] of Object.entries(module)) {
        if (typeof value === 'function') {
          expect(name in called || primitive.has(name), `${what}.${name}: add it to the calls above`).toBe(true);
        } else {
          expect(unfrozen(value), `${what}.${name}`).toEqual([]);
        }
      }
    };
    check(classes, { ...point, ...classOnly }, 'symcrys');
    check(magnetic, { ...point, tensorFormOf: [], allowedPropertiesOf: [] }, 'symcrys/magnetic');
    check(plane, planeCalls, 'symcrys/plane');
  });

  it('tensorFormOf and allowedPropertiesOf of the magnetic API', () => {
    const magneticOps = magnetic.operations('32');
    expect(unfrozen(magnetic.tensorFormOf(magneticOps, 'piezoelectric'))).toEqual([]);
    expect(unfrozen(magnetic.allowedPropertiesOf(magneticOps))).toEqual([]);
  });

  it('residualOperations freezes the list, not the operations of the caller', () => {
    const mine = classes.operations('6/mmm').map((op) => ({ matrix: op.matrix }));
    const kept = classes.residualOperations(mine, basis);
    expect(Object.isFrozen(kept)).toBe(true);
    expect(Object.isFrozen(mine[0])).toBe(false);
  });
  it('zoneAxis gives undefined for parallel planes, never null', () => {
    expect(classes.zoneAxis([1, 1, 0], [2, 2, 0])).toBeUndefined();
  });
});

describe('one tolerance contract (#137 D1, #93)', () => {
  const cubic = classes.operations('m-3m');
  const magneticOps = magnetic.operations("4/m'mm");
  const basis = classes.latticeBasis('cubic');
  const p4 = plane.operations('p4');
  type Call = (options: { tolerance?: unknown }) => unknown;
  // Every function that compares numbers a caller passes in, with the bound of its metric.
  const calls: Record<string, [Call, number]> = {
    'symcrys pointGroupOf': [(o) => classes.pointGroupOf(cubic, o as never), 0.1],
    'symcrys describeOperationsOf': [(o) => classes.describeOperationsOf(cubic, o as never), 0.1],
    'symcrys tensorFormOf': [(o) => classes.tensorFormOf(cubic, 'piezoelectric', o as never), 0.1],
    'symcrys isCentrosymmetricOf': [(o) => classes.isCentrosymmetricOf(cubic, o as never), 0.1],
    'symcrys isEnantiomorphicOf': [(o) => classes.isEnantiomorphicOf(cubic, o as never), 0.1],
    'symcrys allowsPropertyOf': [(o) => classes.allowsPropertyOf(cubic, 'pyroelectric', o as never), 0.1],
    'symcrys allowedPropertiesOf': [(o) => classes.allowedPropertiesOf(cubic, o as never), 0.1],
    'symcrys rotateTensor': [
      (o) => classes.rotateTensor([1, 0, 0], cubic[1].cartesian, 'pyroelectric', o as never),
      0.1,
    ],
    'symcrys siteSymmetryOf': [(o) => classes.siteSymmetryOf(cubic, [0, 0, 1], o as never), 1],
    'symcrys siteSymmetry': [(o) => classes.siteSymmetry('m-3m', [0, 0, 1], o as never), 1],
    'symcrys wyckoffPosition': [(o) => classes.wyckoffPosition('m-3m', [0, 0, 1], o as never), 1],
    'symcrys orbitOf': [(o) => classes.orbitOf(cubic, [0, 0, 1], o as never), 1],
    'symcrys residualOperations': [(o) => classes.residualOperations(cubic, basis, o as never), 1],
    'symcrys/magnetic pointGroupOf': [(o) => magnetic.pointGroupOf(magneticOps, o as never), 0.1],
    'symcrys/magnetic describeOperationsOf': [(o) => magnetic.describeOperationsOf(magneticOps, o as never), 0.1],
    'symcrys/magnetic tensorFormOf': [(o) => magnetic.tensorFormOf(magneticOps, 'ferromagnetic', o as never), 0.1],
    'symcrys/magnetic isCentrosymmetricOf': [(o) => magnetic.isCentrosymmetricOf(magneticOps, o as never), 0.1],
    'symcrys/magnetic isEnantiomorphicOf': [(o) => magnetic.isEnantiomorphicOf(magneticOps, o as never), 0.1],
    'symcrys/magnetic allowsPropertyOf': [
      (o) => magnetic.allowsPropertyOf(magneticOps, 'ferromagnetic', o as never),
      0.1,
    ],
    'symcrys/magnetic allowedPropertiesOf': [(o) => magnetic.allowedPropertiesOf(magneticOps, o as never), 0.1],
    'symcrys/magnetic rotateTensor': [
      (o) => magnetic.rotateTensor([1, 0, 0], cubic[1].cartesian, 'ferromagnetic', o as never),
      0.1,
    ],
    'symcrys/magnetic siteSymmetryOf': [(o) => magnetic.siteSymmetryOf(magneticOps, [0, 0, 1], o as never), 1],
    'symcrys/magnetic siteSymmetry': [(o) => magnetic.siteSymmetry("4/m'mm", [0, 0, 1], o as never), 1],
    'symcrys/magnetic orbitOf': [(o) => magnetic.orbitOf(magneticOps, [0, 0, 1], o as never), 1],
    'symcrys/magnetic residualOperations': [
      (o) => magnetic.residualOperations(magneticOps, classes.latticeBasis('tetragonal'), o as never),
      1,
    ],
    'symcrys/plane describeOperationsOf': [(o) => plane.describeOperationsOf(p4, o as never), 0.1],
    'symcrys/plane siteSymmetry': [(o) => plane.siteSymmetry('p4', [0.1, 0.2], o as never), 0.5],
    'symcrys/plane wyckoffPosition': [(o) => plane.wyckoffPosition('p4', [0.1, 0.2], o as never), 0.5],
    'symcrys/plane orbit': [(o) => plane.orbit('p4', [0.1, 0.2], o as never), 0.5],
  };

  it('EPSILON is 10⁻⁶ and exported by all three entry points', () => {
    expect(classes.EPSILON).toBe(1e-6);
    expect(magnetic.EPSILON).toBe(1e-6);
    expect(plane.EPSILON).toBe(1e-6);
  });

  for (const [name, [call, bound]] of Object.entries(calls)) {
    it(`${name}: takes a tolerance above 0 and below ${bound}, and refuses everything else`, () => {
      expect(() => call({})).not.toThrow();
      expect(() => call({ tolerance: 1e-6 })).not.toThrow();
      expect(() => call({ tolerance: bound / 2 })).not.toThrow(/tolerance/);
      for (const bad of [0, -1e-6, bound, 2 * bound, Number.NaN, Number.POSITIVE_INFINITY, '1e-3', null]) {
        expect(() => call({ tolerance: bad }), JSON.stringify(bad)).toThrow(
          new RangeError(
            `The tolerance must be a number above 0 and below ${bound}, not ${typeof bad === 'number' ? String(bad) : JSON.stringify(bad)}`,
          ),
        );
      }
    });
  }
});
