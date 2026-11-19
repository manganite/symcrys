/**
 * Wyckoff positions against print (fixture class (a)): ITA (6th ed.) Table 3.2.3.2, pp. 745–769,
 * re-parsed from references/itc/vol-a-table-3.2.3.2-wyckoff-positions.md.
 *
 * Independent of the library: the group of each entry is its printed general position
 * (vol-a-table-3.2.3.2-general-positions.md), the face normal of the printed Miller indices is
 * computed here, and each oriented site-symmetry symbol is read along the symmetry directions of
 * ITA Table 2.1.3.1 (typed here). The library's data file must equal the transcription, and its
 * Wyckoff positions must agree with these independent results.
 */

import { describe, expect, it } from 'vitest';
import {
  close,
  inverse,
  mirrorNormal,
  mul,
  neg,
  rotationAbout,
  sameGroup,
  sameM,
  type M,
  type RefOp,
} from '../testUtils/independentGroups.js';
import { groupOfSymbol } from '../testUtils/hermannMauguin.js';
import { expectHeader, readReference, tableRows } from '../testUtils/references.js';
import { POINT_GROUP_KEYS, operations, settings, type PointGroupKey } from './pointGroups.js';
import { wyckoffPositions } from './wyckoff.js';
import { ITA_WYCKOFF } from './wyckoffData.js';

const ORTHONORMAL: M = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];
/** Columns a, b, c in the frame of #6: a = x, b at 120° from a in the xy plane, c = z. */
const HEXAGONAL: M = [
  [1, -1 / 2, 0],
  [0, Math.sqrt(3) / 2, 0],
  [0, 0, 1],
];

/**
 * Symmetry directions of ITA Table 2.1.3.1 (p. 151) as lattice directions, per position of the
 * symbol: primary, secondary, tertiary. Monoclinic: the unique axis only.
 */
const DIRECTIONS: Record<string, number[][][]> = {
  orthorhombic: [[[1, 0, 0]], [[0, 1, 0]], [[0, 0, 1]]],
  tetragonal: [
    [[0, 0, 1]],
    [
      [1, 0, 0],
      [0, 1, 0],
    ],
    [
      [1, -1, 0],
      [1, 1, 0],
    ],
  ],
  hexagonal: [
    [[0, 0, 1]],
    [
      [1, 0, 0],
      [0, 1, 0],
      [-1, -1, 0],
    ],
    [
      [1, -1, 0],
      [1, 2, 0],
      [-2, -1, 0],
    ],
  ],
  cubic: [
    [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ],
    [
      [1, 1, 1],
      [1, -1, -1],
      [-1, 1, -1],
      [-1, -1, 1],
    ],
    [
      [1, -1, 0],
      [1, 1, 0],
      [0, 1, -1],
      [0, 1, 1],
      [-1, 0, 1],
      [1, 0, 1],
    ],
  ],
};

const apply = (m: M, v: number[]): number[] => m.map((r) => r[0] * v[0] + r[1] * v[1] + r[2] * v[2]);
const unit = (v: number[]): number[] => {
  const n = Math.hypot(v[0], v[1], v[2]);
  return v.map((x) => x / n);
};
const transpose = (m: M): M => [0, 1, 2].map((i) => [0, 1, 2].map((j) => m[j][i]));

// --- The transcriptions ---------------------------------------------------------------------------

const headlineRows = tableRows(readReference('itc/vol-a-table-3.2.3.2-headlines.md'));
expectHeader(headlineRows, ['System', 'Short', 'Full', 'Schoenflies', 'Axes', 'Page']);
const generalRows = tableRows(readReference('itc/vol-a-table-3.2.3.2-general-positions.md'));
expectHeader(generalRows, ['Short', 'Axes', 'Page', 'Multiplicity', 'General position']);
const wyckoffRows = tableRows(readReference('itc/vol-a-table-3.2.3.2-wyckoff-positions.md'));
expectHeader(wyckoffRows, [
  'Short',
  'Axes',
  'Page',
  'Multiplicity',
  'Letter',
  'Site symmetry',
  'Coordinates',
  'Miller indices',
]);

/** One coordinate (`-x+y`, `2x`) as the coefficients of x, y, z. */
function coefficients(expr: string): number[] {
  const row = [0, 0, 0];
  const terms = expr.match(/[+-]?\d*[xyz]|[+-]?\d+/g) ?? [];
  if (terms.join('').replace(/^\+/, '') !== expr) throw new Error(`Unreadable coordinate: ${expr}`);
  for (const t of terms) {
    const m = /^([+-]?)(\d*)([xyz]?)$/.exec(t);
    if (!m) throw new Error(`Unreadable term: ${t}`);
    const value = (m[1] === '-' ? -1 : 1) * (m[2] === '' ? 1 : Number(m[2]));
    if (m[3] === '') {
      if (value !== 0) throw new Error(`Constant in a point coordinate: ${expr}`);
    } else row['xyz'.indexOf(m[3])] += value;
  }
  return row;
}

