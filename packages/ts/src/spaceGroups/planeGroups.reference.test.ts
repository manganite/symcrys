/**
 * The 17 plane groups against print (fixture class (a)): ITA (6th ed., 2016) Chapter 2.2,
 * pp. 176–192, re-parsed from references/itc/vol-a-2016-plane-groups.md.
 *
 * The data file must equal the transcription. Independent of the data file, each printed page is
 * checked for consistency: its selected generators, with the integer translations and the
 * centring, generate exactly its general position; each Wyckoff position has as many points as its
 * multiplicity says, and they form one orbit of the group, with a stabilizer of the order that
 * the multiplicity implies.
 */

import { describe, expect, it } from 'vitest';
import { readReference } from '../testUtils/references.js';
import {
  applyToPoint,
  closure,
  compose,
  equalModLattice,
  parseOperation,
  reduceModLattice,
  translationOperation,
  type ExactOperation,
} from './affine.js';
import { PLANE_GROUP_DATA } from './planeGroupData.js';
import { PLANE_GROUP_KEYS, planeGroupGenerators, planeGroupOperations } from './planeGroups.js';
import { isInteger, mod1, parseRational, rational, subtract, type Rational } from './rational.js';

interface PrintedGroup {
  number: number;
  symbol: string;
  page: number;
  fields: Record<string, string>;
  rows: string[][];
}

function printedGroups(): PrintedGroup[] {
  const md = readReference('itc/vol-a-2016-plane-groups.md');
  return md
    .split('\n## ')
    .slice(1)
    .map((section) => {
      const head = /^(\d+) — (\S+), p\. (\d+)$/.exec(section.split('\n')[0]);
      if (!head) throw new Error(`Bad heading: ${section.split('\n')[0]}`);
      const fields: Record<string, string> = {};
      for (const m of section.matchAll(/^([A-Z][\w ()/,+]*?): (.*?) *$/gm)) fields[m[1]] = m[2];
      const rows = section
        .split('\n')
        .filter((l) => /^\| \d/.test(l))
        .map((l) =>
          l
            .split('|')
            .slice(1, -1)
            .map((c) => c.trim()),
        );
      return { number: Number(head[1]), symbol: head[2], page: Number(head[3]), fields, rows };
    });
}

const PRINT = printedGroups();

/**
 * The order of the plane point group named by an oriented site-symmetry symbol (`1`, `2..`, `.m.`,
 * `2mm.`, `3m.`, `6mm` …): n, the rotation at its first position (1 if a dot), and 2n if it
 * contains a mirror, since a plane point group with mirrors has as many mirrors as rotations.
 */
function siteSymbolOrder(symbol: string): number {
  const n = /^[1-6]/.test(symbol) ? Number(symbol[0]) : 1;
  return symbol.includes('m') ? 2 * n : n;
}
/** A point with general rational coordinates, to evaluate the printed coordinate expressions. */
const PARAMETERS: Rational[] = [rational(3, 7), rational(2, 11)];

const t = (s: string) => translationOperation(s.split(',').map(parseRational));
const centrings = (g: PrintedGroup) => [t('0,0'), ...(g.fields.Centring ? [t('1/2,1/2')] : [])];
const pointsEqualModLattice = (p: Rational[], q: Rational[]) => p.every((v, i) => isInteger(subtract(v, q[i])));

