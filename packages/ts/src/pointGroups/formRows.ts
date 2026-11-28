/**
 * The crystal forms of the Wyckoff positions of the crystal classes, computed: for each position its
 * basic form and its limiting forms (ITA 2016 § 3.2.1.2.2, p. 723), the kind of each form from its
 * eigensymmetry and face symmetry, and its first face. The names of the 47 kinds are vocabulary
 * (formTypes.ts); where ITA's order follows no rule, the order is named convention data below
 * (docs/conventions.md, "Crystal forms"). Compared with ITA (6th ed., 2016), Table 3.2.3.2,
 * pp. 745–769, by crystalForms.reference.test.ts.
 */

import { deepFreeze } from '../freeze.js';
import { crystalFamily } from '../lattice.js';
import { dot, inverse, transpose, apply as applyMatrix, type Mat3, type Vec3 } from '../linalg.js';
import { OBVERSE_RHOMBOHEDRAL_BASIS } from '../cellTransformation.js';
import { scale, toNumber } from '../spaceGroups/rational.js';
import {
  classData,
  classSettingData,
  HEXAGONAL_IN_RHOMBOHEDRAL,
  settingBasis,
  settingLatticeOperations,
} from './classData.js';
import { classSettingSymbols } from './classSymbols.js';
import type { PointGroupKey } from './keys.js';
import { keyOfCompleteGroup } from './identify.js';
import { holohedry } from './properties.js';
import { settings } from './pointGroups.js';
import { FORM_TYPE_DATA, FORM_TYPE_KEYS, type CrystalFormTypeKey } from './formTypes.js';
import {
  applyToFace,
  compareRanks,
  computedWyckoffRows,
  echelon,
  faceRank,
  formatFace,
  keyOf,
  nullspace,
  orbit,
  patternSpan,
  pointRank,
  primitive,
  type Mat,
  type Vec,
} from './wyckoffRows.js';

/** [Wyckoff letter, basic (false: a limiting form), kind, Miller indices of the first face, condition]. */
export type FormRow = readonly [string, boolean, CrystalFormTypeKey, string, string?];

/**
 * Convention data: the order of the limiting forms of a position where ITA departs from the rule
 * (`limitingOrder`), as the kinds in printed order, by the short symbol of the setting: in 32 ITA
 * prints the trigonal dipyramid before the rhombohedron.
 */
export const LIMITING_ORDER_EXCEPTIONS: Readonly<Record<string, readonly CrystalFormTypeKey[]>> = deepFreeze({
  '321': ['trigonal-dipyramid', 'rhombohedron'],
  '32': ['trigonal-dipyramid', 'rhombohedron'],
});

/**
 * Convention data: the first faces of limiting forms where ITA prints another face of the orbit
 * than the rule gives (`firstOf`), by the short symbol of the setting; all with rhombohedral axes.
 */
export const FIRST_LIMITING_FACE_EXCEPTIONS: Readonly<Record<string, readonly string[]>> = deepFreeze({
  '32': ['h,k,2k-h'],
  '3m': ['h,k,2k-h', '0,1,-1'],
  '-3m': ['h,k,2k-h'],
});

/** The convention data of the crystal forms, as `formRowsWith` takes them. */
export interface FormConventions {
  readonly limitingOrder: Readonly<Record<string, readonly CrystalFormTypeKey[]>>;
  readonly firstFaces: Readonly<Record<string, readonly string[]>>;
}

const CONVENTIONS: FormConventions = {
  limitingOrder: LIMITING_ORDER_EXCEPTIONS,
  firstFaces: FIRST_LIMITING_FACE_EXCEPTIONS,
};

/**
 * 3P, the rhombohedral basis P in the hexagonal one (`OBVERSE_RHOMBOHEDRAL_BASIS`, columns the
 * obverse a, b, c) times 3, an integer matrix like P⁻¹ (`HEXAGONAL_IN_RHOMBOHEDRAL`).
 */
const RHOMBOHEDRAL_3: Mat = OBVERSE_RHOMBOHEDRAL_BASIS.map((row) => row.map((x) => toNumber(scale(3, x))));

const multiply = (a: Mat, b: Mat): number[][] =>
  a.map((row) => [0, 1, 2].map((j) => row[0] * b[0][j] + row[1] * b[1][j] + row[2] * b[2][j]));

