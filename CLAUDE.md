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

- **No DOM, no UI, no I/O in `src/`.** `tsconfig.json` has neither DOM nor Node types, and ESLint
  forbids environment globals and non-relative imports in library code.
- **No runtime dependencies** unless Thomas agrees. The apps copy `dist/` and run it unbundled in
  the browser; `scripts/check-dist.mjs` fails on any import in `dist/` that is not a relative
  `.js` path.
- **One-way dependency.** symcrys knows nothing about crystallography-common, the apps or
  birss-app. Exception: scripts under `audit/` may read sibling checkouts (`../birss-app`,
  `../stereography`); they are never part of the build or of CI.
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
- Files in `references/` change only to correct them against print.
- Test classes by file suffix: `*.reference.test.ts`, `*.audit.test.ts`, `*.pins.test.ts`, plain
  `*.test.ts`. `npm test` runs all of them and is the only gate.

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
- **Gates**, run by CI on every PR on Node 22 and 24 and quoted in full in every report:
  `typecheck`, `typecheck:ts7`, `lint`, `format:check`, `test`, `build`, `check:dist`.
- **Review by an independent agent** before reporting to Thomas, on every PR without exception:
  an agent that does not know the work gets only repository, branch and purpose and checks the
  diff for errors, edge cases, contradictions with this file, and domain claims against code and
  sources. Findings are verified, then fixed or answered, and listed in the PR ("Review").
- **Merge only on Thomas' explicit OK.**
- **Releases:** procedure in `README.md`. The release PR is merged on Thomas' OK; **Thomas sets
  the tag by hand** (maintainer, 2026-11-08). Before tagging, `origin/main` must be the release
  PR's merge commit; afterwards `release.yml` must be green.
- **npm:** Thomas publishes the first version by hand, after the first release tag; later
  publishing from `release.yml` via Trusted Publishing is to be set up then (issue #3). No
  placeholder packages.
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

- **TypeScript 6.0, checked also with 7.0** (2026-11-08): typescript-eslint supports TypeScript
  below 6.1 only, and the npm package of TypeScript 7 has no JavaScript API, so ESLint cannot parse
  `.ts` with it (checked 2026-11-08). The gate `typecheck:ts7` keeps the code valid under 7, so
  switching later is a version bump once typescript-eslint supports it. The `.d.ts` files are read
  by any TypeScript version, including the apps' TypeScript 7.
- **vitest** as in birss-app, so its tests move over unchanged. **Prettier** with birss-app's
  settings, so moved code is not reformatted.
- **Tests next to the module** (`foo.ts`, `foo.test.ts`), as in birss-app; left out of `dist/` by
  `tsconfig.build.json`.
- **Release tarball on GitHub** (2026-11-08): every release carries the `npm pack` tarball, so the
  apps' `sync.mjs` and birss-app can take a version without building symcrys and before it is on
  npm.
- **The npm package also ships `src/`** (without tests), so source maps and declaration maps
  resolve; the apps copy only `dist/`.
