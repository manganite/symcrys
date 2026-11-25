/**
 * Voigt's notation against print (fixture class (a)): the relations of ITC Vol. D (2013)
 * § 1.1.4.10 (pp. 24–27) and eq. (1.5.7.4) (p. 134), re-parsed from
 * references/itc/vol-d-1.1.4.10-voigt.md, are evaluated on tensors with the index symmetry of each
 * quantity and compared with `toVoigt` with the factors of that quantity; `fromVoigt` takes the
 * Voigt array back. The printed forms in Voigt's notation (the diagrams of § 1.1.4.10.6 and Table
 * 1.5.7.1) are compared in itcVolD.reference.test.ts and itcMagnetic.reference.test.ts.
 */

import { describe, expect, it } from 'vitest';
import * as magnetic from '../magnetic.js';
import { readReference, section, tableRows } from '../testUtils/references.js';
import type { TensorSpec } from './tensorForm.js';

const FILE = readReference('itc/vol-d-1.1.4.10-voigt.md');

/** The index pair of α = 1…6 (eq. (1.1.4.6)), 0-based. */
const PAIR = [
  [0, 0],
  [1, 1],
  [2, 2],
  [1, 2],
  [2, 0],
  [0, 1],
];

/** A deterministic tensor with the index symmetry of a specification: symmetrized pseudo-random numbers. */
function tensorOf(spec: TensorSpec): number[] {
  const rank = spec.rank;
  const dim = 3 ** rank;
  const raw = Array.from({ length: dim }, (_, n) => Math.sin(1.7 * n + 0.3) + 0.1 * n);
  const digits = (n: number) => Array.from({ length: rank }, (_, k) => Math.floor(n / 3 ** (rank - 1 - k)) % 3);
  const flat = (d: number[]) => d.reduce((s, x) => s * 3 + x, 0);
  return raw.map((_, n) => {
    const d = digits(n);
    const variants: number[][] = [d];
    const swap = (v: number[], a: number) => {
      const w = [...v];
      [w[a], w[a + 1]] = [w[a + 1], w[a]];
      return w;
    };
    if (spec.intrinsic === 'symmetric-last-pair' || spec.intrinsic === 'symmetric-pairs') {
      variants.push(...variants.map((v) => swap(v, rank - 2)));
    }
    if (spec.intrinsic === 'symmetric-first-pair' || spec.intrinsic === 'symmetric-pairs') {
      variants.push(...variants.map((v) => swap(v, 0)));
    }
    return variants.reduce((s, v) => s + raw[flat(v)], 0) / variants.length;
  });
}

/** The quantities of the transcription with the specification and the factors of their pairs. */
const QUANTITIES: Readonly<Record<string, { spec: TensorSpec; factors: (1 | 2)[] }>> = {
  strain: { spec: { rank: 2, kind: 'polar', timeParity: 'even', intrinsic: 'symmetric-last-pair' }, factors: [2] },
  stress: { spec: { rank: 2, kind: 'polar', timeParity: 'even', intrinsic: 'symmetric-last-pair' }, factors: [1] },
  d: { spec: { rank: 3, kind: 'polar', timeParity: 'even', intrinsic: 'symmetric-last-pair' }, factors: [2] },
  e: { spec: { rank: 3, kind: 'polar', timeParity: 'even', intrinsic: 'symmetric-first-pair' }, factors: [1] },
  s: { spec: { rank: 4, kind: 'polar', timeParity: 'even', intrinsic: 'symmetric-pairs' }, factors: [2, 2] },
  c: { spec: { rank: 4, kind: 'polar', timeParity: 'even', intrinsic: 'symmetric-pairs' }, factors: [1, 1] },
  p: { spec: { rank: 4, kind: 'polar', timeParity: 'even', intrinsic: 'symmetric-pairs' }, factors: [1, 1] },
  π: { spec: { rank: 4, kind: 'polar', timeParity: 'even', intrinsic: 'symmetric-pairs' }, factors: [1, 2] },
  Q: { spec: { rank: 4, kind: 'polar', timeParity: 'even', intrinsic: 'symmetric-pairs' }, factors: [2, 2] },
  Λ: { spec: { rank: 3, kind: 'axial', timeParity: 'odd', intrinsic: 'symmetric-last-pair' }, factors: [2] },
};

/** The value of a printed term (`2S23`, `d_ikj`, `s_jilk`, `2Λ_i23`) for an assignment of the index letters. */
function term(text: string, t: readonly number[], assign: Readonly<Record<string, number>>): number {
  const m = /^(\d*)([A-Za-zΛπ])_?([a-z0-9]+)$/.exec(text.trim());
  if (!m) throw new Error(`Unreadable term: ${text}`);
  const indices = [...m[3]].map((c) => (/\d/.test(c) ? Number(c) - 1 : assign[c]));
  return Number(m[1] || 1) * t[indices.reduce((s, x) => s * 3 + x, 0)];
}

/** The value of a printed side: terms joined by +. */
const side = (text: string, t: readonly number[], assign: Readonly<Record<string, number>>): number =>
  text.split('+').reduce((s, x) => s + term(x, t, assign), 0);

const close = (a: number, b: number, what: string) => expect(a, what).toBeCloseTo(b, 12);