/**
 * The holohedry of the family of a class, as the key and setting whose lattice operations give it:
 * that of the lattice system named as the family (`6/mmm` also for rhombohedral axes), with the
 * unique axis of the class.
 */
function holohedryOf(key: PointGroupKey, setting: number): { key: PointGroupKey; setting: number } {
  const holo = holohedry(crystalFamily(classData(key).crystalSystem));
  const axis = classSettingData(key, setting).uniqueAxis;
  return { key: holo, setting: axis ? settings(holo).findIndex((x) => x.uniqueAxis === axis) + 1 : 1 };
}

/** The eigensymmetry of a set of unit normals: all orthogonal maps that permute them, as Cartesian matrices. */
function eigensymmetry(normals: readonly Vec3[]): Mat3[] {
  const cross = (a: Vec3, b: Vec3): Vec3 => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
  const near = (a: Vec3, b: Vec3): boolean =>
    Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) < 1e-9;
  // Coplanar normals: the normal of their plane, both ways, makes the set span the space.
  let points = [...normals];
  const n0 = normals[0];
  const other = normals.find((n) => Math.hypot(...cross(n0, n)) > 1e-9);
  if (!other) throw new Error('The eigensymmetry of a pedion or pinacoid is not finite');
  const c = cross(n0, other);
  const z: Vec3 = c.map((x) => x / Math.hypot(...c)) as unknown as Vec3;
  const spans = normals.some((n) => Math.abs(dot(n, z)) > 1e-9);
  if (!spans) points = [...points, z, [-z[0], -z[1], -z[2]]];
  const a = points[0];
  const b = points.find((p) => Math.hypot(...cross(a, p)) > 1e-9)!;
  const third = points.find((p) => Math.abs(dot(cross(a, b), p)) > 1e-9)!;
  const basis = [a, b, third];
  const inv = inverse(transpose(basis as unknown as Mat3));
  const out: Mat3[] = [];
  for (const p of points) {
    for (const q of points) {
      if (Math.abs(dot(p, q) - dot(a, b)) > 1e-9) continue;
      for (const r of points) {
        if (Math.abs(dot(p, r) - dot(a, third)) > 1e-9 || Math.abs(dot(q, r) - dot(b, third)) > 1e-9) continue;
        // T maps a, b, third onto p, q, r: T = [p q r]·[a b third]⁻¹.
        const t = multiplyReal(transpose([p, q, r] as unknown as Mat3), inv);
        // T must permute the normals themselves (and, for coplanar ones, keep the normal of their plane up to sign).
        const keeps = normals.every((x) => normals.some((y) => near(applyMatrix(t, x), y)));
        const zKept = spans || points.slice(-2).some((y) => near(applyMatrix(t, z), y));
        if (keeps && zKept && !out.some((m) => sameMatrix(m, t))) {
          out.push(t);
        }
      }
    }
  }
  return out;
}

const multiplyReal = (a: Mat3, b: Mat3): Mat3 =>
  a.map((row) => [0, 1, 2].map((j) => row[0] * b[0][j] + row[1] * b[1][j] + row[2] * b[2][j])) as unknown as Mat3;
const sameMatrix = (a: Mat3, b: Mat3): boolean =>
  a.every((row, i) => row.every((x, j) => Math.abs(x - b[i][j]) < 1e-9));

/**
 * The kind of the form of a face: its number of faces and eigensymmetry, and where these do not
 * decide, the order of the rotation of the eigensymmetry about the normal of the face's mirror
 * (a prism or a dipyramid) and the condition |h| < |l| (the cubic forms on (hhl)).
 */
