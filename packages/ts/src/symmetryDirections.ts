/**
 * The symmetry directions of the crystal families: the lattice directions along which the
 * symmetry elements of a crystallographic point group lie, grouped by their position in the full
 * Hermann–Mauguin symbol. Data from ITA Table 2.1.3.1 (docs/conventions.md, "Symmetry
 * directions and elements"); `symmetryDirections.reference.test.ts` re-reads the transcription and requires the
 * same directions, in the same order and with the same signs.
 */

import type { CrystalFamily } from './lattice.js';

/** A lattice direction [uvw]: integer coordinates in the conventional basis a, b, c. */
export type Uvw = readonly [number, number, number];

const frozen = (rows: [number, number, number][][]): readonly (readonly Uvw[])[] =>
  Object.freeze(rows.map((dirs) => Object.freeze(dirs.map((d) => Object.freeze(d) as unknown as Uvw))));

/**
 * The symmetry directions of each position of the full symbol, per family, as ITA gives them
 * (hexagonal family: the directions of the hexagonal lattice, which also serve the trigonal classes
 * with hexagonal axes). Triclinic: no position. Monoclinic: the positions of the full symbol, which
 * reads along a, b, c, the orthorhombic directions [100], [010], [001]; of these, only the unique axis is a lattice symmetry direction ([010] for
 * unique axis b, [001] for unique axis c, [100] for unique axis a), and the full symbol has `1` at
 * the other two positions (`1 2/m 1`).
 *
 * @remarks Source: ITA (2016), Table 2.1.3.1, which lists no row for unique axis a; the monoclinic
 * full symbol, ITA (6th ed., 2016), § 2.1.3.15, p. 171.
 */
export const LATTICE_SYMMETRY_DIRECTIONS: Readonly<Record<CrystalFamily, readonly (readonly Uvw[])[]>> = Object.freeze({
  triclinic: frozen([]),
  monoclinic: frozen([[[1, 0, 0]], [[0, 1, 0]], [[0, 0, 1]]]),
  orthorhombic: frozen([[[1, 0, 0]], [[0, 1, 0]], [[0, 0, 1]]]),
  tetragonal: frozen([
    [[0, 0, 1]],
    [
      [1, 0, 0],
      [0, 1, 0],
    ],
    [
      [1, -1, 0],
      [1, 1, 0],
    ],
  ]),
  hexagonal: frozen([
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
  ]),
  cubic: frozen([
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
  ]),
});