describe('plane groups: transcription', () => {
  it('has the 17 groups, plane group n on p. 175 + n', () => {
    expect(PRINT.map((g) => g.number)).toEqual(Array.from({ length: 17 }, (_, i) => i + 1));
    for (const g of PRINT) expect(g.page).toBe(175 + g.number);
  });

  it('equals the data file', () => {
    const fromPrint = PRINT.map((g) => {
      const gens = g.fields['Generators selected'];
      return {
        number: g.number,
        symbol: g.symbol,
        fullSymbol: g.fields['Full symbol'],
        pointGroup: g.fields['Point group'],
        system: g.fields.System.toLowerCase(),
        page: g.page,
        origin: g.fields.Origin,
        asymmetricUnit: g.fields['Asymmetric unit'],
        ...(g.fields.Vertices ? { vertices: g.fields.Vertices.split('; ') } : {}),
        centring: g.fields.Centring ? ['1/2,1/2'] : [],
        generalPosition: g.rows[0][3].split('; '),
        generators: gens === 'none' ? [] : [...gens.matchAll(/\((\d+)\)/g)].map((m) => Number(m[1])),
        wyckoff: g.rows.map((r) => [Number(r[0]), r[1], r[2], r[3].split('; ')]),
      };
    });
    expect(PLANE_GROUP_DATA).toEqual(fromPrint);
    expect(PLANE_GROUP_KEYS).toEqual(PRINT.map((g) => g.symbol));
  });
});

describe('plane groups: each printed page is consistent', () => {
  for (const g of PRINT) {
    const general = g.rows[0][3].split('; ').map(parseOperation);
    const group: ExactOperation[] = centrings(g).flatMap((c) => general.map((op) => reduceModLattice(compose(c, op))));

    it(`${g.symbol}: as many symmetry operations as coordinate triplets in the general position`, () => {
      const ops = g.fields['Symmetry operations'] ?? g.fields['Symmetry operations for (0,0)+ set'];
      expect(ops.split('; ')).toHaveLength(general.length);
      if (g.fields.Centring) {
        expect(g.fields['Symmetry operations for (1/2,1/2)+ set'].split('; ')).toHaveLength(general.length);
      }
    });

    it(`${g.symbol}: the selected generators give the general position`, () => {
      const gens = g.fields['Generators selected'];
      const named = gens === 'none' ? [] : [...gens.matchAll(/\((\d+)\)/g)].map((m) => general[Number(m[1]) - 1]);
      const centring = gens.includes('t(1/2,1/2)') ? [t('1/2,1/2')] : [];
      expect(centring.length > 0).toBe(Boolean(g.fields.Centring));
      const generated = closure([...centring, ...named], { dimension: 2 });
      expect(generated).toHaveLength(group.length);
      for (const op of generated) expect(group.some((o) => equalModLattice(o, op))).toBe(true);
      // The library builds the same set in ITA's order.
      const lib = planeGroupOperations(g.symbol);
      expect(lib).toHaveLength(group.length);
      lib.forEach((op, i) => expect(equalModLattice(op, group[i])).toBe(true));
      expect(planeGroupGenerators(g.symbol)).toHaveLength(named.length + centring.length);
    });

    for (const [multiplicity, letter, site, coordinates] of g.rows) {
      it(`${g.symbol} ${multiplicity}${letter}: the printed points form one orbit of that size`, () => {
        const points = centrings(g).flatMap((c) =>
          coordinates
            .split('; ')
            .map((expr) => applyToPoint(c, applyToPoint(parseOperation(expr), PARAMETERS)).map(mod1)),
        );
        expect(points).toHaveLength(Number(multiplicity));
        // Distinct modulo the lattice.
        points.forEach((p, i) => expect(points.findIndex((q) => pointsEqualModLattice(p, q))).toBe(i));
        // The orbit of the first point under the group is exactly the printed points.
        const orbit: Rational[][] = [];
        for (const op of group) {
          const q = applyToPoint(op, points[0]).map(mod1);
          if (!orbit.some((r) => pointsEqualModLattice(r, q))) orbit.push(q);
        }
        expect(orbit).toHaveLength(points.length);
        for (const q of orbit) expect(points.some((p) => pointsEqualModLattice(p, q))).toBe(true);
        // Stabilizer order = |G| / multiplicity.
        const stabilizer = group.filter((op) => pointsEqualModLattice(applyToPoint(op, points[0]), points[0]));
        expect(stabilizer.length * Number(multiplicity)).toBe(group.length);
        // The printed site-symmetry symbol names a group of that order.
        expect(siteSymbolOrder(site)).toBe(stabilizer.length);
      });
    }
  }
});
