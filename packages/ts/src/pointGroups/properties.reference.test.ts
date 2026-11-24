/**
 * Operation-based properties against print (fixture class (a)): ITA Table 2.1.1.1 (Laue groups
 * and holohedries marked by boxes), ITA Table 1.3.4.1 (lattice systems and their holohedries) and ITA Table 3.2.2.1 (Laue class, pyroelectricity, enantiomorphism of the 21
 * noncentrosymmetric classes), re-parsed from references/itc/.
 */

import { describe, expect, it } from 'vitest';
import { latticeBasis, latticeSystemsOfSystem, type LatticeSystem } from '../lattice.js';
import { det, inverse, multiply, type Mat3 } from '../linalg.js';
import { expectHeader, readReference, tableRows } from '../testUtils/references.js';
import {
  POINT_GROUP_KEYS,
  isPointGroupKey,
  latticeSystems,
  operations,
  pointGroup,
  symbol,
  type MagneticPointGroupKey,
  type PointGroupKey,
} from './pointGroups.js';
import { holohedry } from './properties.js';

/** The fixed properties of a group, read from its record. */
const isCentrosymmetric = (key: MagneticPointGroupKey) => pointGroup(key).centrosymmetric;
const isChiral = (key: MagneticPointGroupKey) => pointGroup(key).enantiomorphic;
const isPolar = (key: MagneticPointGroupKey) => pointGroup(key).polar;
const laueClass = (key: MagneticPointGroupKey) => pointGroup(key).laueClass;

/** ITA Table 2.1.1.1 prints D3h as -62m; the key is -6m2 (docs/conventions.md, "Keys"). */
const keyOf = (printed: string): PointGroupKey => {
  const key = printed === '-62m' ? '-6m2' : printed;
  if (!isPointGroupKey(key)) throw new Error(`Not a key: ${printed}`);
  return key;
};

// --- Table 2.1.1.1: Laue groups ------------------------------------------------------------------

const rows2111 = tableRows(readReference('itc/vol-a-table-2.1.1.1.md'));
if (rows2111[0][3] !== 'Crystallographic point groups') throw new Error('Table 2.1.1.1 header changed');
const LAUE_GROUPS = new Set<PointGroupKey>(
  rows2111
    .slice(1)
    .flatMap((r) => r[3].split(','))
    .map((s) => s.trim())
    .filter((s) => /\((L|H)\)$/.test(s))
    .map((s) => keyOf(s.replace(/\s*\((L|H)\)$/, ''))),
);

// --- Table 3.2.2.1 --------------------------------------------------------------------------------

const rows3221 = tableRows(readReference('itc/vol-a-table-3.2.2.1.md'));
expectHeader(rows3221, [
  'System',
  'Laue class',
  'Group',
  'Rank-1 (pyroelectricity)',
  'Rank-3 (piezo/SHG)',
  'Enantiomorphism',
  'Axial rank-2 (optical activity)',
]);

/**
 * The Laue class column prints full symbols; the trigonal one in the form without the trailing 1
 * (`-32/m`). Each maps to the key of that Laue class.
 */
const LAUE_KEY: Record<string, PointGroupKey> = {
  '-1': '-1',
  '2/m': '2/m',
  '2/m2/m2/m': 'mmm',
  '4/m': '4/m',
  '4/m2/m2/m': '4/mmm',
  '-3': '-3',
  '-32/m': '-3m',
  '6/m': '6/m',
  '6/m2/m2/m': '6/mmm',
  '2/m-3': 'm-3',
  '4/m-32/m': 'm-3m',
};

interface Row3221 {
  key: PointGroupKey;
  laue: PointGroupKey;
  pyroelectric: boolean;
  enantiomorphic: boolean;
}

const TABLE3221: Row3221[] = [];
{
  let laue = '';
  for (const r of rows3221.slice(1)) {
    if (r[1]) laue = r[1];
    if (!isPointGroupKey(r[2]) && r[2] !== '-62m') continue; // icosahedral and spherical rows
    const laueKey = LAUE_KEY[laue];
    if (!laueKey) throw new Error(`Unknown Laue class ${laue}`);
    TABLE3221.push({
      key: keyOf(r[2]),
      laue: laueKey,
      pyroelectric: r[3].startsWith('+'),
      enantiomorphic: r[5] === '+',
    });
  }
}

