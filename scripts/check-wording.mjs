// Fails on personal wording and on traces of history in the files of the repository (GUIDE.md,
// "Documentation"): the rules, the documentation, comments and TSDoc state what holds, not who said
// it, when, or in which issue. Run as part of `npm run lint`.
//
//   node scripts/check-wording.mjs            check every file under version control
//   node scripts/check-wording.mjs FILE ...   check these files

import { execFileSync } from 'node:child_process';
import { readFileSync, realpathSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const NAMES = /\b(?:Thomas|Lottermoser)\b/;
const MAINTAINER = /\bmaintainers?\b/i;
const DECISION =
  /\b(?:decided (?:by (?:the )?(?:maintainer|owner)\b|on [#\d])|(?:chosen while implementing|asked with (?:options|proposals|a design|a recommendation)|asked before implementation|maintainer decision)\b)/i;
const INTERNAL_ID = /#\d+\s+(?:item\s+|step\s+|point\s+|question\s+)?[A-H]\d\b/;
// An issue of this or another repository (`#12`, `owner/repo#12`); not an anchor (`page.md#12`) or
// an entity (`&#38;`). Stylesheets are not checked for it, since a colour (`#000`) looks the same.
const ISSUE = /\b[\w.-]+\/[\w.-]+#\d+\b|(?<![\w&/-])#\d{1,4}\b/;
const DATE = /\b20\d\d-[01]\d-[0-3]\d\b/;
// Lines that name the author or the holder of the copyright, as metadata.
const AUTHORSHIP = /©|^\s*"author"\s*:|^\s*authors?\s*=|^\s*copyright\s*=|^Copyright \(c\)/;

/** Files that record history by their nature, or are not written by hand. */
const SKIPPED = [
  /^CHANGELOG\.md$/,
  /(?:^|\/)LICENSE$/,
  /^package-lock\.json$/,
  /\.pins\.json$/,
  /^packages\/ts\/api\/.*\.api\.md$/,
  /^audit\/.*\/report\.md$/,
  /^packages\/python\/src\/symcrys\/_bundle\.js$/,
  /\.(?:png|svg|ico|woff2?|gz|tgz)$/,
  /^scripts\/check-wording(?:\.test)?\.mjs$/,
];

const isTest = (/** @type {string} */ path) =>
  /\.test\.(?:ts|mjs)$/.test(path) ||
  /\.fixtures\.ts$/.test(path) ||
  /\/testUtils\//.test(path) ||
  /^packages\/python\/tests\//.test(path) ||
  /^audit\//.test(path);
const isReference = (/** @type {string} */ path) => path.startsWith('references/');
const isProcess = (/** @type {string} */ path) => path === 'CLAUDE.md' || path.startsWith('.github/');

/**
 * The rules that apply to a file.
 *
 * @param {string} path - The path relative to the repository root.
 * @returns {[string, RegExp][]} What each rule finds, and its pattern.
 */
function rulesFor(path) {
  /** @type {[string, RegExp][]} */
  const rules = [
    ['a person named', NAMES],
    ['a decision record', DECISION],
    ['an internal issue id', INTERNAL_ID],
  ];
  if (isReference(path)) return rules;
  if (path !== 'CLAUDE.md') rules.push(['"maintainer"', MAINTAINER]);
  if (isTest(path) || isProcess(path)) return rules;
  if (!path.endsWith('.css')) rules.push(['an issue number', ISSUE]);
  rules.push(['a date', DATE]);
  return rules;
}

/**
 * The findings in one file's text, as `path:line: message`.
 *
 * @param {string} path - The path relative to the repository root, which decides the rules.
 * @param {string} text - The content of the file.
 * @returns {string[]} One entry per rule broken on a line.
 */
export function checkText(path, text) {
  /** @type {string[]} */
  const findings = [];
  const rules = rulesFor(path);
  text.split('\n').forEach((line, index) => {
    for (const [what, pattern] of rules) {
      if (pattern === NAMES && AUTHORSHIP.test(line)) continue;
      const match = pattern.exec(line);
      if (match) findings.push(`${path}:${index + 1}: ${what} ("${match[0]}")`);
    }
  });
  return findings;
}

/** @param {string[]} args - The arguments of `git`. */
const git = (args) => execFileSync('git', args, { encoding: 'utf8' });

/** @param {string[]} args - Files to check; all files under version control if empty. */
function main(args) {
  // Paths relative to the root of the repository, which decide the rules, wherever this runs.
  const root = git(['rev-parse', '--show-toplevel']).trim();
  const given = args.map((arg) => relative(root, resolve(arg)));
  process.chdir(root);
  const all = git(['ls-files', '--cached', '--others', '--exclude-standard']).split('\n').filter(Boolean);
  const files = (given.length > 0 ? given : all).filter((path) => !SKIPPED.some((pattern) => pattern.test(path)));
  /** @type {string[]} */
  const findings = [];
  for (const path of files) {
    let text;
    try {
      text = readFileSync(path, 'utf8');
    } catch {
      continue; // deleted in the working tree
    }
    if (text.includes('\0')) continue; // a binary file
    findings.push(...checkText(path, text));
  }
  if (findings.length > 0) {
    console.error(findings.join('\n'));
    console.error(
      `\n${findings.length} finding(s). State what holds, without persons, dates or issue numbers (GUIDE.md, "Documentation").`,
    );
    process.exit(1);
  }
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2));
}
