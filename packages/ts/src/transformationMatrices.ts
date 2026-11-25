/**
 * ITA Table 1.5.1.1 as data (#120; Thomas, 2026-11-25): the selected transformation matrices P and
 * Q = P⁻¹ of ITA (6th ed., 2016), pp. 77–80, one record per printed row, in printed order, as a
 * list without keys of symcrys' own. Transcribed in references/itc/vol-a-2016-table-1.5.1.1.md and
 * compared with it by transformationMatrices.reference.test.ts. A record's `linearPart` is the P
 * of `changeOfCoordinates`.
 */

import { deepFreeze } from './freeze.js';
import type { Mat3 } from './linalg.js';

/** A row of ITA Table 1.5.1.1. */
export interface TransformationMatrix {
  /**
   * The printed statements of the row, in order: one for most rows (`'F → P (Fig. 1.5.1.4)'`), several
   * where print states several transformations with the same P (the changes of cell choice of a
   * monoclinic cell, `'Cell choice 1 → cell choice 2: P → P, C → A'`, …, `'Unique axis b invariant
   * (Fig. 1.5.1.2a)'`). An overbar is written as a leading minus sign (`'(b, a, -c) → (a, b, c)'`).
   */
  readonly statements: readonly string[];
  /** P: the columns are the new basis vectors in the old basis, (a′, b′, c′) = (a, b, c)·P. */
  readonly linearPart: Mat3;
  /** Q = P⁻¹, for the transformation against the arrow ("replace P by Q and vice versa"). */
  readonly inverseLinearPart: Mat3;
  /** The column "Crystal system" as printed, its lines joined by a comma and a space. */
  readonly crystalSystem: string;
  /** The printed page of ITA (6th ed., 2016). */
  readonly page: number;
}

type Row = readonly [statements: readonly string[], p: string, q: string, system: string, page: number];