describe('ITA Table 2.1.1.1: centrosymmetric classes are the 11 Laue groups', () => {
  it('marks 11 classes', () => expect(LAUE_GROUPS.size).toBe(11));

  for (const key of POINT_GROUP_KEYS) {
    it(`${key}: centrosymmetric = ${LAUE_GROUPS.has(key)}`, () => {
      expect(isCentrosymmetric(key)).toBe(LAUE_GROUPS.has(key));
    });
  }
});

describe('ITA Table 3.2.2.1: the 21 noncentrosymmetric classes', () => {
  it('lists 21 classes with the printed totals: 10 pyroelectric, 11 enantiomorphic', () => {
    expect(TABLE3221).toHaveLength(21);
    expect(new Set(TABLE3221.map((r) => r.key)).size).toBe(21);
    expect(TABLE3221.filter((r) => r.pyroelectric)).toHaveLength(10);
    expect(TABLE3221.filter((r) => r.enantiomorphic)).toHaveLength(11);
  });

  it('together with the 11 Laue groups covers all 32 classes', () => {
    expect([...TABLE3221.map((r) => r.key), ...LAUE_GROUPS].sort()).toEqual([...POINT_GROUP_KEYS].sort());
  });

  for (const row of TABLE3221) {
    it(`${row.key}: polar ${row.pyroelectric}, chiral ${row.enantiomorphic}, Laue class ${row.laue}`, () => {
      expect(isCentrosymmetric(row.key)).toBe(false);
      expect(isPolar(row.key)).toBe(row.pyroelectric);
      expect(isChiral(row.key)).toBe(row.enantiomorphic);
      expect(laueClass(row.key)).toBe(row.laue);
    });
  }

  for (const key of LAUE_GROUPS) {
    it(`${key} (Laue group): its own Laue class, neither polar nor chiral`, () => {
      expect(laueClass(key)).toBe(key);
      expect(isPolar(key)).toBe(false);
      expect(isChiral(key)).toBe(false);
    });
  }
});

describe('ITA Table 3.2.2.1: full symbols of the Laue classes', () => {
  // The trigonal Laue class is printed without the trailing 1 of its hexagonal-axes symbol; the
  // monoclinic one is printed as its short symbol 2/m, which names no unique axis and is left out.
  const printed = (full: string) => (full === '-32/m' ? '-32/m1' : full);
  for (const [full, key] of Object.entries(LAUE_KEY).filter(([f]) => f !== '2/m')) {
    it(`${full}: ITC full symbol of ${key}`, () => {
      expect(symbol(key, { form: 'full' }).replace(/\s+/g, '')).toBe(printed(full));
    });
  }
});

/** Crystal system → the class the table marks with a full box in the row of the system. */
const printed = new Map<string, PointGroupKey>();
for (const r of rows2111.slice(1)) {
  const marked = r[3]
    .split(',')
    .map((s) => s.trim())
    .filter((s) => /\(H\)$/.test(s));
  if (marked.length === 0) continue;
  if (marked.length > 1 || !r[2]) throw new Error(`Table 2.1.1.1: unexpected row ${r.join(' | ')}`);
  printed.set(r[2].toLowerCase(), keyOf(marked[0].replace(/\s*\(H\)$/, '')));
}
const SYSTEMS = [...new Set(POINT_GROUP_KEYS.map((key) => pointGroup(key).crystalSystem))];

describe('ITA Table 2.1.1.1: holohedries (Laue groups in full boxes)', () => {
  it('seven crystal systems, each with one holohedry', () => {
    expect([...printed.keys()]).toEqual(SYSTEMS);
    expect(SYSTEMS).toHaveLength(7);
  });

  for (const system of SYSTEMS) {
    it(`${system}: ${printed.get(system)}, the centrosymmetric class of highest order of the system`, () => {
      // Independent of the table.
      const g = pointGroup(printed.get(system)!);
      expect(g.crystalSystem).toBe(system);
      expect(g.centrosymmetric).toBe(true);
      const inSystem = POINT_GROUP_KEYS.filter((key) => pointGroup(key).crystalSystem === system);
      expect(g.order).toBe(Math.max(...inSystem.map((key) => pointGroup(key).order)));
    });
  }
});