interface Entry {
  short: string;
  axes: string;
  family: string;
  page: number;
  /** The printed general position, as Cartesian operations. */
  group: RefOp[];
  basis: M;
  rows: string[][];
}

const familyOf = (system: string): string => (system === 'trigonal' ? 'hexagonal' : system);

const ENTRIES: Entry[] = generalRows.slice(1).map((g) => {
  const headline = headlineRows.find((h) => h[1] === g[0] && h[4] === g[1]);
  if (!headline) throw new Error(`No headline for ${g[0]} ${g[1]}`);
  const family = familyOf(headline[0].toLowerCase());
  const basis = family === 'hexagonal' ? HEXAGONAL : ORTHONORMAL;
  const bInv = inverse(basis);
  const group = g[4].split(/\s+/).map((t) => ({ m: mul(mul(basis, t.split(',').map(coefficients)), bInv), t: false }));
  return {
    short: g[0],
    axes: g[1],
    family,
    page: Number(g[2]),
    group,
    basis,
    rows: wyckoffRows.slice(1).filter((r) => r[0] === g[0] && r[1] === g[1]),
  };
});

/** Printed Miller indices (`h,h,-2h,l`, `0,1,0`; four for hexagonal axes) with h = 3, k = 2, l = 1. */
function hklOf(miller: string): number[] {
  const value: Record<string, number> = { h: 3, k: 2, l: 1, i: -5 };
  const parts = miller.split(',').map((c) => {
    const m = /^(-?)(\d*)([hkil]?)$/.exec(c);
    if (!m || (m[2] === '' && m[3] === '')) throw new Error(`Unreadable index: ${c}`);
    return (m[1] ? -1 : 1) * (m[2] === '' ? 1 : Number(m[2])) * (m[3] ? value[m[3]] : 1);
  });
  if (parts.length === 4) {
    expect(parts[2] + parts[0] + parts[1], `i = -(h+k) in ${miller}`).toBe(0);
    return [parts[0], parts[1], parts[3]];
  }
  return parts;
}

/** Face normal of (hkl): the reciprocal basis B⁻ᵀ applied to hkl. */
const faceNormal = (basis: M, hkl: number[]): number[] => unit(apply(transpose(inverse(basis)), hkl));
/** Point of a coordinate pattern with x = 3, y = 2, z = 1 (lattice basis), Cartesian. */
const point = (basis: M, coords: string): number[] =>
  unit(apply(basis, apply(coords.split(',').map(coefficients), [3, 2, 1])));

const fixesV = (m: M, v: number[]): boolean => {
  const w = apply(m, v);
  return Math.hypot(w[0] - v[0], w[1] - v[1], w[2] - v[2]) < 1e-9;
};
const sameV = (a: readonly number[], b: readonly number[]): boolean =>
  [0, 1, 2].every((i) => Math.abs(a[i] - b[i]) < 1e-9);
const stabilizerOf = (group: RefOp[], v: number[]): RefOp[] => group.filter((g) => fixesV(g.m, v));

// --- Reading an oriented site-symmetry symbol ------------------------------------------------------

/** Generators of one element symbol along u. */
function elementGenerators(token: string, u: number[]): M[] {
  if (token === 'm') return [mirrorNormal(u)];
  const m = /^(-?)([1-6])(\/m)?$/.exec(token);
  if (!m) throw new Error(`Unreadable element: ${token}`);
  if (m[2] === '1') return m[1] ? [neg(ORTHONORMAL)] : [];
  const rotation = rotationAbout(u, 1 / Number(m[2]));
  const gens = [m[1] ? neg(rotation) : rotation];
  if (m[3]) gens.push(mirrorNormal(u));
  return gens;
}

/** All ways to cut `tokens` into `n` contiguous, non-empty groups; a `.` stands alone. */
function splits(tokens: string[], n: number): string[][][] {
  if (n === 1) return tokens.length > 0 && (tokens.length === 1 || !tokens.includes('.')) ? [[tokens]] : [];
  const out: string[][][] = [];
  for (let k = 1; k <= tokens.length - n + 1; k++) {
    const head = tokens.slice(0, k);
    if (head.length > 1 && head.includes('.')) continue;
    for (const rest of splits(tokens.slice(k), n - 1)) out.push([head, ...rest]);
  }
  return out;
}

