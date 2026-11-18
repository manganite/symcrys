/**
 * Captures what birss-app shows for the 32 crystal classes, as behavioural pins (fixture class (c),
 * CLAUDE.md) for symcrys's Birss convention: in its Birss mode symcrys must give what birss-app
 * gives (maintainer, 2026-11-18). Reads ../birss-app (sibling checkout), writes
 * src/pointGroups/birssApp.pins.fixtures.ts. Run by hand: npm run audit:birss-app. Not part of the
 * build, the tests or CI (CLAUDE.md, "Hard constraints"). Regenerate the pins only by re-running
 * this script against a known-good birss-app revision, never by editing them.
 *
 * Per class and per setting birss-app offers: the generators (getTransformedGenerators), the
 * operations in birss-app's order (getFullGroup of those generators, as getSymmetryOperations and
 * isCentrosymmetric build them), the generator symbols (getGeneratorSymbols, in generator order),
 * the operation symbols (getSymmetryOperations, in birss-app's display order), the Birss-mode
 * symbol of the setting (getFrameDisplayName / getGroupDisplayName); per class the Birss default
 * setting (getDefaultSetting) and the property flags.
 */
import { writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { it } from 'vitest';

import {
  ALTERNATE_SETTINGS,
  getFullGroup,
  getGeneratorSymbols,
  getSymmetryOperations,
  getTransformedGenerators,
  isCentrosymmetric,
} from '../../../birss-app/src/services/symmetryGroups';
import {
  getDefaultSetting,
  getFrameDisplayName,
  getGroupDisplayName,
} from '../../../birss-app/src/services/conventionMapping';
import { getLaueClass, isChiral, isPolar } from '../../../birss-app/src/services/propertyFlags';
import { POINT_GROUP_KEYS } from '../../src/pointGroups/pointGroups';

const here = fileURLToPath(new URL('.', import.meta.url));
const birssApp = `${here}../../../birss-app`;

/** Matrix entries as written into the fixture: exact integers, otherwise the double as captured. */
const matrix = (m: number[][]): number[][] => m.map((r) => r.map((x) => (Object.is(x, -0) ? 0 : x)));

it('captures the Birss-mode pins from birss-app', () => {
  const commit = execFileSync('git', ['-C', birssApp, 'log', '-1', '--format=%h %cs'], { encoding: 'utf8' }).trim();
  const dirty = execFileSync('git', ['-C', birssApp, 'status', '--porcelain'], { encoding: 'utf8' }).trim();
  if (dirty) throw new Error('birss-app has local changes; capture only from a clean checkout');

  const classes = POINT_GROUP_KEYS.map((key) => {
    const count = (ALTERNATE_SETTINGS[key]?.length ?? 0) + 1;
    const settings = Array.from({ length: count }, (_, i) => {
      const setting = i + 1;
      const gens = getTransformedGenerators(key, setting);
      return {
        setting,
        symbol: count > 1 ? getFrameDisplayName(key, setting, 'birss').primary : getGroupDisplayName(key, 'birss'),
        generators: gens.map((g) => matrix(g.m)),
        operations: getFullGroup(gens, key).map((g) => matrix(g.m)),
        generatorSymbols: getGeneratorSymbols(key, setting),
        operationSymbols: getSymmetryOperations(key, setting),
      };
    });
    return {
      key,
      defaultSetting: getDefaultSetting(key, 'birss'),
      centrosymmetric: isCentrosymmetric(key),
      polar: isPolar(key),
      chiral: isChiral(key),
      laueClass: getLaueClass(key),
      settings,
    };
  });

  const out = `/**
 * Behavioural pins (fixture class (c), CLAUDE.md): what birss-app ${commit} shows for the 32 crystal
 * classes. Captured by audit/birss-app/capture.run.ts (npm run audit:birss-app); regenerate only by
 * re-capture, never edit. Matrices are birss-app's Cartesian matrices (Birss frame), rows first.
 */

export interface BirssAppSetting {
  readonly setting: number;
  readonly symbol: string;
  readonly generators: readonly (readonly number[])[][];
  readonly operations: readonly (readonly number[])[][];
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

export const BIRSS_APP_REVISION = ${JSON.stringify(commit)};

export const BIRSS_APP_CLASSES: readonly BirssAppClass[] = ${JSON.stringify(classes)};
`;
  writeFileSync(`${here}../../src/pointGroups/birssApp.pins.fixtures.ts`, out);
});
