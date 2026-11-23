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
- **Two packages, one implementation** (maintainer, 2026-11-19, #30): the TypeScript library
  (`packages/ts`, npm) and a thin Python layer (`packages/python`, PyPI) that runs the bundled
  `dist/` of the same version in an embedded JavaScript engine. Results agree by construction
  (up to rounding in the last bit of a float, from the engines' `Math`); every calculation is written, tested and documented once, in TypeScript.

## Layout

| Path                   | What                                                                                                                   |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `packages/ts`          | the npm package `symcrys`: `src/`, `dist/`, `package.json`, `tsconfig.build.json`, a README for npm                    |
| `packages/python`      | the PyPI package `symcrys`: `pyproject.toml`, `src/symcrys/`, `tests/`, `examples/`                                    |
| `references/`, `docs/` | shared by both packages; `docs/` is also the source of the documentation site                                          |
| `scripts/`, `audit/`   | repository tools: `check-dist.mjs`, `bundle-python.mjs`, `python-docstrings.mjs`; the audits against sibling checkouts |
| root `package.json`    | private npm workspace: the dev dependencies and the gates                                                              |

Below, `src/`, `dist/` and `tsconfig.build.json` without a prefix are those of `packages/ts`.
Decision on the layout (maintainer, 2026-11-19, #30): two package folders, as first proposed in
#30, rather than a `python/` folder beside the TypeScript package. The npm package, its release
tarball and the trusted publisher on npm stay as they were; a checkout for
crystallography-common's `sync.mjs --kern` is `packages/ts` of a symcrys checkout.

## Hard constraints

- **No DOM, no UI, no I/O in library code** (everything in `src/` except test-only code, see
  "Tests"). `tsconfig.build.json` type-checks it with neither DOM nor Node types, and ESLint
  forbids a list of environment globals and any non-relative import there.
- **No runtime dependencies** unless Thomas agrees. The TypeScript package has none. The Python
  package depends on `quickjs-ng` (the JavaScript engine; MIT, wheels `abi3` from Python 3.10) and
  NumPy (maintainer, 2026-11-19). The apps copy `dist/` and run it unbundled in
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
| Supported versions, how to report a vulnerability                                        | `SECURITY.md`                               |
| Open work, ideas, open questions                                                         | GitHub issues of this repository            |
| Conventions (axis frames, settings, symbols, ITC vs Birss) with their literature anchors | `docs/conventions.md`                       |
| Guides and examples for users (the documentation site)                                   | `docs/` (Sphinx with MyST)                  |
| What a function or type does                                                             | its TSDoc comment in `packages/ts/src`      |
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
  Sources are in Thomas' Zotero, in the collection _Projekte › Crystallography-Apps_, which also
  holds the literature of the app family (maintainer, 2026-11-14: one place for the literature of
  all repositories). A source newly cited in symcrys is added there; if it is missing from Zotero,
  import it by DOI or ISBN and check its metadata against the printed source (for a book: authors,
  year, edition and publisher against the title page).
  Ask Thomas for a volume that is not at hand.
- **Further books for questions of convention and group theory** (Thomas, 2026-11-20), all in his
  Zotero; consult them, beside ITC and Birss, before putting such a question to him: Litvin
  (magnetic groups; _Acta Cryst._ A**64**, 419 (2008)), Koster, Dimmock, Wheeler & Statz,
  _Properties of the Thirty-Two Point Groups_ (1963), Liboff, _Primer for Point and Space Groups_
  (2004), Paufler, _Physikalische Kristallographie_, and for group theory Wipf, Rosebrock,
  Brückler and Glosauer (editions and page offsets in `CLAUDE.md` of crystallography-common,
  "Literatur"). State of the files (2026-11-20): Liboff has no PDF in Zotero. The PDF of Paufler
  (`7SL8TECS`) reads through the Zotero tools since its repair on 2026-11-20 (it had been stored
  inside an upload envelope). The scan
  repeats pages, so the offset between PDF and printed page grows (22 at p. 60, 40 at p. 316): read
  the printed number on the page. Its counts for the magnetic properties (31, 58, 66 groups;
  pp. 66, 140, 240) agree with ITC Vol. D; its Tables 6.11 (p. 141) and 7.6 (pp. 240 ff.) give the forms after
  Bhagavantam and Birss.

## Pure ITC (decided 2026-11-22; the code follows in the ITC migration)

Decided by Thomas on 2026-11-22 (#106, #110), after a review of 0.10.0 and an audit of the API
against ITC: earlier decisions led to special solutions for the existing apps, which is not a good
way. symcrys is to be efficient, logically structured, user-friendly and **strictly ITC**; an
application adapts to symcrys, not the other way round (this sharpens "ITC standard for every
consumer" below). This section is binding for all new work.
The sections below that it replaces describe the code as it still is; the ITC migration (#121,
#126) changes code, `docs/conventions.md` and those sections together and rewrites them to the new
state (#127). Until then (Thomas, 2026-11-22): existing behaviour keeps working and is fixed where
broken, since it is the safety net of the migration (#121), and new exports take no `convention`
option. The Birss mode, its data and its birss-app pins were removed in step 5 of #121 (#121,
2026-11-23); passages below that describe them are history until #127 rewrites them.

- **One convention, ITC.** The option `convention` and the Birss output mode go; so do birss-app's
  order of the operations, its generators and its axis signs as API behaviour, the special reading
  of `mm'm'` and `6'/mmm'` by `findPointGroup` (#46), and the birss-app pins as reference. The
  conversion to Birss's presentation belongs in birss-app (#125). Replaces "Two conventions: ITC
  (default) and Birss" below and the Birss parts of the decisions under "Point groups" and
  "Tensors".
- **No special solutions for applications.** An application's choice is no longer a reason. A
  choice that print leaves open is made by ITC's conventions where they extend to the case,
  otherwise with Thomas, and recorded here; replaces "birss-app is the reference where print leaves
  a choice open". The special solutions found so far are listed in #110; each stays until #110 or
  its own issue decides it, and none of these patterns is extended in new work (they are tagged
  "under review" below).
- **ITC is the source of the data.** The data move from the Birss frame into the ITC frame; nothing
  is derived from Birss any more (how they are stored: #122). Long-term clarity and the inner
  structure of the project come before the amount of work. The print-verified Birss tests (Birss
  Tables 3, 4a–4f, 6, 7 and the generating matrices σ(N) of eq. (2.17); Tables 3 and σ(N) confirmed
  by Thomas on 2026-11-22) stay as an independent second print check: Birss's operations and the ITC forms are
  carried into one frame and compared there (`testUtils/birssFrame.ts`).
- **Settings as ITC prints them.** Only settings that ITC prints, selected by their ITC symbol
  with the index as a second handle (#116; design of the setting record: #123); missing ones are
  added (unique axis a, rhombohedral axes #111). "Printed by ITC" means printed as the symbol of
  the point group in that orientation anywhere in ITC, not only in ITA Table 3.2.3.2 (Thomas,
  2026-11-22, after a search of the volumes): so `mm2` keeps `2mm` and `m2m` (ITA 2016 § 1.6.4,
  p. 114, "the three point groups 2mm, m2m and mm2"; ITC Vol. D Tables 1.2.3.1, p. 49, and 1.5.7.1,
  p. 135), and `2'm'm` keeps all six orientations (ITC Vol. D pp. 111, 113, 135–136, 139–140).
  The inventory of what ITC prints is `references/itc/orientations.md`. Its reading (Thomas,
  2026-11-23, #121): a grey group has every setting of its class, since it is the class with time
  reversal (ITC Vol. D eq. (1.5.2.1)), although ITC prints grey groups in their standard
  orientation only; a symbol in a list of group types without a frame counts as printed in the
  orientation its positions name (so `6'/mmm'` keeps `6'/mm'm`, Vol. D Table 1.2.6.12, p. 66);
  orientations that ITC prints only as site symmetries in another lattice (`2.mm`, `mm2` turned
  30° in a hexagonal cell) are not settings. Every trigonal group gets the rhombohedral setting of
  its class, a black-and-white group where the hexagonal setting it comes from exists (Thomas,
  2026-11-23).
- **Tolerant input**, in every entry point, where it is a pure normalisation before the comparison
  and the input stays unambiguous (spaces, overbar spellings such as `-`, a combining overbar or
  `bar`, prime variants, Birss's printed forms such as `m3m`); an input that could match two groups
  or settings is an error that lists the candidates (#96). Decided further by Thomas on 2026-11-23
  (#96): a Schoenflies symbol names the group and gives its default setting. Revised by Thomas on
  2026-11-23 in #151 (replacing his earlier answer that a symbol with spaces is a full symbol first,
  `3 2` the rhombohedral setting, and the rule of #150 that compared full symbols with their spaces):
  spaces carry no meaning, since print writes the symbols without them; a symbol that names several
  settings gives the standard (ITC default) setting, also in `{ setting }` (where it was an error),
  as a name without ITA's headline means the standard; the other settings are chosen by the options
  `axes` (`'hexagonal'`, which holds for every group of the hexagonal family, or `'rhombohedral'`)
  and `uniqueAxis`, named as ITA's headlines name them, in every function with `setting` and in
  `findPointGroup`; criteria that no setting meets are an error. Implemented in
  #121 step 7b (`notation.ts`; `docs/conventions.md`, "Reading symbols"). Chosen while
  implementing (#151): further spellings that are unambiguous, the right single quotation mark `’`
  as a prime, the minus sign and the hyphens as the overbar, `¯` after the digit (the overbar of the
  text layer of the ITA 2016 PDFs), LaTeX's `\bar{3}` and subscripts (`C_{3v}`); `{ setting }`
  reads Birss's cubic symbols too, but no Schoenflies symbol, which names no setting.
- **Signs of axes:** the axis of an operation (for a reflection, its normal) carries the sign of its
  Seitz symbol (ITA 6th ed., Tables 1.4.2.1/1.4.2.2), in every entry point; Table 2.1.3.1 stays the
  anchor of the lattice symmetry directions (#114; for the plane groups, #107).
- **Reference edition:** ITA 6th ed. (2016). Exception, until there is another solution: what comes
  from the space-group tables (Ch. 2.3) keeps the 5th ed. (2006, Part 7) as anchor, because
  transcribing and checking the 230 space groups from as many separate PDFs of the 2016 edition is
  not feasible (#124). This is the one place for the reference edition.

## Two conventions: ITC (default) and Birss

_Replaced by "Pure ITC" above; describes the code until the ITC migration._

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
- **ITC output in the ITC convention, Birss output in the Birss convention** (maintainer,
  2026-11-18): in `'birss'` symcrys gives what birss-app gives today, so that birss-app shows the
  same once it moves onto symcrys; where Birss's print leaves a choice open (generators, order of
  the operations, sign of an axis), birss-app's choice holds. Behavioural pins captured from
  birss-app check it (`docs/conventions.md`, "Birss convention and birss-app"); for these choices
  they are the reference, not only regression detectors, because birss-app defines them. In `'itc'`
  the output follows ITA. Where symcrys has a setting birss-app lacks (`2'm'm`, settings 4 to 6),
  the Birss output follows the same rules and is unpinned until birss-app has the setting.

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
- Files in `references/` change only by transcription from print or by correction against it
  (maintainer, 2026-11-18). The one exception is the note on provenance in a file's head (where a
  transcription came from, what was reported where): it follows the current state of the source it
  names (maintainer, 2026-11-20). Notes on the state of symcrys do not belong there (which settings
  it has); they are in `docs/conventions.md` (maintainer, 2026-11-23, removed from
  `references/itc/orientations.md`). Prettier and ESLint leave these files alone.

## Tests

- Tests sit next to their module (`foo.ts`, `foo.test.ts`), as in birss-app.
- **Test-only code** is `*.test.ts`, `*.fixtures.ts`, `*.pins.json` and anything in a `testUtils/`
  folder (in `packages/ts/src`). It is
  type-checked with Node types (tests read `references/` from disk), may import Node built-ins,
  and is left out of `dist/` and the npm package; `check:dist` fails if any of it is built. Any
  other file in `src/` is library code.
- Test classes by file suffix: `*.reference.test.ts` (re-parse print transcriptions),
  `*.audit.test.ts` (exhaustive coverage), `*.pins.test.ts` (behavioural pins), plain `*.test.ts`;
  further suffixes from birss-app may come along. `npm test` runs all of them; no subset is a
  gate of its own.
- **Captured fixtures are JSON** (maintainer, 2026-11-19, #30): a capture script writes
  `*.pins.json` (one entry per line, left alone by Prettier, not in the npm package), so that the
  tests of another language read the same files; `src/testUtils/` reads them for the TypeScript
  tests. Hand-written fixtures in `.ts` move to JSON when they are next touched.
- **Python tests** (`packages/python/tests`, pytest) read the same `references/` and `*.pins.json`
  and have no expected values of their own (#30); in addition they test the layer itself (names,
  conversions, errors) and run the example notebooks.
- **ITC baseline pins** (#121): the safety net of the ITC migration. `testUtils/itcBaseline.ts`
  collects the ITC output of all three entry points over the public API; `audit/itc-baseline`
  (`npm run audit:itc-baseline`) writes it from a clean checkout as `itcBaseline.pins.json` in
  `pointGroups/`, `tensors/` and `spaceGroups/`, and `itcBaseline.pins.test.ts` compares. A PR of
  the migration that changes a pin lists every change and why, then re-captures; a rename changes
  only the calls in `itcBaseline.ts`. Python does not read these pins: the migration rewrites the
  Python layer (#98), whose own tests follow it.
- **Test timeout** 30 s (`vitest.config.ts`): several exhaustive tests take one to two seconds alone
  and four times that with every file in parallel on a slower machine (WSL, 12 workers).

## Public API and versions

- Public API = everything exported from the entries in `exports` of `package.json`: `src/index.ts`
  (`symcrys`, the crystallographic API), `src/magnetic.ts` (`symcrys/magnetic`, the magnetic
  API; "Point groups" below) and `src/plane.ts` (`symcrys/plane`, the plane groups; "Plane groups"
  below). Everything else is internal and may change freely.
- **Plain data at the API boundary** (maintainer, 2026-11-19, #30): exported functions take and
  return numbers, strings, booleans, arrays and plain objects; no classes, no functions, no `Map` or
  `Set` as arguments or results. A thin layer in another language (Python, #30) can then pass
  everything as JSON without knowing the module.
- SemVer. Before 1.0.0: MINOR for new features and for any breaking change, PATCH for fixes.
  From 1.0.0 on: MAJOR for breaking changes.
- `CHANGELOG.md` gets an entry for every change to the public API or to calculated results. A
  correction says what was wrong and since which version it is fixed (consumers need this to
  judge old results).
- **One version for both packages** (maintainer, 2026-11-19): `src/version.ts`,
  `packages/ts/package.json` and `packages/python/pyproject.toml`; tests in both languages check
  that they agree, and `npm run bundle:python` refuses to bundle otherwise.
- **The Python API follows the TypeScript API by fixed rules** (#30; `packages/python/src/symcrys/_convert.py`):
  function names and object keys camelCase → snake_case; an options object becomes keyword-only
  arguments; arrays of numbers become NumPy arrays (`float64` for matrices, Cartesian vectors,
  tensor bases and relations; `int64` for index lists, Miller indices and lattice directions);
  errors of the library raise `SymcrysError`, a `ValueError`. `symcrys.plane` converts its arrays
  field by field instead of by key ("The API of `symcrys/plane`" below). A new export of `src/index.ts` gets
  its Python function in `symcrys`, one of `src/magnetic.ts` in `symcrys.magnetic`, one of
  `src/plane.ts` in `symcrys.plane`, in the same PR; a test fails until it has one.
- **One description of every export: its TSDoc comment** (maintainer, 2026-11-20, #29). The
  TypeScript reference is generated from it (TypeDoc), and so are the docstrings of the Python
  functions and constants (`scripts/python-docstrings.mjs`, `npm run docs:python`, which rewrites
  them in `symcrys/__init__.py`, `symcrys/magnetic.py` and `symcrys/plane.py`), by the rules above: names in
  snake_case, the options object as a "Parameters" section of keyword arguments, `RangeError` as
  `SymcrysError`, `undefined`/`true`/`false` as `None`/`True`/`False`. Hand-written for Python is
  only what Python alone has, the shapes and dtypes of the NumPy arrays
  (`packages/python/docstrings.json`), and the module docstrings. So the summary of a TSDoc comment
  is written for both languages; what holds for TypeScript only (a frozen result, a test that keeps
  a value in step) goes into `@remarks`, which the Python docstrings leave out. The docstrings are
  committed, so that editors show them; the gate `docs` fails if one is missing or stale, or if a
  TypeScript name is left in it. A PR that changes a TSDoc comment runs `npm run docs:python`.
- **The engine stays replaceable** (#30): the whole boundary is one function, `call(name,
argsJson) → resultJson` (`_engine.py`, `scripts/bundle-python.mjs`; a name of the magnetic API has
  the prefix `magnetic.`, one of the plane API `plane.`), so another backend
  (Pyodide in JupyterLite) replaces one module. Not now: that second backend and a display layer
  such as `_repr_latex_` (presentation; ideas in #30).

## Git, PRs and releases

- Never commit to `main` (the only exception was the initial commit that created it). Short-lived
  branch (`feature/`, `fix/`, `refactor/`, `docs/`, `chore/`, `audit/`), Conventional Commits
  (`type(scope): summary`), PR to `main`, merged with a merge commit (no squash).
- **Gates**, run by CI on every PR, these seven on Node 22 and 24: `typecheck`, `typecheck:ts7`,
  `lint`, `format:check`, `test`, `build`, `check:dist`; and `python` on Python 3.10 and the newest
  (bundle, build sdist and wheel, install the wheel into a fresh environment, `mypy --strict`,
  `pytest`; maintainer, 2026-11-19, from the first PR of the Python package); and `docs` (#29):
  `npm run docs:check` (TypeDoc with every warning an error: an undocumented export, a broken
  link, a referenced type that is not exported; the Python docstrings current; the TypeScript
  examples of the site type-check) and `npm run docs:site` (Sphinx with `-W -n`: every example and
  notebook executed, every reference resolved). A report names all nine with their result; a
  skipped one is named as skipped. The external links (`npm run docs:linkcheck`) are checked by
  the job `linkcheck` (`linkcheck.yml`: on every PR, weekly and by hand), which is not a gate: a
  site elsewhere that is down for a while must not block a merge (maintainer, 2026-11-21). A red
  `linkcheck` is still looked at, and a link that is really dead is fixed. Locally: `npm run
build && npm run bundle:python`, then in `packages/python` `pip install -e ".[test]"`, `mypy` and `pytest`.
- **Review by an independent agent** before reporting to Thomas, on every PR without exception:
  an agent that does not know the work gets only repository, branch and purpose and checks the
  diff for errors, edge cases, contradictions with this file, and domain claims against code and
  sources. Findings are verified, then fixed or answered, and listed in the PR ("Review").
- **Merge only on Thomas' explicit OK.**
- **Repository settings** (maintainer, 2026-11-08): the ruleset `main` allows changes only
  through a pull request, merged with a merge commit, with `gates (22)`, `gates (24)`,
  `python (3.10)`, `python (3.x)` and `docs` (from 2026-11-21, #29) green on a branch up to date
  with `main`; no force push, no deletion. It requires no approval, because
  GitHub does not let Thomas approve his own PRs; his OK stays a process rule. Admins may bypass
  only through a pull request (e.g. when a check itself is broken), never by pushing directly.
  Squash and rebase merges are off, head branches are deleted after merge.
- **Documentation site** (#29): built from the tag by `release.yml` (jobs `site` and `pages`) and
  published on GitHub Pages, [manganite.github.io/symcrys](https://manganite.github.io/symcrys/).
  Settings by Thomas: Pages with the source "GitHub Actions", and a deployment rule for tags
  `v*.*.*` on the environment `github-pages`. Which checks the ruleset `main` requires: "Repository
  settings" above.
- **Releases:** procedure in `README.md`. The release PR is merged on Thomas' OK. **Who sets the
  tag depends on where the release work runs** (maintainer, 2026-11-21; replaces "Thomas sets the
  tag by hand", 2026-11-08): Claude Code on Thomas' computer sets it itself once the release PR
  is merged on his OK; in a cloud session, where pushing a tag fails
  ("Cloud-session limits"), Thomas sets it. Before tagging, `origin/main` must be the release PR's
  merge commit (`release.yml` refuses a tag that is not on `main`, #128); afterwards `release.yml`
  must be green.
- **npm:** `release.yml` submits each tagged version with `npm stage publish` (trusted publishing,
  allowed action "stage" only); **Thomas approves it** with 2FA (maintainer, 2026-11-08). Never
  publish from a working copy other than a clean checkout of the tag; a stale checkout put `0.0.0`
  on npm (issue #3). No placeholder packages.
- **PyPI** (maintainer, 2026-11-19): the same tag builds sdist and wheel, attaches them to the
  GitHub release, and the job `pypi` of `release.yml` publishes them by trusted publishing. It runs
  in the GitHub environment `pypi`, which needs **Thomas' approval** of each run; the trusted
  publisher on pypi.org names this repository, `release.yml` and `pypi`. No placeholder package:
  the name `symcrys` was taken on PyPI by the first real release, 0.5.0.
- Commits end with `Co-Authored-By: …`; in sessions with a link (claude.ai) also with
  `Claude-Session: …`. On Thomas' computer commit and tag with
  `git config user.email 6277652+manganite@users.noreply.github.com` (GitHub rejects the private
  address, GH007). In a cloud session Claude commits with its own signed identity.

## Cloud-session limits (claude.ai)

- Tag push and the tag API fail (403).
- GraphQL is blocked, so no `gh pr create` or `gh issue view`. Use REST:
  `gh api repos/manganite/symcrys/pulls -f title=… -f head=<branch> -f base=main -f body=…`;
  merge `gh api -X PUT repos/manganite/symcrys/pulls/N/merge -f merge_method=merge`.
- A draft PR cannot be marked ready (GraphQL only), so open PRs as regular PRs, not drafts.
- The session's GitHub access rewrites the "Generated with Claude Code" footer of PR texts; put
  the session link on its own line above it.

## Consumers (for orientation; symcrys does not depend on them)

- **Teaching apps:** copy `dist/` of a tagged version into `lib/kern/` with a MANIFEST, via
  `sync.mjs` of crystallography-common; they stay build-free. Their `checkJs` reads the `.d.ts`.
- **birss-app:** npm dependency with a pinned version.
- All consumers call symcrys by its English names, without a translation layer, and take a new
  version when they choose.

## Decisions (with reason)

- **TypeScript 6.0, checked also with 7.0** (2026-11-08): typescript-eslint 8.73 supports TypeScript
  below 6.1 only (peer range, checked 2026-11-18); its experimental `tsgo` backend
  (`parserOptions.backend`, optional peer `@typescript/native`) needs TypeScript 7.1 dev or beta
  builds, not 7.0.2, and is not public API. TypeScript 7.0.2 offers no stable compiler API (only
  `typescript/unstable/*`), so ESLint cannot parse `.ts` with it (checked 2026-11-08). TypeScript 7
  is installed as the aliased dev dependency `typescript7`, and the gate `typecheck:ts7` keeps the
  code valid under 7, so switching is mostly a version bump once typescript-eslint supports it; only
  `scripts/check-dist.mjs`, which reads imports with `ts.preProcessFile` of TypeScript 6, then needs
  another way to read them. Scripts call both compilers by path, because the two packages compete
  for the `tsc` command. The `.d.ts` files are read by TypeScript 6 and 7 (the apps check with
  7.0.2).
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

### Documentation

Decided by Thomas on 2026-11-20 (#29), asked before implementation, unless a point gives its own date.

- **Sphinx with MyST** for the site, `myst-nb` for the notebooks and the pages with Python code
  cells, autodoc with napoleon for the Python reference, and the HTML of TypeDoc beside it (`ts/`).
  Material for MkDocs, first proposed in #29, reached its end of life on 2026-11-05, and its
  successor Zensical was at 0.1 with preliminary support for API references. The tools are pinned
  in `docs/requirements.txt`, their whole environment in `docs/constraints.txt` (with Python 3.13,
  used as `PIP_CONSTRAINT` by CI and `release.yml`, #128), and the dev dependencies (TypeDoc 0.28, which accepts TypeScript 6.0,
  and `typedoc-plugin-missing-exports`, which documents the internal types that public signatures
  name), never dependencies of the packages.
- **Everything shown runs**: a TypeScript example of the site is a file in `docs/examples`, run
  with Node against the build when the site is built (directive `ts-example`,
  `docs/_ext/symcrys_docs.py`), its output shown as printed; Python code cells and the notebooks of
  `packages/python/examples` are executed; the table of named properties is made from
  `TENSOR_PROPERTIES`. A failing example fails the gate `docs`.
- **Conventions are included, not copied**: `docs/conventions.md` is a page of the site.
- **Only the newest version** on the site, which names it in its title; versioned pages from 1.0.0
  on, when the API holds still (#57).
- **Short READMEs** (root, `packages/ts` for npm, `packages/python` for PyPI): what symcrys is, how
  to install, one short example, the link to the site. The root README keeps development and
  releases.
- **An API report** (`@microsoft/api-extractor`, which ships TypeScript 6.0.3 itself) comes later,
  in a PR of its own (#56).
- **A PATCH release of its own** (0.6.1) puts the site online with the generated docstrings.
- **Findability** (maintainer, 2026-11-22, #72): every page has a description (`symcrys_page_descriptions`
  in `docs/conf.py`; the build warns about a page without one, so the gate `docs` fails), Open Graph
  tags and a canonical link (`html_baseurl`), and the build writes `sitemap.xml`. The sitemap is meant
  to be named in `robots.txt` of manganite.github.io, so that that repository keeps no list of the
  symcrys pages (done there after the release that brings it). Written in `docs/_ext/symcrys_docs.py`
  rather than with `sphinx-sitemap` and `sphinxext-opengraph` (chosen while implementing): about 50
  lines instead of two more pinned tools, one of which (`sphinx-sitemap`) pulls in
  `sphinx-last-updated-by-git`, which needs the git history of the pages. The landing page's browser
  title names its subject (`docs/_templates/base.html`; furo gives it the site's name alone). No image
  for link previews yet; symcrys has none of its own.

### ITC standard for every consumer

- **symcrys follows the ITC standard; an application adapts** (maintainer, 2026-11-21, #24): the API
  always follows ITC _(sharpened by "Pure ITC" above, which removes the Birss convention)_. Only in the
  Birss convention does it make the adjustments that are checked
  against Birss. If one of Thomas' apps deviates from the ITC standard (a frame, a setting, a
  symbol), the app does the conversion, not symcrys. Reason: symcrys is meant to be useful to other
  users too, and that works only if it follows what users of such a library expect, the ITC
  standard. Example: stereography keeps its own Cartesian frame and rotates symcrys' results into it.

### Point groups

The conventions themselves are in `docs/conventions.md`; here, what was decided and why.

- **Keys are ITC short symbols of the class** _(The reason "birss-app selects 'birss' anyway" is void
  under "Pure ITC"; the key of D3h: #115.)_ (maintainer, 2026-11-08, #13): ITC is the default
  convention, and birss-app selects `'birss'` anyway. For the 32 classes they equal birss-app's
  keys; for the magnetic groups they are the short symbols of ITC Vol. D Table 1.5.2.3,
  which differ from birss-app's keys for D2h(C2h) (`mm'm'`, birss-app `m'm'm`) and D6h(D3h)
  (`6'/mmm'`, birss-app `6'/mm'm`); a grey group is the class key followed by `1'`.
- **Order of work** (maintainer, 2026-11-08, #13): first the 32 crystal classes (type I) with
  settings, both conventions, symbols and the properties that follow from the operations; the 90
  magnetic groups (types II and III) in a second step. Data and code are shared; the split only
  keeps reviews small. **The magnetic groups come after stereography has moved onto symcrys**
  (maintainer, 2026-11-18, crystallography-common#99): the teaching apps do not need them and
  birss-app rests; adding them is additive, and the first real consumer tests the API early. **Magnetic groups and group properties in three PRs** (maintainer, 2026-11-19, #13, #41):
  data, symbols and operations; then the `'c'`-tensors and the named tensor properties; then the
  fixed properties of a class as fields of `pointGroup()`; released together as one MINOR.
- **Fixed properties are fields of `pointGroup()`** (maintainer, 2026-11-20, #41; decided on the
  call sites of stereography and birss-app, listed in #41): what is fixed once the group is named
  (`crystalSystem`, `order`, `centrosymmetric`, `polar`, `chiral`, `laueClass`; in the magnetic API
  also `type`, `crystalClass`) is data of the record, and the functions `isCentrosymmetric`,
  `isPolar`, `isChiral` and `laueClass` are removed, so that there is one way to ask (MINOR; a
  consumer that passes a function writes `(key) => pointGroup(key).polar`). A key and a list of
  operations are two cases: for the operations of a distorted crystal or a site symmetry there are
  `isCentrosymmetricOf(operations)` and `isChiralOf(operations)`, named like `tensorFormOf` and
  asking of the list what it asks (orthogonal matrices; in the magnetic API `timeReversal`); polar
  is there `allowsPropertyOf(operations, 'pyroelectric')`, and a Laue class needs the group
  identified first. _(Under review, #113.)_ **`holohedry(system)` is a function of the crystal system**, not a field:
  the holohedry depends on the group only through its system, and both readings for the trigonal
  classes have a consumer (birss-app shows `-3m`, the holohedry of the trigonal system;
  stereography needs `6/mmm`, the lattice symmetry in hexagonal axes:
  `holohedry(crystalFamily(system))`); a field would have had to pick one.
- **Symmetry elements as structured data** _(Axis signs and Birss part replaced by "Pure ITC" above:
  Seitz anchor, #114.)_ (maintainer, 2026-11-18, #16): symcrys describes each
  operation (`describeOperations`: kind, n, axis, sense, and in the magnetic API time reversal) and the elements along each
  symmetry direction (`symmetryDirections`); strings such as `4⁺ 0,0,z` or `2_z` stay in the
  applications, which also translate them. An axis is given both as a lattice direction [uvw] and as
  a Cartesian unit vector. In the ITC convention it has the sign of ITA Table 2.1.3.1, which fixes
  what the sense refers to and reproduces ITA's printed operation symbols; in the Birss convention
  the sign birss-app gives it (`docs/conventions.md`, "Symmetry directions and elements").
- **Operations in ITA's order in the ITC convention** _(Birss part replaced by "Pure ITC" above; describes the code until the ITC migration.)_
  (maintainer, 2026-11-18,
  crystallography-common#99): `operations` returns the operations as ITA numbers them, built coset
  by coset from ITA's selected generators (`docs/conventions.md`, "Order of the operations").
  Consumers draw and list operations in this order (stereography: poles, faces, face lists), so it
  should mean something and stay stable; the closure order had no meaning of its own. For the classes
  the set comes from ITA's selected generators (`pointGroups/itcData.ts`, #122).
- **Generators per convention** _(Birss part replaced by "Pure ITC" above; describes the code until the ITC migration.)_
  (maintainer, 2026-11-18, #25, #27): `generators` returns ITA's
  selected generators in the ITC convention and birss-app's (the stored ones) in the Birss
  convention (`docs/conventions.md`, "Generators").
- **Cartesian floating-point matrices with snapping** (maintainer, 2026-11-08, #13), as in
  birss-app, so its tests carry over; exact lattice-basis matrices when a consumer needs them
  (#24; since #121 step 6d the field `matrix` of every operation, "The operation record" below).
- **The operation record** (#137 A2, decided by Thomas on 2026-11-22; #94; #121 step 6d): an
  operation is `{ matrix, cartesian }`, in the magnetic API with `timeReversal`: `matrix` is ITA's
  W in the lattice basis in every entry point (as in `symcrys/plane`), `cartesian` the orthogonal
  matrix; `latticeOperations` is removed. Every function that takes operations from a caller and
  computes with Cartesian matrices reads `cartesian` and refuses a record without it, so that W
  cannot pass for a Cartesian matrix silently; `residualOperations` reads `matrix` and refuses one
  that is not integer. Chosen while implementing: inside the library the calculations work on
  `CartesianOperation` (`{ cartesian, timeReversal }`), so a record of the API passes as it is and
  a caller may build `{ cartesian }` alone; in Python `matrix` stays float64 by the fixed rule
  for matrices (#137 H may revisit it).
- **Properties that need tensors** come with the tensor module (maintainer, 2026-11-08, #13), as
  named tensor properties ("Tensors" below, #41).
- **Hexagonal frame x ∥ a, z ∥ c** (maintainer, 2026-11-08, #6): birss-app's frame, in which its
  print-verified tensor tests hold; ITC Vol. D puts the secondary direction of the trigonal groups
  along x₁ as well.
- **ITC anchor for the crystal classes** (maintainer, 2026-11-09, #13, #18): the operations of
  every ITC setting that ITA lists must equal its general position printed in ITA Table 3.2.3.2, a
  print anchor (class (a)) and so stronger than a derivation; it is also the basis for exact
  lattice-basis matrices later. In addition the ITC symbol of each setting, read along the symmetry
  directions of ITA Table 2.1.3.1 and closed independently, must give the same operations; this
  also covers `2mm`, `m2m` and monoclinic unique axis a, which ITA does not list. ITC Vol. D Table 1.5.2.3 is transcribed with
  the magnetic groups.
- **Stored frame and settings** _(Storage in the Birss frame and the Birss part replaced by "Pure ITC" above;
  the settings follow #116.)_ (2026-11-09, #14): data are stored once, in Birss's frame (setting
  1); every setting, the ITC ones included, is a rotation of it. A setting index names a physical
  frame and means the same in both conventions; the convention picks the default and the symbols and
  how the operations are presented (order, generators, axis signs), not their set. One data set then
  serves both conventions, and the Birss print tests apply directly.
- **birss-app is the reference where print leaves a choice open** (_replaced on 2026-11-22 by
  "Pure ITC" above; describes the code until the ITC migration_) (maintainer, 2026-11-09, #17):
  symcrys follows birss-app's current implementation unless it is wrong on the subject. The choices
  for the crystal classes were checked against birss-app 2be5fe3: D3h keeps the key and ITC
  default `-6m2` (print state in `docs/conventions.md`, "Keys"), and the Birss symbols that Birss
  does not print are derived as birss-app reads them. Where birss-app is not wrong but can be
  improved, symcrys improves on it only after clarifying with Thomas; `docs/conventions.md` records
  the difference with its reason, and #19 collects what birss-app takes over when it moves onto
  symcrys.
- **Site symmetry and Wyckoff positions** _(Birss part replaced by "Pure ITC" above; describes the code until the ITC migration.)_
  (maintainer, 2026-11-18, #24 item 1; asked before
  implementation): Wyckoff positions in the ITC convention only, because neither Birss nor birss-app
  has them (no Birss output to follow); the site symmetry itself, plain computation, in both. The
  representative is ITA's printed point and face as strings plus one numeric face (hkl) _(under review,
  #110 item 10, #115)_ with its
  Cartesian normal, since the apps work with face poles. "Lies on the element" uses an optional
  `tolerance`, default `EPSILON`, so that stereography can pass 10⁻⁴ for its rounded links while
  symcrys projects onto the fixed space. `mm2` settings 2 and 3 and monoclinic unique axis a, which
  ITA does not print, are
  derived from setting 1 by a permutation of the axes (settings cab and bca of ITA 2016 Table
  1.5.4.4, #122), with a test that reads the oriented symbol independently, as for the symbols.
  `siteSymmetry` takes any list of operations, so that a consumer can use it for
  the operations of a distorted crystal (stereography, `analyzeGroup`); whether stereography uses it
  so is decided when stereography moves (#24). The print anchor is ITA 6th ed. Table 3.2.3.2
  (`references/`); the 5th edition (Table 10.1.2.2, via stereography's form catalogue) is an
  additional check by `audit/wyckoff-2006`, not the reference (docs/conventions.md, "Site symmetry
  and Wyckoff positions").
- **Crystal forms, group identification, orbits** (maintainer, 2026-11-21, #24 items 2 and 3;
  asked before implementation). **Data of a form:** a table of the 47 forms of ITA Table 3.2.1.3
  (`CRYSTAL_FORM_TYPES`: number, English name as printed, number of faces, eigensymmetry), to which
  the forms of a class refer by number; the English names are terms of the print source, like the
  symbols, while names in other languages (stereography's German ones) and the link ids stay in the
  apps; point forms are left out. **Names**, in the `…Of` scheme: `crystalForms(key, { setting })`;
  `pointGroupOf(operations)` beside `pointGroup(key)`; `latticeOperations(key, { setting })` _(replaced
  by the field `matrix` of every operation, #121 step 6d)_;
  `orbit(key, …)`, exact in the lattice basis, and `orbitOf(operations, direction)`, Cartesian, with
  coinciding poles merged. **Tolerance:** an optional `tolerance`, default `EPSILON`, as for
  `siteSymmetry`. **Lattice-basis operations** for all families and settings, integer and without
  cell angles: the integer matrices of the point operations do not depend on the cell angles (ITA
  prints them as the general position), so the restriction of `latticeBasis` below does not apply;
  Cartesian matrices for a real monoclinic or triclinic cell belong to #24 item 4. **Identification:**
  `pointGroupOf` closes the list into a group, returns the key always and the setting only if the
  operations equal those of a setting in symcrys's frame, `undefined` if they form no crystallographic
  point group; the elements of any list of operations come from `describeOperationsOf`. **Three
  PRs, one MINOR:** forms; lattice operations and orbits; identification. Crystal forms are given in
  the ITC convention only, like the Wyckoff positions they belong to (decided by that precedent, not
  asked again). Asked while implementing the second PR _(replaced by "The operation record" above,
  #121 step 6d)_: `latticeOperations` returns the shape of
  `operations` (`{ matrix }`, index for index, in the magnetic API with `timeReversal`), so that a
  caller switches between the two lists, although Python then gives the integer matrices as float64
  under the fixed rule for `matrix`; `latticeOperations`, `orbit` and `orbitOf` are in both entry
  points, by the rule for new functions (a face's orbit does not depend on time reversal). The
  print anchor of the forms is ITA 6th ed. Tables 3.2.3.2 and 3.2.1.3, checked against each other;
  stereography's catalogue (ITA 2006) is an additional check by `audit/forms-2006`, not the
  reference (docs/conventions.md, "Crystal forms"). Chosen while implementing the third PR:
  `pointGroupOf` names the group by how often each combination of determinant, trace and time
  reversal occurs, which differs for all 122 groups (tested) and so names any point group in any
  orientation; it takes no convention, because a setting index means the same frame in both;
  `describeOperationsOf` signs its Cartesian axes as the Birss convention of `describeOperations`
  does (first non-zero component positive), since no lattice names them _(to be redefined with the
  Seitz anchor, #114, #127)_.
- **Rhombohedral axes** (#111, #121 step 6c; the setting itself decided by Thomas on 2026-11-23,
  "Pure ITC" above): the obverse axes in the hexagonal cell of setting 1 (ITA 2016 Table 1.5.1.1,
  p. 78), so the Cartesian operations are those of setting 1. Chosen while implementing, recorded on
  Thomas' OK (2026-11-23, PR #148): **`pointGroupOf`** names such operations setting 1, since the
  two settings hold the same Cartesian operations and a list of them cannot say which basis is
  meant; **a key is the key** in `findPointGroup`, also where it is the symbol of another setting
  (`32` gives setting 1, not the rhombohedral setting 3; before, no key was such a symbol), the
  rhombohedral setting is chosen by `{ axes: 'rhombohedral' }` (#96, step 7b); the **representative face** with rhombohedral axes takes h = 5, k = 2, l = 1,
  since (321) lies there on the limiting form (h,k,2k−h) and h = 4 would give printed faces with a
  common factor ((4,2,−6), (4,2,0)). The symbols of the magnetic groups in the rhombohedral setting
  follow the rule for all black-and-white symbols (the symbol of the class in that frame with the
  primes of the operations).
- **`latticeBasis` only for families with fixed cell angles** (2026-11-09, #14): for monoclinic
  and triclinic a Cartesian basis would need the cell angles, which a point group does not fix.
- **Two entry points, `symcrys` and `symcrys/magnetic`** (maintainer, 2026-11-20, #47): the
  crystallographic and the magnetic reading of a key are separated in the API, not only in the
  documentation. Thomas: someone who writes a purely crystallographic application deals with the 32
  crystal classes, and `32` is one of them; in an application in which magnetism plays a part, `32`
  is a colourless group, and for the properties of quartz one has to give the grey group `321'`.
  Chosen by Thomas among three proposals: two entry points with the same function names (the import
  decides the reading), rather than two families of names in one entry point
  (`tensorForm` / `magneticTensorForm`) or a context option. The crystallographic API has no time
  reversal at all (operations `{ matrix, cartesian }` since #121 step 6d, no time parity, no `type`, the time-even properties
  only), and a question that involves time reversal is an error that names the magnetic API,
  because a wrong reading should fail, not answer. Chosen while implementing _(under review, #110
  item 8)_: `timeParity: 'i'` and
  `timeReversal: false` are accepted in what a caller passes in, so that data of the magnetic API
  without time reversal can be handed on; for the same reason, in the other direction, the
  magnetic API refuses an operation that does not say whether it is combined with time reversal
  (operations of the crystallographic API), instead of reading it as a white group; a search
  (`findPointGroup`, `isPointGroupKey`) answers "not found" for a magnetic symbol, because not
  finding is the correct answer there; the magnetic API has the names of the crystallographic
  one also for the lists (`POINT_GROUP_KEYS` are there the 122 keys, `findPointGroup` finds all
  groups); Wyckoff positions and crystal forms stay with the crystallographic API, because ITA
  tabulates them for the classes only. One implementation serves both: the modules compute for all 122 groups, as
  the magnetic API exports them, and `crystalClasses.ts` checks what comes in and leaves time
  reversal out of what goes back, so the two agree by construction and every print-verified test
  serves both (`entryPoints.test.ts` checks the agreement). This replaces the first design of #13,
  one set of functions taking all 122 keys with a list of magnetic keys beside the classes. A new
  function is added to the shared modules and exported by both entry points, with its wrapper in
  `crystalClasses.ts` if a key, an operation or a tensor passes through it.
- **A search reads its argument as a symbol** _(Replaced by "Pure ITC" above; describes the code until the ITC migration.)_
  (maintainer, 2026-11-20, #46): `findPointGroup`
  gives the setting a symbol names, also where the string is a key, so that
  `findPointGroup(symbol(key, { convention, setting }), convention)` returns the setting. It
  matters for two keys in the Birss convention (`mm'm'`, `6'/mmm'`: the Birss symbols of setting
  2). Thomas on the alternative, a key always giving the default setting, which would have left
  these two symbols unfindable as symbols: it makes no sense, and in the end birss-app has to give
  the same as it does now, as far as that is mathematically correct; only real errors are fixed.
  birss-app names setting 2 of the two groups by exactly these symbols (2be5fe3:
  `conventionMapping.ts`, `symmetryGroups.ts`; in symcrys the pins of the setting symbols).
  Everywhere else a key is the key and means the default setting.
- **Magnetic point groups: order and generators in the ITC convention** (maintainer, 2026-11-19,
  #13; asked before implementation): ITC Vol. D prints neither (Table 1.5.2.3 groups the operators),
  so an operation of a black-and-white group keeps the number ITA gives it in the crystal class,
  time reversal being a mark on the operation, and a grey group lists the class first, then the
  same sequence with time reversal. The other proposal, the subgroup without time reversal first
  and its coset after it (ITC Vol. D eq. (1.5.2.2)), would have changed the numbers against the
  class. The generators follow the same idea: those of the class with their time reversal, for a
  grey group followed by `1'` (chosen while implementing).
- **Six settings of `2'm'm`** _(The six settings stay, all printed in ITC Vol. D ("Pure ITC" above); the
  reasons from birss-app and the numbering are replaced, #116, #123.)_
  (maintainer, 2026-11-20, #19): an orthorhombic group gets a setting
  for every distinct orientation of its axes. birss-app's standing decision (at most three settings
  per group, by the axis that carries the unique element) does not cover the one group whose three
  elements all differ; it has six orientations, and print uses all of them (Birss, four tables of
  ITC Vol. D, Paufler), so a reader who takes a symbol from print must be able to select it.
  Since #121 step 6b the six are numbered by the column order of ITA 2016 Table 1.5.4.4 (#137 A4;
  `docs/conventions.md`, "Settings"), and monoclinic unique axis a is setting 3 (#121 step 6c, #137 A5).
- **Symbols per volume** (#137 B2, B3, B5, decided by Thomas on 2026-11-22; #121 step 7a): each
  entry point writes the symbols of the volume it is anchored in. The magnetic API: the default
  setting of a grey or black-and-white group has its key as short symbol (`32'` as ITC Vol. D Table
  1.5.2.3 prints it; `321'`, the class key and `1'`), and Schoenflies symbols in `S6`; the
  crystallographic API:
  ITA's `321` and `C3i`. The types `'I'`, `'II'`, `'III'` are those of ITC Vol. D Table 1.2.6.12
  (p. 66). Chosen while implementing: a crystal class keeps ITA's short symbol (`321`) in the
  magnetic API too, so that a class has the same `settings` in both entry points and
  `{ setting: '32' }` selects the same setting in both; the symbol derived by the rule (`32'1`)
  still selects the default setting. Confirmed by Thomas on 2026-11-23
  (#150): the white groups keep `321`, and the default short symbol is the one of Table 1.5.2.3
  (`3m'`), although Vol. D writes `3m'1` where it sets the orientation against `31m'` (p. 140).
- **Magnetic point groups: data** _(Storage in the Birss frame replaced by "Pure ITC" above; the reason
  given for the type names is corrected in #109. Since #122 PR 2c the ITC full symbols of the
  black-and-white groups are stored, one per setting, and the rule runs the other way: the time
  reversal of the operations is derived from them (`pointGroups/itcMagneticData.ts`).)_ (2026-11-19, #13): stored like the classes, in the Birss frame
  with birss-app's generators and settings (birss-app 2be5fe3), ITC derived. Not stored: the grey
  groups (class and time reversal, ITC Vol. D eq. (1.5.2.1)) and the symbols of the black-and-white
  groups, which are the symbols of the class in the same frame with the primes of the operations;
  one rule then serves all settings and both conventions, and the print (58 full symbols of ITC
  Vol. D Table 1.5.2.3, 58 symbols of Birss Table 6) checks the rule instead of a list of strings.
  The types are named `'I'`, `'II'`, `'III'` as in birss-app; ITC Vol. D numbers them differently
  (`docs/conventions.md`, "Types").
- **Reading ITC Vol. D** (2026-11-19): the volume in Zotero (`YQKTNYVN`) is one PDF of 541 pages;
  the printed page number is the PDF page number plus 1 (checked at Table 1.5.2.3: PDF pages
  110–111 are printed pp. 111–112). Its text layer loses primes, overbars and underlines, so tables
  are transcribed from page images, not from extracted text.
- **Reading Birss** (2026-11-19): the scan in Zotero (`WKMPAPCY`, "Birss Symmetry & Magnetism
  komplett") has two printed pages on each PDF page; Table 6 (printed pp. 91–98) is on PDF pages
  55–59, rotated by 90°. Time reversal is an underline there, easy to miss at low resolution: read
  the pages enlarged. Its Shubnikov symbols agree with those of ITC Vol. D Table 1.5.2.3 for all 90
  groups, which a test now checks (two independent prints). The table has two misprints, kept as printed
  with errata in `references/birss/table-6.md`.

### Tensors

The conventions are in `docs/conventions.md` ("Tensors"); here, what was decided and why.

- **Results as numbers, not text** (maintainer, 2026-11-19, #30; asked before implementation):
  `tensorForm` and `tensorFormOf` return the basis in reduced row echelon form, the free parameters
  as index lists and the relations as coefficient rows. Relation strings
  (`\chi_{xxx} = -\chi_{xyy}`), LaTeX, Nye diagrams, Voigt matrices and trigonometric polynomials stay in the
  applications. Numbers serve every consumer (birss-app, the teaching apps, Python with NumPy);
  strings would fix one presentation, and this is the decision that is expensive to change later.
- **Scope: symmetry only** (maintainer, 2026-11-19): the form for a point group and for any list of
  operations, the named properties, rotation of a tensor. birss-app's SHG source terms (`computeShg`),
  lab geometry, simulator and polarimetry are applications of the forms and stay in birss-app.
- **Ranks 0 to 4 with all index symmetries of birss-app in the first step** (maintainer,
  2026-11-19): the print anchors for rank 4 (Birss Table 4f, Hoshi 1995) exist, and electric-
  quadrupole SHG of centrosymmetric crystals needs rank 4. In the ITC convention rank 4 is anchored
  by the diagrams of ITC Vol. D § 1.1.4.10.6 (#39; printed pp. 27–29, PDF pages 26–28; 29 for the
  crystal classes, compared with the computed forms, and one for the spherical system, compared with
  the isotropic tensors written out by hand). Reading them: crossing lines at 550 dpi, followed end
  to end; a dot with a half circle around it is passed by the line, not linked; where a line runs
  through a dot without ending there and without a bridge (44 in the diagrams of 3, -3), the printed
  count and the dot's own links decide, and the reading is noted in the transcription
  (`references/itc/vol-d-1.1.4.10.6-rank-4-forms.md`).
- **Names** _(The field names taken from birss-app are under review, #117.)_
  (maintainer, 2026-11-19): `tensorForm(key, spec, options)`,
  `tensorFormOf(operations, spec)`, `rotateTensor(tensor, rotation, spec)`; in the magnetic API
  `TensorSpec` with birss-app's fields (`rank`, `parity`, `timeParity`, `intrinsic`), so birss-app
  passes its specifications unchanged; in the crystallographic API without `timeParity` (#47).
- **Free parameters are the pivots of the reduced row echelon form** _(Birss part replaced by "Pure ITC" above; describes the code until the ITC migration.)_: the lowest component
  independent of those before it. This is birss-app's rule since its Q0 reduction, so in the Birss
  convention the parameters agreed with birss-app by name and order without a rule of their own
  (behavioural pins, removed with the Birss mode), and in the ITC convention the same rule
  applies to the ITC setting.
- **An index symmetry that does not apply at the rank is an error** (2026-11-19): birss-app ignores
  `'voigt'` at rank 3 and the like; a library call with it is a mistake of the caller, and silently
  computing another tensor would hide it.
- **Time reversal is built in** _(Birss part replaced by "Pure ITC" above; describes the code until the ITC migration.)_
  (#13): an operation with `timeReversal` changes the sign of a
  `'c'`-tensor, so the magnetic point groups use the same tensor code, and in the magnetic API
  `tensorForm` and the functions for named properties take all 122 keys. Their forms are anchored in print in both
  conventions: Birss's Table 7 with Tables 4b–4f, and ITC Vol. D Tables 1.5.2.4, 1.5.7.1 and 1.5.8.1
  (`docs/conventions.md`, "Tensors").
- **Crystal class and white group are two readings of one key** (maintainer, 2026-11-20): the 32
  crystal classes are not simply the 32 white magnetic groups. In a purely crystallographic context
  quartz has the class `32`; in the context of magnetism it has the grey group `321'`, and `32`
  there means a magnetically ordered crystal without any time reversal in its symmetry (Birss p. 84,
  Paufler p. 60). The operations are the same, so the key is the same string, and the entry point
  says which reading is meant ("Two entry points" above). birss-app does not make the distinction
  clear yet (#19).
- **Named tensor properties, one generic call** (maintainer, 2026-11-19, #41; names asked before
  implementation, 2026-11-20): a property that is the question whether a tensor is allowed is an
  entry of the table `TENSOR_PROPERTIES` (name → `TensorSpec`, description, print source), not a
  function of its own, so a new property is a line of data, and the same call serves a key and any
  list of operations: `allowsProperty(key, name)`, `allowedProperties(key)`,
  `allowsPropertyOf(operations, name)`, `allowedPropertiesOf(operations)`; `tensorForm` and
  `tensorFormOf` (and `rotateTensor`) take a name in place of a specification. `isPiezoelectric` is
  removed (MINOR).
  Chosen by Thomas among the proposals: `allows…` rather than `has…`, because symmetry allows a
  property and does not say the crystal has it; names as adjectives (`'pyroelectric'`,
  `'piezoelectric'`, `'gyrotropic'` for optical activity, `'ferromagnetic'`, `'magnetoelectric'`,
  `'piezomagnetic'`; the three time-odd ones in the magnetic API only, #47); these six and no more
  for now (`'ferroaxial'` came as the seventh, below); `allowedProperties` returns the names only (the
  form is one `tensorForm` call away); one name per kind of tensor, so second-harmonic generation,
  which has the tensor of `'piezoelectric'`, gets no name of its own.
- **`'ferroaxial'`, the seventh property** (maintainer, 2026-11-20, #41): Thomas' group works on
  ferroaxial materials beside chiral ones (NiTiO₃, class `-3`) and asked for a query for "axial".
  It is a named property like the others, a time-even axial vector, in both APIs; Thomas agreed to
  the name `'ferroaxial'` rather than "axial", because `'axial'` already is the parity of a tensor
  and five of the seven properties have an axial tensor. Not a field of `pointGroup()`: a question
  whether a tensor is allowed is a named property (above), which also serves a list of operations.
  ITC Vol. D does not tabulate the property; the term is cited from Hlinka et al., _Phys. Rev.
  Lett._ **116**, 177602 (2016) (in Zotero without PDF, so the 13 classes are not checked against
  its table), and the print anchor of the classes is Birss's Tables 4a and 4c
  (`docs/conventions.md`, "Named properties").
- **A printed form is compared in the setting its symbol names** (2026-11-20): ITC Vol. D § 1.5.7.1
  (p. 134) ties each form to the orientation given by the Hermann–Mauguin symbol and lists further
  orientations in square brackets, so the tests look every printed symbol up among the ITC symbols
  of the settings instead of assuming the default setting; this also tests the symbols of the
  non-default settings against print.
- **Reading Birss Table 7** (2026-11-20): printed pp. 103–108, PDF pages 61–64 of the scan
  (`WKMPAPCY`), rotated by 90°; the text that explains it is on pp. 102 and 109–110 (group A by
  eq. (3.24), group B, the meaning of the parentheses). The transcription of birss-app agrees with
  the book in all 90 rows. The book leaves out parentheses in two rows; both are recorded printing
  errors (birss-app, `docs/findings/`, 2026-07-04), kept as printed with errata in
  `references/birss/table-7.md`, and the tests expect the corrected cells.
- **birss-app's documentation first** (2026-11-20, on Thomas' question whether it had been read): what looks like an open question
  on Birss's tables, the settings or the three types of groups is usually decided and reasoned
  there. Before asking Thomas or deciding anew, read birss-app's `STATUS.md` (standing decisions),
  `docs/references/` (conventions, Birss/ITC divergences), `docs/findings/` (book errors, bracket
  semantics) and the notes in its copy of the tables, `birss-tables/`. The repository
  manganite/birss-tables holds the same tables (synchronized in manganite/birss-tables#4); only in
  birss-app are `table-nomenclature.md` and the scripts in `birss-tables/tools/` that generate it
  (with a transcription of ITC Vol. D Table 1.5.2.3 in `generate_nomenclature.py`) and birss-app's
  data. What symcrys finds beyond that goes to #19.
- **Speed** (#30, measured 2026-11-19): birss-app's reduction, bundled, takes under QuickJS
  (`quickjs-ng`) 3–112 ms per class for the SHG tensor and up to about 0.3 s at rank 4 (m-3m), 10–35
  times Node; enough for a Python layer that calls symcrys a few times per material. Forms per
  class, setting and kind of tensor are cached.

### Plane groups (and later space groups)

Decided by Thomas on 2026-11-22 (#31, where the questions, the proposals and the answers are
recorded), asked before implementation, each among proposals with a recommendation; what is chosen
while implementing gets its own note here.

- **Exact inside, plain numbers at the API; a type of its own** (#31 question 1): an operation with
  a translation is computed exactly, the matrix as integers in the lattice basis and the translation
  as fractions (integer numerator over the smallest denominator), so that comparing operations and
  points of the group data modulo the lattice needs no tolerance. At the API it is
  `{ matrix, translation }` in the lattice basis: `matrix` a d × d matrix with integer entries, the
  object shape `{ matrix }` of the lattice operations of the point groups with `translation` added, and `translation` as
  numbers (1/3 as the nearest double), as spglib gives its symmetry (integer rotations, float
  translations), which is what users of such a library expect. The Cartesian operations of the
  crystal classes and magnetic groups (`operations`, tensors) stay as they are _(since #121 step 6d
  an operation of a point group is `{ matrix, cartesian }`, `matrix` W as here, "The operation
  record")_. The alternatives were
  exact fractions at the API ([numerator, denominator] pairs: unusual, and every consumer would
  compute with fractions itself), floating point with snapping as for the point groups (not exact;
  comparisons modulo 1 with a tolerance, cf. plane-groups `CLAUDE.md`, "Toleranzen der Bestimmung")
  and one type for all groups (would have broken the point-group API, and tensors are Cartesian).
  Functions that take a point from a caller (floating point) take an optional `tolerance`, as
  `siteSymmetry` does. NumPy types in Python: "The API of `symcrys/plane`" below.
- **One module for every dimension**: written for d = 2 and d = 3, so that the space groups for the
  3D app are the same module with d = 3, not a further implementation.
- **The arithmetic** (chosen while implementing, PR #76; `src/spaceGroups/`): a rational is a pair
  [numerator, denominator] of safe integers in lowest terms with a positive denominator, so that
  equal numbers have equal pairs; every intermediate product and sum is checked, and a value
  outside the safe integers throws rather than rounds. An operation (W, w) has d from 1 to 3. The
  closure gives one representative per coset of the integer translations, translations in [0, 1),
  breadth first from the identity; this order has no meaning of its own (ITA's order comes with the
  data, as for the point groups). It refuses a generator with det W ≠ ±1 (a typo in transcribed
  data would otherwise close into a monoid) and stops at 192 cosets (Fm-3m in its conventional
  cell), a bound that a closure in a larger cell raises by an option. Coordinate triplets are read
  as ITA prints them, with integer coefficients and every character consumed, so that a stray sign
  is an error.
- **First step: the 17 plane groups** (#31 question 2), one MINOR in several PRs: the type, its
  arithmetic and the closure; the data of ITA (operations in ITA's order, selected generators,
  centring, origin, asymmetric unit, Wyckoff positions), transcribed to `references/` and tested
  against print; the description of the operations (kind, location, glide part, as in ITA's
  "Symmetry operations") and the symmetry elements in a cell; site symmetry, orbit and the Wyckoff
  position of a point. The determination of the group of a pattern (plane-groups' `bestimmung.js`)
  follows in a second MINOR, built on the first; it is the largest part (cell reduction, metric,
  choice of cell and origin, tolerances), and plane-groups can move most of its calculations
  before it.
- **Description of an operation** (chosen while implementing, PR #78; `src/spaceGroups/describe.ts`,
  fields in its TSDoc): structured and exact, as for the point groups ("Symmetry elements as
  structured data"); the symbols such as `g(1/2,1/2) x,x` stay with the applications. The kinds
  `'mirror'` and `'glide'` match `'mirror'` of the point groups. The line of a mirror or glide is
  given by its direction and one point; the point on y = 0 (on x = 0 for a line along a) is one fixed
  choice among many, so that equal lines give equal data. Checked against print: the symbols written
  from the description reproduce every printed "Symmetry operations" entry of the 17 groups
  (`describe.reference.test.ts`); invariants that do not depend on the computation (a centre is
  fixed, a point of the line moves by the glide vector) cover the operations shifted by lattice
  translations, where print has no centres of order ≥ 3 away from the origin.
- **Points: orbit, site symmetry, Wyckoff position** (chosen while implementing, PR #79;
  `src/spaceGroups/positions.ts`): a point from a caller has floating-point coordinates in the
  lattice basis, so these functions work in floating point on the exact operations, with the
  `tolerance` of #31 measured per coordinate modulo the lattice (default `EPSILON`), as
  `siteSymmetry` does for directions; a tolerance in the lattice basis needs no metric, which a
  plane group does not fix; it must stay below 1/2. As `siteSymmetry` does, the operations fixing the
  point are closed under products and the point is set onto the fixed space of the closure (the mean
  of its images), repeated until stable, so a large tolerance still gives a subgroup. The Wyckoff position is the printed row of the point's
  multiplicity whose printed coordinates (with the centring) reach the point, so letter and
  oriented symbol come from print, not from a rule of symcrys. Checked: every printed point of every
  Wyckoff position of the 17 groups, displaced by about 3·10⁻⁸ in both directions, gives its printed letter, multiplicity,
  symbol and printed orbit (`positions.reference.test.ts`).
- **Snapping onto a Wyckoff position** _(Under review, #108; not to be extended.)_
  (`snapToWyckoffPosition`, decided by Thomas on 2026-11-22,
  #85; chosen while implementing, PR #104; `src/spaceGroups/snap.ts`): the criterion of plane-groups
  (`lage`, `einrasten`), the distance of the point to the point set of a position, not of its images:
  per printed coordinate expression with every centring, the parameters by least squares in the
  lattice coordinates, accepted if both coordinate differences are below the tolerance; points before
  lines before the general position. Different from the app, among positions of the same kind the
  nearest wins, not the first in print order; the two differ only near the crossing of two lines,
  where the nearer line is the better answer. The least-squares point is not always the nearest in
  the per-coordinate measure (on `x,2x` it reaches 0.8 of the tolerance), as in the app. Checked:
  every printed point of every Wyckoff position snaps onto its letter (`snap.reference.test.ts`).
- **Asymmetric unit and elements in the cell** _(Under review, #110 items 12 and 13; not to be extended.)_
  (chosen while implementing, PR #80;
  `src/spaceGroups/cell.ts`): exact rationals inside, as the rest of the module. The asymmetric unit
  is the polygon of the printed inequalities, given by its vertices (counter-clockwise from the
  lowest) and, per edge, the printed inequality that holds it with integer coefficients without a
  common factor; printed bounds that hold no edge (e.g. `y <= 2/3` in p3) are left out, so every
  inequality is an edge to draw. The elements are found by describing every operation shifted by the
  lattice translations that can reach the cell (bound in the code), keeping what meets [0, 1]² with
  its boundary: a centre with the highest order about it, a line with its segment, as a glide line
  with its glide reduced to s·direction, 0 < s < 1. Checked against print: the printed vertices
  (hexagonal groups) and the printed inequalities read as text; centres and mirror lines from the
  Wyckoff positions (no free parameter and a rotation; one free parameter and a mirror) with their
  lattice translates; every printed glide; all lines also derived independently from the printed general
  position (ITA prints no glide line of p4mm, p3m1, p31m, p6mm); and from the group alone the area 1/|G|, one image of a
  general point inside, each line the element of an operation, the lines mapped onto themselves
  (`cell.reference.test.ts`).
- **No frieze, layer or magnetic plane groups for now** (#31 question 3): no consumer needs them;
  the dimension-generic module keeps them possible (idea in #74).
- **Entry point `symcrys/plane`, later `symcrys/space`** (#31 question 4), as `symcrys/magnetic`
  (#47): the import decides how a key is read, and the root entry point stays the crystal classes
  in 3D. `symcrys/plane` holds the 10 plane point groups and the 17 plane groups, with the function
  names of the other entry points where the notion is the same; in Python `symcrys.plane`. Keys are
  the symbols ITA prints for the plane: `'p2mg'`, `'c2mm'` for the plane groups, `'2mm'`, `'4mm'`
  etc. for the plane point groups (the plane point group `2mm` is the class `mm2` with its 2 normal
  to the plane); the two sets do not overlap, since a plane group's symbol begins with its lattice
  letter. The operations of a plane point group are the linear parts of its symmorphic plane group
  (pm for `m`, p3m1 and p31m for the settings of `3m`), one data source with the plane groups
  (chosen while implementing, PR #82): the first plan, the crystal classes restricted to the plane,
  fails for `m`, since no setting of the class `m` has its mirror normal to a, as pm has
  (`-x,y`); a test checks that every plane group's linear parts are its point group.
- **The API of `symcrys/plane`** (Thomas, 2026-11-22, #31, asked with proposals and a
  recommendation): **`planeGroup(key)`** names the function that gives a plane group (number,
  symbols, point group, system, centring), not `spaceGroup` as recommended (one name for plane and
  space): a name that says what it is serves teaching and the apps; `symcrys/space` will have
  `spaceGroup`. The other names come from the other entry points (`operations`, `generators`,
  `wyckoffPositions`, `siteSymmetry`, `orbit`, `describeOperations`) and take the key of a plane
  group or of a plane point group. **The plane point groups in the lattice basis** (integer 2 × 2
  matrices, the type of the plane groups, so that the point group of a plane group is its linear
  part), and `3m` in two settings, `3m1` and `31m`, as in p3m1 and p31m. **Asymmetric unit and
  symmetry elements in the cell as numbers in symcrys**: the asymmetric unit as inequalities
  (coefficients of a·x + b·y ≤ c) with its vertices, the elements as rotation centres with their
  order and lines with kind, glide vector and segment in the cell [0, 1]², so that the calculation
  is in one place for all apps; the segment is the part nearest the drawing that still is geometry.
  **Python:** `matrix` float64 by the fixed rule, as for the point groups; `translation` float64.
  Asked in a second round (Thomas, 2026-11-22, #31, all four recommendations taken): **functions of a
  point take the key**, `siteSymmetry(key, point)`, `wyckoffPositionOf(key, point)`,
  `orbit(key, point)` with `{ tolerance }` (the site symmetry needs the group modulo the lattice;
  arbitrary lists of operations belong to the determination); **names** `asymmetricUnit(key)` and
  `symmetryElements(key)`, ITA's terms; **plane point groups** with ten keys as in ITA Table 3.2.1.1
  and `3m` in the settings 1 = `3m1` and 2 = `31m` (`{ setting }`, `pointGroup`, `symbol`, as in
  `symcrys`); their **positions and edge forms** (ITA Table 3.2.3.1) later, #81. Chosen while
  implementing (PR #82): the Python layer converts the results of `symcrys.plane` itself (a translation,
  point, vertex or segment float64 even where its entries are integers; a direction of a line int64,
  although `direction` is a float key of the fixed rule, which means a Cartesian vector there); a
  Wyckoff position gives all printed coordinates of its (0,0)+ set (`coordinates`, a list), since ITA
  prints them all for the plane groups; fields and functions as in `symcrys` where the notion is the
  same (`crystalSystem`, `settings(key)` as a list of settings with `index`, `symbol`, `default`,
  `wyckoffPositionOf` giving the same record as `wyckoffPositions`; review of PR #82). Asked in a third round (Thomas,
  2026-11-22, #84, #85; recommendations taken): **`describeOperationsOf(operations)`** describes any
  list of operations of the plane, the name of the other entry points for the same notion; a
  translation is read as a fraction with a denominator of at most 12, within 10⁻⁹ (chosen while
  implementing, as proposed in the question). **`normal`** _(sign: #107, #114)_ of a mirror or glide line, its symmetry
  direction in the lattice basis (ITA Table 2.1.3.1), in the descriptions and in each line of
  `symmetryElements`, so that an application can assign a line to a position of the symbol without a
  metric. **Snapping** onto the nearest Wyckoff position by the distance to the position, the most
  special first, gets a function of its own, `snapToWyckoffPosition(key, point, { tolerance })` (#85), rather
  than an option of `wyckoffPositionOf`, which keeps its criterion (the distance of the images).
- **Print anchor: ITA 6th edition (2016), Chapter 2.2** _(The reference edition and its exception are
  stated in "Pure ITC" above.)_ (#31, asked together with the four
  questions): the 6th edition is the reference of symcrys for what it holds (`docs/conventions.md`,
  "Sources"); for the crystal classes only the order of the operations, the selected generators and the
  symbols of the operations come from the space-group tables of the 5th edition (Part 7). The
  2016 volume in Zotero (`7NZ258UB`) holds Chapters 2.1 (`9W72G6EC`) and 3.2 (`Y6Z8P8NR`), and
  Thomas added Chapter 2.2 on 2026-11-22 as one PDF per plane group (attachments
  `sgtable2o2o001` to `sgtable2o2o017`); plane group n is printed on p. 175 + n (checked at 7, 8, 9
  and 17; "the 17 types of plane groups (Chapter 2.2)", Ch. 2.1, p. 142, which also says that the
  data of Chapters 2.2 and 2.3 closely follow the earlier edition). Their text layer keeps overbars
  (as `¯` after the letter) but takes fractions apart, so the tables are transcribed from page
  images. The 5th
  edition (2006, `3SDKZZFX`), Part 6, pp. 92–109, against which plane-groups is tested, becomes an
  additional check by `audit/plane-groups-2006` (against plane-groups' transcription,
  `js/ebenengruppen.js`), not the reference; printed p. 92 is PDF page 235 (checked at that page
  only). The data of the 17 groups (`src/spaceGroups/planeGroupData.ts`) hold what the pages print
  except the diagrams, the Patterson symmetry, the symmetry operations as text (kept in `references/`, the anchor of their
  description in a later PR) and the reflection conditions (not transcribed: plane-groups leaves
  diffraction to the diffraction app); the selected generators must close into the printed general
  position, or `planeGroupOperations` throws, as for the point groups.
