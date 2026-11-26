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

import { millerIndices } from '../indices.js';
import { representativeFace } from './wyckoff.js';
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
import {
  expectHeader,
  readReference,
  tableRows,
  sameAxes,
  RHOMBOHEDRAL_IN_HEXAGONAL,
} from '../testUtils/references.js';
import { POINT_GROUP_KEYS, operations, settings, type PointGroupKey } from './pointGroups.js';
import { wyckoffPositions } from './wyckoff.js';
import {
  computedWyckoffRows,
  FIRST_FACE_EXCEPTIONS,
  FIRST_POINT_EXCEPTIONS,
  LETTER_ORDER,
  wyckoffRowsWith,
} from './wyckoffRows.js';

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
  rhombohedral: [
    [[1, 1, 1]],
    [
      [1, -1, 0],
      [0, 1, -1],
      [-1, 0, 1],
    ],
  ],
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
  /** The printed general position, as matrices on the lattice coordinates, in printed order. */
  lattice: M[];
  basis: M;
  rows: string[][];
}

const familyOf = (system: string): string => (system === 'trigonal' ? 'hexagonal' : system);

const ENTRIES: Entry[] = generalRows.slice(1).map((g) => {
  const headline = headlineRows.find((h) => h[1] === g[0] && h[4] === g[1]);
  if (!headline) throw new Error(`No headline for ${g[0]} ${g[1]}`);
  const family = familyOf(headline[0].toLowerCase());
  const basis =
    g[1] === 'rhombohedral axes'
      ? mul(HEXAGONAL, RHOMBOHEDRAL_IN_HEXAGONAL)
      : family === 'hexagonal'
        ? HEXAGONAL
        : ORTHONORMAL;
  const bInv = inverse(basis);
  const lattice = g[4].split(/\s+/).map((t) => t.split(',').map(coefficients));
  const group = lattice.map((w) => ({ m: mul(mul(basis, w), bInv), t: false }));
  return {
    short: g[0],
    axes: g[1],
    family,
    page: Number(g[2]),
    group,
    lattice,
    basis,
    rows: wyckoffRows.slice(1).filter((r) => r[0] === g[0] && r[1] === g[1]),
  };
});

