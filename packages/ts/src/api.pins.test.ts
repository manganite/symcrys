/**
 * The API pins replayed in TypeScript (testUtils/apiCalls.ts): each pinned call of the public API
 * gives the pinned answer, and every export of the three entry points is pinned at least once, so
 * that the Python test, which replays the same file through the Python layer, reaches every
 * function. Behavioural pins (fixture class (c)): a difference is a change of behaviour that its
 * pull request lists before re-capturing, or a bug.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { API_PINS_FILE, ENTRY_POINTS, UNPINNED, answer, apiCalls, type ApiPin } from './testUtils/apiCalls.js';

interface PinFile {
  readonly revision: string;
  readonly pins: readonly ApiPin[];
}

const pinned = JSON.parse(readFileSync(new URL(`./${API_PINS_FILE}`, import.meta.url), 'utf8')) as PinFile;
const id = (p: { entry: string; name: string; args?: readonly unknown[] }): string =>
  `${p.entry} ${p.name}${p.args ? JSON.stringify(p.args) : ''}`;

describe(`the API pins (pins of ${pinned.revision})`, () => {
  it('are the calls of testUtils/apiCalls.ts, in the same order, none throwing', () => {
    expect(pinned.pins.map(id)).toEqual(apiCalls().map((c) => id(JSON.parse(JSON.stringify(c)))));
  });

  it('pin every export of every entry point at least once', () => {
    for (const [entry, module] of Object.entries(ENTRY_POINTS)) {
      const names = new Set(pinned.pins.filter((p) => p.entry === entry).map((p) => p.name));
      const missing = Object.keys(module).filter((k) => !UNPINNED.has(k) && !names.has(k));
      expect(missing, entry).toEqual([]);
    }
  });

  it('give the pinned answer to every call', () => {
    const differ: string[] = [];
    for (const p of pinned.pins) {
      const value = answer(p);
      if (JSON.stringify(value) !== JSON.stringify(p.value)) differ.push(id(p));
    }
    expect(differ).toEqual([]);
  });
});
