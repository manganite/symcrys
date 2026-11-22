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
import * as wyckoff from './pointGroups/wyckoff.js';

const CONVENTIONS = ['itc', 'birss'] as const;
const MAGNETIC_API = /symcrys\/magnetic/;

/** The crystallographic API takes keys of crystal classes; tests pass it other keys on purpose. */
const asClass = (key: string) => key as classes.PointGroupKey;

describe('the entry points', () => {
  it('are both entries of the package', () => {
    expect(Object.keys(pkg.exports)).toEqual(['.', './magnetic', './plane', './package.json']);
  });

  it('export the same names; only the Wyckoff positions and the crystal forms are crystallographic alone', () => {
    const onlyClasses = ['CRYSTAL_FORM_TYPES', 'crystalForms', 'wyckoffPositionOf', 'wyckoffPositions'];
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
        'chiral',
        'crystalSystem',
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

  it('a class is found by the symbol of each of its settings, in the convention asked for', () => {
    for (const key of classes.POINT_GROUP_KEYS) {
      for (const convention of CONVENTIONS) {
        for (const setting of classes.settings(key, convention)) {
          for (const hm of [setting.symbol, setting.fullSymbol]) {
            const found = classes.findPointGroup(hm, convention);
            const what = `${hm} (${key}, ${convention})`;
            expect(found?.key, what).toBe(key);
            const again = classes.settings(key, convention)[found!.setting - 1];
            expect([again.symbol, again.fullSymbol], what).toContain(hm);
          }
        }
      }
    }
    // D3h: the two conventions give the same symbol to different settings (docs/conventions.md, "Keys").
    expect(classes.findPointGroup('-62m')).toEqual({ key: '-6m2', setting: 1 });
    expect(classes.findPointGroup('-62m', 'itc')).toEqual({ key: '-6m2', setting: 1 });
    expect(classes.findPointGroup('-62m', 'birss')).toEqual({ key: '-6m2', setting: 2 });
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
      // … and for a list of operations: the same answers as the fields, and as the magnetic API.
      const g = classes.pointGroup(key);
      for (const list of ['operations', 'generators'] as const) {
        expect(classes.isCentrosymmetricOf(classes[list](key)), `${key} ${list}`).toBe(g.centrosymmetric);
        expect(classes.isChiralOf(classes[list](key)), `${key} ${list}`).toBe(g.chiral);
        expect(magnetic.isCentrosymmetricOf(magnetic[list](key)), `${key} ${list}`).toBe(g.centrosymmetric);
        expect(magnetic.isChiralOf(magnetic[list](key)), `${key} ${list}`).toBe(g.chiral);
        expect(classes.allowsPropertyOf(classes[list](key), 'pyroelectric'), `${key} ${list}`).toBe(g.polar);
      }
    }
  });

  it('the holohedry of a crystal system is the same function in both', () => {
    expect(classes.holohedry).toBe(magnetic.holohedry);
  });

  it('Wyckoff positions and site symmetry take their options', () => {
    for (const key of classes.POINT_GROUP_KEYS) {
      for (const { index: setting } of classes.settings(key)) {
        const positions = classes.wyckoffPositions(key, { setting });
        expect(positions, `${key}, setting ${setting}`).toBe(wyckoff.wyckoffPositions(key, { setting }));
        const special = positions[positions.length - 1];
        expect(classes.wyckoffPositionOf(key, special.representative.cartesian, { setting }).letter).toBe(
          special.letter,
        );
      }
    }
    // 32: the twofold axes lie along other directions in the two settings.
    expect(classes.wyckoffPositions('32', { setting: 1 })).not.toEqual(classes.wyckoffPositions('32', { setting: 2 }));
    // A direction 0.06° off the fourfold axis of 4mm: general by default, on the axis within 10⁻².
    const off = [0.001, 0.0005, 1] as const;
    const ops = classes.operations('4mm');
    expect(classes.siteSymmetry(ops, off).multiplicity).toBe(8);
    expect(classes.siteSymmetry(ops, off, { tolerance: 1e-2 }).multiplicity).toBe(1);
    expect(classes.wyckoffPositionOf('4mm', off).letter).toBe('d');
    expect(classes.wyckoffPositionOf('4mm', off, { tolerance: 1e-2 }).letter).toBe('a');
  });

  it('the named properties are those of time-even tensors, their specifications without time parity', () => {
    const timeEven = Object.entries(magnetic.TENSOR_PROPERTIES).filter(([, p]) => p.spec.timeParity === 'i');
    expect(Object.keys(classes.TENSOR_PROPERTIES)).toEqual(timeEven.map(([name]) => name));
    expect(Object.keys(classes.TENSOR_PROPERTIES)).toEqual([
      'pyroelectric',
      'ferroaxial',
      'piezoelectric',
      'gyrotropic',
    ]);
    expect(Object.keys(magnetic.TENSOR_PROPERTIES)).toHaveLength(7);
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
      (key) => classes.wyckoffPositionOf(key, [0, 0, 1]),
      classes.crystalForms,
      classes.latticeOperations,
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
      /Unknown tensor property: "magnetic" \(known: pyroelectric, ferroaxial, piezoelectric, gyrotropic\)/,
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
      (ops: readonly classes.Operation[]) => classes.orbitOf(ops, [1, 2, 3]),
      (ops: readonly classes.Operation[]) => classes.pointGroupOf(ops),
      (ops: readonly classes.Operation[]) => classes.describeOperationsOf(ops),
      (ops: readonly classes.Operation[]) => classes.tensorFormOf(ops, 'piezoelectric'),
      (ops: readonly classes.Operation[]) => classes.allowsPropertyOf(ops, 'piezoelectric'),
      (ops: readonly classes.Operation[]) => classes.allowedPropertiesOf(ops),
      (ops: readonly classes.Operation[]) => classes.isCentrosymmetricOf(ops),
      (ops: readonly classes.Operation[]) => classes.isChiralOf(ops),
    ];
    const marked = (timeReversal: unknown) => [{ matrix: white[0].matrix, timeReversal } as classes.Operation];
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
    matrix: [
      [2, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ],
  } as const;
  const notOrthogonal = /Operation 0 is not an orthogonal \(Cartesian\) matrix/;
  it('in the crystallographic API', () => {
    const ops = [stretch] as unknown as readonly classes.Operation[];
    for (const call of [
      () => classes.siteSymmetry(ops, [1, 0, 0]),
      () => classes.siteSymmetry(ops, [0, 1, 0]),
      () => classes.orbitOf(ops, [1, 2, 3]),
      () => classes.pointGroupOf(ops),
      () => classes.describeOperationsOf(ops),
      () => classes.tensorFormOf(ops, 'piezoelectric'),
      () => classes.allowsPropertyOf(ops, 'piezoelectric'),
      () => classes.allowedPropertiesOf(ops),
      () => classes.isCentrosymmetricOf(ops),
      () => classes.isChiralOf(ops),
    ]) {
      expect(call).toThrow(RangeError);
      expect(call).toThrow(notOrthogonal);
    }
  });
  it('within the tolerance of the call: operations rounded to 4 decimals pass with tolerance 10⁻⁴', () => {
    // 6/mmm (order 24): [001] has site symmetry 6mm (order 12), [100] mm2 (order 4); ITA 6th ed.
    // Table 3.2.3.2, multiplicities 2 and 6.
    const rounded = classes.operations('6/mmm').map((op) => ({
      matrix: op.matrix.map((row) => row.map((x) => Math.round(x * 1e4) / 1e4)),
    })) as unknown as readonly classes.Operation[];
    expect(() => classes.siteSymmetry(rounded, [0, 0, 1])).toThrow(/not an orthogonal/);
    expect(classes.siteSymmetry(rounded, [0, 0, 1], { tolerance: 1e-4 }).multiplicity).toBe(2);
    expect(classes.siteSymmetry(rounded, [1, 0, 0], { tolerance: 1e-4 }).multiplicity).toBe(6);
    expect(() => classes.orbitOf(rounded, [1, 0, 0])).toThrow(/not an orthogonal/);
    expect(classes.orbitOf(rounded, [1, 0, 0], { tolerance: 1e-4 })).toHaveLength(6);
  });
  it('in the magnetic API', () => {
    const ops = [{ ...stretch, timeReversal: false }] as unknown as readonly magnetic.Operation[];
    for (const call of [
      () => magnetic.siteSymmetry(ops, [1, 0, 0]),
      () => magnetic.siteSymmetry(ops, [0, 1, 0]),
      () => magnetic.orbitOf(ops, [1, 2, 3]),
      () => magnetic.pointGroupOf(ops),
      () => magnetic.describeOperationsOf(ops),
      () => magnetic.tensorFormOf(ops, 'pyroelectric'),
      () => magnetic.allowsPropertyOf(ops, 'pyroelectric'),
      () => magnetic.allowedPropertiesOf(ops),
      () => magnetic.isCentrosymmetricOf(ops),
      () => magnetic.isChiralOf(ops),
    ]) {
      expect(call).toThrow(RangeError);
      expect(call).toThrow(notOrthogonal);
    }
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
    (ops: readonly magnetic.Operation[]) => magnetic.isChiralOf(ops),
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
    const inversion = classes.generators('-1')[0].matrix;
    for (const value of [1, 'false', null]) {
      expect(() => calls[0](asMagnetic([{ matrix: inversion, timeReversal: value }]))).toThrow(
        /timeReversal must be true or false/,
      );
    }
  });

  it('with the answer given, the form is that of the group: inversion forbids a polar vector, 1̄′ does not', () => {
    const inversion = classes.generators('-1')[0].matrix;
    expect(magnetic.tensorFormOf([{ matrix: inversion, timeReversal: false }], 'pyroelectric').basis).toHaveLength(0);
    expect(magnetic.tensorFormOf([{ matrix: inversion, timeReversal: true }], 'pyroelectric').basis).toHaveLength(0);
    expect(magnetic.tensorFormOf([{ matrix: inversion, timeReversal: true }], 'magnetoelectric').basis).toHaveLength(9);
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
    attempt(() => classes.tensorForm('32', { rank: 1, parity: 'axial', timeParity: 'c', intrinsic: 'none' }));
    const magneticSpec: magnetic.TensorSpec = { rank: 1, parity: 'polar', timeParity: 'i', intrinsic: 'none' };
    // @ts-expect-error a specification of the magnetic API, whose time parity may be 'c'
    attempt(() => classes.tensorForm('32', magneticSpec));
    // @ts-expect-error operations of the magnetic API, which may be combined with time reversal
    attempt(() => classes.tensorFormOf(magnetic.operations("321'"), 'piezoelectric'));
    // @ts-expect-error also for the site symmetry
    attempt(() => classes.siteSymmetry(magnetic.operations('32'), [0, 0, 1]));
    // Accepted: time parity 'i' and no time reversal, stated.
    attempt(() => classes.tensorForm('32', { rank: 1, parity: 'polar', timeParity: 'i', intrinsic: 'none' }));
    attempt(() =>
      classes.tensorFormOf([{ matrix: classes.operations('1')[0].matrix, timeReversal: false }], 'pyroelectric'),
    );
  });

  it('what lacks time reversal is not accepted by the magnetic API', () => {
    // @ts-expect-error operations of the crystallographic API do not say whether they have time reversal
    attempt(() => magnetic.tensorFormOf(classes.operations('32'), 'piezoelectric'));
    // @ts-expect-error a specification without time parity
    attempt(() => magnetic.tensorForm('32', { rank: 1, parity: 'polar', intrinsic: 'none' }));
    // @ts-expect-error the Wyckoff positions are crystallographic
    attempt(() => magnetic.wyckoffPositions('32'));
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

  it('the point group of a list: the class, and the white group of its operations', () => {
    for (const key of classes.POINT_GROUP_KEYS) {
      for (const { index: setting } of classes.settings(key)) {
        expect(classes.pointGroupOf(classes.operations(key, { setting }))).toEqual({ key, setting });
        const white = magnetic.operations(key, { setting });
        expect(magnetic.pointGroupOf(white)).toEqual({ key, setting });
        expect(classes.describeOperationsOf(classes.operations(key, { setting }))).toEqual(
          magnetic.describeOperationsOf(white).map(({ timeReversal: _t, ...d }) => d),
        );
      }
    }
    expect(magnetic.pointGroupOf(magnetic.operations("321'"))).toEqual({ key: "321'", setting: 2 });
  });

  it('lattice operations and orbits agree; the magnetic ones carry time reversal', () => {
    for (const key of classes.POINT_GROUP_KEYS) {
      for (const { index: setting } of classes.settings(key)) {
        const lattice = magnetic.latticeOperations(key, { setting });
        expect(classes.latticeOperations(key, { setting })).toEqual(lattice.map((w) => ({ matrix: w.matrix })));
        expect(classes.orbit(key, { hkl: [3, 2, 1] }, { setting })).toEqual(
          magnetic.orbit(key, { hkl: [3, 2, 1] }, { setting }),
        );
        const ops = classes.operations(key, { setting });
        expect(classes.orbitOf(ops, [3, 2, 1])).toEqual(
          magnetic.orbitOf(magnetic.operations(key, { setting }), [3, 2, 1]),
        );
      }
    }
    expect(magnetic.latticeOperations("4'mm'").map((w) => w.timeReversal)).toEqual(
      magnetic.operations("4'mm'").map((op) => op.timeReversal),
    );
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
