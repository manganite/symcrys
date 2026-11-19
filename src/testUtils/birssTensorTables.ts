/**
 * Readers for Birss's Tables 4a–4f (references/birss/), which give the form of tensors of rank 0
 * to 4 for the 32 classes in Birss's frame (test-only code). Each class row is turned into linear
 * relations among the 3^rank components, read as Birss prints them; nothing comes from symcrys.
 * Moved from birss-app (`src/services/testUtils/birssTableParsers.ts` and the readers in
 * `tables4e.reference.test.ts`), where the reading of each table was worked out and checked.
 */

import { readReference, tableRows } from './references.js';

const AXES = 'xyz';

/** Flat index of a component written as letters, e.g. `xyz` → 5. */
export const flatIndex = (s: string): number => [...s].reduce((a, ch) => a * 3 + AXES.indexOf(ch), 0);

/** A printed relation: component `idx` = Σ coeff·component (an empty sum: the component vanishes). */
export interface Relation {
  readonly idx: number;
  readonly terms: readonly { readonly idx: number; readonly coeff: number }[];
}

// --- Table 4a: symbol class per class and kind of tensor ------------------------------------------

/** Letter of a symbol class (`H_m` → `H`); a blank entry (`-`) means the tensor vanishes. */
const classLetter = (cell: string): string | null => cell.match(/^([A-U])_[mn]$/)?.[1] ?? null;

export interface ClassRow {
  /** Key of the class; Birss prints `m3`, `m3m` (docs/conventions.md, "Where ITC and Birss differ"). */
  readonly key: string;
  readonly polarEven: string | null;
  readonly axialEven: string | null;
  readonly polarOdd: string | null;
  readonly axialOdd: string | null;
}

export const CLASS_ROWS: readonly ClassRow[] = tableRows(readReference('birss/table-4a.md'))
  .slice(1)
  .map((c) => ({
    key: c[1] === 'm3' ? 'm-3' : c[1] === 'm3m' ? 'm-3m' : c[1],
    polarEven: classLetter(c[3]),
    axialEven: classLetter(c[4]),
    polarOdd: classLetter(c[5]),
    axialOdd: classLetter(c[6]),
  }));

/** The symbol class of a class for a tensor of a rank and parity, or null if the tensor vanishes. */
export function symbolClass(row: ClassRow, rank: number, parity: 'polar' | 'axial'): string | null {
  const even = rank % 2 === 0;
  return parity === 'polar' ? (even ? row.polarEven : row.polarOdd) : even ? row.axialEven : row.axialOdd;
}

// --- Tables 4b, 4c, 4d: ranks 0 to 2 ---------------------------------------------------------------

/** Rows of a table keyed by symbol-class letter (row labels `A0`, `B2`, …). */
function rowsByLetter(file: string): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const cells of tableRows(readReference(file))) {
    const m = cells[0].match(/^([A-U])[0-9]$/);
    if (m) out.set(m[1], cells.slice(1));
  }
  return out;
}

export const T4B = rowsByLetter('birss/table-4b.md'); // [x]
export const T4C = rowsByLetter('birss/table-4c.md'); // [x, y, z]
export const T4D = rowsByLetter('birss/table-4d.md'); // [xx, yy, zz, xy, yx, xz(2), yz(2)]

/**
 * Relations of a rank-0 to rank-2 row. A cell `0` vanishes; a cell naming a component (with or
 * without a minus sign) sets the column's component equal to it. Table 4d's `xz(2)` and `yz(2)`
 * columns stand for the pairs {xz, zx} and {yz, zy}, each free or vanishing together (the reading
 * worked out in birss-app: row A2 then has 9 independent components).
 */