/** Printed Miller indices (`h,h,-2h,l`, `0,1,0`; four for hexagonal axes) with h = 3, k = 2, l = 1. */
/** h = 3, k = 2, l = 1; for rhombohedral axes h = 5, since (321) lies there on the limiting form (h,k,2k-h). */
function hklOf(miller: string, axes = ''): number[] {
  const value: Record<string, number> =
    axes === 'rhombohedral axes' ? { h: 5, k: 2, l: 1, i: -7 } : { h: 3, k: 2, l: 1, i: -5 };
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
/** A printed triplet (`x,-x+y,z`) as the matrix of its coefficients of x, y, z, one row per coordinate. */
const triplet = (coords: string): M => coords.split(',').map(coefficients);
/** The images W·t of a triplet t under the operations, the first of each distinct image, in order. */
function distinctImages(operations: readonly M[], t: M): M[] {
  const out: M[] = [];
  for (const w of operations) {
    const image = mul(w, t);
    if (!out.some((u) => sameM(u, image))) out.push(image);
  }
  return out;
}
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
  // Three positions, two for rhombohedral axes (ITA Table 2.1.3.1).
  for (const split of splits(tokens, sets.length)) {
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
      if (p === sets.length) {
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
    settings(key)
      .filter((s) => s.symbol === e.short && (axis === undefined || s.uniqueAxis === axis) && sameAxes(e.axes, s))
      .map((s) => ({ key, index: s.index })),
  );
  if (found.length !== 1) throw new Error(`No unique setting for ${e.short} ${e.axes}`);
  return found[0];
}

const UNIQUE: Record<string, number[]> = { b: [0, 1, 0], c: [0, 0, 1] };

describe('ITA Table 3.2.3.2: Wyckoff positions', () => {
  it('the computed positions equal the transcription, row by row, but for the origin', () => {
    // Columns: multiplicity, letter, site symmetry, coordinates, Miller indices (the page is in print only).
    const printed = wyckoffRows.slice(1).filter((r) => r[4] !== 'o');
    const computed = printed.map((r) => `${r[0]} ${r[1]}`);
    const entries = [...new Set(computed)].map((id) => printed.find((r) => `${r[0]} ${r[1]}` === id)!);
    const fromLibrary = entries.flatMap((r) => {
      const { key, index } = settingOf({ short: r[0], axes: r[1] } as Entry);
      return computedWyckoffRows(key, index).map((row) => [
        r[0],
        r[1],
        String(row[1]),
        row[0],
        row[2],
        row[3].join(' '),
        row[4],
      ]);
    });
    expect(fromLibrary).toEqual(printed.map((r) => r.filter((_, i) => i !== 2)));
  });

  it('needs each entry of the convention data: without it the result departs from print or is undecided', () => {
    const settingsBySymbol = POINT_GROUP_KEYS.flatMap((key) => settings(key).map((s) => ({ key, s })));
    const without = (
      table: 'letterOrder' | 'firstPoints' | 'firstFaces',
      symbol: string,
      entry: string,
    ): {
      letterOrder: typeof LETTER_ORDER;
      firstPoints: typeof FIRST_POINT_EXCEPTIONS;
      firstFaces: typeof FIRST_FACE_EXCEPTIONS;
    } => {
      const all = { letterOrder: LETTER_ORDER, firstPoints: FIRST_POINT_EXCEPTIONS, firstFaces: FIRST_FACE_EXCEPTIONS };
      return { ...all, [table]: { ...all[table], [symbol]: all[table][symbol].filter((x) => x !== entry) } };
    };
    for (const table of ['letterOrder', 'firstPoints', 'firstFaces'] as const) {
      const data = {
        letterOrder: LETTER_ORDER,
        firstPoints: FIRST_POINT_EXCEPTIONS,
        firstFaces: FIRST_FACE_EXCEPTIONS,
      }[table];
      for (const [symbol, entries] of Object.entries(data)) {
        const found = settingsBySymbol.filter(({ s }) => s.symbol === symbol);
        expect(found, symbol).toHaveLength(1);
        const { key, s } = found[0];
        for (const entry of entries) {
          const label = `${table} ${symbol} ${entry}`;
          let departs: boolean;
          try {
            departs =
              JSON.stringify(wyckoffRowsWith(key, s.index, without(table, symbol, entry))) !==
              JSON.stringify(computedWyckoffRows(key, s.index));
          } catch {
            departs = true;
          }
          expect(departs, label).toBe(true);
        }
      }
    }
  });

  it('has Wyckoff positions for each of the 45 printed entries, on the page of the entry', () => {
    expect(ENTRIES).toHaveLength(45);
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
        const n = faceNormal(e.basis, hklOf(r[7], e.axes));
        const stab = stabilizerOf(e.group, n);
        expect(stab.length * Number(r[3]), 'order of the site symmetry × multiplicity').toBe(order);
        // Rhombohedral axes: the symmetry directions of ITA Table 2.1.3.1 for them.
        const family = e.axes === 'rhombohedral axes' ? 'rhombohedral' : e.family;
        const readings = symbolGroups(r[5], family, e.basis, uniqueAxis, n);
        expect(
          readings.some((h) =>
            sameGroup(
              h,
              stab.map((s) => ({ cartesian: s.m, timeReversal: false })),
            ),
          ),
          `site symmetry ${r[5]} read along ITA Table 2.1.3.1`,
        ).toBe(true);
        // The representative point has a conjugate site symmetry (same Wyckoff position).
        const p = point(e.basis, r[6].split(' ')[0]);
        const conj = e.group.some((g) => {
          const q = apply(g.m, p);
          const s = stabilizerOf(e.group, q);
          return s.length === stab.length && s.every((x) => stab.some((y) => sameM(x.m, y.m)));
        });
        expect(conj, `point ${r[6]} in the same position`).toBe(true);
      });

      it(`${label}, ${r[3]}${r[4]}: the printed points are the images of the first under the general position, in its order`, () => {
        const printed = r[6].split(' ').map(triplet);
        expect(printed, 'one point per equivalent direction').toHaveLength(Number(r[3]));
        expect(printed).toEqual(distinctImages(e.lattice, printed[0]));
      });
    }

    it(`${label}: different letters are different positions (site symmetries not conjugate)`, () => {
      const stabs = e.rows
        .filter((x) => x[4] !== 'o')
        .map((x) => stabilizerOf(e.group, faceNormal(e.basis, hklOf(x[7], e.axes))));
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
        lib.map((w) => [w.letter, String(w.multiplicity), w.siteSymmetry, w.coordinates.join(' '), w.millerIndices]),
      ).toEqual(faces.map((x) => [x[4], x[3], x[5], x[6], x[7]]));
      lib.forEach((w, i) => {
        const n = faceNormal(e.basis, hklOf(faces[i][7], e.axes));
        // The public millerIndices with these values gives the face the test reads from print.
        const values = e.axes === 'rhombohedral axes' ? { h: 5, k: 2, l: 1 } : { h: 3, k: 2, l: 1 };
        expect(millerIndices(w.millerIndices, values)).toEqual(hklOf(faces[i][7], e.axes));
        expect(sameV(representativeFace(key, index, w.millerIndices).cartesian, n)).toBe(true);
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

describe('Wyckoff coordinates of every setting, unprinted ones included', () => {
  // Printed settings are checked against print above; this pins the order for all settings: the
  // images of the first point under the operations of the setting, in their order (the order
  // printed for setting 1, carried into the frame of an unprinted setting).
  for (const key of POINT_GROUP_KEYS) {
    for (const s of settings(key)) {
      it(`${key}, setting ${s.index}: each position lists the images of its first point, in the order of the operations`, () => {
        const lattice = operations(key, { setting: s.index }).map((op) => op.matrix.map((r) => [...r]));
        for (const w of wyckoffPositions(key, { setting: s.index })) {
          expect(w.coordinates.map(triplet), `${w.letter}`).toEqual(distinctImages(lattice, triplet(w.coordinates[0])));
        }
      });
    }
  }
});

describe('Settings ITA does not print: mm2 as 2mm and m2m', () => {
  for (const s of settings('mm2').filter((x) => x.symbol === '2mm' || x.symbol === 'm2m')) {
    it(`${s.symbol}: every position read along x, y, z gives the site symmetry of its representative`, () => {
      const group = groupOfSymbol(s.symbol, ORTHONORMAL);
      const lib = wyckoffPositions('mm2', { setting: s.index });
      expect(lib.map((w) => w.letter)).toEqual(['d', 'c', 'b', 'a']);
      for (const w of lib) {
        const n = faceNormal(ORTHONORMAL, hklOf(w.millerIndices));
        expect(sameV(representativeFace('mm2', s.index, w.millerIndices).cartesian, n)).toBe(true);
        const stab = stabilizerOf(group, n);
        expect(stab.length * w.multiplicity).toBe(4);
        const readings = symbolGroups(w.siteSymmetry, 'orthorhombic', ORTHONORMAL, undefined, n);
        expect(
          readings.some((h) =>
            sameGroup(
              h,
              stab.map((x) => ({ cartesian: x.m, timeReversal: false })),
            ),
          ),
        ).toBe(true);
        const p = point(ORTHONORMAL, w.coordinates[0]);
        // The carried points are the images of the first under the group read from the symbol.
        const images = distinctImages(
          group.map((g) => g.m),
          triplet(w.coordinates[0]),
        );
        expect(w.coordinates).toHaveLength(w.multiplicity);
        expect(new Set(w.coordinates.map((c) => JSON.stringify(triplet(c))))).toEqual(
          new Set(images.map((m) => JSON.stringify(m))),
        );
        const conj = group.some((g) => {
          const s2 = stabilizerOf(group, apply(g.m, p));
          return s2.length === stab.length && s2.every((x) => stab.some((y) => sameM(x.m, y.m)));
        });
        expect(conj, `point ${w.coordinates} in the same position`).toBe(true);
      }
    });
  }
});

describe('Settings ITA does not print: monoclinic unique axis a', () => {
  for (const key of ['2', 'm', '2/m'] as const) {
    const s = settings(key).find((x) => x.uniqueAxis === 'a')!;
    it(`${key} ${s.fullSymbol}: every position read along x gives the site symmetry of its representative`, () => {
      // The full symbol read along a, b, c = x, y, z; the unique axis a is x.
      const group = groupOfSymbol(s.fullSymbol, ORTHONORMAL);
      const lib = wyckoffPositions(key, { setting: s.index });
      expect(lib.map((w) => w.letter)).toEqual(wyckoffPositions(key, { setting: 1 }).map((w) => w.letter));
      for (const w of lib) {
        const n = faceNormal(ORTHONORMAL, hklOf(w.millerIndices));
        expect(sameV(representativeFace(key, s.index, w.millerIndices).cartesian, n)).toBe(true);
        const stab = stabilizerOf(group, n);
        expect(stab.length * w.multiplicity).toBe(group.length);
        const readings = symbolGroups(w.siteSymmetry, 'monoclinic', ORTHONORMAL, [1, 0, 0], n);
        expect(
          readings.some((h) =>
            sameGroup(
              h,
              stab.map((x) => ({ cartesian: x.m, timeReversal: false })),
            ),
          ),
        ).toBe(true);
        const p = point(ORTHONORMAL, w.coordinates[0]);
        // The carried points are the images of the first under the group read from the symbol.
        const images = distinctImages(
          group.map((g) => g.m),
          triplet(w.coordinates[0]),
        );
        expect(w.coordinates).toHaveLength(w.multiplicity);
        expect(new Set(w.coordinates.map((c) => JSON.stringify(triplet(c))))).toEqual(
          new Set(images.map((m) => JSON.stringify(m))),
        );
        const conj = group.some((g) => {
          const s2 = stabilizerOf(group, apply(g.m, p));
          return s2.length === stab.length && s2.every((x) => stab.some((y) => sameM(x.m, y.m)));
        });
        expect(conj, `point ${w.coordinates} in the same position`).toBe(true);
      }
    });
  }
});