describe('ITC Vol. D § 1.1.4.10.2: strain and stress, eq. (1.1.4.6)', () => {
  for (const [quantity, heading] of [
    ['strain', '## Voigt indices'],
    ['stress', '## Voigt indices'],
  ] as const) {
    it(`${quantity}: each printed relation holds for toVoigt with the factor ${QUANTITIES[quantity].factors[0]}`, () => {
      const { spec, factors } = QUANTITIES[quantity];
      const t = tensorOf(spec);
      const v = magnetic.toVoigt(t, spec, { factors }) as readonly number[];
      const rows = tableRows(section(FILE, heading).split('The stress tensor')[quantity === 'strain' ? 0 : 1]).slice(1);
      expect(rows.length).toBeGreaterThanOrEqual(6);
      for (const [, relation] of rows) {
        const [lhs, ...rhs] = relation.split(' = ');
        const alpha = Number(lhs.slice(1)) - 1;
        for (const r of rhs) close(v[alpha], side(r, t, {}), `${quantity}: ${relation}`);
      }
      expect(magnetic.fromVoigt(v, spec, { factors }).every((x, n) => Math.abs(x - t[n]) < 1e-12)).toBe(true);
    });
  }
});

describe('ITC Vol. D § 1.1.4.10.3, § 1.1.4.10.5 and eq. (1.5.7.4): third- and fourth-rank tensors', () => {
  const rows = [
    ...tableRows(section(FILE, '## Third-rank')).slice(1),
    ...tableRows(section(FILE, '## Fourth-rank')).slice(1),
    ...tableRows(section(FILE, '## The piezomagnetic')).slice(1),
  ];

  for (const name of ['d', 'e', 's', 'c', 'p', 'π', 'Q', 'Λ']) {
    it(`${name}: each printed relation holds for toVoigt with the factors ${QUANTITIES[name].factors.join(', ')}`, () => {
      const { spec, factors } = QUANTITIES[name];
      const t = tensorOf(spec);
      const v = magnetic.toVoigt(t, spec, { factors }) as readonly (readonly number[])[];
      let own = rows.filter((r) => r[0].startsWith(`${name} (`)).map((r) => r[1]);
      if (own.length === 1 && own[0] === 'same relation as for the elastic compliances') {
        own = rows.filter((r) => r[0].startsWith('s (')).map((r) => r[1].replace(/s_/g, 'Q_'));
      }
      expect(own.length, name).toBeGreaterThan(0);
      let checked = 0;
      for (const relation of own) {
        if (spec.rank === 3) {
          // Free letters: i (a vector index), and j, k from the pair of α (d, Λ), or k (e).
          for (let i = 0; i < 3; i++) {
            for (let a = 0; a < 6; a++) {
              const [j, k] = PAIR[a];
              const voigt = spec.intrinsic === 'symmetric-first-pair' ? v[a][i] : v[i][a];
              const generic = /\(α = ([\d, ]+)\)$/.exec(relation);
              if (generic) {
                if (
                  !generic[1]
                    .split(', ')
                    .map(Number)
                    .includes(a + 1)
                )
                  continue;
                const [left] = relation.replace(/\s*\(.*$/, '').split(' = ');
                // "d_ijj = d_iα": the left side read with j = k = the pair's index.
                close(voigt, side(left.replace(/\(j ≠ k\)/, ''), t, { i, j, k }), `${name}: ${relation}`);
                checked++;
              } else if (relation === 'e_αk = e_ijk') {
                close(voigt, side('e_ijk', t, { i: j, j: k, k: i }), `${name}: ${relation}`);
                checked++;
              } else {
                const m = /^Λ_i(\d) = (.*)$/.exec(relation) ?? /^Λ_ij = (Λ_ijj) for j = 1, 2, 3$/.exec(relation);
                if (!m) throw new Error(`Unread relation: ${relation}`);
                if (m[1].startsWith('Λ')) {
                  if (a < 3) close(voigt, side('Λ_ijj', t, { i, j: a }), `${name}: ${relation}`);
                } else if (Number(m[1]) === a + 1) close(voigt, side(m[2], t, { i }), `${name}: ${relation}`);
                checked++;
              }
            }
          }
        } else {
          // "i = j; k ≠ l; s_αβ = …", or "c_αβ = c_ijkl" for every α, β.
          const parts = relation.split(';').map((x) => x.trim());
          const conditions = parts.slice(0, -1);
          const [, ...rhs] = parts[parts.length - 1].split(' = ');
          for (let a = 0; a < 6; a++) {
            for (let b = 0; b < 6; b++) {
              const [i, j] = PAIR[a];
              const [k, l] = PAIR[b];
              const holds = conditions.every((c) => {
                const x = /^([ik]) ([=≠]) ([jl])$/.exec(c)!;
                const same = x[1] === 'i' ? i === j : k === l;
                return x[2] === '=' ? same : !same;
              });
              if (!holds) continue;
              for (const r of rhs)
                close(v[a][b], side(r, t, { i, j, k, l }), `${name}: ${relation} at ${a + 1}${b + 1}`);
              checked++;
            }
          }
        }
      }
      expect(checked, name).toBeGreaterThan(0);
      const back = magnetic.fromVoigt(v, spec, { factors });
      back.forEach((x, n) => close(x, t[n], `${name}: fromVoigt`));
    });
  }
});
