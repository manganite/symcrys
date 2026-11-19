/**
 * The behavioural pins captured from birss-app (fixture class (c), CLAUDE.md) by
 * audit/birss-app/capture.run.ts, read from their JSON files (test-only code). JSON, so that the
 * tests of a later Python layer read the same files (#30).
 */

import { readFileSync } from 'node:fs';

type Matrix = readonly (readonly number[])[];

export interface BirssAppSetting {
  readonly setting: number;
  readonly symbol: string;
  readonly generators: readonly Matrix[];
  readonly operations: readonly Matrix[];
  readonly generatorSymbols: readonly string[];
  readonly operationSymbols: readonly string[];
}

export interface BirssAppClass {
  readonly key: string;
  readonly defaultSetting: number;
  readonly centrosymmetric: boolean;
  readonly polar: boolean;
  readonly chiral: boolean;
  readonly laueClass: string;
  readonly settings: readonly BirssAppSetting[];
}

/** One tensor form as birss-app presents it, in reduced row echelon form. */
export interface BirssAppTensorForm {
  readonly rank: 0 | 1 | 2 | 3 | 4;
  readonly parity: 'polar' | 'axial';
  readonly intrinsic: 'none' | 'ij' | 'jk' | 'ij_kl' | 'voigt';
  /** Flat index of the pivot of each basis row: birss-app's free parameters, in its order. */
  readonly parameters: readonly number[];
  /** Basis rows as [flat index, value] pairs of their nonzero entries. */
  readonly basis: readonly (readonly (readonly [number, number])[])[];
}

export interface BirssAppTensorClass {
  readonly key: string;
  readonly settings: readonly { readonly setting: number; readonly forms: readonly BirssAppTensorForm[] }[];
}

interface PinFile<T> {
  readonly note: string;
  readonly revision: string;
  readonly classes: readonly T[];
}

const read = <T>(path: string): PinFile<T> =>
  JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8')) as PinFile<T>;

const pointGroupPins = read<BirssAppClass>('../pointGroups/birssApp.pins.json');
const tensorPins = read<BirssAppTensorClass>('../tensors/birssApp.pins.json');

/** birss-app revision and date the point-group pins come from, e.g. `2be5fe3 2026-11-07`. */
export const BIRSS_APP_REVISION = pointGroupPins.revision;
export const BIRSS_APP_CLASSES = pointGroupPins.classes;

/** birss-app revision the tensor pins come from. */
export const BIRSS_APP_TENSOR_REVISION = tensorPins.revision;
export const BIRSS_APP_TENSOR_CLASSES = tensorPins.classes;
