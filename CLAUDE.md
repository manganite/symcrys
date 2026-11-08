# CLAUDE.md – symcrys

Working agreement for anyone (human or agent) changing this repository. symcrys is its own
project: the guide (`LEITFADEN.md`) and `CLAUDE.md` of the crystallography app family do **not**
apply here. Where this file and another document disagree on process, this file wins.

## What symcrys is

- The shared computational core for the crystallography teaching apps (stereography, plane-groups,
  later diffraction and a 3D app) and for birss-app (maintainer decision 2026-11-07,
  manganite/crystallography-common#99).
- It holds **calculations**: groups as data, group generation, symbols and settings, derived
  properties, subgroup relations, tensors. **Presentation stays in the apps** (LaTeX, SVG, view
  models, display strings in other languages).
- A library in its own right: easily extensible, distributable on its own, English throughout
  (identifiers, comments, docs, commit messages).

## Hard constraints

- **No DOM, no UI, no I/O in library code** (everything in `src/` except test-only code, see
  "Tests"). `tsconfig.build.json` type-checks it with neither DOM nor Node types, and ESLint
  forbids a list of environment globals and any non-relative import there.
- **No runtime dependencies** unless Thomas agrees. The apps copy `dist/` and run it unbundled in
  the browser; `scripts/check-dist.mjs` fails on any import or type reference in `dist/` that is
  not a relative `.js` path.
- **One-way dependency.** symcrys knows nothing about crystallography-common, the apps or
  birss-app. Exception: scripts under `audit/` may read sibling checkouts (`../birss-app`,
  `../stereography`); they are run by hand, never by the build, the tests or CI. Lint and format
  apply to them like to any other file, except generated reports (`audit/**/report.md`), which
  Prettier leaves alone. The scripts are not type-checked, because they import the sibling
  checkouts.
- **Relative imports carry the `.js` extension** (`NodeNext`), so `dist/` runs in browsers and in
  Node without a bundler.

## Where things go

| What                                                                                     | Where                                       |
| ---------------------------------------------------------------------------------------- | ------------------------------------------- |
| Working mode, process, decisions with their reason                                       | this file                                   |
| Purpose, use, build commands, release procedure                                          | `README.md`                                 |
| Changes per version                                                                      | `CHANGELOG.md` (Keep a Changelog)           |
| Open work, ideas, open questions                                                         | GitHub issues of this repository            |
| Conventions (axis frames, settings, symbols, ITC vs Birss) with their literature anchors | `docs/`                                     |
| Transcribed reference tables re-parsed by tests                                          | `references/`, with source and printed page |

Documentation describes the **current state**, not how it was reached. Material taken over from
birss-app is rewritten to its present conclusions; its development history (revisions, superseded
findings, ledgers) stays in birss-app (maintainer decision 2026-11-08). The history of symcrys
itself lives in git, PRs, issues and `CHANGELOG.md`.

Every kind of information has one place; elsewhere, link to it. A PR that changes a decision, a
convention or the process updates this file (or the `docs/` file) in the same PR.

## Working with Thomas

- Conversation in German; everything in the repository in English.
- Ask when something is unclear; do not guess. Say so when you do not know. Precise, verifiable,
  to the point. Proactive proposals are welcome.
- Thomas is the domain authority. Crystallography and physics claims are checked against code and
  print sources (ITC, Birss 1966, …) with printed page numbers, never against app output alone.
  Sources are in Thomas' Zotero; ask him for a volume that is not at hand.

## Two conventions: ITC (default) and Birss

- symcrys supports two conventions for point groups: the _International Tables for
  Crystallography_ (ITC: Vol. A for the 32 crystal classes, Vol. D Ch. 1.5 for the magnetic point
  groups) and Birss, _Symmetry and Magnetism_ (1966). **ITC is the default** (`'itc'`); Birss
  (`'birss'`) is an option a caller selects explicitly. Maintainer decision 2026-11-08.
- The convention decides the default setting (axis frame), the symbols, and therefore which
  Cartesian tensor components survive. Every divergence is documented in `docs/` and every new one
  is added there in the same PR.
- The stored data are in the Birss frame and ITC is derived from them, so the print-verified tests
  carried over from birss-app stay valid (maintainer, 2026-11-08). Each convention is tested
  against its own print source: ITC output against ITC tables, Birss output against Birss's tables.
- birss-app keeps Birss as its own default for now and selects `'birss'`; to be revisited when it
  moves onto symcrys (maintainer, 2026-11-08).

## Correctness and provenance

Carried over from birss-app, where the calculations come from.

- **Anti-circularity.** Expected values in correctness tests come from print (directly, or via an
  independent derivation calibrated against print), never from symcrys output.
- Three classes of fixtures, recorded in each fixture's `source` / `note`:
  (a) print-verified, (b) independently derived and calibrated against (a),
  (c) behavioural pins captured from a known-good revision. Pins are regression detectors, never
  correctness authority; regenerate them only by re-capture, never edit one to turn it green.
- **Safety net first.** For any data or math change: extend the relevant fixture first, require
  it green, then change the code.
- Files in `references/` change only to correct them against print; Prettier and ESLint leave
  them alone.

## Tests

- Tests sit next to their module (`foo.ts`, `foo.test.ts`), as in birss-app.
- **Test-only code** is `*.test.ts`, `*.fixtures.ts` and anything in a `testUtils/` folder. It is
  type-checked with Node types (tests read `references/` from disk), may import Node built-ins,
  and is left out of `dist/` and the npm package; `check:dist` fails if any of it is built. Any
  other file in `src/` is library code.
- Test classes by file suffix: `*.reference.test.ts` (re-parse print transcriptions),
  `*.audit.test.ts` (exhaustive coverage), `*.pins.test.ts` (behavioural pins), plain `*.test.ts`;
  further suffixes from birss-app may come along. `npm test` runs all of them; no subset is a
  gate of its own.

## Public API and versions

- Public API = everything exported from `src/index.ts` (and from any later entry in `exports` of
  `package.json`). Everything else is internal and may change freely.
- SemVer. Before 1.0.0: MINOR for new features and for any breaking change, PATCH for fixes.
  From 1.0.0 on: MAJOR for breaking changes.
- `CHANGELOG.md` gets an entry for every change to the public API or to calculated results. A
  correction says what was wrong and since which version it is fixed (consumers need this to
  judge old results).
- `src/version.ts` holds the version; a test checks it against `package.json`.

## Git, PRs and releases

- Never commit to `main` (the only exception was the initial commit that created it). Short-lived
  branch (`feature/`, `fix/`, `refactor/`, `docs/`, `chore/`, `audit/`), Conventional Commits
  (`type(scope): summary`), PR to `main`, merged with a merge commit (no squash).
- **Gates**, run by CI on every PR on Node 22 and 24: `typecheck`, `typecheck:ts7`, `lint`,
  `format:check`, `test`, `build`, `check:dist`. A report names all seven with their result; a
  skipped one is named as skipped.
- **Review by an independent agent** before reporting to Thomas, on every PR without exception:
  an agent that does not know the work gets only repository, branch and purpose and checks the
  diff for errors, edge cases, contradictions with this file, and domain claims against code and
  sources. Findings are verified, then fixed or answered, and listed in the PR ("Review").
- **Merge only on Thomas' explicit OK.**
- **Releases:** procedure in `README.md`. The release PR is merged on Thomas' OK; **Thomas sets
  the tag by hand** (maintainer, 2026-11-08). Before tagging, `origin/main` must be the release
  PR's merge commit; afterwards `release.yml` must be green.
- **npm:** `release.yml` submits each tagged version with `npm stage publish` (trusted publishing,
  allowed action "stage" only); **Thomas approves it** with 2FA (maintainer, 2026-11-08). Never
  publish from a working copy other than a clean checkout of the tag; a stale checkout put `0.0.0`
  on npm (issue #3). No placeholder packages.
- Commits end with `Co-Authored-By: …`; in sessions with a link (claude.ai) also with
  `Claude-Session: …`. On Thomas' computer commit with
  `git config user.email 6277652+manganite@users.noreply.github.com` (GitHub rejects the private
  address, GH007). In a cloud session Claude commits with its own signed identity.

## Cloud-session limits (claude.ai)

- Tag push and the tag API fail (403).
- GraphQL is blocked, so no `gh pr create` or `gh issue view`. Use REST:
  `gh api repos/manganite/symcrys/pulls -f title=… -f head=<branch> -f base=main -f body=…`;
  merge `gh api -X PUT repos/manganite/symcrys/pulls/N/merge -f merge_method=merge`.
- The session's GitHub access rewrites the "Generated with Claude Code" footer of PR texts; put
  the session link on its own line above it.

## Consumers (for orientation; symcrys does not depend on them)

- **Teaching apps:** copy `dist/` of a tagged version into `lib/kern/` with a MANIFEST, via
  `sync.mjs` of crystallography-common; they stay build-free. Their `checkJs` reads the `.d.ts`.
- **birss-app:** npm dependency with a pinned version.
- All consumers call symcrys by its English names, without a translation layer, and take a new
  version when they choose.

## Decisions (with reason)

- **TypeScript 6.0, checked also with 7.0** (2026-11-08): typescript-eslint 8.72 supports
  TypeScript below 6.1 only, and TypeScript 7.0.2 offers no stable compiler API (only
  `typescript/unstable/*`), so ESLint cannot parse `.ts` with it (checked 2026-11-08). TypeScript 7
  is installed as the aliased dev dependency `typescript7`, and the gate `typecheck:ts7` keeps the
  code valid under 7, so switching is mostly a version bump once typescript-eslint supports it; only
  `scripts/check-dist.mjs`, which reads imports with `ts.preProcessFile` of TypeScript 6, then needs
  another way to read them. Scripts
  call both compilers by path, because the two packages compete for the `tsc` command. The
  `.d.ts` files are read by TypeScript 6 and 7 (the apps check with 7.0.2).
- **vitest** as in birss-app (there 4.1, here 5.1); its tests move over with relative imports
  given the `.js` extension. **Prettier** with birss-app's settings, so moved code is not
  reformatted.
- **Two type checks** (2026-11-08): library code without environment types
  (`tsconfig.build.json`), everything else with Node types (`tsconfig.json`), so tests can read
  reference files from disk while the library stays environment-free.
- **No `engines` field**: the library needs only ES2022 with ES modules, and a narrow range would
  warn consumers needlessly; the development requirement is in `README.md`.
- **Release tarball on GitHub** (2026-11-08): every release carries the `npm pack` tarball, so the
  apps' `sync.mjs` and birss-app can take a version without building symcrys and before it is on
  npm.
- **The npm package also ships `src/`** (without test-only code), so source maps and declaration
  maps resolve; the apps copy only `dist/`.
- **`exports` with `default`, not `import`** (2026-11-08): `require('symcrys')` then works too
  (Node 22.12+ can require ES modules), and so do tools that resolve only `default`.
