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
  /** Time reversal of each generator, in the order of `generators`. */
  readonly generatorTimeReversal: readonly boolean[];
  readonly operations: readonly Matrix[];
  /** Time reversal of each operation, in the order of `operations`. */
  readonly operationTimeReversal: readonly boolean[];
  readonly generatorSymbols: readonly string[];
  readonly operationSymbols: readonly string[];
}

/** One of birss-app's 122 magnetic point groups (the 32 crystal classes included). */
export interface BirssAppGroup {
  /** birss-app's key: the Birss short symbol of its default setting. */
  readonly key: string;
  readonly type: 'I' | 'II' | 'III';
  /** birss-app's key of the crystal class (getFamilyClass). */
  readonly crystalClass: string;
  readonly defaultSetting: number;
  /** The default setting of birss-app's ITC mode. */
  readonly itcDefaultSetting: number;
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

interface PinFile {
  readonly note: string;
  readonly revision: string;
}

const read = <T extends PinFile>(path: string): T =>
  JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8')) as T;

const pointGroupPins = read<PinFile & { readonly groups: readonly BirssAppGroup[] }>(
  '../pointGroups/birssApp.pins.json',
);
const tensorPins = read<
  PinFile & { readonly classes: readonly BirssAppTensorClass[]; readonly magnetic: readonly BirssAppTensorClass[] }
>('../tensors/birssApp.pins.json');

/** birss-app revision and date the point-group pins come from, e.g. `2be5fe3 2026-11-07`. */
export const BIRSS_APP_REVISION = pointGroupPins.revision;
/** All 122 groups: types I, II, III, in birss-app's order. */
export const BIRSS_APP_GROUPS = pointGroupPins.groups;

/** birss-app revision the tensor pins come from. */
export const BIRSS_APP_TENSOR_REVISION = tensorPins.revision;
/** The 32 crystal classes: time-even forms (`timeParity: 'i'`). */
export const BIRSS_APP_TENSOR_CLASSES = tensorPins.classes;
/** The 58 black-and-white groups, under birss-app's keys: time-odd forms (`timeParity: 'c'`). */
export const BIRSS_APP_TENSOR_MAGNETIC = tensorPins.magnetic;

/** birss-app's keys are Birss symbols; for two groups the key of symcrys, the ITC short symbol, differs. */
export const SYMCRYS_KEY: Readonly<Record<string, string>> = { "m'm'm": "mm'm'", "6'/mm'm": "6'/mmm'" };
