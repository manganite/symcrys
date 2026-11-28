/**
 * The full and short Hermann–Mauguin symbols of the settings of the 32 crystal classes, computed
 * from the symmetry elements of the operations of a setting along its symmetry directions (ITA
 * Table 2.1.3.1; docs/conventions.md, "Symbols"). `classData.reference.test.ts` compares them with
 * the headlines of ITA Table 3.2.3.2 and with the symbols of the other settings, for all 50.
 *
 * Internal; read by pointGroups.ts, blackWhiteData.ts, formRows.ts and wyckoffRows.ts.
 */

import { apply, type Vec3 } from '../linalg.js';
import { crystalFamily } from '../lattice.js';
import type { PointGroupKey } from './keys.js';
import { classData, settingBasis, settingCartesianOperations, settingSymmetryDirections } from './classData.js';
import { elementOf, elementsAlong, normalize, type ElementsAlong } from './rotations.js';

/** The short and the full symbol of a setting. */
export interface ClassSymbols {
  /** The ITC short symbol (`321`, `mmm`, `2/m`). */
  readonly short: string;
  /** The ITC full symbol, positions separated by single spaces (`3 2 1`, `2/m 2/m 2/m`, `1 2/m 1`). */
  readonly full: string;
}

/**
 * The position of a full symbol for the elements along one symmetry direction: `n/m` for an even
 * axis n with a mirror normal to it, `-6` for a threefold axis with a mirror normal to it, otherwise
 * `m`, `-3`, `-4`, `n`, or `1` for a direction without symmetry. A rotoinversion -6 always has a
 * threefold axis and a mirror, a rotoinversion -3 or -4 the axis 3 or 2 that it names with it.
 */
function positionSymbol({ rotation, rotoinversion, mirror }: ElementsAlong): string {
  if (mirror && rotation % 2 === 0) return `${rotation}/m`;
  if (mirror && rotation === 3) return '-6';
  if (mirror) return 'm';
  if (rotoinversion === 3 || rotoinversion === 4) return `-${rotoinversion}`;
  return `${rotation}`;
}

const cache = new Map<string, ClassSymbols>();

/**
 * The ITC symbols of a setting of a class. The full symbol has one position per position of the
 * symmetry directions of the setting, read along each of its directions (they agree); the triclinic
 * classes, which have no symmetry direction, are `1` and `-1`; a symbol whose positions after the
 * first are all `1` is its first position (`4`, `-3`, `6/m`), except in the monoclinic classes,
 * whose full symbol names the unique axis by its position (`1 2 1`); a cubic symbol leaves out a
 * last position `1` (`2 3`). The short symbol is the full one with `2/m` written `m` (also `4/m` in
 * the cubic classes), except in the monoclinic classes, which leave out the `1` instead (`2/m`);
 * its positions are written without spaces.
 */
export function classSettingSymbols(key: PointGroupKey, index: number): ClassSymbols {
  const cacheKey = `${key}#${index}`;
  const hit = cache.get(cacheKey);
  if (hit) return hit;
  const family = crystalFamily(classData(key).crystalSystem);
  const elements = settingCartesianOperations(key, index).map(elementOf);
  let positions: string[];
  if (family === 'triclinic') {
    positions = [elements.some((e) => e.kind === 'inversion') ? '-1' : '1'];
  } else {
    const basis = settingBasis(key, index);
    positions = settingSymmetryDirections(key, index).map((directions, i) => {
      const symbols = new Set(
        directions.map((uvw) =>
          positionSymbol(elementsAlong(elements, normalize(apply(basis, uvw as unknown as Vec3)))),
        ),
      );
      if (symbols.size !== 1) throw new Error(`${key} setting ${index}: position ${i + 1} reads ${[...symbols]}`);
      return [...symbols][0];
    });
    if (family === 'cubic' && positions.at(-1) === '1') positions = positions.slice(0, -1);
    else if (family !== 'monoclinic' && positions.slice(1).every((p) => p === '1')) positions = positions.slice(0, 1);
  }
  const short = positions
    .filter((p) => family !== 'monoclinic' || p !== '1')
    .map((p) => ((p === '2/m' && family !== 'monoclinic') || (p === '4/m' && family === 'cubic') ? 'm' : p))
    .join('');
  const result = Object.freeze({ short, full: positions.join(' ') });
  cache.set(cacheKey, result);
  return result;
}
