/**
 * The signs of the axes against ITA's Seitz symbols (ITA 6th ed. 2016, Tables 1.4.2.1–1.4.2.5,
 * pp. 52–53; references/itc/vol-a-2016-tables-1.4.2-seitz.md; "Pure ITC", #114, #107). The printed
 * tables are re-parsed here: each entry is checked against its own matrix (the direction is the axis
 * or the normal, the sense the turn about it), and the axis and sense the library computes for every
 * operation of every point group, magnetic group, plane group and plane point group against the
 * printed Seitz symbol of its matrix.
 */

import { describe, expect, it } from 'vitest';
import { familyBasis } from '../lattice.js';
import { det, inverse, multiply, type Mat3 } from '../linalg.js';
import * as classes from '../index.js';
import * as magnetic from '../magnetic.js';
import * as plane from '../plane.js';
import { readReference, tableRows } from '../testUtils/references.js';

const text = readReference('itc/vol-a-2016-tables-1.4.2-seitz.md');

/** The rows of one table of the transcription: [no, triplet, type, orientation, seitz]. */
function rowsOf(name: string): string[][] {
  const start = text.indexOf(`## ${name}`);
  const end = text.indexOf('\n## ', start + 3);
  return tableRows(text.slice(start, end < 0 ? undefined : end)).slice(1);
}

/** A printed triplet or doublet with coefficients ±1 as a matrix, read here on its own. */
function matrixOf(printed: string): number[][] {
  const vars = printed.split(',').length === 2 ? 'xy' : 'xyz';
  return printed.split(',').map((part) => {
    const row = new Array(vars.length).fill(0);
    let rest = part;
    while (rest.length) {
      const m = /^([+-]?)([xyz])/.exec(rest);
      if (!m) throw new Error(`Unreadable: ${printed}`);
      row[vars.indexOf(m[2])] += m[1] === '-' ? -1 : 1;
      rest = rest.slice(m[0].length);
    }
    return row;
  });
}

/** The Seitz symbol's subscript as a direction and its sense; with the erratum of No. 32. */
function seitzOf(symbol: string): { direction?: number[]; sense?: string; improper: boolean } {
  const m = /^(-?)(\d|m)(?:\^([+-]))?(?:_\{(.+)\})?$/.exec(symbol);
  if (!m) throw new Error(`Unreadable Seitz symbol: ${symbol}`);
  return {
    improper: m[1] === '-' || m[2] === 'm',
    ...(m[3] ? { sense: m[3] } : {}),
    ...(m[4] ? { direction: (m[4].match(/-?\d/g) ?? []).map(Number) } : {}),
  };
}

const TABLES = {
  cubic: rowsOf('Table 1.4.2.1'),
  hexagonal: rowsOf('Table 1.4.2.2'),
  rhombohedral: rowsOf('Table 1.4.2.3'),
  square: rowsOf('Table 1.4.2.4'),
  hexagonalPlane: rowsOf('Table 1.4.2.5'),
};
/** The erratum of Table 1.4.2.1, No. 32 (in the head of the transcription). */
const seitzSymbol = (table: string, row: string[]) => (table === 'cubic' && row[0] === '32' ? '-3^+_{-1-11}' : row[4]);

/** The dimension of a table. */
const w = (name: string) => (name === 'square' || name === 'hexagonalPlane' ? 2 : 3);

/** The Cartesian basis of each table: a, b, c as columns. */
const OBVERSE = [
  [2 / 3, -1 / 3, -1 / 3],
  [1 / 3, 1 / 3, -2 / 3],
  [1 / 3, 1 / 3, 1 / 3],
] as unknown as Mat3;
const BASES: Record<string, Mat3> = {
  cubic: familyBasis('cubic'),
  hexagonal: familyBasis('hexagonal'),
  rhombohedral: multiply(familyBasis('hexagonal'), OBVERSE),
};

const apply = (m: number[][], v: number[]) => m.map((row) => row.reduce((s, x, j) => s + x * v[j], 0));
const same = (a: number[], b: number[]) => a.every((x, i) => x === b[i]);

