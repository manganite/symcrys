/**
 * The two entry points (docs/conventions.md, "Two entry points"): `index.ts`, the crystallographic
 * API for the 32 crystal classes without time reversal, and `magnetic.ts`, the magnetic API for the
 * 122 magnetic point groups. Checked here: the two export the same names; the crystallographic API
 * returns nothing about time reversal and refuses every question that involves it; and where both
 * can be asked, they agree: a time-even question has the same answer for a crystal class, its white
 * group and its grey group.
 */

import { describe, expect, it } from 'vitest';
import pkg from '../package.json' with { type: 'json' };
import * as classes from './index.js';
import * as magnetic from './magnetic.js';

const CONVENTIONS = ['itc', 'birss'] as const;
const MAGNETIC_API = /symcrys\/magnetic/;

/** The crystallographic API takes keys of crystal classes; tests pass it other keys on purpose. */
const asClass = (key: string) => key as classes.PointGroupKey;

describe('the two entry points', () => {
  it('are both entries of the package', () => {
    expect(Object.keys(pkg.exports)).toEqual(['.', './magnetic', './package.json']);
  });

  it('export the same names; only the Wyckoff positions are crystallographic alone', () => {
    const onlyClasses = ['wyckoffPositionOf', 'wyckoffPositions'];
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

  it('a crystal class has no type, a magnetic point group has one', () => {
    for (const key of classes.POINT_GROUP_KEYS) {
      const g = classes.pointGroup(key);
      const m = magnetic.pointGroup(key);
      expect(Object.keys(g).sort()).toEqual(['crystalSystem', 'key', 'order']);
      expect(m.type).toBe('I');
      expect(g).toEqual({ key: m.key, crystalSystem: m.crystalSystem, order: m.order });
      expect(classes.pointGroup(key)).toBe(g);
      expect(Object.isFrozen(g)).toBe(true);
    }
  });
});

describe('the crystallographic API returns nothing about time reversal', () => {
  it('operations and generators are matrices, those of the white group, in its order', () => {
    for (const key of classes.POINT_GROUP_KEYS) {
      for (const convention of CONVENTIONS) {
        for (const { index: setting } of classes.settings(key, convention)) {
          const options = { convention, setting };
          for (const list of ['operations', 'generators'] as const) {
            const ops = classes[list](key, options);
            const white = magnetic[list](key, options);
            const what = `${list} of ${key}, ${convention}, setting ${setting}`;
            expect(ops, what).toHaveLength(white.length);
            ops.forEach((op, i) => {
              expect(Object.keys(op), what).toEqual(['matrix']);
              expect(op.matrix, what).toBe(white[i].matrix);
              expect(white[i].timeReversal, what).toBe(false);
              expect(Object.isFrozen(op), what).toBe(true);
            });
            expect(Object.isFrozen(ops), what).toBe(true);
            expect(classes[list](key, options), what).toBe(ops);
          }
        }
      }
    }
  });

  it('descriptions of operations have no time reversal and are otherwise those of the white group', () => {
    for (const key of classes.POINT_GROUP_KEYS) {
      for (const convention of CONVENTIONS) {
        const described = classes.describeOperations(key, { convention });
        const white = magnetic.describeOperations(key, { convention });
        expect(described.map((d) => ({ ...d, timeReversal: false }))).toEqual(white);
        for (const d of described) expect('timeReversal' in d).toBe(false);
        expect(classes.describeOperations(key, { convention })).toBe(described);
        expect(classes.symmetryDirections(key, { convention })).toBe(magnetic.symmetryDirections(key, { convention }));
      }
    }
  });

  it('settings, symbols and the properties of the operations are those of the white group', () => {
    for (const key of classes.POINT_GROUP_KEYS) {
      for (const convention of CONVENTIONS) {
        expect(classes.settings(key, convention)).toEqual(magnetic.settings(key, convention));
        for (const form of ['short', 'full', 'schoenflies'] as const) {
          expect(classes.symbol(key, { convention, form })).toBe(magnetic.symbol(key, { convention, form }));
        }
      }
      expect(classes.isCentrosymmetric(key)).toBe(magnetic.isCentrosymmetric(key));
      expect(classes.isPolar(key)).toBe(magnetic.isPolar(key));
      expect(classes.isChiral(key)).toBe(magnetic.isChiral(key));
      expect(classes.laueClass(key)).toBe(magnetic.laueClass(key));
    }
  });

  it('the named properties are those of time-even tensors, their specifications without time parity', () => {
    const timeEven = Object.entries(magnetic.TENSOR_PROPERTIES).filter(([, p]) => p.spec.timeParity === 'i');
    expect(Object.keys(classes.TENSOR_PROPERTIES)).toEqual(timeEven.map(([name]) => name));
    expect(Object.keys(classes.TENSOR_PROPERTIES)).toEqual(['pyroelectric', 'piezoelectric', 'gyrotropic']);
    expect(Object.keys(magnetic.TENSOR_PROPERTIES)).toHaveLength(6);
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
      classes.isCentrosymmetric,
      classes.isPolar,
      classes.isChiral,
      classes.laueClass,
      classes.describeOperations,
      classes.symmetryDirections,
      classes.wyckoffPositions,
      (key) => classes.wyckoffPositionOf(key, [0, 0, 1]),
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
    for (const name of ['ferromagnetic', 'magnetoelectric', 'piezomagnetic']) {
      const odd = name as classes.TensorPropertyName;
      const calls = [
        () => classes.allowsProperty('3', odd),
        () => classes.allowsPropertyOf(ops, odd),
        () => classes.tensorForm('3', odd),
        () => classes.tensorFormOf(ops, odd),
        () => classes.rotateTensor([0, 0, 1], classes.operations('3')[1].matrix, odd),
      ];
      for (const call of calls) {
        expect(call, name).toThrow(RangeError);
        expect(call, name).toThrow(MAGNETIC_API);
        expect(call, name).toThrow(/time-odd tensor/);
      }
    }
    expect(() => classes.allowsProperty('3', 'magnetic' as classes.TensorPropertyName)).toThrow(
      /Unknown tensor property: "magnetic" \(known: pyroelectric, piezoelectric, gyrotropic\)/,
    );
    expect(() => classes.allowsProperty('3', { rank: 1 } as unknown as classes.TensorPropertyName)).toThrow(
      /Unknown tensor property/,
    );
  });

  it("a time-odd tensor specification; time parity 'i' is accepted", () => {
    const vector = { rank: 1, parity: 'axial', intrinsic: 'none' } as const;
    const odd = { ...vector, timeParity: 'c' } as classes.TensorSpec;
    const even = { ...vector, timeParity: 'i' } as classes.TensorSpec;
    expect(() => classes.tensorForm('3', odd)).toThrow(MAGNETIC_API);
    expect(() => classes.tensorFormOf(classes.operations('3'), odd)).toThrow(MAGNETIC_API);
    expect(() => classes.rotateTensor([0, 0, 1], classes.operations('3')[1].matrix, odd)).toThrow(MAGNETIC_API);
    expect(classes.tensorForm('3', even)).toBe(classes.tensorForm('3', vector));
    expect(() => classes.tensorForm('3', { ...vector, timeParity: 'x' } as classes.TensorSpec)).toThrow(
      /Unknown time parity: "x"/,
    );
    expect(() => classes.tensorForm('3', null as unknown as classes.TensorSpec)).toThrow(/Not a tensor specification/);
  });

  it('an operation combined with time reversal; an operation of the magnetic API without is accepted', () => {
    const grey = magnetic.operations(GREY);
    const white = magnetic.operations('32');
    const calls = [
      (ops: readonly classes.Operation[]) => classes.siteSymmetry(ops, [0, 0, 1]),
      (ops: readonly classes.Operation[]) => classes.tensorFormOf(ops, 'piezoelectric'),
      (ops: readonly classes.Operation[]) => classes.allowsPropertyOf(ops, 'piezoelectric'),
      (ops: readonly classes.Operation[]) => classes.allowedPropertiesOf(ops),
    ];
    for (const call of calls) {
      expect(() => call(grey)).toThrow(RangeError);
      expect(() => call(grey)).toThrow(/Operation 6 is combined with time reversal/);
      expect(() => call(grey)).toThrow(MAGNETIC_API);
      expect(call(white)).toEqual(call(classes.operations('32')));
    }
  });
});

describe('a time-even question has one answer: class, white group and grey group agree', () => {
  const grey = (key: classes.PointGroupKey) => `${key}1'` as magnetic.PointGroupKey;
  const SPECS: classes.TensorSpec[] = [
    ...Object.values(classes.TENSOR_PROPERTIES).map((p) => p.spec),
    { rank: 2, parity: 'polar', intrinsic: 'ij' },
    { rank: 3, parity: 'axial', intrinsic: 'none' },
  ];

  it('forms of time-even tensors, in every setting', { timeout: 60_000 }, () => {
    for (const key of classes.POINT_GROUP_KEYS) {
      for (const { index: setting } of classes.settings(key)) {
        for (const spec of SPECS) {
          const form = classes.tensorForm(key, spec, { setting });
          const magneticSpec = { ...spec, timeParity: 'i' } as const;
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

  it('site symmetry does not depend on time reversal', () => {
    for (const key of ['32', '4mm', 'm-3m'] as const) {
      for (const direction of [
        [0, 0, 1],
        [1, 0, 0],
        [1, 2, 3],
      ] as const) {
        const site = classes.siteSymmetry(classes.operations(key), direction);
        expect(site).toEqual(magnetic.siteSymmetry(magnetic.operations(key), direction));
        expect(magnetic.siteSymmetry(magnetic.operations(grey(key)), direction).multiplicity).toBe(site.multiplicity);
      }
    }
  });
});
