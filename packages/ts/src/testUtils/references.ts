/**
 * Reading the transcribed print tables in references/ (test-only code).
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = new URL('../../../../references/', import.meta.url);

/** The content of a file in references/, e.g. `birss/table-3.md`. */
export function readReference(path: string): string {
  return readFileSync(fileURLToPath(new URL(path, ROOT)), 'utf8');
}

/** The text from the line starting with `heading` up to the next line starting with `## ` (or the end). */
export function section(content: string, heading: string): string {
  const lines = content.split('\n');
  const start = lines.findIndex((l) => l.startsWith(heading));
  if (start < 0) throw new Error(`Heading not found: ${heading}`);
  let end = start + 1;
  while (end < lines.length && !lines[end].startsWith('## ')) end++;
  return lines.slice(start, end).join('\n');
}

/**
 * The rows of the first Markdown table in `content`, header first, separator row dropped, cells
 * trimmed. Stops at the first line after the table that does not start with `|`.
 */
export function tableRows(content: string): string[][] {
  const lines = content.split('\n');
  const start = lines.findIndex((l) => l.trim().startsWith('|'));
  if (start < 0) throw new Error('No table found');
  const rows: string[][] = [];
  for (let i = start; i < lines.length && lines[i].trim().startsWith('|'); i++) {
    const cells = lines[i]
      .trim()
      .split('|')
      .slice(1, -1)
      .map((c) => c.trim());
    if (cells.every((c) => /^:?-+:?$/.test(c))) continue;
    rows.push(cells);
  }
  return rows;
}

/** Fails loudly if a table's header changed shape, so a parser never reads the wrong column. */
export function expectHeader(rows: string[][], expected: string[]): void {
  if (JSON.stringify(rows[0]) !== JSON.stringify(expected)) {
    throw new Error(
      `Table header changed.\nExpected: ${JSON.stringify(expected)}\nActual:   ${JSON.stringify(rows[0])}`,
    );
  }
}

/**
 * True if a printed entry of ITA Table 3.2.3.2 (its `Axes` column) and a setting of symcrys have the
 * same axes: rhombohedral for both, or hexagonal or none for both.
 */
export const sameAxes = (printed: string, setting: { readonly axes?: string }): boolean =>
  (printed === 'rhombohedral axes') === (setting.axes === 'rhombohedral');

/**
 * The rhombohedral basis in the hexagonal one, obverse (ITA 2016 Table 1.5.1.1, p. 78, the matrix Q of R₁ obverse): the columns
 * a_R = (2a + b + c)/3, b_R = (−a + b + c)/3, c_R = (−a − 2b + c)/3; typed here independently of src/.
 */
export const RHOMBOHEDRAL_IN_HEXAGONAL: number[][] = [
  [2 / 3, -1 / 3, -1 / 3],
  [1 / 3, 1 / 3, -2 / 3],
  [1 / 3, 1 / 3, 1 / 3],
];
