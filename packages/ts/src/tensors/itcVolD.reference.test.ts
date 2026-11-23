/**
 * Tensor forms in the ITC convention against ITC Vol. D, Chapter 1.1 (fixture class (a)),
 * re-parsed from references/itc/:
 *
 * - § 1.1.4.10.7: the full forms (cells, links, signs) of axial tensors of rank 2, general and
 *   symmetric, in the frame ITC draws them: in the ITC default setting, and for the monoclinic
 *   classes also with the axis parallel to Ox3 (unique axis c, setting 2);
 * - § 1.1.4.10.6: fourth-rank tensors with both index pairs symmetric (`'ij_kl'`: p, π, Q) and with
 *   the pairs also interchangeable (`'voigt'`: c, s): the numbers of independent components, and
 *   the full forms (cells, links, signs and factors of the 6 × 6 matrices) of the 29 diagrams for
 *   crystal classes, in the ITC default setting. The diagram of the spherical system, for which
 *   the library has no group, is compared with the two isotropic tensors written out by hand.
 */

import { describe, expect, it } from 'vitest';
import { isPointGroupKey, settings, symbol, type PointGroupKey } from '../pointGroups/pointGroups.js';
import { expectHeader, readReference, tableRows } from '../testUtils/references.js';
import { linkScheme, schemeOf, type Scheme } from '../testUtils/yariv.js';
import { rotateTensor, tensorForm, type TensorSpec } from './tensorForm.js';

/** Abbreviations of § 1.1.4.10.6 and § 1.1.4.10.7 (see the transcriptions), and D3h printed as -62m. */
const ABBREVIATION: Record<string, string> = {
  '42': '422',
  '62': '622',
  '4m': '4mm',
  '6m': '6mm',
  '4/mm': '4/mmm',
  '6/mm': '6/mmm',
  '-62m': '-6m2',
  '2mm': 'mm2',
};

function keyOf(printed: string, misprint: Record<string, string> = {}): PointGroupKey {
  const key = misprint[printed] ?? ABBREVIATION[printed] ?? printed;
  if (!isPointGroupKey(key)) throw new Error(`ITC Vol. D: not a class: ${printed}`);
  return key;
}

const itcDefault = (key: PointGroupKey) => settings(key).find((s) => s.isDefault)!.index;

// --- § 1.1.4.10.7: axial tensors of rank 2 ---------------------------------------------------------

const AXIAL = tableRows(readReference('itc/vol-d-1.1.4.10.7-axial-rank-2.md'));
expectHeader(AXIAL, ['Section', 'Groups (as printed)', 'Frame', 'Links']);

const PANELS = AXIAL.slice(1).map((r) => ({
  section: r[0],
  symmetric: r[0].startsWith('1.1.4.10.7.2'),
  groups: r[1].split(',').map((g) => keyOf(g.trim())),
  frame: r[2],
  links:
    r[3] === '—'
      ? []
      : r[3].split(';').map((g) =>
          g
            .trim()
            .split(/\s+/)
            .map((m) => {
              const x = m.match(/^([1-3])([1-3])([fo])$/);
              if (!x) throw new Error(`ITC Vol. D 1.1.4.10.7: mark ${m}`);
              return { name: `${x[1]}${x[2]}`, filled: x[3] === 'f' };
            }),
        ),
}));

/** The setting the panel is drawn in: ITC default, or the monoclinic setting with the axis on Ox3 / Ox2. */
function settingOf(key: PointGroupKey, frame: string): number {
  if (!frame) return itcDefault(key);
  const axis = frame === 'parallel to Ox3' ? 'c' : frame === 'parallel to Ox2' ? 'b' : null;
  const s = settings(key).find((x) => x.uniqueAxis === axis);
  if (!s) throw new Error(`${key}: no setting for frame ${frame}`);
  return s.index;
}

const GRID = [1, 2, 3].flatMap((i) => [1, 2, 3].map((j) => ({ i, j, name: `${i}${j}`, index: (i - 1) * 3 + (j - 1) })));

