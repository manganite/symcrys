/**
 * The symmetry directions of the plane lattices after the rotation point, by set: convention data of
 * ITA (2016 Table 2.1.3.1, p. 151, "Two dimensions"), which fix the order of the positions of the
 * symbols; compared with the transcription by `planeWyckoff.reference.test.ts`.
 */

import { deepFreeze } from '../freeze.js';
import type { PlaneSystem } from './planeGroupData.js';

/** A lattice direction [uv] of the plane. */
export type PlaneDirection = readonly [number, number];

export const PLANE_SYMMETRY_DIRECTIONS: Readonly<Record<PlaneSystem, readonly (readonly PlaneDirection[])[]>> =
  deepFreeze({
    oblique: [],
    rectangular: [[[1, 0]], [[0, 1]]],
    square: [
      [
        [1, 0],
        [0, 1],
      ],
      [
        [1, -1],
        [1, 1],
      ],
    ],
    hexagonal: [
      [
        [1, 0],
        [0, 1],
        [-1, -1],
      ],
      [
        [1, -1],
        [1, 2],
        [-2, -1],
      ],
    ],
  });