export function relationsLowRank(rank: 0 | 1 | 2, letter: string): Relation[] {
  const table = rank === 0 ? T4B : rank === 1 ? T4C : T4D;
  const cells = table.get(letter);
  if (!cells) throw new Error(`Table 4${'bcd'[rank]}: no row ${letter}`);
  const columns = rank === 0 ? [''] : rank === 1 ? ['x', 'y', 'z'] : ['xx', 'yy', 'zz', 'xy', 'yx'];
  const out: Relation[] = [];
  columns.forEach((component, k) => {
    const cell = cells[k];
    if (cell === '0') out.push({ idx: flatIndex(component), terms: [] });
    else if (rank > 0) {
      const sign = cell.startsWith('-') ? -1 : 1;
      const ref = cell.replace(/^-/, '');
      if (ref !== component || sign !== 1)
        out.push({ idx: flatIndex(component), terms: [{ idx: flatIndex(ref), coeff: sign }] });
    } else if (cell !== 'x') throw new Error(`Table 4b: unexpected cell ${cell}`);
  });
  if (rank === 2) {
    const pairs: [string, string, string][] = [
      [cells[5], 'xz', 'zx'],
      [cells[6], 'yz', 'zy'],
    ];
    for (const [cell, a, b] of pairs) {
      if (cell === '0') out.push({ idx: flatIndex(a), terms: [] }, { idx: flatIndex(b), terms: [] });
      else if (cell !== a) throw new Error(`Table 4d: unexpected cell ${cell} in column ${a}(2)`);
    }
  }
  return out;
}

// --- Table 4e: rank 3 ---------------------------------------------------------------------------------

/** Distinct permutations of the letters of `s`, sorted. */
function permutations(s: string): string[] {
  const out = new Set<string>();
  const rec = (cur: string, rest: string) => {
    if (!rest) out.add(cur);
    for (let i = 0; i < rest.length; i++) rec(cur + rest[i], rest.slice(0, i) + rest.slice(i + 1));
  };
  rec('', s);
  return [...out].sort();
}

/** An axis relabelling (bijection of x, y, z) taking `from` to `to`, or null if there is none. */
function relabelling(from: string, to: string): Record<string, string> | null {
  const map: Record<string, string> = {};
  for (let i = 0; i < from.length; i++) {
    if (map[from[i]] && map[from[i]] !== to[i]) return null;
    map[from[i]] = to[i];
  }
  const values = Object.values(map);
  return new Set(values).size === values.length ? map : null;
}

const E_ROWS = tableRows(readReference('birss/table-4e.md'));
const E_HEADER = E_ROWS[0];
export const T4E = new Map(E_ROWS.filter((r) => /^[A-U]3$/.test(r[0])).map((r) => [r[0][0], r] as const));

/**
 * Relations of a Table 4e row. A header `xxy(3)` stands for the distinct permutations of `xxy`. A
 * cell is `0`, the column's own component (free), a single component (every member equals ± it), or
 * a component of a family of the same size related by an axis relabelling (members paired through
 * the relabelling). Any other cell throws.
 */
export function relations4e(letter: string): Relation[] {
  const row = T4E.get(letter);
  if (!row) throw new Error(`Table 4e: no row ${letter}`);
  const columns = E_HEADER.slice(1).map((h) => {
    const m = h.match(/^([a-z]+)(?:\((\d+)\))?$/);
    if (!m) throw new Error(`Table 4e: header ${h}`);
    return { base: m[1], members: m[2] ? permutations(m[1]) : [m[1]] };
  });
  const familyOf = new Map<string, (typeof columns)[number]>();
  for (const col of columns) for (const m of col.members) familyOf.set(m, col);

  const out: Relation[] = [];
  columns.forEach((col, k) => {
    const cell = row[k + 1];
    if (cell === '0') {
      for (const m of col.members) out.push({ idx: flatIndex(m), terms: [] });
      return;
    }
    const sign = cell.startsWith('-') ? -1 : 1;
    const ref = cell.replace(/^-/, '');
    if (ref === col.base && sign === 1) return;
    const refFamily = familyOf.get(ref);
    if (!refFamily) throw new Error(`Table 4e: cell ${cell} names no component`);
    if (refFamily.members.length === 1) {
      for (const m of col.members) out.push({ idx: flatIndex(m), terms: [{ idx: flatIndex(ref), coeff: sign }] });
      return;
    }
    const map = refFamily.members.length === col.members.length ? relabelling(refFamily.base, col.base) : null;
    if (!map) throw new Error(`Table 4e: cell ${cell} in column ${col.base} has no reading`);
    for (const m of refFamily.members) {
      const image = [...m].map((ch) => map[ch]).join('');
      out.push({ idx: flatIndex(image), terms: [{ idx: flatIndex(m), coeff: sign }] });
    }
  });
  return out;
}

// --- Table 4f: rank 4 ---------------------------------------------------------------------------------

