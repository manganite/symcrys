/**
 * stereography's transcription of ITA 2006 (5th ed.), read from a fixed revision of the sibling
 * checkout ../stereography, for the audits wyckoff-2006 and forms-2006.
 *
 * stereography takes its Wyckoff positions from symcrys since 7832fb0 (the oriented symbols of
 * ALT_SETTINGS in js/sitesym.js are gone) and its crystal forms since 6f174fa (js/formen.js keeps
 * names, link ids and representatives only), so its current catalogue is no independent check any
 * more. The revision fixed here has both files in their last own state (js/formen.js unchanged
 * from 511de92 to 6f174fa, js/sitesym.js from 9472f43 to 7832fb0); the files are read from it with
 * `git show`, whatever the checkout's working state.
 */
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

/** The revision of stereography whose js/formen.js and js/sitesym.js transcribe ITA 2006. */
export const REVISION = '41cf39a';

const checkout = fileURLToPath(new URL('../../stereography/', import.meta.url));

/** A file of stereography at the fixed revision, as text. */
export function stereographyFile(path: string): string {
  return execFileSync('git', ['-C', checkout, 'show', `${REVISION}:${path}`], { encoding: 'utf8' });
}

/** A module of stereography at the fixed revision (it must have no imports of its own). */
export async function stereographyModule(path: string): Promise<Record<string, unknown>> {
  const text = stereographyFile(path);
  // A static import or re-export (JSDoc `@import` in a comment is not one).
  if (/^\s*(import\b(?!\.meta)|export\b[^\n]*\bfrom\b)/m.test(text)) {
    throw new Error(`${path} at ${REVISION} imports other modules`);
  }
  return import(/* @vite-ignore */ `data:text/javascript;base64,${Buffer.from(text).toString('base64')}`);
}

/** The fixed revision with its date, for the reports. */
export function revisionLine(): string {
  return execFileSync('git', ['-C', checkout, 'log', '-1', '--format=%h %cs', REVISION], { encoding: 'utf8' }).trim();
}