/**
 * The groups the oriented symbol can denote at the site v (ITA 6th ed., § 2.1.3.12, p. 163): the
 * characters of a position stand for elements along directions of that position's set (Table
 * 2.1.3.1) that fix v, each character along a different direction; a character may also stand for
 * equivalent elements along further directions of the set, which the closure supplies.
 */
function symbolGroups(
  symbolText: string,
  family: string,
  basis: M,
  uniqueAxis: number[] | undefined,
  v: number[],
): RefOp[][] {
  if (symbolText === '1') return [close([])];
  if (symbolText === '-1') return [close([{ m: neg(ORTHONORMAL), t: false }])];
  const tokens = symbolText.match(/-?[1-6](\/m)?|m|\./g) ?? [];
  if (tokens.join('') !== symbolText) throw new Error(`Unreadable site symmetry: ${symbolText}`);
  if (family === 'monoclinic') {
    if (!uniqueAxis || tokens.length !== 1) throw new Error(`Monoclinic site symmetry: ${symbolText}`);
    return [close(elementGenerators(tokens[0], uniqueAxis).map((m) => ({ m, t: false })))];
  }
  const sets = DIRECTIONS[family].map((set) => set.map((d) => unit(apply(basis, d))));
  const results: RefOp[][] = [];
  for (const split of splits(tokens, 3)) {
    // For each position, every assignment of its tokens to distinct directions whose elements fix v.
    const perPosition: M[][][] = split.map((group, p) => {
      if (group[0] === '.') return [[]];
      const assign = (i: number, used: number[]): M[][] => {
        if (i === group.length) return [[]];
        const out: M[][] = [];
        sets[p].forEach((u, j) => {
          if (used.includes(j)) return;
          const gens = elementGenerators(group[i], u);
          if (!gens.every((g) => fixesV(g, v))) return;
          for (const rest of assign(i + 1, [...used, j])) out.push([...gens, ...rest]);
        });
        return out;
      };
      return assign(0, []);
    });
    const combine = (p: number, acc: M[]): void => {
      if (p === 3) {
        results.push(close(acc.map((m) => ({ m, t: false }))));
        return;
      }
      for (const gens of perPosition[p]) combine(p + 1, [...acc, ...gens]);
    };
    combine(0, []);
  }
  return results;
}

/** The ITC setting of symcrys for an entry (same short symbol; same unique axis if monoclinic). */
function settingOf(e: Entry): { key: PointGroupKey; index: number } {
  const axis = /^unique axis (b|c)$/.exec(e.axes)?.[1];
  const found = POINT_GROUP_KEYS.flatMap((key) =>
    settings(key, 'itc')
      .filter((s) => s.symbol === e.short && (axis === undefined || s.uniqueAxis === axis))
      .map((s) => ({ key, index: s.index })),
  );
  if (found.length !== 1) throw new Error(`No unique setting for ${e.short} ${e.axes}`);
  return found[0];
}

const UNIQUE: Record<string, number[]> = { b: [0, 1, 0], c: [0, 0, 1] };