describe('ITC Vol. D § 1.1.4.10.7: axial tensors of rank 2', () => {
  it('the transcription covers the 32 classes in both parts, except those the section leaves out', () => {
    const covered = (sym: boolean) => new Set(PANELS.filter((p) => p.symmetric === sym).flatMap((p) => p.groups));
    expect(covered(false).size).toBe(30); // without -6 and 6/m
    expect(covered(true).size).toBe(30); // without 6/m and 6mm
  });

  for (const p of PANELS) {
    const spec: TensorSpec = { rank: 2, parity: 'axial', timeParity: 'i', intrinsic: p.symmetric ? 'ij' : 'none' };
    const title = `${p.section} ${p.groups.join(', ')}${p.frame ? ` (${p.frame})` : ''}`;
    it(`${title}: cells, links and signs`, () => {
      for (const key of p.groups) {
        const setting = settingOf(key, p.frame);
        const basis = tensorForm(key, spec, { setting }).basis;
        expect(basis, `${key} setting ${setting}: independent components`).toHaveLength(p.links.length);
        const cells = p.symmetric ? GRID.filter((c) => c.i <= c.j) : GRID;
        const got = schemeOf(basis, cells);
        const want = linkScheme(p.links);
        expect(got.partition, `${key} setting ${setting}`).toBe(want.partition);
        for (const [cell, sign] of want.signs)
          expect(got.signs.get(cell), `${key}: sign of ${cell}`).toBeCloseTo(sign, 9);
      }
    });
  }

  it('the monoclinic panels drawn parallel to Ox2 are the ITC default setting (unique axis b)', () => {
    for (const key of ['2', 'm'] as const) expect(settingOf(key, 'parallel to Ox2')).toBe(itcDefault(key));
  });
});

// --- § 1.1.4.10.6: counts of fourth-rank tensors -----------------------------------------------------

const COUNTS = tableRows(readReference('itc/vol-d-table-1.1.4.10.6-rank-4-counts.md'));
expectHeader(COUNTS, ['Section', 'Groups (as printed)', 'Count p', 'Count c', 'Note']);

/** § 1.1.4.10.6.7 (i) prints "3m" in the cubic system; the class meant is m-3 (see the transcription). */
const CUBIC_MISPRINT = { '3m': 'm-3' };

const ROWS4 = COUNTS.slice(1)
  .filter((r) => r[1] !== 'all tensors (spherical system)')
  .map((r) => ({
    section: r[0],
    groups: r[1].split(',').map((g) => keyOf(g.trim(), r[0].startsWith('1.1.4.10.6.7') ? CUBIC_MISPRINT : {})),
    p: Number(r[2]),
    c: Number(r[3]),
  }));

describe('ITC Vol. D § 1.1.4.10.6: fourth-rank tensors, numbers of independent components', () => {
  it('the rows cover the 32 classes once each', () => {
    const all = ROWS4.flatMap((r) => r.groups);
    expect(all).toHaveLength(32);
    expect(new Set(all).size).toBe(32);
  });

  it.each(ROWS4.map((r) => [`${r.section} ${r.groups.join(', ')}`, r] as const))('%s', (_t, r) => {
    for (const key of r.groups) {
      const n = (intrinsic: 'ij_kl' | 'voigt') =>
        tensorForm(key, { rank: 4, parity: 'polar', timeParity: 'i', intrinsic }).basis.length;
      expect(n('ij_kl'), `${key}: p, π, Q`).toBe(r.p);
      expect(n('voigt'), `${key}: c, s`).toBe(r.c);
    }
  });
});

// --- § 1.1.4.10.6: forms of fourth-rank tensors ------------------------------------------------------

const FORMS = tableRows(readReference('itc/vol-d-1.1.4.10.6-rank-4-forms.md'));
expectHeader(FORMS, ['Section', 'Groups (as printed)', 'Tensors', 'Count', 'Links', 'Cross', 'Note']);

type Tensor4 = 'p' | 'π' | 'Q' | 'c' | 's';

/** The factor of a printed mark relative to the heavy dot it is linked to (key on p. 28). */
const MARK: Record<string, number> = { f: 1, o: -1, d: 2, m: -2 };

/** ⊗ = k·(t11 − t12), with k as printed for each tensor (key on p. 28). */
const CROSS_FACTOR: Record<Tensor4, number> = { p: 1 / 2, π: 1, Q: 2, c: 1 / 2, s: 2 };

const DIAGRAMS = FORMS.slice(1).map((r) => ({
  section: r[0],
  printedGroups: r[1],
  spherical: r[0] === '1.1.4.10.6.8',
  tensors: r[2].split(',').map((t) => t.trim() as Tensor4),
  count: Number(r[3]),
  links: r[4].split(';').map((g) =>
    g
      .trim()
      .split(/\s+/)
      .map((m) => {
        const x = m.match(/^([1-6][1-6])([fodm])$/);
        if (!x) throw new Error(`ITC Vol. D 1.1.4.10.6: mark ${m}`);
        return { name: x[1], factor: MARK[x[2]] };
      }),
  ),
  cross: r[5] ? r[5].split(/\s+/) : [],
}));

