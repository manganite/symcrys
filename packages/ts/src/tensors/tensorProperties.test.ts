/**
 * Named tensor properties: the table, the four functions and names in `tensorForm`. The print
 * anchors are in itc.reference.test.ts (ITA Table 3.2.2.1: pyroelectric, piezoelectric, gyrotropic)
 * and itcMagnetic.reference.test.ts (ITC Vol. D Tables 1.5.2.4, 1.5.7.1, 1.5.8.1).
 */

import { describe, expect, it } from 'vitest';
import {
  MAGNETIC_POINT_GROUP_KEYS,
  POINT_GROUP_KEYS,
  operations,
  pointGroup,
  settings,
  type MagneticPointGroupKey,
  type PointGroupKey,
} from '../pointGroups/pointGroups.js';
import { siteSymmetryOf } from '../siteSymmetry.js';
import { TENSOR_PROPERTIES, TENSOR_PROPERTY_NAMES, type TensorPropertyName } from './propertyTable.js';
import type { Mat3 } from '../linalg.js';
import { CLASS_ROWS, T4C, symbolClass } from '../testUtils/birssTensorTables.js';
import { rotateTensor, tensorForm, tensorFormOf } from './tensorForm.js';
import { allowedProperties, allowedPropertiesOf, allowsProperty, allowsPropertyOf } from './tensorProperties.js';

/** The fixed properties of a group, read from its record. */
const isCentrosymmetric = (key: MagneticPointGroupKey) => pointGroup(key).centrosymmetric;
const isChiral = (key: MagneticPointGroupKey) => pointGroup(key).enantiomorphic;
const isPolar = (key: MagneticPointGroupKey) => pointGroup(key).polar;

const count = (name: TensorPropertyName, type: 'I' | 'II' | 'III') =>
  MAGNETIC_POINT_GROUP_KEYS.filter((k) => pointGroup(k).type === type && allowsProperty(k, name)).length;

describe('TENSOR_PROPERTIES', () => {
  it('names seven properties, each with a specification, a description and a print source', () => {
    expect(TENSOR_PROPERTY_NAMES).toEqual([
      'pyroelectric',
      'ferroaxial',
      'piezoelectric',
      'gyrotropic',
      'ferromagnetic',
      'magnetoelectric',
      'piezomagnetic',
    ]);
    for (const name of TENSOR_PROPERTY_NAMES) {
      const p = TENSOR_PROPERTIES[name];
      expect(Object.keys(p.spec).sort(), name).toEqual(['intrinsic', 'kind', 'rank', 'timeParity']);
      expect(p.description.length, name).toBeGreaterThan(20);
      // Ferroaxial order is not in ITC Vol. D; its classes follow from Birss's tables of tensor forms.
      expect(p.source, name).toMatch(
        name === 'ferroaxial'
          ? /Phys\. Rev\. Lett\. 116, 177602 \(2016\); classes: Birss \(1966\), Tables 4a and 4c, pp\. 56–58/
          : /ITC Vol\. D \(2013\), § 1\.\d.*p+\. \d+/,
      );
    }
  });

  it('is frozen, and no two names share a tensor', () => {
    expect(Object.isFrozen(TENSOR_PROPERTIES)).toBe(true);
    expect(Object.isFrozen(TENSOR_PROPERTIES.piezoelectric.spec)).toBe(true);
    expect(new Set(TENSOR_PROPERTY_NAMES.map((n) => JSON.stringify(TENSOR_PROPERTIES[n].spec))).size).toBe(7);
  });
});