function formType(normals: readonly Vec3[]): { type: CrystalFormTypeKey; condition?: string } {
  const n = normals.length;
  const near = (a: Vec3, b: Vec3): boolean =>
    Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) < 1e-9;
  const candidates = FORM_TYPE_DATA.filter(([, , faces]) => faces === n);
  if (n === 1) return { type: 'pedion' };
  if (n === 2) {
    const parallel = near(normals[0], normals[1].map((x) => -x) as unknown as Vec3);
    return { type: parallel ? 'pinacoid' : 'sphenoid' };
  }
  const group = eigensymmetry(normals);
  const identified = keyOfCompleteGroup(group.map((m) => ({ cartesian: m, timeReversal: false })));
  if (!identified) throw new Error('An eigensymmetry that is not a crystallographic point group');
  // A printed eigensymmetry is a short symbol of a setting of the class (`-62m` of `-6m2`); only the
  // settings of the class found are read, so that the symbols of no other class are computed.
  const ofClass = settings(identified as PointGroupKey).map((s) => s.symbol);
  const byGroup = candidates.filter(([, , , e]) => ofClass.includes(e));
  if (byGroup.length === 1) return { type: FORM_TYPE_KEYS[byGroup[0][0] - 1] };
  // The order of the rotation about the normal of the mirror that fixes the first face.
  const f = normals[0];
  const det = (m: Mat3): number =>
    m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
    m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
    m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  let axis = 0;
  for (const m of group) {
    if (det(m) > 0 || !near(applyMatrix(m, f), f)) continue;
    const trace = m[0][0] + m[1][1] + m[2][2];
    if (Math.abs(trace - 1) > 1e-9) continue; // a reflection has trace 1
    // Its normal: a column of I − M that is not zero.
    const columns = [0, 1, 2].map((j) => [0, 1, 2].map((i) => (i === j ? 1 : 0) - m[i][j]) as unknown as Vec3);
    const d = columns.find((v) => Math.hypot(...v) > 1e-9)!;
    const u = d.map((x) => x / Math.hypot(...d)) as unknown as Vec3;
    const order = group.filter((r) => det(r) > 0 && near(applyMatrix(r, u), u)).length;
    axis = Math.max(axis, order);
  }
  const byAxis = byGroup.filter(([number]) => {
    const d = FORM_DISTINCTIONS[FORM_TYPE_KEYS[number - 1]];
    return d?.mirrorAxis === undefined || d.mirrorAxis === axis;
  });
  if (byAxis.length === 1) return { type: FORM_TYPE_KEYS[byAxis[0][0] - 1] };
  // The cubic forms on (hhl): two components of the normal are equal; |h| < |l| if the third is larger.
  const abs = f.map(Math.abs).sort((x, y) => x - y);
  const condition = Math.abs(abs[0] - abs[1]) < 1e-9 ? '|h|<|l|' : '|h|>|l|';
  const byCondition = byAxis.filter(
    ([number]) => FORM_DISTINCTIONS[FORM_TYPE_KEYS[number - 1]]?.condition === condition,
  );
  if (byCondition.length !== 1) throw new Error(`No unique kind for a form of ${n} faces`);
  return { type: FORM_TYPE_KEYS[byCondition[0][0] - 1], condition };
}

/**
 * Part of the definition of the names: what tells apart kinds of forms with the same number of faces
 * and eigensymmetry, from their geometry (Table 3.2.1.3 gives the names, not these numbers): the
 * order of the rotation of the eigensymmetry about the normal of the mirror that fixes a face (6, 4
 * or 3 for a prism, whose faces are parallel to the main axis; 4 for the tetrahexahedron), and for
 * the cubic forms on (hhl) the condition on h and l (ITA's "for |h| < |l|").
 */
export const FORM_DISTINCTIONS: Readonly<
  Partial<Record<CrystalFormTypeKey, { readonly mirrorAxis?: number; readonly condition?: string }>>
> = deepFreeze({
  'ditetragonal-prism': { mirrorAxis: 4 },
  'tetragonal-dipyramid': { mirrorAxis: 2 },
  'ditrigonal-prism': { mirrorAxis: 3 },
  'trigonal-dipyramid': { mirrorAxis: 1 },
  'dihexagonal-prism': { mirrorAxis: 6 },
  'hexagonal-dipyramid': { mirrorAxis: 2 },
  tetrahexahedron: { mirrorAxis: 4 },
  'trigon-trioctahedron': { mirrorAxis: 2, condition: '|h|>|l|' },
  'tetragon-trioctahedron': { mirrorAxis: 2, condition: '|h|<|l|' },
  'trigon-tritetrahedron': { condition: '|h|<|l|' },
  'tetragon-tritetrahedron': { condition: '|h|>|l|' },
});

