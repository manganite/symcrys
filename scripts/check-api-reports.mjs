// Checks the API reports of packages/ts/api/, after api-extractor has compared them:
// every type a public signature uses is written out in its report, and nothing internal comes in
// with it. api-extractor writes out a type that an entry point does not export by name under its
// internal name (includeForgottenExports) and marks it `ae-forgotten-export`; the aliases of
// symcrys/magnetic and symcrys/plane rest on that. Such types are
// listed here, so that a new one is a decision, not an accident: a signature that names a type
// through an internal namespace would pull the whole module, internal functions included, into
// the report. Fails on an unlisted forgotten type, a namespace, and a warning that names a source
// file (api-extractor's footer, which would make a report change with a line of a comment).

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const API = fileURLToPath(new URL('../packages/ts/api/', import.meta.url));

/** The types each report may write out without an export by name: those behind the aliases. */
const EXPECTED = {
  'symcrys.api.md': [
    // The crystallographic descriptions are those of the magnetic API without time reversal (Omit).
    'CartesianOperationDescription_2',
    'OperationDescription_2',
  ],
  'symcrys-magnetic.api.md': [
    // PointGroup is an alias of this, generic over the key with another default than in the
    // crystallographic API.
    'PointGroup_2',
  ],
  'symcrys-plane.api.md': /** @type {string[]} */ ([]),
};

const problems = [];
for (const [file, expected] of Object.entries(EXPECTED)) {
  const text = readFileSync(`${API}${file}`, 'utf8');
  const forgotten = [...text.matchAll(/\(ae-forgotten-export\) The symbol "([^"]+)"/g)].map((m) => m[1]);
  for (const name of forgotten) {
    if (!expected.includes(name)) {
      problems.push(
        `${file}: ${name} is written out without an export by name; export it, or name an exported type in the signature`,
      );
    }
  }
  for (const name of expected) {
    if (!forgotten.includes(name))
      problems.push(`${file}: ${name} is listed but not in the report any more; take it off the list`);
  }
  if (/\bdeclare namespace\b/.test(text)) {
    problems.push(`${file}: a namespace is written out; a signature names a type through an internal module`);
  }
  if (/^\/\/ src\//m.test(text)) {
    problems.push(`${file}: a warning names a source file (the report would change with its lines)`);
  }
}
if (problems.length > 0) {
  console.error(problems.map((p) => `check-api-reports: ${p}`).join('\n'));
  process.exit(1);
}
console.log('check-api-reports: the reports have the expected types written out, nothing internal');