describe('allowsProperty and allowedProperties', () => {
  it('count the groups as print does: classes 10, 20, 15; magnetic groups 31, 58, 66', () => {
    // ITA Table 3.2.2.1 (itc.reference.test.ts) and ITC Vol. D Chapter 1.5 (itcMagnetic.reference.test.ts).
    expect(count('pyroelectric', 'I')).toBe(10);
    expect(count('piezoelectric', 'I')).toBe(20);
    expect(count('gyrotropic', 'I')).toBe(15);
    for (const name of ['ferromagnetic', 'magnetoelectric', 'piezomagnetic'] as const)
      expect(count(name, 'II')).toBe(0);
    expect(count('ferromagnetic', 'I') + count('ferromagnetic', 'III')).toBe(31);
    expect(count('magnetoelectric', 'I') + count('magnetoelectric', 'III')).toBe(58);
    expect(count('piezomagnetic', 'I') + count('piezomagnetic', 'III')).toBe(66);
    // The time-even properties of a magnetic group are those of its class: 11, 26 and 17 of the 58
    // black-and-white groups, and each grey group with its class.
    expect((['pyroelectric', 'piezoelectric', 'gyrotropic'] as const).map((n) => count(n, 'III'))).toEqual([
      11, 26, 17,
    ]);
    expect((['pyroelectric', 'piezoelectric', 'gyrotropic'] as const).map((n) => count(n, 'II'))).toEqual([10, 20, 15]);
  });

  it('ferroaxial: the 13 classes for which Birss prints a non-zero axial vector (Tables 4a, 4c)', () => {
    // Table 4a gives each class its symbol class for an axial tensor of odd rank, Table 4c the form
    // of that symbol class at rank 1 (columns x, y, z); a dash in Table 4a is a vanishing tensor.
    const printed = CLASS_ROWS.filter((row) => {
      const letter = symbolClass(row, 1, 'axial');
      return letter !== null && T4C.get(letter)!.some((cell) => cell !== '0');
    }).map((row) => row.key);
    expect(printed).toEqual(['1', '-1', '2', 'm', '2/m', '4', '-4', '4/m', '3', '-3', '6', '-6', '6/m']);
    expect(POINT_GROUP_KEYS.filter((key) => allowsProperty(key, 'ferroaxial'))).toEqual(printed);
    // The axial vector lies along the unique axis (z: unique axis c, the setting Birss prints); any
    // direction in 1 and -1.
    for (const row of CLASS_ROWS.filter((r) => printed.includes(r.key))) {
      const setting = ['2', 'm', '2/m'].includes(row.key) ? 2 : 1;
      const form = tensorForm(row.key as PointGroupKey, 'ferroaxial', { setting });
      const cells = T4C.get(symbolClass(row, 1, 'axial')!)!;
      expect(
        form.parameters.map(([i]) => i),
        row.key,
      ).toEqual([0, 1, 2].filter((i) => cells[i] !== '0'));
    }
    // Time-even: a magnetic group allows it if its class does (13 grey, 17 black-and-white groups).
    for (const key of MAGNETIC_POINT_GROUP_KEYS) {
      expect(allowsProperty(key, 'ferroaxial'), key).toBe(printed.includes(pointGroup(key).crystalClass));
    }
    expect([count('ferroaxial', 'I'), count('ferroaxial', 'II'), count('ferroaxial', 'III')]).toEqual([13, 13, 17]);
    // Seven of the 13 classes are neither polar nor chiral.
    expect(printed.filter((key) => !isPolar(key as PointGroupKey) && !isChiral(key as PointGroupKey))).toEqual([
      '-1',
      '2/m',
      '-4',
      '4/m',
      '-3',
      '-6',
      '6/m',
    ]);
  });

  it('pyroelectric is polar; chiral groups are gyrotropic, and so are m, mm2, -4, -42m', () => {
    for (const key of MAGNETIC_POINT_GROUP_KEYS) {
      expect(allowsProperty(key, 'pyroelectric'), key).toBe(isPolar(key));
      if (isChiral(key)) expect(allowsProperty(key, 'gyrotropic'), key).toBe(true);
      if (isCentrosymmetric(key)) expect(allowsProperty(key, 'piezoelectric'), key).toBe(false);
    }
    expect(POINT_GROUP_KEYS.filter((k) => allowsProperty(k, 'gyrotropic') && !isChiral(k))).toEqual([
      'm',
      'mm2',
      '-4',
      '-42m',
    ]);
  });

  it('a group with time reversal itself allows what its class allows of the time-even properties', () => {
    for (const key of MAGNETIC_POINT_GROUP_KEYS.filter((k) => pointGroup(k).type === 'II')) {
      const crystalClass = key.slice(0, -2) as PointGroupKey;
      expect(allowedProperties(key), key).toEqual(
        allowedProperties(crystalClass).filter((n) => TENSOR_PROPERTIES[n].spec.timeParity === 'even'),
      );
    }
  });

  it('allowedProperties lists the names in the order of the table', () => {
    expect(allowedProperties('1')).toEqual(TENSOR_PROPERTY_NAMES);
    expect(allowedProperties('m-3m')).toEqual([]);
    expect(allowedProperties('432')).toEqual(['gyrotropic', 'magnetoelectric']);
    expect(allowedProperties("2'")).toEqual(TENSOR_PROPERTY_NAMES);
    expect(allowedProperties("m'm'2")).toEqual(TENSOR_PROPERTY_NAMES.filter((name) => name !== 'ferroaxial'));
    expect(allowedProperties("-1'")).toEqual(['ferroaxial', 'magnetoelectric']);
    expect(allowedProperties("mm21'")).toEqual(['pyroelectric', 'piezoelectric', 'gyrotropic']);
  });

  it('do not depend on the setting, and agree with the functions for operations', () => {
    for (const key of MAGNETIC_POINT_GROUP_KEYS) {
      const allowed = allowedProperties(key);
      for (const s of settings(key)) {
        const ops = operations(key, { setting: s.index });
        expect(allowedPropertiesOf(ops), `${key} setting ${s.index}`).toEqual(allowed);
      }
    }
  }, 30_000); // closes and projects about 180 groups without the cache

  it('take any operations: the site symmetry of the threefold axis of m-3m is polar, the group is not', () => {
    const ops = operations('m-3m');
    const site = siteSymmetryOf(ops, [1, 1, 1]).operations.map((i) => ops[i]);
    // The site symmetry is 3m.
    expect(allowedPropertiesOf(site)).toEqual(allowedProperties('3m'));
    expect(allowedPropertiesOf(site)).toEqual(['pyroelectric', 'piezoelectric', 'magnetoelectric', 'piezomagnetic']);
    expect(allowsProperty('m-3m', 'pyroelectric')).toBe(false);
    expect(allowsPropertyOf(site, 'pyroelectric')).toBe(true);
    // Generators are enough: the list is closed first.
    expect(allowedPropertiesOf([{ cartesian: [[-1, 0, 0], [0, -1, 0], [0, 0, 1]], timeReversal: true }])).toEqual(allowedProperties("2'")); // prettier-ignore
  });

  it('throw a RangeError for an unknown key or name', () => {
    expect(() => allowsProperty('1', TENSOR_PROPERTIES.piezoelectric.spec as never)).toThrow(/Unknown tensor property/);
    expect(() => allowsProperty('nonsense' as never, 'piezoelectric')).toThrow(/Unknown point group key/);
    expect(() => allowsProperty('1', 'piezo' as never)).toThrow(
      /Unknown tensor property: "piezo" \(known: pyroelectric/,
    );
    expect(() => allowsProperty('1', 'toString' as never)).toThrow(RangeError);
    expect(() => allowsPropertyOf(operations('1'), 'optical activity' as never)).toThrow(/Unknown tensor property/);
    expect(() => allowedProperties('nonsense' as never)).toThrow(RangeError);
  });
});

describe('tensorForm and tensorFormOf with the name of a property', () => {
  it('give the form of the tensor the table names', () => {
    for (const name of TENSOR_PROPERTY_NAMES) {
      for (const key of ['1', '-6m2', "4'/mmm'", "2221'"] as const) {
        const byName = tensorForm(key, name);
        expect(byName, `${key} ${name}`).toEqual(tensorForm(key, TENSOR_PROPERTIES[name].spec));
        expect(tensorFormOf(operations(key), name)).toEqual(byName);
      }
    }
  });

  it('the piezoelectric tensor of quartz (32) has two parameters, d_111 and d_123', () => {
    expect(tensorForm('32', 'piezoelectric').parameters).toEqual([
      [0, 0, 0],
      [0, 1, 2],
    ]);
  });

  it('rotateTensor takes a name too', () => {
    const rz: Mat3 = [
      [0, -1, 0],
      [1, 0, 0],
      [0, 0, 1],
    ];
    const t = tensorForm('32', 'piezoelectric').basis[0];
    expect(rotateTensor(t, rz, 'piezoelectric')).toEqual(rotateTensor(t, rz, TENSOR_PROPERTIES.piezoelectric.spec));
  });

  it('throw a RangeError for an unknown name', () => {
    expect(() => tensorForm('1', 'piezo' as never)).toThrow(/Unknown tensor property/);
    expect(() => tensorFormOf(operations('1'), 'piezo' as never)).toThrow(/Unknown tensor property/);
  });
});