describe('ITA Table 3.2.3.2: Wyckoff positions', () => {
  it('the library data equal the transcription, row by row', () => {
    const fromData = ITA_WYCKOFF.flatMap((e) =>
      e.rows.map((r) => [
        e.symbol,
        e.uniqueAxis
          ? `unique axis ${e.uniqueAxis}`
          : ['3', '-3', '312', '321', '3m1', '31m', '-31m', '-3m1'].includes(e.symbol)
            ? 'hexagonal axes'
            : '',
        String(e.page),
        String(r[1]),
        r[0],
        r[2],
        r[3],
        r[4],
      ]),
    );
    expect(fromData).toEqual(wyckoffRows.slice(1));
  });

  it('has Wyckoff positions for each of the 40 printed entries, on the page of the entry', () => {
    expect(ENTRIES).toHaveLength(40);
    for (const e of ENTRIES) {
      expect(e.rows.length, `${e.short} ${e.axes}`).toBeGreaterThan(0);
      for (const r of e.rows) expect(Number(r[2]), `${e.short} ${e.axes}`).toBe(e.page);
    }
  });

  for (const e of ENTRIES) {
    const label = `${e.short}${e.axes ? ` (${e.axes})` : ''}, p. ${e.page}`;
    const order = e.group.length;
    const uniqueAxis = UNIQUE[/^unique axis (b|c)$/.exec(e.axes)?.[1] ?? ''];

    it(`${label}: letters from a, general position first with multiplicity = order, origin o last`, () => {
      const letters = e.rows.map((r) => r[4]);
      const faces = letters.filter((l) => l !== 'o');
      expect(faces).toEqual([...'abcdefgh'.slice(0, faces.length)].reverse());
      expect(e.rows[0][5]).toBe('1');
      expect(Number(e.rows[0][3])).toBe(order);
      if (letters.includes('o')) {
        expect(letters.at(-1)).toBe('o');
        expect(e.rows.at(-1)?.[3]).toBe('1');
        expect(e.rows.at(-1)?.[6]).toBe('0,0,0');
        expect(e.rows.at(-1)?.[7]).toBe('');
      }
    });

    for (const r of e.rows.filter((x) => x[4] !== 'o')) {
      it(`${label}, ${r[3]}${r[4]} ${r[5]}: face and point lie in the position the symbol describes`, () => {
        const n = faceNormal(e.basis, hklOf(r[7]));
        const stab = stabilizerOf(e.group, n);
        expect(stab.length * Number(r[3]), 'order of the site symmetry × multiplicity').toBe(order);
        const readings = symbolGroups(r[5], e.family, e.basis, uniqueAxis, n);
        expect(
          readings.some((h) =>
            sameGroup(
              h,
              stab.map((s) => ({ matrix: s.m, timeReversal: false })),
            ),
          ),
          `site symmetry ${r[5]} read along ITA Table 2.1.3.1`,
        ).toBe(true);
        // The representative point has a conjugate site symmetry (same Wyckoff position).
        const p = point(e.basis, r[6]);
        const conj = e.group.some((g) => {
          const q = apply(g.m, p);
          const s = stabilizerOf(e.group, q);
          return s.length === stab.length && s.every((x) => stab.some((y) => sameM(x.m, y.m)));
        });
        expect(conj, `point ${r[6]} in the same position`).toBe(true);
      });
    }

    it(`${label}: different letters are different positions (site symmetries not conjugate)`, () => {
      const stabs = e.rows
        .filter((x) => x[4] !== 'o')
        .map((x) => stabilizerOf(e.group, faceNormal(e.basis, hklOf(x[7]))));
      for (let i = 0; i < stabs.length; i++) {
        for (let j = i + 1; j < stabs.length; j++) {
          const conjugate = e.group.some((g) => {
            const gi = inverse(g.m);
            const image = stabs[i].map((s) => mul(mul(g.m, s.m), gi));
            return image.length === stabs[j].length && image.every((m) => stabs[j].some((y) => sameM(m, y.m)));
          });
          expect(conjugate).toBe(false);
        }
      }
    });

    it(`${label}: the library gives the printed positions with this site symmetry`, () => {
      const { key, index } = settingOf(e);
      const lib = wyckoffPositions(key, { setting: index });
      const ops = operations(key, { setting: index });
      const faces = e.rows.filter((x) => x[4] !== 'o');
      expect(
        lib.map((w) => [w.letter, String(w.multiplicity), w.siteSymmetry, w.coordinates, w.millerIndices]),
      ).toEqual(faces.map((x) => [x[4], x[3], x[5], x[6], x[7]]));
      lib.forEach((w, i) => {
        const n = faceNormal(e.basis, hklOf(faces[i][7]));
        expect(sameV(w.representative.cartesian, n)).toBe(true);
        const stab = stabilizerOf(e.group, n).map((s) => ({ m: s.m, t: false }));
        expect(
          sameGroup(
            stab,
            w.siteSymmetryOperations.map((k) => ops[k]),
          ),
        ).toBe(true);
      });
    });
  }
});

describe('Settings ITA does not print: mm2 as 2mm and m2m', () => {
  for (const s of settings('mm2', 'itc').filter((x) => x.symbol === '2mm' || x.symbol === 'm2m')) {
    it(`${s.symbol}: every position read along x, y, z gives the site symmetry of its representative`, () => {
      const group = groupOfSymbol(s.symbol, ORTHONORMAL);
      const lib = wyckoffPositions('mm2', { setting: s.index });
      expect(lib.map((w) => w.letter)).toEqual(['d', 'c', 'b', 'a']);
      for (const w of lib) {
        const n = faceNormal(ORTHONORMAL, hklOf(w.millerIndices));
        expect(sameV(w.representative.cartesian, n)).toBe(true);
        const stab = stabilizerOf(group, n);
        expect(stab.length * w.multiplicity).toBe(4);
        const readings = symbolGroups(w.siteSymmetry, 'orthorhombic', ORTHONORMAL, undefined, n);
        expect(
          readings.some((h) =>
            sameGroup(
              h,
              stab.map((x) => ({ matrix: x.m, timeReversal: false })),
            ),
          ),
        ).toBe(true);
        const p = point(ORTHONORMAL, w.coordinates);
        const conj = group.some((g) => {
          const s2 = stabilizerOf(group, apply(g.m, p));
          return s2.length === stab.length && s2.every((x) => stab.some((y) => sameM(x.m, y.m)));
        });
        expect(conj, `point ${w.coordinates} in the same position`).toBe(true);
      }
    });
  }
});