/**
 * The rule for the first face of a cubic form: as `pointRank`, but the latest pivots first
 * (`0,k,l`, `h,h,l`, `0,1,1`).
 */
function cubicRank(vectors: readonly Vec[]): number[] {
  const { rows, pivots } = echelon(vectors);
  const flat = rows.flat();
  return [
    Math.max(...flat.map(Math.abs)),
    flat.filter((x) => x < 0).length,
    flat.filter((x) => x !== 0).length,
    ...pivots.map((p) => -p),
    ...flat.map((x) => -x),
  ];
}

/** A face subspace in the setting's own Miller indices (rhombohedral axes: from the hexagonal ones). */
type Space = readonly Vec[];

const cache = new Map<string, readonly FormRow[]>();

/**
 * The crystal forms of a setting, by Wyckoff position (general position first), basic forms before
 * limiting forms.
 *
 * The rules (basic and limiting forms, kind, order, first face) are stated in docs/conventions.md,
 * "Crystal forms", "How they are computed".
 */
export function computedFormRows(key: PointGroupKey, setting: number): readonly FormRow[] {
  const id = `${key}#${setting}`;
  const cached = cache.get(id);
  if (cached) return cached;
  const result = formRowsWith(key, setting, CONVENTIONS);
  cache.set(id, result);
  return result;
}

