/**
 * Crystal forms against print (fixture class (a)): ITA (6th ed.) Table 3.2.3.2, pp. 745–769 (the
 * face forms of each Wyckoff position), and Table 3.2.1.3, pp. 724–726 (the 47 forms with their
 * numbers of faces, eigensymmetries and generating point groups), re-parsed from
 * references/itc/vol-a-table-3.2.3.2-face-forms.md and vol-a-table-3.2.1.3-crystal-forms.md.
 *
 * Checks independent of the library: (1) the two tables against each other: every form of
 * Table 3.2.3.2, with the face symmetry of its Wyckoff position, is listed in Table 3.2.1.3 for its
 * class, in bold for a basic form and in normal type for a limiting one, and conversely; (2) the
 * faces of each printed form, computed here from the printed general position
 * (vol-a-table-3.2.3.2-general-positions.md), are as many as the form has and lie in the Wyckoff
 * position of the row; (3) the eigensymmetry of each form with finite eigensymmetry, computed here
 * as the group of all orthogonal maps that permute its face normals (the symmetry of the form as a
 * polyhedron; monoclinic and triclinic with a, b, c along x, y, z), is the printed one, and a
 * limiting form has a higher eigensymmetry than the basic form of its position; (4) a prism, and
 * only a prism, has its face normals in one plane, and a name that gives the polygon of the faces
 * (trigon-, tetragon-, pentagon-) matches the polyhedron the faces bound: this tells apart forms
 * with the same number of faces and eigensymmetry; (5) each form occurs once per position, except
 * the limiting forms marked † in Table 3.2.1.3. The
 * library's data file must equal the transcriptions, and its crystal forms must agree with them.
 */

import { describe, expect, it } from 'vitest';
import { close, inverse, mul, sameM, type M, type RefOp } from '../testUtils/independentGroups.js';
import { expectHeader, readReference, section, tableRows } from '../testUtils/references.js';
import { crystalForms } from './crystalForms.js';
import { ITA_FORMS, ITA_FORM_TYPES } from './crystalFormsData.js';
import { POINT_GROUP_KEYS, settings, type PointGroupKey } from './pointGroups.js';

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

const apply = (m: M, v: number[]): number[] => m.map((r) => r[0] * v[0] + r[1] * v[1] + r[2] * v[2]);
const unit = (v: number[]): number[] => {
  const n = Math.hypot(v[0], v[1], v[2]);
  return v.map((x) => x / n);
};
const transpose = (m: M): M => [0, 1, 2].map((i) => [0, 1, 2].map((j) => m[j][i]));
const det = (m: M): number =>
  m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
  m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
  m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
const sameV = (a: readonly number[], b: readonly number[]): boolean =>
  [0, 1, 2].every((i) => Math.abs(a[i] - b[i]) < 1e-9);

// --- The transcriptions ---------------------------------------------------------------------------

const formsFile = readReference('itc/vol-a-table-3.2.1.3-crystal-forms.md');
const typeRows = tableRows(section(formsFile, '## Forms'));
expectHeader(typeRows, ['No.', 'Crystal form', 'Faces', 'Eigensymmetry']);
const generatingRows = tableRows(section(formsFile, '## Generating point groups'));
expectHeader(generatingRows, ['No.', 'Class', 'Axes', 'Face symmetry', 'Type', 'Note']);
const faceRows = tableRows(readReference('itc/vol-a-table-3.2.3.2-face-forms.md'));
expectHeader(faceRows, ['Short', 'Axes', 'Page', 'Letter', 'Form', 'Name', 'Miller indices', 'Condition']);
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
const generalRows = tableRows(readReference('itc/vol-a-table-3.2.3.2-general-positions.md'));
expectHeader(generalRows, ['Short', 'Axes', 'Page', 'Multiplicity', 'General position']);
const headlineRows = tableRows(readReference('itc/vol-a-table-3.2.3.2-headlines.md'));
expectHeader(headlineRows, ['System', 'Short', 'Full', 'Schoenflies', 'Axes', 'Page']);

/**
 * Names of Table 3.2.3.2 that differ from the name of the same form in Table 3.2.1.3: the print
 * names the dihedron after the group that generates it, and adds a third name in 432.
 */
const NAME_VARIANTS: Record<string, number> = {
  'Sphenoid or dihedron': 3,
  'Dome or dihedron': 3,
  'Pentagon-trioctahedron or gyroid or pentagon-icositetrahedron': 44,
};
const numberOfName = (name: string): number => {
  const row = typeRows.slice(1).find((r) => r[1] === name);
  const n = row ? Number(row[0]) : NAME_VARIANTS[name];
  if (!n) throw new Error(`Unknown form name: ${name}`);
  return n;
};