// The rows as printed: matrices by rows, rows separated by ';', a fraction as n/d.
const ROWS: readonly Row[] = [
  [
    [
      'Cell choice 1 → cell choice 2: P → P, C → A',
      'Cell choice 2 → cell choice 3: P → P, A → I',
      'Cell choice 3 → cell choice 1: P → P, I → C',
      'Unique axis b invariant (Fig. 1.5.1.2a)',
    ],
    '-1 0 1; 0 1 0; -1 0 0',
    '0 0 -1; 0 1 0; 1 0 -1',
    'Monoclinic (cf. Sections 1.5.4.3 and 2.1.3.15)',
    77,
  ],
  [
    [
      'Cell choice 1 → cell choice 2: P → P, A → B',
      'Cell choice 2 → cell choice 3: P → P, B → I',
      'Cell choice 3 → cell choice 1: P → P, I → A',
      'Unique axis c invariant (Fig. 1.5.1.2b)',
    ],
    '0 -1 0; 1 -1 0; 0 0 1',
    '-1 1 0; -1 0 0; 0 0 1',
    'Monoclinic (cf. Sections 1.5.4.3 and 2.1.3.15)',
    77,
  ],
  [
    [
      'Cell choice 1 → cell choice 2: P → P, B → C',
      'Cell choice 2 → cell choice 3: P → P, C → I',
      'Cell choice 3 → cell choice 1: P → P, I → B',
      'Unique axis a invariant (Fig. 1.5.1.2c)',
    ],
    '1 0 0; 0 0 -1; 0 1 -1',
    '1 0 0; 0 -1 1; 0 -1 0',
    'Monoclinic (cf. Sections 1.5.4.3 and 2.1.3.15)',
    77,
  ],
  [
    [
      'Unique axis b → unique axis c',
      'Cell choice 1: P → P, C → A',
      'Cell choice 2: P → P, A → B',
      'Cell choice 3: P → P, I → I',
      'Cell choice invariant',
    ],
    '0 1 0; 0 0 1; 1 0 0',
    '0 0 1; 1 0 0; 0 1 0',
    'Monoclinic (cf. Sections 1.5.4.3 and 2.1.3.15)',
    77,
  ],
  [
    [
      'Unique axis b → unique axis a',
      'Cell choice 1: P → P, C → B',
      'Cell choice 2: P → P, A → C',
      'Cell choice 3: P → P, I → I',
      'Cell choice invariant',
    ],
    '0 0 1; 1 0 0; 0 1 0',
    '0 1 0; 0 0 1; 1 0 0',
    'Monoclinic (cf. Sections 1.5.4.3 and 2.1.3.15)',
    77,
  ],
  [
    [
      'Unique axis c → unique axis a',
      'Cell choice 1: P → P, A → B',
      'Cell choice 2: P → P, B → C',
      'Cell choice 3: P → P, I → I',
      'Cell choice invariant',
    ],
    '0 1 0; 0 0 1; 1 0 0',
    '0 0 1; 1 0 0; 0 1 0',
    'Monoclinic (cf. Sections 1.5.4.3 and 2.1.3.15)',
    77,
  ],
  [
    ['I → P (Fig. 1.5.1.3)'],
    '-1/2 1/2 1/2; 1/2 -1/2 1/2; 1/2 1/2 -1/2',
    '0 1 1; 1 0 1; 1 1 0',
    'Orthorhombic, Tetragonal, Cubic',
    77,
  ],
  [
    ['F → P (Fig. 1.5.1.4)'],
    '0 1/2 1/2; 1/2 0 1/2; 1/2 1/2 0',
    '-1 1 1; 1 -1 1; 1 1 -1',
    'Orthorhombic, Tetragonal, Cubic',
    77,
  ],
  [
    ['(b, a, -c) → (a, b, c)'],
    '0 1 0; 1 0 0; 0 0 -1',
    '0 1 0; 1 0 0; 0 0 -1',
    'Unconventional orthorhombic setting',
    78,
  ],
  [['(c, a, b) → (a, b, c)'], '0 0 1; 1 0 0; 0 1 0', '0 1 0; 0 0 1; 1 0 0', 'Unconventional orthorhombic setting', 78],
  [
    ['(-c, b, a) → (a, b, c)'],
    '0 0 -1; 0 1 0; 1 0 0',
    '0 0 1; 0 1 0; -1 0 0',
    'Unconventional orthorhombic setting',
    78,
  ],
  [['(b, c, a) → (a, b, c)'], '0 1 0; 0 0 1; 1 0 0', '0 0 1; 1 0 0; 0 1 0', 'Unconventional orthorhombic setting', 78],
  [
    ['(a, -c, b) → (a, b, c)'],
    '1 0 0; 0 0 -1; 0 1 0',
    '1 0 0; 0 0 1; 0 -1 0',
    'Unconventional orthorhombic setting',
    78,
  ],
  [
    ['P → C₁', 'I → F₁ (Fig. 1.5.1.5), c axis invariant'],
    '1 1 0; -1 1 0; 0 0 1',
    '1/2 -1/2 0; 1/2 1/2 0; 0 0 1',
    'Tetragonal (cf. Section 1.5.4.3)',
    78,
  ],
  [
    ['P → C₂', 'I → F₂ (Fig. 1.5.1.5), c axis invariant'],
    '1 -1 0; 1 1 0; 0 0 1',
    '1/2 1/2 0; -1/2 1/2 0; 0 0 1',
    'Tetragonal (cf. Section 1.5.4.3)',
    78,
  ],
  [
    ['Primitive rhombohedral cell → triple hexagonal cell R₁, obverse setting (Fig. 1.5.1.6a,c)'],
    '1 0 1; -1 1 1; 0 -1 1',
    '2/3 -1/3 -1/3; 1/3 1/3 -2/3; 1/3 1/3 1/3',
    'Rhombohedral space groups (cf. Section 1.5.4.3)',
    78,
  ],
  [
    ['Primitive rhombohedral cell → triple hexagonal cell R₂, obverse setting (Fig. 1.5.1.6c)'],
    '0 -1 1; 1 0 1; -1 1 1',
    '-1/3 2/3 -1/3; -2/3 1/3 1/3; 1/3 1/3 1/3',
    'Rhombohedral space groups (cf. Section 1.5.4.3)',
    78,
  ],
  [
    ['Primitive rhombohedral cell → triple hexagonal cell R₃, obverse setting (Fig. 1.5.1.6c)'],
    '-1 1 1; 0 -1 1; 1 0 1',
    '-1/3 -1/3 2/3; 1/3 -2/3 1/3; 1/3 1/3 1/3',
    'Rhombohedral space groups (cf. Section 1.5.4.3)',
    78,
  ],
  [
    ['Primitive rhombohedral cell → triple hexagonal cell R₁, reverse setting (Fig. 1.5.1.6d)'],
    '-1 0 1; 1 -1 1; 0 1 1',
    '-2/3 1/3 1/3; -1/3 -1/3 2/3; 1/3 1/3 1/3',
    'Rhombohedral space groups (cf. Section 1.5.4.3)',
    78,
  ],
  [
    ['Primitive rhombohedral cell → triple hexagonal cell R₂, reverse setting (Fig. 1.5.1.6b,d)'],
    '0 1 1; -1 0 1; 1 -1 1',
    '1/3 -2/3 1/3; 2/3 -1/3 -1/3; 1/3 1/3 1/3',
    'Rhombohedral space groups (cf. Section 1.5.4.3)',
    78,
  ],
  [
    ['Primitive rhombohedral cell → triple hexagonal cell R₃, reverse setting (Fig. 1.5.1.6d)'],
    '1 -1 1; 0 1 1; -1 0 1',
    '1/3 1/3 -2/3; -1/3 2/3 -1/3; 1/3 1/3 1/3',
    'Rhombohedral space groups (cf. Section 1.5.4.3)',
    78,
  ],
  [
    ['Hexagonal cell P → orthohexagonal centred cell C₁ (Fig. 1.5.1.7)'],
    '1 1 0; 0 2 0; 0 0 1',
    '1 -1/2 0; 0 1/2 0; 0 0 1',
    'Trigonal, Hexagonal (cf. Section 1.5.4.3)',
    78,
  ],
  [
    ['Hexagonal cell P → orthohexagonal centred cell C₂ (Fig. 1.5.1.7)'],
    '1 -1 0; 1 1 0; 0 0 1',
    '1/2 1/2 0; -1/2 1/2 0; 0 0 1',
    'Trigonal, Hexagonal (cf. Section 1.5.4.3)',
    78,
  ],
  [
    ['Hexagonal cell P → orthohexagonal centred cell C₃ (Fig. 1.5.1.7)'],
    '0 -2 0; 1 -1 0; 0 0 1',
    '-1/2 1 0; -1/2 0 0; 0 0 1',
    'Trigonal, Hexagonal (cf. Section 1.5.4.3)',
    79,
  ],
  [
    ['Hexagonal cell P → triple hexagonal cell H₁ (Fig. 1.5.1.8)'],
    '1 1 0; -1 2 0; 0 0 1',
    '2/3 -1/3 0; 1/3 1/3 0; 0 0 1',
    'Trigonal, Hexagonal (cf. Section 1.5.4.3)',
    79,
  ],
  [
    ['Hexagonal cell P → triple hexagonal cell H₂ (Fig. 1.5.1.8)'],
    '2 -1 0; 1 1 0; 0 0 1',
    '1/3 1/3 0; -1/3 2/3 0; 0 0 1',
    'Trigonal, Hexagonal (cf. Section 1.5.4.3)',
    79,
  ],
  [
    ['Hexagonal cell P → triple hexagonal cell H₃ (Fig. 1.5.1.8)'],
    '1 -2 0; 2 -1 0; 0 0 1',
    '-1/3 2/3 0; -2/3 1/3 0; 0 0 1',
    'Trigonal, Hexagonal (cf. Section 1.5.4.3)',
    79,
  ],
  [
    ['Hexagonal cell P → triple rhombohedral cell D₁'],
    '1 0 -1; 0 1 -1; 1 1 1',
    '2/3 -1/3 1/3; -1/3 2/3 1/3; -1/3 -1/3 1/3',
    'Trigonal, Hexagonal (cf. Section 1.5.4.3)',
    79,
  ],
  [
    ['Hexagonal cell P → triple rhombohedral cell D₂'],
    '-1 0 1; 0 -1 1; 1 1 1',
    '-2/3 1/3 1/3; 1/3 -2/3 1/3; 1/3 1/3 1/3',
    'Trigonal, Hexagonal (cf. Section 1.5.4.3)',
    79,
  ],
  [
    [
      'Triple hexagonal cell R, obverse setting → C-centred monoclinic cell, unique axis b, cell choice 1 (Fig. 1.5.1.9a)',
    ],
    '2/3 0 0; 1/3 1 0; -2/3 0 1',
    '3/2 0 0; -1/2 1 0; 1 0 1',
    'Rhombohedral space groups (cf. Section 1.5.4.3)',
    79,
  ],
  [
    [
      'Triple hexagonal cell R, obverse setting → C-centred monoclinic cell, unique axis b, cell choice 2 (Fig. 1.5.1.9a)',
    ],
    '-1/3 -1 0; 1/3 -1 0; -2/3 0 1',
    '-3/2 3/2 0; -1/2 -1/2 0; -1 1 1',
    'Rhombohedral space groups (cf. Section 1.5.4.3)',
    79,
  ],
  [
    [
      'Triple hexagonal cell R, obverse setting → C-centred monoclinic cell, unique axis b, cell choice 3 (Fig. 1.5.1.9a)',
    ],
    '-1/3 1 0; -2/3 0 0; -2/3 0 1',
    '0 -3/2 0; 1 -1/2 0; 0 -1 1',
    'Rhombohedral space groups (cf. Section 1.5.4.3)',
    79,
  ],
  [
    [
      'Triple hexagonal cell R, obverse setting → A-centred monoclinic cell, unique axis c, cell choice 1 (Fig. 1.5.1.9b)',
    ],
    '0 2/3 0; 0 1/3 1; 1 -2/3 0',
    '1 0 1; 3/2 0 0; -1/2 1 0',
    'Rhombohedral space groups (cf. Section 1.5.4.3)',
    79,
  ],
  [
    [
      'Triple hexagonal cell R, obverse setting → A-centred monoclinic cell, unique axis c, cell choice 2 (Fig. 1.5.1.9b)',
    ],
    '0 -1/3 -1; 0 1/3 -1; 1 -2/3 0',
    '-1 1 1; -3/2 3/2 0; -1/2 -1/2 0',
    'Rhombohedral space groups (cf. Section 1.5.4.3)',
    79,
  ],
  [
    [
      'Triple hexagonal cell R, obverse setting → A-centred monoclinic cell, unique axis c, cell choice 3 (Fig. 1.5.1.9b)',
    ],
    '0 -1/3 1; 0 -2/3 0; 1 -2/3 0',
    '0 -1 1; 0 -3/2 0; 1 -1/2 0',
    'Rhombohedral space groups (cf. Section 1.5.4.3)',
    79,
  ],
  [
    ['Primitive rhombohedral cell → C-centred monoclinic cell, unique axis b, cell choice 1 (Fig. 1.5.1.10a)'],
    '0 0 1; -1 1 1; -1 -1 1',
    '1 -1/2 -1/2; 0 1/2 -1/2; 1 0 0',
    'Rhombohedral space groups (cf. Section 1.5.4.3)',
    79,
  ],
  [
    ['Primitive rhombohedral cell → C-centred monoclinic cell, unique axis b, cell choice 2 (Fig. 1.5.1.10a)'],
    '-1 -1 1; 0 0 1; -1 1 1',
    '-1/2 1 -1/2; -1/2 0 1/2; 0 1 0',
    'Rhombohedral space groups (cf. Section 1.5.4.3)',
    79,
  ],
  [
    ['Primitive rhombohedral cell → C-centred monoclinic cell, unique axis b, cell choice 3 (Fig. 1.5.1.10a)'],
    '-1 1 1; -1 -1 1; 0 0 1',
    '-1/2 -1/2 1; 1/2 -1/2 0; 0 0 1',
    'Rhombohedral space groups (cf. Section 1.5.4.3)',
    80,
  ],
  [
    ['Primitive rhombohedral cell → A-centred monoclinic cell, unique axis c, cell choice 1 (Fig. 1.5.1.10b)'],
    '1 0 0; 1 -1 1; 1 -1 -1',
    '1 0 0; 1 -1/2 -1/2; 0 1/2 -1/2',
    'Rhombohedral space groups (cf. Section 1.5.4.3)',
    80,
  ],
  [
    ['Primitive rhombohedral cell → A-centred monoclinic cell, unique axis c, cell choice 2 (Fig. 1.5.1.10b)'],
    '1 -1 -1; 1 0 0; 1 -1 1',
    '0 1 0; -1/2 1 -1/2; -1/2 0 1/2',
    'Rhombohedral space groups (cf. Section 1.5.4.3)',
    80,
  ],
  [
    ['Primitive rhombohedral cell → A-centred monoclinic cell, unique axis c, cell choice 3 (Fig. 1.5.1.10b)'],
    '1 -1 1; 1 -1 -1; 1 0 0',
    '0 0 1; -1/2 -1/2 1; 1/2 -1/2 0',
    'Rhombohedral space groups (cf. Section 1.5.4.3)',
    80,
  ],
];

const fraction = (s: string): number => {
  const [n, d] = s.split('/').map(Number);
  return d === undefined ? n + 0 : n / d;
};
const matrix = (s: string): Mat3 => s.split(';').map((row) => row.trim().split(/\s+/).map(fraction)) as unknown as Mat3;

/**
 * ITA Table 1.5.1.1 (6th ed., 2016, pp. 77–80): the selected transformation matrices P and Q = P⁻¹,
 * one record per printed row in printed order (`statements`, `linearPart`, `inverseLinearPart`,
 * `crystalSystem`, `page`). A record's `linearPart` is the P that `changeOfCoordinates` takes;
 * fractions such as 1/3 are the nearest numbers, which `changeOfCoordinates` reads back as fractions.
 */
export const TRANSFORMATION_MATRICES: readonly TransformationMatrix[] = deepFreeze(
  ROWS.map(([statements, p, q, crystalSystem, page]) => ({
    statements: [...statements],
    linearPart: matrix(p),
    inverseLinearPart: matrix(q),
    crystalSystem,
    page,
  })),
);