describe('ITA Tables 1.4.2.1–1.4.2.5: the printed Seitz symbols agree with their matrices', () => {
  it('have 48, 24, 12, 8 and 12 entries', () => {
    expect(Object.values(TABLES).map((t) => t.length)).toEqual([48, 24, 12, 8, 12]);
  });
  for (const [name, rows] of Object.entries(TABLES)) {
    it(`${name}: the direction is the axis (W u = ±u) or the normal (W u = −u), and the sense turns about it`, () => {
      for (const row of rows) {
        const w = matrixOf(row[1]);
        const s = seitzOf(seitzSymbol(name, row));
        const d = w.length === 3 ? det(w as unknown as Mat3) : w[0][0] * w[1][1] - w[0][1] * w[1][0];
        expect(s.improper, row.join(' ')).toBe(d < 0);
        if (!s.direction) continue;
        // The proper part fixes the axis; a reflection reverses its normal.
        const proper = d < 0 ? w.map((r) => r.map((x) => -x)) : w;
        if (w.length === 2)
          expect(
            same(
              apply(w, s.direction),
              s.direction.map((x) => -x),
            ),
            row.join(' '),
          ).toBe(true);
        else expect(same(apply(proper, s.direction), s.direction), row.join(' ')).toBe(true);
        if (s.sense && w.length === 3) {
          // Counter-clockwise about +u: the axial vector of the Cartesian rotation points along u.
          const b = BASES[name];
          const r = multiply(multiply(b, proper as unknown as Mat3), inverse(b));
          const axial = [r[2][1] - r[1][2], r[0][2] - r[2][0], r[1][0] - r[0][1]];
          const u = apply(b as unknown as number[][], s.direction);
          expect(Math.sign(axial.reduce((acc, x, i) => acc + x * u[i], 0)) > 0 ? '+' : '-', row.join(' ')).toBe(
            s.sense,
          );
        }
      }
    });
  }
  it('the Type column names the R of the Seitz symbol, the Orientation of a rotation its direction', () => {
    for (const [name, rows] of Object.entries(TABLES)) {
      for (const row of rows) {
        // R without the subscript (`2_{001}` → `2`, `-3^+_{111}` → `-3^+`), the erratum of No. 32 read.
        expect(seitzSymbol(name, row).replace(/_\{.*\}$/, ''), `${name} ${row.join(' ')}`).toBe(row[2]);
        const s = seitzOf(seitzSymbol(name, row));
        if (!s.direction || s.improper || row[3] === '') continue;
        // A rotation's Orientation is its axis as a line (x,x,0; -x,0,x; 0,0,z): its coefficients.
        const coefficients = row[3]
          .split(',')
          .map((c) => (c === '0' ? 0 : c.startsWith('-') ? -1 : 1) * (/2/.test(c) ? 2 : 1));
        const parallel = (a: number[], b: number[]) => a.every((x, i) => x === b[i]) || a.every((x, i) => x === -b[i]);
        if (w(name) === 3) expect(parallel(coefficients, s.direction), `${name} ${row.join(' ')}`).toBe(true);
      }
    }
  });
});

/** The printed Seitz direction and sense of a matrix in a table. */
function printedSeitz(name: keyof typeof TABLES, w: readonly (readonly number[])[]) {
  const row = TABLES[name].find((r) => matrixOf(r[1]).every((rr, i) => rr.every((x, j) => x === w[i][j] + 0)));
  if (!row) throw new Error(`${name}: no printed matrix ${JSON.stringify(w)}`);
  return seitzOf(seitzSymbol(name, row));
}

describe('the axis of every operation has the sign of its printed Seitz symbol (#114, #107)', () => {
  for (const [label, api] of [
    ['symcrys', classes],
    ['symcrys/magnetic', magnetic],
  ] as const) {
    it(`${label}: every key and setting`, () => {
      for (const key of api.POINT_GROUP_KEYS as readonly string[]) {
        for (const s of api.settings(key as never)) {
          const table: keyof typeof TABLES =
            api.pointGroup(key as never).crystalSystem === 'trigonal' ||
            api.pointGroup(key as never).crystalSystem === 'hexagonal'
              ? s.axes === 'rhombohedral'
                ? 'rhombohedral'
                : 'hexagonal'
              : 'cubic';
          const ops = api.operations(key as never, { setting: s.index });
          api.describeOperations(key as never, { setting: s.index }).forEach((d, i) => {
            if (!d.axis) return;
            const printed = printedSeitz(table, ops[i].matrix);
            expect([...d.axis.lattice], `${key} #${s.index} op ${i + 1}`).toEqual(printed.direction);
            if (d.n >= 3) expect(d.sense, `${key} #${s.index} op ${i + 1}`).toBe(printed.sense);
          });
        }
      }
    });
  }
  it('symcrys/plane: the normal of every mirror and glide line, in every group and setting', () => {
    const keys = [...plane.PLANE_GROUP_KEYS, ...plane.POINT_GROUP_KEYS] as string[];
    for (const key of keys) {
      const isGroup = (plane.PLANE_GROUP_KEYS as readonly string[]).includes(key);
      const settings = isGroup ? [1] : plane.settings(key as never).map((s) => s.index);
      const system = isGroup
        ? plane.planeGroup(key as never).crystalSystem
        : plane.pointGroup(key as never).crystalSystem;
      // Table 1.4.2.4 serves the oblique, rectangular and square systems, 1.4.2.5 the hexagonal one.
      const table = system === 'hexagonal' ? 'hexagonalPlane' : 'square';
      for (const setting of settings) {
        const ops = plane.operations(key as never, { setting });
        plane.describeOperations(key as never, { setting }).forEach((d, i) => {
          if (d.kind !== 'reflection' && d.kind !== 'glide-reflection') return;
          expect([...(d.axis ?? [])], `${key} #${setting} op ${i + 1}`).toEqual(
            printedSeitz(table, ops[i].matrix).direction,
          );
        });
      }
    }
  });
});