/**
 * Corrections of two misprints of Table 3.2.1.3 (references/itc/vol-a-table-3.2.1.3-crystal-forms.md,
 * "Errata"): No. 14 `.m` for `..m`; No. 31 `6/m(1)` in normal type for bold.
 */
function corrected(row: string[]): string[] {
  const [no, cls, axes, sym, type, note] = row;
  if (no === '14' && cls === '4/mmm' && sym === '.m, .m.') return [no, cls, axes, '..m, .m.', type, note];
  if (no === '31' && cls === '6/m' && sym === '1') return [no, cls, axes, sym, 'basic', note];
  return row;
}

/** One coordinate (`-x+y`, `2x`) as the coefficients of x, y, z. */
function coefficients(expr: string): number[] {
  const row = [0, 0, 0];
  const terms = expr.match(/[+-]?\d*[xyz]/g) ?? [];
  if (terms.join('').replace(/^\+/, '') !== expr) throw new Error(`Unreadable coordinate: ${expr}`);
  for (const t of terms) {
    const m = /^([+-]?)(\d*)([xyz])$/.exec(t);
    if (!m) throw new Error(`Unreadable term: ${t}`);
    row['xyz'.indexOf(m[3])] += (m[1] === '-' ? -1 : 1) * (m[2] === '' ? 1 : Number(m[2]));
  }
  return row;
}

/** Printed Miller indices with the given h, k, l (four indices for hexagonal axes, i = −(h + k)). */
function hklOf(miller: string, value: Record<string, number>): number[] {
  const parts = miller.split(',').map((c) => {
    const m = /^(-?)(\d*)([hkil]?)$/.exec(c);
    if (!m || (m[2] === '' && m[3] === '')) throw new Error(`Unreadable index: ${c}`);
    const v = m[3] === 'i' ? -(value.h + value.k) : m[3] ? value[m[3]] : 1;
    return (m[1] ? -1 : 1) * (m[2] === '' ? 1 : Number(m[2])) * v;
  });
  if (parts.length === 4) {
    expect(parts[2] + parts[0] + parts[1], `i = -(h+k) in ${miller}`).toBe(0);
    return [parts[0], parts[1], parts[3]];
  }
  return parts;
}

/** h, k, l of the representative: 3, 2, 1, or 1, 2, 3 where the printed condition is |h| < |l|. */
const valuesFor = (condition: string): Record<string, number> =>
  condition === 'abs(h)<abs(l)' ? { h: 1, k: 2, l: 3 } : { h: 3, k: 2, l: 1 };

const faceNormal = (basis: M, hkl: number[]): number[] => unit(apply(transpose(inverse(basis)), hkl));

interface Entry {
  short: string;
  axes: string;
  family: string;
  page: number;
  group: RefOp[];
  basis: M;
  /** Rows of the face forms. */
  forms: string[][];
  /** Rows of the Wyckoff positions. */
  positions: string[][];
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
    forms: faceRows.slice(1).filter((r) => r[0] === g[0] && r[1] === g[1]),
    positions: wyckoffRows.slice(1).filter((r) => r[0] === g[0] && r[1] === g[1]),
  };
});
const entryOf = (short: string): Entry => {
  const e = ENTRIES.find((x) => x.short === short);
  if (!e) throw new Error(`No entry ${short}`);
  return e;
};

/** The printed entry for an eigensymmetry symbol of Table 3.2.1.3 (trigonal: the hexagonal axes). */
const EIGEN_ENTRY: Record<string, string> = { '32': '321', '3m': '3m1', '-3m': '-3m1' };

/**
 * The type of a crystallographic point group: how many operations it has of each kind (determinant
 * and trace). This distinguishes the 32 classes.
 */
const signature = (ops: M[]): string =>
  ops
    .map((m) => `${Math.round(det(m))}:${Math.round(m[0][0] + m[1][1] + m[2][2])}`)
    .sort()
    .join(' ');

const cross = (a: number[], b: number[]): number[] => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const dot = (a: number[], b: number[]): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/**
 * All orthogonal maps that permute a finite set of unit vectors spanning two or three dimensions:
 * for three independent vectors of the set (two and their cross product if the set is planar), each
 * choice of images in the set with the same scalar products fixes one linear map, which is kept if
 * it permutes the set.
 */
