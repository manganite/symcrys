/**
 * Captures what birss-app shows for the 32 crystal classes, as behavioural pins (fixture class (c),
 * CLAUDE.md) for symcrys's Birss convention: in its Birss mode symcrys must give what birss-app
 * gives (maintainer, 2026-11-18). Reads ../birss-app (sibling checkout) and writes two JSON files,
 * read by the tests of both languages (#30):
 *
 * - src/pointGroups/birssApp.pins.json: per class and per setting birss-app offers, the generators
 *   (getTransformedGenerators), the operations in birss-app's order (getFullGroup of those
 *   generators, as getSymmetryOperations and isCentrosymmetric build them), the generator symbols
 *   (getGeneratorSymbols, in generator order), the operation symbols (getSymmetryOperations, in
 *   birss-app's display order), the Birss-mode symbol of the setting (getFrameDisplayName /
 *   getGroupDisplayName); per class the Birss default setting (getDefaultSetting) and the property
 *   flags.
 * - src/tensors/birssApp.pins.json: per class, setting and tensor specification, the tensor form
 *   (computeTensorForm) as birss-app presents it: reduced to row echelon form with birss-app's own
 *   `rref`, so the pivots are birss-app's free parameters (Q0), in its order.
 *
 * Run by hand: npm run audit:birss-app. Not part of the build, the tests or CI (CLAUDE.md, "Hard
 * constraints"). Regenerate the pins only by re-running this script against a known-good birss-app
 * revision, never by editing them.
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
import { computeTensorForm, type TensorSpec } from '../../../birss-app/src/services/tensorForms';
import { rref } from '../../../birss-app/src/services/linalg';
import { POINT_GROUP_KEYS } from '../../packages/ts/src/pointGroups/pointGroups';

const here = fileURLToPath(new URL('.', import.meta.url));
const birssApp = `${here}../../../birss-app`;

/** Matrix entries as written into the pins: exact integers, otherwise the double as captured. */
const matrix = (m: number[][]): number[][] => m.map((r) => r.map((x) => (Object.is(x, -0) ? 0 : x)));

/**
 * The tensor specifications pinned: every rank with every index symmetry birss-app applies at it,
 * polar and axial. Time-even only: the 32 classes have no time reversal, so `c` equals `i` (tested
 * in symcrys).
 */
const INTRINSIC_BY_RANK: Record<number, TensorSpec['intrinsic'][]> = {
  0: ['none'],
  1: ['none'],
  2: ['none', 'ij', 'jk'],
  3: ['none', 'ij', 'jk'],
  4: ['none', 'ij', 'jk', 'ij_kl', 'voigt'],
};
const SPECS: TensorSpec[] = [0, 1, 2, 3, 4].flatMap((rank) =>
  (['polar', 'axial'] as const).flatMap((parity) =>
    INTRINSIC_BY_RANK[rank].map((intrinsic) => ({
      rank: rank as TensorSpec['rank'],
      parity,
      timeParity: 'i' as const,
      intrinsic,
    })),
  ),
);

/** A basis row as [flat index, value] pairs of its nonzero entries, rounded to 12 decimals. */
const sparse = (row: number[]): [number, number][] =>
  row.flatMap((x, i): [number, number][] => {
    const v = Math.round(x * 1e12) / 1e12;
    return v === 0 ? [] : [[i, v]];
  });

it('captures the Birss-mode pins from birss-app', () => {
  const commit = execFileSync('git', ['-C', birssApp, 'log', '-1', '--format=%h %cs'], { encoding: 'utf8' }).trim();
  const dirty = execFileSync('git', ['-C', birssApp, 'status', '--porcelain'], { encoding: 'utf8' }).trim();
  if (dirty) throw new Error('birss-app has local changes; capture only from a clean checkout');

  const settingCount = (key: string) => (ALTERNATE_SETTINGS[key]?.length ?? 0) + 1;

  const classes = POINT_GROUP_KEYS.map((key) => {
    const count = settingCount(key);
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

  const forms = POINT_GROUP_KEYS.map((key) => ({
    key,
    settings: Array.from({ length: settingCount(key) }, (_, i) => ({
      setting: i + 1,
      forms: SPECS.map((spec) => {
        const form = computeTensorForm(key, i + 1, spec);
        if (!form) throw new Error(`birss-app has no form for ${key} setting ${i + 1}`);
        const basis = form.basisResults.length === 0 ? [] : rref(form.basisResults, 3 ** spec.rank);
        return {
          rank: spec.rank,
          parity: spec.parity,
          intrinsic: spec.intrinsic,
          parameters: basis.map((row) => row.findIndex((x) => Math.abs(x) > 1e-7)),
          basis: basis.map(sparse),
        };
      }),
    })),
  }));

  const header = (what: string) =>
    `Behavioural pins (fixture class (c), CLAUDE.md): ${what} birss-app shows for the 32 crystal classes. ` +
    'Captured by audit/birss-app/capture.run.ts (npm run audit:birss-app); regenerate only by re-capture, never edit.';

  // One entry per line, so that a re-capture shows as a diff per class.
  const write = (path: string, doc: Record<string, unknown>, listKey: string, list: unknown[]) => {
    const head = Object.entries(doc)
      .map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`)
      .join('\n');
    const body = list.map((x) => `    ${JSON.stringify(x)}`).join(',\n');
    writeFileSync(path, `{\n${head}\n  ${JSON.stringify(listKey)}: [\n${body}\n  ]\n}\n`);
  };

  write(
    `${here}../../packages/ts/src/pointGroups/birssApp.pins.json`,
    {
      note: `${header('what')} Matrices are birss-app's Cartesian matrices (Birss frame), rows first.`,
      revision: commit,
    },
    'classes',
    classes,
  );
  write(
    `${here}../../packages/ts/src/tensors/birssApp.pins.json`,
    {
      note:
        `${header('the tensor forms')} Per class, setting and specification (time-even): the basis in reduced row ` +
        "echelon form (birss-app's rref of computeTensorForm), each row as [flat index, value] pairs of its nonzero " +
        'entries rounded to 12 decimals, and the free parameters (flat index of the pivot of each row).',
      revision: commit,
    },
    'classes',
    forms,
  );
});