/** The index pair of α = 1…6 (Voigt's notation, § 1.1.4.10.2, p. 24): 11, 22, 33, 23, 31, 12. */
const PAIR: readonly (readonly [number, number])[] = [
  [0, 0],
  [1, 1],
  [2, 2],
  [1, 2],
  [2, 0],
  [0, 1],
];

/** The factor between the matrix element t_αβ and the tensor component t_ijkl (p. 27). */
function matrixFactor(tensor: Tensor4, alpha: number, beta: number): number {
  if (tensor === 'p' || tensor === 'c') return 1;
  if (tensor === 'π') return beta > 3 ? 2 : 1;
  return (alpha > 3 ? 2 : 1) * (beta > 3 ? 2 : 1); // s and Q, eq. (1.1.4.12)
}

/** The basis of a form as rows over the matrix elements `αβ` of the tensor. */
function matrixRows(basis: readonly (readonly number[])[], tensor: Tensor4): Map<string, number[]> {
  const out = new Map<string, number[]>();
  for (let a = 1; a <= 6; a++) {
    for (let b = 1; b <= 6; b++) {
      const [i, j] = PAIR[a - 1];
      const [k, l] = PAIR[b - 1];
      const flat = ((i * 3 + j) * 3 + k) * 3 + l;
      out.set(
        `${a}${b}`,
        basis.map((row) => matrixFactor(tensor, a, b) * row[flat]),
      );
    }
  }
  return out;
}

/** The printed scheme: classes of linked cells, each cell with its factor relative to the first cell by name. */
function printedScheme4(links: (typeof DIAGRAMS)[number]['links']): Scheme {
  const plain = linkScheme(links.map((g) => g.map((m) => ({ name: m.name, filled: true }))));
  const signs = new Map<string, number>();
  for (const g of links) {
    const first = [...g].sort((x, y) => (x.name < y.name ? -1 : 1))[0];
    for (const m of g) signs.set(m.name, m.factor / first.factor);
  }
  return { partition: plain.partition, signs };
}