function symmetryOfSet(vs: number[][]): M[] {
  const v1 = vs[0];
  const v2 = vs.find((v) => Math.hypot(...cross(v1, v)) > 1e-6);
  if (!v2) throw new Error('A set along one line has infinite symmetry');
  const v3 = vs.find((v) => Math.abs(dot(cross(v1, v2), v)) > 1e-6);
  const planar = v3 === undefined;
  const third = (a: number[], b: number[]): number[] => unit(cross(a, b));
  const source = [v1, v2, planar ? third(v1, v2) : v3];
  const sourceInv = inverse(transpose(source));
  const out: M[] = [];
  for (const w1 of vs) {
    for (const w2 of vs) {
      if (Math.abs(dot(w1, w2) - dot(v1, v2)) > 1e-9) continue;
      const candidates = planar ? [third(w1, w2), third(w1, w2).map((x) => -x)] : vs;
      for (const w3 of candidates) {
        if (
          !planar &&
          (Math.abs(dot(w1, w3) - dot(v1, source[2])) > 1e-9 || Math.abs(dot(w2, w3) - dot(v2, source[2])) > 1e-9)
        )
          continue;
        const a = mul(transpose([w1, w2, w3]), sourceInv);
        const orthogonal = sameM(mul(a, transpose(a)), ORTHONORMAL);
        if (orthogonal && vs.every((v) => vs.some((w) => sameV(apply(a, v), w)))) out.push(a);
      }
    }
  }
  return out;
}

/** True if the vectors are all perpendicular to one direction (the normals of an open form, a prism). */
const isPlanar = (vs: number[][]): boolean => {
  const v2 = vs.find((v) => Math.hypot(...cross(vs[0], v)) > 1e-6);
  if (!v2) return true;
  const axis = cross(vs[0], v2);
  return vs.every((v) => Math.abs(dot(axis, v)) < 1e-9);
};

/**
 * The number of vertices of each face of the closed polyhedron with the given unit face normals,
 * all faces at distance 1 from the centre: the points where three face planes meet and that lie
 * inside all others.
 */
function verticesPerFace(vs: number[][]): number[] {
  return vs.map((a, i) => {
    const corners: number[][] = [];
    for (let j = 0; j < vs.length; j++) {
      for (let k = j + 1; k < vs.length; k++) {
        if (j === i || k === i) continue;
        const m = [a, vs[j], vs[k]];
        if (Math.abs(det(m)) < 1e-9) continue;
        const x = apply(inverse(m), [1, 1, 1]);
        if (vs.every((n) => dot(n, x) <= 1 + 1e-9) && !corners.some((y) => sameV(x, y))) corners.push(x);
      }
    }
    return corners.length;
  });
}

/** The polygon a name of Table 3.2.1.3 gives the faces of its form: trigon-, tetragon-, pentagon-. */
const POLYGON: Record<string, number> = { Trigon: 3, Tetragon: 4, Pentagon: 5 };

const orbit = (group: RefOp[], n: number[]): number[][] => {
  const out: number[][] = [];
  for (const g of group) {
    const v = apply(g.m, n);
    if (!out.some((w) => sameV(v, w))) out.push(v);
  }
  return out;
};
const stabilizerOf = (group: RefOp[], v: number[]): RefOp[] => group.filter((g) => sameV(apply(g.m, v), v));
const conjugate = (group: RefOp[], a: RefOp[], b: RefOp[]): boolean =>
  group.some((g) => {
    const gi = inverse(g.m);
    const image = a.map((s) => mul(mul(g.m, s.m), gi));
    return image.length === b.length && image.every((m) => b.some((y) => sameM(m, y.m)));
  });

/** The order of the eigensymmetry of form n (Infinity for ∞m, ∞/mm). */
const eigenOrder = (n: number): number => {
  const e = typeRows[n][3];
  return e.startsWith('∞') ? Infinity : entryOf(EIGEN_ENTRY[e] ?? e).group.length;
};

// --- Tests -----------------------------------------------------------------------------------------

describe('ITA Table 3.2.1.3: the 47 crystal forms', () => {
  it('the library data equal the transcription', () => {
    expect(ITA_FORM_TYPES.map((r) => r.map(String))).toEqual(typeRows.slice(1));
  });

  it('has the forms 1 to 47 in order, each with its eigensymmetry among the printed entries', () => {
    expect(typeRows.slice(1).map((r) => Number(r[0]))).toEqual(Array.from({ length: 47 }, (_, i) => i + 1));
    for (const r of typeRows.slice(1)) {
      if (!r[3].startsWith('∞')) expect(() => entryOf(EIGEN_ENTRY[r[3]] ?? r[3]), r[3]).not.toThrow();
    }
  });
});

