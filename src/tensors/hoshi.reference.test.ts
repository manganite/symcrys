/**
 * The rank-4 form with both pairs symmetric (`'ij_kl'`, electric-quadrupole SHG) against Hoshi et
 * al. (1995), Eqs. (11)–(12) (fixture class (a)), re-parsed from references/hoshi/eqs-11-12.md.
 *
 * Hoshi gives the form for the limit groups D∞h and C∞v. At rank 4 a sixfold axis already makes the
 * plane perpendicular to it isotropic, so the forms of 6/mmm and 6mm equal those of the limit groups
 * exactly (the argument is set out in birss-app's fixture, from which this test is moved). Hoshi
 * also imposes tracelessness, Q_ii = 0, which is not a symmetry and not part of `'ij_kl'`. So:
 *
 * 1. the relations of Eq. (11) and the in-plane closure L1111 = L1122 + 2·L1212 of Eq. (12), which
 *    follow from symmetry alone, hold for every tensor of the form;
 * 2. the form has 6 independent components, and with the nine trace conditions added it is exactly
 *    Hoshi's 4-parameter form, the lines of Eq. (12) with a factor −2 included.
 */

import { describe, expect, it } from 'vitest';
import { expectHeader, readReference, tableRows } from '../testUtils/references.js';
import { matrixRank, satisfies } from '../testUtils/rank.js';
import { tensorForm, type TensorSpec } from './tensorForm.js';

const DIM = 81;
const EQ: TensorSpec = { rank: 4, parity: 'polar', timeParity: 'i', intrinsic: 'ij_kl' };

const idx = (s: string): number => {
  if (!/^[xyz]{4}$/.test(s)) throw new Error(`Hoshi: component ${s}`);
  return [...s].reduce((a, ch) => a * 3 + 'xyz'.indexOf(ch), 0);
};

const rows = tableRows(readReference('hoshi/eqs-11-12.md'));
expectHeader(rows, ['Component', 'L1122', 'L1212', 'L1133', 'L1313', 'Eq.']);
const PRINTED = rows.slice(1).map((r) => ({ component: r[0], coeffs: r.slice(1, 5).map(Number), eq: Number(r[5]) }));

/** Hoshi's form: one vector per free parameter; unlisted components are zero. */
const hoshiSpace = [0, 1, 2, 3].map((p) => {
  const v = new Array<number>(DIM).fill(0);
  for (const r of PRINTED) v[idx(r.component)] = r.coeffs[p];
  return v;
});

/** Printed line as a row r with r·t = 0: t_component − Σ coeff·L = 0, the L written as their components. */
const PARAMETER_COMPONENT = ['xxyy', 'xyxy', 'xxzz', 'xzxz'];
const lineRow = (r: (typeof PRINTED)[number]) => {
  const row = new Array<number>(DIM).fill(0);
  row[idx(r.component)] += 1;
  r.coeffs.forEach((c, p) => (row[idx(PARAMETER_COMPONENT[p])] -= c));
  return row;
};

/** Lines of Eq. (12) that follow from symmetry alone: the in-plane closure for xxxx and yyyy. */
const SYMMETRY_LINES = PRINTED.filter((r) => r.eq === 11 || r.component === 'xxxx' || r.component === 'yyyy');
const TRACE_LINES = PRINTED.filter((r) => !SYMMETRY_LINES.includes(r));

/** The nine trace conditions Σ_i Λ_iikl = 0. */
const TRACE = [0, 1, 2].flatMap((k) =>
  [0, 1, 2].map((l) => {
    const row = new Array<number>(DIM).fill(0);
    for (let i = 0; i < 3; i++) row[i * 27 + i * 9 + k * 3 + l] = 1;
    return row;
  }),
);

/** Basis of the vectors of span(basis) that satisfy every row. */
function restrict(basis: readonly (readonly number[])[], conditions: number[][]): number[][] {
  // Coordinates c with Σ_m c_m (row·basis_m) = 0 for every row: the null space of an n-column matrix.
  const n = basis.length;
  const m = conditions.map((r) => basis.map((b) => r.reduce((s, a, i) => s + a * b[i], 0)));
  const pivots: number[] = [];
  let row = 0;
  for (let c = 0; c < n && row < m.length; c++) {
    let p = row;
    for (let r = row + 1; r < m.length; r++) if (Math.abs(m[r][c]) > Math.abs(m[p][c])) p = r;
    if (Math.abs(m[p][c]) < 1e-9) continue;
    [m[row], m[p]] = [m[p], m[row]];
    const pv = m[row][c];
    for (let j = 0; j < n; j++) m[row][j] /= pv;
    for (let r = 0; r < m.length; r++)
      if (r !== row) {
        const f = m[r][c];
        for (let j = 0; j < n; j++) m[r][j] -= f * m[row][j];
      }
    pivots.push(c);
    row++;
  }
  return [...Array(n).keys()]
    .filter((f) => !pivots.includes(f))
    .map((f) => {
      const coord = new Array<number>(n).fill(0);
      coord[f] = 1;
      pivots.forEach((p, r) => (coord[p] = -m[r][f]));
      return Array.from({ length: DIM }, (_, i) => coord.reduce((s, c, k) => s + c * basis[k][i], 0));
    });
}

const sameSpace = (a: readonly (readonly number[])[], b: readonly (readonly number[])[]) =>
  matrixRank(a, DIM) === matrixRank(b, DIM) && matrixRank([...a, ...b], DIM) === matrixRank(a, DIM);

describe('Hoshi et al. (1995), Eqs. (11)–(12)', () => {
  it('the transcription has 21 lines in 4 free parameters', () => {
    expect(PRINTED).toHaveLength(21);
    expect(matrixRank(hoshiSpace, DIM)).toBe(4);
    expect(TRACE_LINES.map((r) => r.component).sort()).toEqual(['zzxx', 'zzyy', 'zzzz']);
  });

  for (const key of ['6/mmm', '6mm'] as const) {
    describe(key, () => {
      const basis = tensorForm(key, EQ).basis;

      it('6 independent components; the symmetry lines of Eqs. (11) and (12) hold', () => {
        expect(basis).toHaveLength(6);
        for (const r of SYMMETRY_LINES) expect(satisfies(basis, [lineRow(r)]), `${r.component}`).toBe(true);
      });

      it('with tracelessness added, the form is exactly Hoshi’s, the −2 lines included', () => {
        const traceless = restrict(basis, TRACE);
        expect(traceless).toHaveLength(4);
        expect(sameSpace(traceless, hoshiSpace)).toBe(true);
        for (const r of TRACE_LINES) expect(satisfies(traceless, [lineRow(r)]), r.component).toBe(true);
        for (const r of TRACE_LINES)
          expect(satisfies(basis, [lineRow(r)]), `${r.component} needs Q_ii = 0`).toBe(false);
      });
    });
  }

  it('6/mmm and 6mm have the same form, in both conventions', () => {
    const forms = (['itc', 'birss'] as const).flatMap((convention) =>
      (['6/mmm', '6mm'] as const).map((k) => tensorForm(k, EQ, { convention }).basis),
    );
    for (const f of forms) expect(f).toEqual(forms[0]);
  });
});