/** `computedFormRows` with the given convention data, uncached: the tests check that each entry is needed. */
export function formRowsWith(key: PointGroupKey, setting: number, conventions: FormConventions): readonly FormRow[] {
  const data = classSettingData(key, setting);
  const symbol = classSettingSymbols(key, setting).short;
  const rhombohedral = data.axes === 'rhombohedral';
  const hexagonalFamily = crystalFamily(classData(key).crystalSystem) === 'hexagonal';
  const cubic = crystalFamily(classData(key).crystalSystem) === 'cubic';
  const bravaisMiller = hexagonalFamily && !rhombohedral;
  // Work in the hexagonal basis for rhombohedral axes: W_hex = P·W·P⁻¹, h_hex = h·P⁻¹.
  const own = settingLatticeOperations(key, setting) as unknown as Mat[];
  const ops: Mat[] = rhombohedral
    ? own.map((w) =>
        multiply(multiply(RHOMBOHEDRAL_3, w), HEXAGONAL_IN_RHOMBOHEDRAL).map((row) => row.map((x) => x / 3)),
      )
    : own;
  const toWork = (h: Vec): number[] => (rhombohedral ? applyToFace(HEXAGONAL_IN_RHOMBOHEDRAL, h) : [...h]);
  const toOwn = (h: Vec): number[] => (rhombohedral ? primitive(applyToFace(RHOMBOHEDRAL_3, h)) : [...h]);
  const holo = holohedryOf(key, setting);
  const holohedry = settingLatticeOperations(holo.key, holo.setting) as unknown as Mat[];
  const holohedryRows = computedWyckoffRows(holo.key, holo.setting);
  // The normals in a cell of general lengths, so that no sample face is special by the metric
  // (with c = a a tetragonal (hhl) form would be an octahedron).
  const family = crystalFamily(classData(key).crystalSystem);
  const lengths =
    family === 'cubic'
      ? [1, 1, 1]
      : family === 'tetragonal' || family === 'hexagonal'
        ? [1, 1, 1.5556]
        : [1, 1.2071, 1.5556];
  const basis = settingBasis(holo.key, holo.setting).map((row) => row.map((x, j) => x * lengths[j])) as unknown as Mat3;
  const reciprocal = transpose(inverse(basis));
  const unit = (h: Vec): Vec3 => {
    const v = applyMatrix(reciprocal, h as unknown as Vec3);
    const n = Math.hypot(v[0], v[1], v[2]);
    return [v[0] / n, v[1] / n, v[2] / n];
  };
  const faceStabiliser = (group: readonly Mat[], h: Vec): number =>
    group.filter((w) => applyToFace(w, h).every((x, i) => x === h[i])).length;
  const faceOrbit = (h: Vec): number[][] => {
    const out: number[][] = [];
    for (const w of ops) {
      const im = applyToFace(w, h);
      if (!out.some((x) => x.every((v, i) => v === im[i]))) out.push(im);
    }
    return out;
  };
  /** Faces of a space with small general coefficients, those with the least stabiliser in the holohedry. */
  const generic = (space: Space): number[][] => {
    const coefficients =
      space.length === 1
        ? [[1]]
        : space.length === 2
          ? [
              [1, 3],
              [3, 1],
              [2, 5],
              [5, 2],
            ]
          : [
              [5, 3, 1],
              [1, 3, 5],
              [3, 5, 1],
            ];
    const faces = coefficients.map((c) =>
      primitive([0, 1, 2].map((j) => space.reduce((s, row, r) => s + c[r] * row[j], 0))),
    );
    const least = Math.min(...faces.map((h) => faceStabiliser(holohedry, h)));
    return faces.filter((h) => faceStabiliser(holohedry, h) === least);
  };
  /** The kinds of the forms of a space, one per condition. */
  const kinds = (space: Space): { type: CrystalFormTypeKey; condition?: string }[] => {
    const out: { type: CrystalFormTypeKey; condition?: string }[] = [];
    // Only the cubic forms on (hhl) differ within one space, by the ratio of h and l.
    const samples = cubic && space.length === 2 ? generic(space) : generic(space).slice(0, 1);
    for (const h of samples) {
      const k = formType(faceOrbit(h).map(unit));
      if (!out.some((x) => x.type === k.type)) out.push(k);
    }
    if (out.length > 1 && out.some((x) => x.condition === undefined)) throw new Error('Two kinds without a condition');
    return out.sort((a, b) => (a.condition === '|h|<|l|' ? -1 : b.condition === '|h|<|l|' ? 1 : 0));
  };
  const face = (space: Space): string => {
    const own = echelon(space.map(toOwn)).rows;
    return formatFace(own, bravaisMiller);
  };
  const firstOf = (space: Space, basicSpace: Space): Space => {
    const spaces = orbit(ops, space, applyToFace).map((s) => echelon(s.map(toOwn)).rows);
    const basicKey = keyOf(basicSpace.map(toOwn));
    const inBasic = (s: Space): boolean => keyOf([...basicSpace.map(toOwn), ...s]) === basicKey;
    const integral = (s: Space): boolean => echelon(s).pivots.every((p, r) => echelon(s).rows[r][p] === 1);
    const familyRank = (s: Space): number[] => (hexagonalFamily ? faceRank(s) : cubic ? cubicRank(s) : pointRank(s));
    const rank = (s: Space): number[] => [integral(s) ? 0 : 1, inBasic(s) ? 0 : 1, ...familyRank(s)];
    const listed = spaces.find((s) => faceExceptions.includes(keyOf(s)));
    if (listed) used.add(keyOf(listed));
    const first = listed ?? spaces.sort((a, b) => compareRanks(rank(a), rank(b)))[0];
    return first.map(toWork);
  };
  // The position of a face space in the holohedry: the letter of the row whose face space is in its orbit.
  const holohedryLetter = (space: Space): string => {
    const keys = new Set(orbit(holohedry, space, applyToFace).map((s) => keyOf(s)));
    const row = holohedryRows.find((r) => keys.has(keyOf(patternSpanOfFace(r[4]))));
    if (!row) throw new Error(`No position of the holohedry for ${face(space)}`);
    return row[0];
  };
  const parallelToAxis = (space: Space): boolean => {
    if (cubic) return false;
    // Faces parallel to c (for rhombohedral axes in the hexagonal working basis): l = 0. Only
    // orthorhombic, tetragonal and hexagonal positions have more than one limiting form.
    return space.every((h) => h[2] === 0);
  };
  const faceExceptions = (conventions.firstFaces[symbol] ?? []).map((p) => keyOf(patternSpanOfFace(p)));
  const used = new Set<string>();
  const out: FormRow[] = [];
  for (const [letter, , , , miller] of computedWyckoffRows(key, setting)) {
    const f: Space = echelon(patternSpanOfFace(miller).map(toWork)).rows;
    const site = faceStabiliser(ops, generic(f)[0]);
    const basic = kinds(f);
    for (const k of basic) out.push(row(letter, true, k, miller));
    // Subspaces of F on elements of the holohedry, and their intersections.
    const found = new Map<string, number[][]>();
    const add = (s: number[][]): void => {
      if (s.length === 0 || s.length >= f.length) return;
      const k = keyOf(s);
      if (!found.has(k)) found.set(k, echelon(s).rows);
    };
    for (const w of holohedry) {
      // Faces of F fixed by W: h = Σ c_r f_r with h·W = h.
      const equations = [0, 1, 2].map((j) => f.map((row) => applyToFace(w, row)[j] - row[j]));
      const coefficients = nullspaceN(equations, f.length);
      add(coefficients.map((c) => [0, 1, 2].map((j) => f.reduce((s, row, r) => s + c[r] * row[j], 0))));
    }
    for (let size = -1; size !== found.size;) {
      size = found.size;
      const list = [...found.values()];
      for (const a of list) for (const b of list) add(intersection(a, b));
    }
    const limiting: { space: Space; kind: { type: CrystalFormTypeKey; condition?: string } }[] = [];
    const seen = new Set<string>();
    for (const s of found.values()) {
      if (seen.has(keyOf(s))) continue;
      for (const o of orbit(ops, s, applyToFace)) seen.add(keyOf(o));
      if (faceStabiliser(ops, generic(s)[0]) !== site) continue;
      for (const k of kinds(s)) {
        if (basic.some((b) => b.type === k.type)) continue;
        limiting.push({ space: firstOf(s, f), kind: k });
      }
    }
    // A subspace of another limiting form of the same kind adds no form of its own.
    const contained = (a: Space, b: Space): boolean =>
      a.length < b.length && orbit(ops, b, applyToFace).some((o) => keyOf([...o, ...a]) === keyOf(o));
    for (let i = limiting.length - 1; i >= 0; i--) {
      const l = limiting[i];
      if (limiting.some((m) => m !== l && m.kind.type === l.kind.type && contained(l.space, m.space)))
        limiting.splice(i, 1);
    }
    const order = conventions.limitingOrder[symbol] ?? [];
    const rank = (l: (typeof limiting)[number]): (number | string)[] => [
      -l.space.length,
      parallelToAxis(l.space) ? 0 : 1,
      // letters descending
      -holohedryLetter(l.space).charCodeAt(0),
    ];
    limiting.sort((a, b) => {
      const i = order.indexOf(a.kind.type);
      const j = order.indexOf(b.kind.type);
      if (i >= 0 && j >= 0) return i - j;
      const ra = rank(a);
      const rb = rank(b);
      for (let t = 0; t < ra.length; t++) if (ra[t] !== rb[t]) return (ra[t] as number) - (rb[t] as number);
      return 0;
    });
    for (const l of limiting) out.push(row(letter, false, l.kind, face(l.space)));
  }
  if (used.size !== faceExceptions.length) throw new Error(`A first face listed for ${symbol} is in no form`);
  return deepFreeze(out);
}