describe('ITA Table 3.2.3.2: face forms', () => {
  it('the library data equal the transcription, row by row (names as numbers of Table 3.2.1.3)', () => {
    const fromData = ITA_FORMS.flatMap((e) =>
      e.rows.map((r) => [
        e.symbol,
        e.uniqueAxis ?? '',
        String(e.page),
        r[0],
        r[1] ? 'basic' : 'limiting',
        String(r[2]),
        r[3],
        (r[4] ?? '').replace(/\|(\w)\|/g, 'abs($1)'),
      ]),
    );
    const fromPrint = faceRows
      .slice(1)
      .map(([short, axes, page, letter, form, name, miller, condition]) => [
        short,
        /^unique axis (b|c)$/.exec(axes)?.[1] ?? '',
        page,
        letter,
        form,
        String(numberOfName(name)),
        miller,
        condition,
      ]);
    expect(fromData).toEqual(fromPrint);
  });

  it('has forms for each of the 40 printed entries, on the page and with the letters of its Wyckoff positions', () => {
    expect(ENTRIES).toHaveLength(40);
    for (const e of ENTRIES) {
      const label = `${e.short} ${e.axes}`;
      for (const r of e.forms) expect(Number(r[2]), label).toBe(e.page);
      const letters = e.positions.map((r) => r[4]).filter((l) => l !== 'o');
      expect([...new Set(e.forms.map((r) => r[3]))], label).toEqual(letters);
      // Each position starts with a basic form; limiting forms follow it.
      for (const l of letters) expect(e.forms.find((r) => r[3] === l)?.[4], `${label} ${l}`).toBe('basic');
    }
  });

  it('agrees with the generating point groups of Table 3.2.1.3 (both ways, with the errata applied)', () => {
    /** Entries of Table 3.2.3.2 a class symbol of Table 3.2.1.3 stands for. */
    const entriesFor = (cls: string): Entry[] => {
      const exact = ENTRIES.filter((e) => e.short === cls);
      if (exact.length) return exact;
      const key = POINT_GROUP_KEYS.find((k) => k === cls);
      if (!key) throw new Error(`Unknown class ${cls}`);
      const symbols = settings(key, 'itc').map((s) => s.symbol);
      return ENTRIES.filter((e) => symbols.includes(e.short));
    };
    const dotless = (s: string): string => s.replace(/\./g, '');
    const printed = generatingRows
      .slice(1)
      .map(corrected)
      .filter((r) => r[2] !== 'rhombohedral')
      .flatMap(([no, cls, , syms, type]) =>
        entriesFor(cls).flatMap((e) =>
          syms.split(', ').map((s) => ({ key: `${e.short} ${e.axes}`, no, sym: s, type })),
        ),
      );
    const fromForms = ENTRIES.flatMap((e) =>
      e.forms.map((r) => {
        const site = e.positions.find((p) => p[4] === r[3])?.[5] ?? '?';
        return { key: `${e.short} ${e.axes}`, no: String(numberOfName(r[5])), site, type: r[4] };
      }),
    );
    const matches = (p: (typeof printed)[number], f: (typeof fromForms)[number]): boolean =>
      p.key === f.key &&
      p.no === f.no &&
      p.type === f.type &&
      (p.sym.includes('.') ? p.sym === f.site : p.sym === dotless(f.site));
    for (const f of fromForms) {
      expect(
        printed.some((p) => matches(p, f)),
        `Table 3.2.1.3 lists ${f.key}: form ${f.no}, ${f.type}, face symmetry ${f.site}`,
      ).toBe(true);
    }
    for (const p of printed) {
      expect(
        fromForms.some((f) => matches(p, f)),
        `Table 3.2.3.2 has ${p.key}: form ${p.no}, ${p.type}, face symmetry ${p.sym}`,
      ).toBe(true);
    }
  });

  it('has each form once per position, except the limiting forms marked † in Table 3.2.1.3', () => {
    // Footnote † (p. 726): these limiting forms occur in three or two non-equivalent orientations;
    // three rhombic prisms in 222 (p. 726, example (2)), two dipyramids in 422 and 622 (p. 727).
    const daggers = generatingRows.slice(1).filter((r) => r[5] === '†');
    expect(daggers.map((r) => `${r[0]} ${r[1]}`)).toEqual(['6 222', '14 422', '31 622']);
    for (const e of ENTRIES) {
      const counts = new Map<string, number>();
      for (const r of e.forms) {
        const k = `${r[3]} ${numberOfName(r[5])} ${r[4]}`;
        counts.set(k, (counts.get(k) ?? 0) + 1);
      }
      for (const [k, count] of counts) {
        const [, no, type] = k.split(' ');
        const dagger = daggers.some((r) => r[0] === no && r[1] === e.short && r[4] === type);
        expect(count, `${e.short} ${e.axes}: ${k}`).toBe(dagger ? (e.short === '222' ? 3 : 2) : 1);
      }
    }
  });

  for (const e of ENTRIES) {
    const label = `${e.short}${e.axes ? ` (${e.axes})` : ''}, p. ${e.page}`;
    for (const r of e.forms) {
      const [, , , letter, form, name, miller, condition] = r;
      const n = numberOfName(name);
      const faces = Number(typeRows[n][2]);
      it(`${label}, ${letter}: ${name} (${miller}${condition ? `, ${condition}` : ''})`, () => {
        const values = valuesFor(condition);
        if (condition) {
          const [h, , l] = [values.h, values.k, values.l].map(Math.abs);
          expect(condition === 'abs(h)<abs(l)' ? h < l : h > l, 'the representative meets the condition').toBe(true);
        }
        const normal = faceNormal(e.basis, hklOf(miller, values));
        const faceSet = orbit(e.group, normal);
        expect(faceSet.length, 'faces of the form').toBe(faces);
        // The face lies in the Wyckoff position of the row: its site symmetry is conjugate to that
        // of the position's printed face.
        const position = e.positions.find((p) => p[4] === letter);
        if (!position) throw new Error(`No position ${letter}`);
        expect(Number(position[3])).toBe(faces);
        const siteOfPosition = stabilizerOf(e.group, faceNormal(e.basis, hklOf(position[7], { h: 3, k: 2, l: 1 })));
        expect(conjugate(e.group, stabilizerOf(e.group, normal), siteOfPosition), 'same Wyckoff position').toBe(true);
        // Open or closed: the face normals of a prism (and of a form of one or two faces) lie in one
        // plane, those of every other form do not. This tells apart forms with the same number of
        // faces and the same eigensymmetry (tetragonal dipyramid and ditetragonal prism, ...).
        const typeName = typeRows[n][1];
        if (faces > 1) expect(isPlanar(faceSet), `open form: ${typeName}`).toBe(faces <= 2 || /prism/.test(typeName));
        // The polygon of the faces where the name gives it (trigon-tritetrahedron: triangles,
        // tetragon-tritetrahedron: quadrilaterals, ...): tells apart the two cubic forms on (hhl).
        const polygon = POLYGON[/^(Trigon|Tetragon|Pentagon)-/.exec(typeName)?.[1] ?? ''];
        if (polygon) expect(new Set(verticesPerFace(faceSet)), `faces of ${typeName}`).toEqual(new Set([polygon]));
        // Eigensymmetry: the symmetry of the faces as a polyhedron.
        const eigen = typeRows[n][3];
        if (!eigen.startsWith('∞')) {
          const own = symmetryOfSet(faceSet);
          const expected = entryOf(EIGEN_ENTRY[eigen] ?? eigen).group;
          expect(signature(own), `eigensymmetry ${eigen}`).toBe(signature(expected.map((g) => g.m)));
          expect(close(own.map((m) => ({ m, t: false }))).length).toBe(own.length);
        }
        if (form === 'limiting') {
          const basic = e.forms.find((x) => x[3] === letter && x[4] === 'basic');
          if (!basic) throw new Error('No basic form');
          expect(eigenOrder(n), 'higher eigensymmetry than the basic form').toBeGreaterThan(
            eigenOrder(numberOfName(basic[5])),
          );
        }
      });
    }

    it(`${label}: the library gives the printed forms`, () => {
      const axis = /^unique axis (b|c)$/.exec(e.axes)?.[1];
      const found = POINT_GROUP_KEYS.flatMap((key: PointGroupKey) =>
        settings(key, 'itc')
          .filter((s) => s.symbol === e.short && (axis === undefined || s.uniqueAxis === axis))
          .map((s) => ({ key, index: s.index })),
      );
      expect(found).toHaveLength(1);
      const lib = crystalForms(found[0].key, { setting: found[0].index });
      expect(lib.map((f) => [f.letter, f.basic ? 'basic' : 'limiting', f.formType, f.millerIndices])).toEqual(
        e.forms.map((r) => [r[3], r[4], numberOfName(r[5]), r[6]]),
      );
      lib.forEach((f, i) => {
        const r = e.forms[i];
        const position = e.positions.find((p) => p[4] === r[3]);
        expect([f.multiplicity, f.siteSymmetry]).toEqual([Number(position?.[3]), position?.[5]]);
        expect(f.condition ?? '').toBe(r[7].replace(/abs\((\w)\)/g, '|$1|'));
        expect(sameV(f.representative.cartesian, faceNormal(e.basis, hklOf(r[6], valuesFor(r[7]))))).toBe(true);
      });
    });
  }
});
