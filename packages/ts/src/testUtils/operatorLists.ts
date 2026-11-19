/**
 * Reading the printed lists of symmetry operators of ITC Vol. D Table 1.5.2.3 and Birss Table 6
 * (test-only code), and naming the operations of a point group the same way, so that the two can be
 * compared as multisets of labels.
 *
 * A label is the kind of operation (`1`, `-1`, `2`, `3`, `4`, `6`, `-3`, `-4`, `-6`, `m`), a prime
 * for time reversal, and the axis as far as the print names it: `_x`, `_y`, `_z`, `_xy`, `_-xy` in
 * the triclinic to tetragonal systems; `_z` or `_⊥` (perpendicular to the principal axis) in the
 * trigonal and hexagonal systems; nothing in the cubic system. Both senses of a rotation have the
 * same label (the print writes `±`).
 */

/** What the labels need of a described operation (`describeOperations`). */
export interface LabelledOperation {
  readonly kind: 'identity' | 'inversion' | 'rotation' | 'rotoinversion' | 'mirror';
  readonly order: number;
  readonly axis?: { readonly cartesian: readonly [number, number, number] };
  readonly timeReversal: boolean;
}

const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;

function axisLabel(system: string, v: readonly [number, number, number]): string {
  if (system === 'cubic') return '';
  const [x, y, z] = v;
  if (near(x, 0) && near(y, 0)) return '_z';
  if (system === 'trigonal' || system === 'hexagonal') {
    if (!near(z, 0)) throw new Error(`axis ${v.join(',')} is neither z nor perpendicular to it`);
    return '_⊥';
  }
  if (near(y, 0) && near(z, 0)) return '_x';
  if (near(x, 0) && near(z, 0)) return '_y';
  if (near(z, 0) && near(x, y)) return '_xy';
  if (near(z, 0) && near(x, -y)) return '_-xy';
  throw new Error(`axis ${v.join(',')} has no printed name`);
}

/** The label of one described operation in a group of the given crystal system. */
export function operationLabel(system: string, d: LabelledOperation): string {
  const prime = d.timeReversal ? "'" : '';
  if (d.kind === 'identity') return `1${prime}`;
  if (d.kind === 'inversion') return `-1${prime}`;
  const base = d.kind === 'mirror' ? 'm' : d.kind === 'rotoinversion' ? `-${d.order}` : `${d.order}`;
  return `${base}${prime}${axisLabel(system, d.axis!.cartesian)}`;
}

/**
 * The labels of a printed operator list such as `1, 2_z, ±-4'_z, 3(2'_⊥), 4(±3)`: one label per
 * operation. `±op` stands for two operations, `n(op)` for n times the operations of `op`. Birss
 * writes a mirror as `-2`; it is read as `m`. A subscript `⊥` may be written `_⊥` or `⊥`.
 */
export function printedLabels(list: string): string[] {
  return list.split(',').flatMap((raw) => {
    let term = raw.trim();
    let count = 1;
    const grouped = /^(\d)\((.+)\)$/.exec(term);
    if (grouped) {
      count = Number(grouped[1]);
      term = grouped[2];
    }
    if (term.startsWith('±')) {
      count *= 2;
      term = term.slice(1);
    }
    const m = /^(-?[1-6]|m)('?)(?:_?(x|y|z|xy|-xy|⊥))?$/.exec(term);
    if (!m) throw new Error(`Unreadable operator: ${raw.trim()}`);
    const base = m[1] === '-2' ? 'm' : m[1];
    const label = `${base}${m[2]}${m[3] ? `_${m[3]}` : ''}`;
    return Array.from({ length: count }, () => label);
  });
}