describe('ITA Table 1.3.4.1: lattice systems and their holohedries (#137 G1)', () => {
  const rows = tableRows(readReference('itc/vol-a-table-1.3.4.1.md'));
  expectHeader(rows, ['Lattice system', 'Bravais types of lattices', 'Holohedry']);
  /** The printed name, lower case and without "(anorthic)", and the printed holohedry. */
  const PRINTED = rows.slice(1).map((r) => [r[0].replace(/\s*\(anorthic\)$/, '').toLowerCase(), r[2]] as const);

  it('seven lattice systems, each with the printed holohedry', () => {
    expect(PRINTED).toHaveLength(7);
    for (const [system, printed] of PRINTED) expect(holohedry(system as LatticeSystem), system).toBe(keyOf(printed));
  });

  it('agrees with Table 2.1.1.1: the full boxes of each crystal system are the holohedries of its lattice systems', () => {
    // Table 2.1.1.1 marks one holohedry per crystal system, -3m for the trigonal one (its hR lattice);
    // the trigonal classes act on the hP lattice of 6/mmm too (§ 1.3.4.4.2).
    for (const system of SYSTEMS) {
      const ofSystem = latticeSystemsOfSystem(system).map((l) => holohedry(l));
      expect(ofSystem, system).toContain(printed.get(system));
    }
  });

  it('the trigonal classes belong to the hexagonal and the rhombohedral lattice system, the others to one', () => {
    for (const key of POINT_GROUP_KEYS) {
      const system = pointGroup(key).crystalSystem;
      expect(latticeSystems(key), key).toEqual(system === 'trigonal' ? ['hexagonal', 'rhombohedral'] : [system]);
    }
    expect(() => holohedry('trigonal' as LatticeSystem)).toThrow(/'hexagonal' or 'rhombohedral'/);
    expect(() => holohedry('anorthic' as LatticeSystem)).toThrow(/Unknown lattice system: "anorthic"/);
  });

  it('each holohedry keeps its lattice, as does every class of the lattice system, and none has more operations', () => {
    // Independent of the table. The hexagonal (hP) lattice: the basis of the hexagonal family. The
    // rhombohedral (hR) lattice: the rhombohedral axes in the frame of the hexagonal ones (ITA 2016
    // Table 1.5.1.1, p. 78: a_R = (2a + b + c)/3, b_R = (−a + b + c)/3, c_R = (−a − 2b + c)/3).
    const hex = latticeBasis('hexagonal');
    const obverse = [
      [2 / 3, -1 / 3, -1 / 3],
      [1 / 3, 1 / 3, -2 / 3],
      [1 / 3, 1 / 3, 1 / 3],
    ];
    const bases: Record<string, Mat3> = {
      orthorhombic: latticeBasis('orthorhombic'),
      tetragonal: latticeBasis('tetragonal'),
      hexagonal: hex,
      rhombohedral: multiply(hex, obverse as unknown as Mat3),
      cubic: latticeBasis('cubic'),
    };
    for (const [system, basis] of Object.entries(bases)) {
      const toLattice = inverse(basis);
      /** True if every operation, written in the lattice basis, is a matrix of integers of determinant ±1. */
      const keepsLattice = (key: PointGroupKey) =>
        operations(key).every((op) => {
          const w = multiply(multiply(toLattice, op.cartesian), basis);
          return w.flat().every((x) => Math.abs(x - Math.round(x)) < 1e-9) && Math.abs(Math.abs(det(w)) - 1) < 1e-9;
        });
      const h = holohedry(system as LatticeSystem);
      expect(keepsLattice(h), system).toBe(true);
      for (const key of POINT_GROUP_KEYS.filter((k) => latticeSystems(k).includes(system as LatticeSystem))) {
        expect(keepsLattice(key), `${key} on ${system}`).toBe(true);
        expect(pointGroup(key).order, key).toBeLessThanOrEqual(pointGroup(h).order);
      }
    }
    // 6/mmm does not keep the rhombohedral lattice: the two lattice systems are distinct.
    const toR = inverse(bases.rhombohedral);
    const sixfold = operations('6').find((op) => Math.abs(op.cartesian[0][0] - 0.5) < 1e-9);
    const w = multiply(multiply(toR, sixfold!.cartesian), bases.rhombohedral);
    expect(w.flat().every((x) => Math.abs(x - Math.round(x)) < 1e-9)).toBe(false);
  });
});
