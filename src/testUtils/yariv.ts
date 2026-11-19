/**
 * Yariv's Table 16.1 (references/yariv/table-16.1.md) and the 3×6 grid of a rank-3 tensor
 * symmetric in its last two indices (test-only code).
 */

import { readReference, tableRows, expectHeader } from './references.js';

/** One printed mark: row i (1–3), column μ (1–6), heavy dot (`f`) or open circle (`o`). */
export interface Mark {
  readonly i: number;
  readonly mu: number;
  readonly filled: boolean;
}

export interface YarivPanel {
  readonly id: string;
  readonly panel: string;
  readonly groups: readonly string[];
  readonly printedCount: number;
  /** Groups of linked marks; a group of one heavy dot is an independent modulus. */
  readonly links: readonly (readonly Mark[])[];
  readonly evidence: string;
}

const rows = tableRows(readReference('yariv/table-16.1.md'));
expectHeader(rows, ['Id', 'Panel', 'Groups', 'Count', 'Links', 'Evidence', 'Note']);

export const YARIV_PANELS: readonly YarivPanel[] = rows.slice(1).map((r) => ({
  id: r[0],
  panel: r[1],
  groups: r[2].split(',').map((g) => g.trim()),
  printedCount: Number(r[3]),
  links:
    r[4] === '—'
      ? []
      : r[4].split(';').map((g) =>
          g
            .trim()
            .split(/\s+/)
            .map((m) => {
              const x = m.match(/^([1-3])([1-6])([fo])$/);
              if (!x) throw new Error(`Yariv: mark ${m} in ${r[0]}`);
              return { i: Number(x[1]), mu: Number(x[2]), filled: x[3] === 'f' };
            }),
        ),
  evidence: r[5],
}));

/** The jk pair of Voigt column μ = 1…6: xx, yy, zz, yz, zx, xy. */
const VOIGT: readonly [number, number][] = [
  [0, 0],
  [1, 1],
  [2, 2],
  [1, 2],
  [2, 0],
  [0, 1],
];

/** Flat index of d_i(jk) for grid cell (i, μ), 1-based. */
export const cellIndex = (i: number, mu: number): number => {
  const [j, k] = VOIGT[mu - 1];
  return (i - 1) * 9 + j * 3 + k;
};

export const cellName = (i: number, mu: number) => `d${i}${mu}`;

/** A partition of grid cells into classes, each cell with its sign relative to the class's first cell in reading order. */
export interface Scheme {
  /** Classes as sorted cell names, the classes sorted. */
  readonly partition: string;
  /** Sign of each nonzero cell relative to the first cell of its class (reading order: row, then column). */
  readonly signs: ReadonlyMap<string, number>;
}

/** The printed scheme of a panel. */
export function printedScheme(p: YarivPanel): Scheme {
  const signs = new Map<string, number>();
  const classes = p.links.map((g) => {
    const ordered = [...g].sort((a, b) => a.i - b.i || a.mu - b.mu);
    const ref = ordered[0].filled ? 1 : -1;
    for (const m of ordered) signs.set(cellName(m.i, m.mu), (m.filled ? 1 : -1) / ref);
    return ordered.map((m) => cellName(m.i, m.mu));
  });
  return { partition: partitionString(classes), signs };
}

function partitionString(classes: string[][]): string {
  return classes
    .map((c) => [...c].sort().join(','))
    .sort()
    .join(' | ');
}

/**
 * The scheme of a basis (rows of length 27, symmetric in jk): cells whose columns over the basis are
 * proportional form a class; the sign is the ratio to the first cell of the class, which must be ±1
 * for a scheme drawn with dots and circles.
 */
export function basisScheme(basis: readonly (readonly number[])[]): Scheme {
  const column = (c: number) => basis.map((row) => row[c]);
  const classes: { cells: string[]; ref: number[] }[] = [];
  const signs = new Map<string, number>();
  for (let i = 1; i <= 3; i++) {
    for (let mu = 1; mu <= 6; mu++) {
      const v = column(cellIndex(i, mu));
      if (v.every((x) => Math.abs(x) < 1e-9)) continue;
      let placed = false;
      for (const cls of classes) {
        const k = cls.ref.findIndex((x) => Math.abs(x) > 1e-9);
        const ratio = v[k] / cls.ref[k];
        if (v.every((x, n) => Math.abs(x - ratio * cls.ref[n]) < 1e-9)) {
          cls.cells.push(cellName(i, mu));
          signs.set(cellName(i, mu), ratio);
          placed = true;
          break;
        }
      }
      if (!placed) {
        classes.push({ cells: [cellName(i, mu)], ref: v });
        signs.set(cellName(i, mu), 1);
      }
    }
  }
  return { partition: partitionString(classes.map((c) => c.cells)), signs };
}

/** The nonzero cells of a scheme, sorted. */
export const cellsOf = (s: Scheme): string[] => [...s.signs.keys()].sort();