const row = (
  letter: string,
  basic: boolean,
  kind: { type: CrystalFormTypeKey; condition?: string },
  miller: string,
): FormRow =>
  kind.condition ? [letter, basic, kind.type, miller, kind.condition] : [letter, basic, kind.type, miller];

/** The face space of printed Miller indices, three components (Bravais–Miller indices without i). */
function patternSpanOfFace(miller: string): number[][] {
  const parts = miller.split(',');
  const three = parts.length === 4 ? [parts[0], parts[1], parts[3]] : parts;
  return patternSpan(three.join(','), 'hkl');
}

/** A basis of the coefficient vectors c (length n) with A·c = 0. */
function nullspaceN(rows: readonly Vec[], n: number): number[][] {
  if (n === 3) return nullspace(rows);
  // Pad to three columns, solve, and drop the padding (a column of zeros stays free).
  const padded = rows.map((r) => [...r, ...Array(3 - n).fill(0)]);
  const extra = Array.from({ length: 3 - n }, (_, i) => [0, 1, 2].map((j) => (j === n + i ? 1 : 0)));
  return nullspace([...padded, ...extra]).map((v) => v.slice(0, n));
}

/** The intersection of two subspaces given by bases. */
function intersection(a: readonly Vec[], b: readonly Vec[]): number[][] {
  // The orthogonal complements (in the integer sense) as equations.
  const ea = nullspace(a);
  const eb = nullspace(b);
  return nullspace([...ea, ...eb]);
}
