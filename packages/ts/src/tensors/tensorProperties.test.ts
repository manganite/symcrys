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
  type PointGroupKey,
} from '../pointGroups/pointGroups.js';
import { isCentrosymmetric, isChiral, isPolar } from '../pointGroups/properties.js';
import { siteSymmetry } from '../siteSymmetry.js';
import { TENSOR_PROPERTIES, TENSOR_PROPERTY_NAMES, type TensorPropertyName } from './propertyTable.js';
import { tensorForm, tensorFormOf } from './tensorForm.js';
import { allowedProperties, allowedPropertiesOf, allowsProperty, allowsPropertyOf } from './tensorProperties.js';

const count = (name: TensorPropertyName, type: 'I' | 'II' | 'III') =>
  MAGNETIC_POINT_GROUP_KEYS.filter((k) => pointGroup(k).type === type && allowsProperty(k, name)).length;

describe('TENSOR_PROPERTIES', () => {
  it('names six properties, each with a specification, a description and a print source', () => {
    expect(TENSOR_PROPERTY_NAMES).toEqual([
      'pyroelectric',
      'piezoelectric',
      'gyrotropic',
      'ferromagnetic',
      'magnetoelectric',
      'piezomagnetic',
    ]);
    for (const name of TENSOR_PROPERTY_NAMES) {
      const p = TENSOR_PROPERTIES[name];
      expect(Object.keys(p.spec).sort(), name).toEqual(['intrinsic', 'parity', 'rank', 'timeParity']);
      expect(p.description.length, name).toBeGreaterThan(20);
      expect(p.source, name).toMatch(/ITC Vol\. D \(2013\), § 1\.\d.*p+\. \d+/);
    }
  });

  it('is frozen, and no two names share a tensor', () => {
    expect(Object.isFrozen(TENSOR_PROPERTIES)).toBe(true);
    expect(Object.isFrozen(TENSOR_PROPERTIES.piezoelectric.spec)).toBe(true);
    expect(new Set(TENSOR_PROPERTY_NAMES.map((n) => JSON.stringify(TENSOR_PROPERTIES[n].spec))).size).toBe(6);
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
        allowedProperties(crystalClass).filter((n) => TENSOR_PROPERTIES[n].spec.timeParity === 'i'),
      );
    }
  });

  it('allowedProperties lists the names in the order of the table', () => {
    expect(allowedProperties('1')).toEqual(TENSOR_PROPERTY_NAMES);
    expect(allowedProperties('m-3m')).toEqual([]);
    expect(allowedProperties('432')).toEqual(['gyrotropic', 'magnetoelectric']);
    expect(allowedProperties("m'm'2")).toEqual(TENSOR_PROPERTY_NAMES);
    expect(allowedProperties("-1'")).toEqual(['magnetoelectric']);
    expect(allowedProperties("mm21'")).toEqual(['pyroelectric', 'piezoelectric', 'gyrotropic']);
  });

  it('do not depend on setting or convention, and agree with the functions for operations', () => {
    for (const key of MAGNETIC_POINT_GROUP_KEYS) {
      const allowed = allowedProperties(key);
      for (const convention of ['itc', 'birss'] as const) {
        for (const s of settings(key, convention)) {
          const ops = operations(key, { convention, setting: s.index });
          expect(allowedPropertiesOf(ops), `${key} ${convention} ${s.index}`).toEqual(allowed);
        }
      }
      for (const name of TENSOR_PROPERTY_NAMES) {
        expect(allowsPropertyOf(operations(key), name), `${key} ${name}`).toBe(allowed.includes(name));
      }
    }
  });

  it('take any operations: the site symmetry of the threefold axis of m-3m is polar, the group is not', () => {
    const ops = operations('m-3m');
    const site = siteSymmetry(ops, [1, 1, 1]).operations.map((i) => ops[i]);
    // The site symmetry is 3m.
    expect(allowedPropertiesOf(site)).toEqual(allowedProperties('3m'));
    expect(allowedPropertiesOf(site)).toEqual(['pyroelectric', 'piezoelectric', 'magnetoelectric', 'piezomagnetic']);
    expect(allowsProperty('m-3m', 'pyroelectric')).toBe(false);
    expect(allowsPropertyOf(site, 'pyroelectric')).toBe(true);
    // Generators are enough: the list is closed first.
    expect(allowedPropertiesOf([{ matrix: [[-1, 0, 0], [0, -1, 0], [0, 0, 1]], timeReversal: true }])).toEqual(allowedProperties("2'")); // prettier-ignore
  });

  it('throw a RangeError for an unknown key or name', () => {
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
        for (const convention of ['itc', 'birss'] as const) {
          const byName = tensorForm(key, name, { convention });
          expect(byName, `${key} ${name}`).toEqual(tensorForm(key, TENSOR_PROPERTIES[name].spec, { convention }));
          expect(tensorFormOf(operations(key, { convention }), name)).toEqual(byName);
        }
      }
    }
  });

  it('the piezoelectric tensor of quartz (32) has two parameters, d_111 and d_123', () => {
    expect(tensorForm('32', 'piezoelectric').parameters).toEqual([
      [0, 0, 0],
      [0, 1, 2],
    ]);
  });

  it('throw a RangeError for an unknown name', () => {
    expect(() => tensorForm('1', 'piezo' as never)).toThrow(/Unknown tensor property/);
    expect(() => tensorFormOf(operations('1'), 'piezo' as never)).toThrow(/Unknown tensor property/);
  });
});