function allPermutations(n: number): number[][] {
  if (n === 0) return [[]];
  return allPermutations(n - 1).flatMap((p) =>
    Array.from({ length: n }, (_, i) => [...p.slice(0, i), n - 1, ...p.slice(i)]),
  );
}

const applyPermutation = (s: string, perm: readonly number[]) => perm.map((p) => s[p]).join('');

/**
 * The index-position permutations a Table 4f header annotation stands for (`result[i] =
 * base[perm[i]]`), applied in lockstep to the column's component and to every cell in the column
 * (Birss, text before Table 4f, quoted in references/birss/table-4f.md).
 */
function annotationPermutations(annotation: string | undefined, base: string): number[][] {
  const n = base.length;
  const identity = Array.from({ length: n }, (_, i) => i);
  if (!annotation) return [identity];
  if (/^\d+$/.test(annotation)) return allPermutations(n);
  if (annotation === 'c4') return identity.map((k) => identity.map((i) => (i + k) % n));
  if (/^[a-z][·.]\d+$/.test(annotation)) return allPermutations(n - 1).map((p) => [...p, n - 1]);
  if (/^[a-z]:\d+$/.test(annotation)) return allPermutations(n - 1).map((p) => [0, ...p.map((i) => i + 1)]);
  const ordered = annotation.match(/^([a-z])([a-z]):\d+$/);
  if (ordered) {
    const [, a, b] = ordered;
    return allPermutations(n).filter((p) => {
      const s = applyPermutation(base, p);
      return s.indexOf(a) < s.indexOf(b);
    });
  }
  throw new Error(`Table 4f: annotation (${annotation})`);
}

const F_ROWS = tableRows(readReference('birss/table-4f.md')); // Part I only: tableRows reads the first table
const F_PARTS: string[][][] = (() => {
  const content = readReference('birss/table-4f.md');
  const parts = content.split(/\n## Part /).slice(1);
  return parts.map((p) => tableRows(p));
})();
if (F_PARTS.length !== 2 || F_ROWS[0][0] !== 'Row') throw new Error('Table 4f: expected Part I and Part II');

/** The Table 4f rows of a symbol class: [Part I, Part II]. */
export function rows4f(letter: string): string[][] {
  return F_PARTS.map((rows) => {
    const r = rows.find((x) => x[0] === `${letter}4`);
    if (!r) throw new Error(`Table 4f: no row ${letter}4`);
    return r;
  });
}

/** Number of class rows in each part of Table 4f. */
export const T4F_ROW_COUNTS = F_PARTS.map((rows) => rows.filter((r) => /^[A-U]4$/.test(r[0])).length);

/** Relations of a Table 4f row (both parts); sum cells (`yyxx+xyyx+yxyx`) are direct equalities. */
export function relations4f(letter: string): Relation[] {
  return rows4f(letter).flatMap((row, part) => {
    const header = F_PARTS[part][0];
    const out: Relation[] = [];
    for (let k = 1; k < header.length; k++) {
      const h = header[k].match(/^([a-z]+)(?:\(([^)]+)\))?$/);
      if (!h) throw new Error(`Table 4f: header ${header[k]}`);
      const [, base, annotation] = h;
      const perms = annotationPermutations(annotation, base);
      const cell = row[k];
      if (cell === '0') {
        for (const p of perms) out.push({ idx: flatIndex(applyPermutation(base, p)), terms: [] });
      } else if (cell.includes('+')) {
        if (perms.length !== 1) throw new Error(`Table 4f: sum cell in annotated column ${header[k]}`);
        out.push({ idx: flatIndex(base), terms: cell.split('+').map((t) => ({ idx: flatIndex(t.trim()), coeff: 1 })) });
      } else {
        const sign = cell.startsWith('-') ? -1 : 1;
        const value = cell.replace(/^-/, '');
        if (value === base && sign === 1) continue;
        for (const p of perms) {
          out.push({
            idx: flatIndex(applyPermutation(base, p)),
            terms: [{ idx: flatIndex(applyPermutation(value, p)), coeff: sign }],
          });
        }
      }
    }
    return out;
  });
}

/** The relations as rows r with r·t = 0, over `dim` components. */
export function relationRows(relations: readonly Relation[], dim: number): number[][] {
  return relations.map((r) => {
    const row = new Array<number>(dim).fill(0);
    row[r.idx] += 1;
    for (const t of r.terms) row[t.idx] -= t.coeff;
    return row;
  });
}