describe('ITC Vol. D § 1.1.4.10.6: fourth-rank tensors, forms of the matrices', () => {
  it('30 diagrams; the link groups of each are as many as its printed count, which is that of the table of counts', () => {
    expect(DIAGRAMS).toHaveLength(30);
    for (const d of DIAGRAMS) {
      expect(d.links, `${d.section} ${d.tensors.join(', ')}`).toHaveLength(d.count);
      const row = COUNTS.slice(1).find((r) => r[0] === d.section)!;
      expect(row[1], d.section).toBe(d.printedGroups);
      for (const t of d.tensors) expect(d.count, `${d.section} ${t}`).toBe(Number(row[t === 'c' || t === 's' ? 3 : 2]));
    }
  });

  it('every section draws each of the five tensors once; a cell is marked at most once in a diagram', () => {
    for (const section of new Set(DIAGRAMS.map((d) => d.section))) {
      const tensors = DIAGRAMS.filter((d) => d.section === section).flatMap((d) => d.tensors);
      expect([...tensors].sort(), section).toEqual(['Q', 'c', 'p', 's', 'π']);
    }
    for (const d of DIAGRAMS) {
      const cells = [...d.links.flatMap((g) => g.map((m) => m.name)), ...d.cross];
      expect(new Set(cells).size, `${d.section} ${d.tensors.join(', ')}`).toBe(cells.length);
      // A linked group has at least one heavy dot, to which the other marks refer.
      for (const g of d.links) expect(g.some((m) => m.factor === 1)).toBe(true);
    }
  });

  /** Compares a basis (rows of 81 components) with a diagram for one of its tensors. */
  function expectDiagram(
    d: (typeof DIAGRAMS)[number],
    tensor: Tensor4,
    basis: readonly (readonly number[])[],
    what: string,
  ) {
    expect(basis, `${what}: independent components`).toHaveLength(d.count);
    const rows = matrixRows(basis, tensor);
    // ⊗ = k (t11 − t12), in every basis tensor.
    for (const cell of d.cross) {
      const x = rows.get(cell)!;
      const t11 = rows.get('11')!;
      const t12 = rows.get('12')!;
      x.forEach((v, n) => expect(v, `${what}: ⊗ at ${cell}`).toBeCloseTo(CROSS_FACTOR[tensor] * (t11[n] - t12[n]), 9));
      expect(
        x.some((v) => Math.abs(v) > 1e-9),
        `${what}: ⊗ at ${cell} is not zero`,
      ).toBe(true);
    }
    // c and s are drawn as the upper triangle; so is the one diagram for all five tensors (cubic (ii),
    // spherical), where the matrix of p, π and Q is read as symmetric (see the transcription).
    const upperOnly = d.tensors.includes('c') || d.tensors.includes('s');
    if (upperOnly && tensor !== 'c' && tensor !== 's') {
      for (const [name, row] of rows) {
        const mirrored = rows.get(`${name[1]}${name[0]}`)!;
        row.forEach((v, n) => expect(v, `${what}: ${name} = ${name[1]}${name[0]}`).toBeCloseTo(mirrored[n], 9));
      }
    }
    // All other cells: the marked ones are nonzero and linked as printed, the others vanish.
    const cells = [...rows.keys()]
      .filter((name) => !d.cross.includes(name) && (!upperOnly || name[0] <= name[1]))
      .map((name) => ({ name, row: rows.get(name)! }));
    const got = schemeOf(
      basis.map((_b, n) => cells.map((c) => c.row[n])),
      cells.map((c, index) => ({ name: c.name, index })),
    );
    const want = printedScheme4(d.links);
    expect(got.partition, what).toBe(want.partition);
    for (const [cell, factor] of want.signs)
      expect(got.signs.get(cell), `${what}: factor of ${cell}`).toBeCloseTo(factor, 9);
  }

  for (const d of DIAGRAMS.filter((x) => !x.spherical)) {
    const groups = d.printedGroups
      .split(',')
      .map((g) => keyOf(g.trim(), d.section.startsWith('1.1.4.10.6.7') ? CUBIC_MISPRINT : {}));
    for (const tensor of d.tensors) {
      it(`${d.section} ${groups.join(', ')}: ${tensor}`, () => {
        const intrinsic = tensor === 'c' || tensor === 's' ? 'voigt' : 'ij_kl';
        for (const key of groups) {
          const basis = tensorForm(key, { rank: 4, parity: 'polar', timeParity: 'i', intrinsic }).basis;
          expectDiagram(d, tensor, basis, key);
        }
      });
    }
  }

  it('1.1.4.10.6.8 spherical system: the two isotropic tensors, written out by hand', () => {
    // λ δ_ij δ_kl and μ (δ_ik δ_jl + δ_il δ_jk): the isotropic fourth-rank tensors with both index
    // pairs symmetric (an independent derivation, fixture class (b); the library has no such group).
    const delta = (i: number, j: number) => (i === j ? 1 : 0);
    const build = (f: (i: number, j: number, k: number, l: number) => number) =>
      Array.from({ length: 81 }, (_x, n) => f(Math.floor(n / 27), Math.floor(n / 9) % 3, Math.floor(n / 3) % 3, n % 3));
    const isotropic = [
      build((i, j, k, l) => delta(i, j) * delta(k, l)),
      build((i, j, k, l) => delta(i, k) * delta(j, l) + delta(i, l) * delta(j, k)),
    ];
    // They are isotropic: unchanged by a rotation about an axis in no special direction.
    const [x, y, z, angle] = [1 / 3, 2 / 3, 2 / 3, 0.7];
    const [c, s, t] = [Math.cos(angle), Math.sin(angle), 1 - Math.cos(angle)];
    const rotation = [
      [t * x * x + c, t * x * y - s * z, t * x * z + s * y],
      [t * x * y + s * z, t * y * y + c, t * y * z - s * x],
      [t * x * z - s * y, t * y * z + s * x, t * z * z + c],
    ] as const;
    const spec = { rank: 4, parity: 'polar', timeParity: 'i', intrinsic: 'ij_kl' } as const;
    for (const tensor of isotropic) {
      rotateTensor(tensor, rotation, spec).forEach((v, n) => expect(v).toBeCloseTo(tensor[n], 9));
    }
    const d = DIAGRAMS.find((x) => x.spherical)!;
    expect(d.tensors).toHaveLength(5);
    for (const tensor of d.tensors) expectDiagram(d, tensor, isotropic, `spherical ${tensor}`);
  });

  it('32, 3m, -3m are drawn with the twofold axis along Ox1 and the mirror normal to it (p. 25): the ITC default setting', () => {
    expect((['32', '3m', '-3m'] as const).map((key) => symbol(key))).toEqual(['321', '3m1', '-3m1']);
  });

  it('the monoclinic diagrams ("twofold axis parallel to Ox2") are the ITC default setting', () => {
    for (const key of ['2', 'm', '2/m'] as const) expect(settings(key).find((s) => s.isDefault)!.uniqueAxis).toBe('b');
  });
});
