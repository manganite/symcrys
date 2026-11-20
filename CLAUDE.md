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

| Path                   | What                                                                                                |
| ---------------------- | --------------------------------------------------------------------------------------------------- |
| `packages/ts`          | the npm package `symcrys`: `src/`, `dist/`, `package.json`, `tsconfig.build.json`, a README for npm |
| `packages/python`      | the PyPI package `symcrys`: `pyproject.toml`, `src/symcrys/`, `tests/`, `examples/`                 |
| `references/`, `docs/` | shared by both packages                                                                             |
| `scripts/`, `audit/`   | repository tools: `check-dist.mjs`, `bundle-python.mjs`; the audits against sibling checkouts       |
| root `package.json`    | private npm workspace: the dev dependencies and the gates                                           |

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
  (maintainer, 2026-11-18); Prettier and ESLint leave them alone.

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

## Public API and versions

- Public API = everything exported from the entries in `exports` of `package.json`: `src/index.ts`
  (`symcrys`, the crystallographic API) and `src/magnetic.ts` (`symcrys/magnetic`, the magnetic
  API; "Point groups" below). Everything else is internal and may change freely.
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
  errors of the library raise `SymcrysError`, a `ValueError`. A new export of `src/index.ts` gets
  its Python function in `symcrys`, one of `src/magnetic.ts` in `symcrys.magnetic`, in the same PR;
  a test fails until it has one.
- **The engine stays replaceable** (#30): the whole boundary is one function, `call(name,
argsJson) → resultJson` (`_engine.py`, `scripts/bundle-python.mjs`; a name of the magnetic API has
  the prefix `magnetic.`), so another backend
  (Pyodide in JupyterLite) replaces one module. Not now: that second backend and a display layer
  such as `_repr_latex_` (presentation; ideas in #30).

## Git, PRs and releases

- Never commit to `main` (the only exception was the initial commit that created it). Short-lived
  branch (`feature/`, `fix/`, `refactor/`, `docs/`, `chore/`, `audit/`), Conventional Commits
  (`type(scope): summary`), PR to `main`, merged with a merge commit (no squash).
- **Gates**, run by CI on every PR on Node 22 and 24: `typecheck`, `typecheck:ts7`, `lint`,
  `format:check`, `test`, `build`, `check:dist`; and `python` on Python 3.10 and the newest
  (bundle, build sdist and wheel, install the wheel into a fresh environment, `mypy --strict`,
  `pytest`; maintainer, 2026-11-19, from the first PR of the Python package). A report names all
  eight with their result; a skipped one is named as skipped. Locally: `npm run build && npm run
bundle:python`, then in `packages/python` `pip install -e ".[test]"`, `mypy` and `pytest`.
- **Review by an independent agent** before reporting to Thomas, on every PR without exception:
  an agent that does not know the work gets only repository, branch and purpose and checks the
  diff for errors, edge cases, contradictions with this file, and domain claims against code and
  sources. Findings are verified, then fixed or answered, and listed in the PR ("Review").
- **Merge only on Thomas' explicit OK.**
- **Repository settings** (maintainer, 2026-11-08): the ruleset `main` allows changes only
  through a pull request, merged with a merge commit, with `gates (22)` and `gates (24)` green on
  a branch up to date with `main`; no force push, no deletion. It requires no approval, because
  GitHub does not let Thomas approve his own PRs; his OK stays a process rule. Admins may bypass
  only through a pull request (e.g. when a check itself is broken), never by pushing directly.
  Squash and rebase merges are off, head branches are deleted after merge.
- **Releases:** procedure in `README.md`. The release PR is merged on Thomas' OK; **Thomas sets
  the tag by hand** (maintainer, 2026-11-08). Before tagging, `origin/main` must be the release
  PR's merge commit; afterwards `release.yml` must be green.
- **npm:** `release.yml` submits each tagged version with `npm stage publish` (trusted publishing,
  allowed action "stage" only); **Thomas approves it** with 2FA (maintainer, 2026-11-08). Never
  publish from a working copy other than a clean checkout of the tag; a stale checkout put `0.0.0`
  on npm (issue #3). No placeholder packages.
- **PyPI** (maintainer, 2026-11-19): the same tag builds sdist and wheel, attaches them to the
  GitHub release, and the job `pypi` of `release.yml` publishes them by trusted publishing. It runs
  in the GitHub environment `pypi`, which needs **Thomas' approval** of each run; the trusted
  publisher on pypi.org names this repository, `release.yml` and `pypi`. The name `symcrys` is
  taken on PyPI only by the first real release (pending publisher, no placeholder).
- Commits end with `Co-Authored-By: …`; in sessions with a link (claude.ai) also with
  `Claude-Session: …`. On Thomas' computer commit with
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

### Point groups

The conventions themselves are in `docs/conventions.md`; here, what was decided and why.

- **Keys are ITC short symbols of the class** (maintainer, 2026-11-08, #13): ITC is the default
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
  fixed properties of a class as fields of `pointGroup()`; released together as one MINOR. The
  rank-4 forms of ITC Vol. D (#39) follow in a PR of their own.
- **Symmetry elements as structured data** (maintainer, 2026-11-18, #16): symcrys describes each
  operation (`describeOperations`: kind, n, axis, sense, and in the magnetic API time reversal) and the elements along each
  symmetry direction (`symmetryDirections`); strings such as `4⁺ 0,0,z` or `2_z` stay in the
  applications, which also translate them. An axis is given both as a lattice direction [uvw] and as
  a Cartesian unit vector. In the ITC convention it has the sign of ITA Table 2.1.3.1, which fixes
  what the sense refers to and reproduces ITA's printed operation symbols; in the Birss convention
  the sign birss-app gives it (`docs/conventions.md`, "Symmetry directions and elements").
- **Operations in ITA's order in the ITC convention** (maintainer, 2026-11-18,
  crystallography-common#99): `operations` returns the operations as ITA numbers them, built coset
  by coset from ITA's selected generators (`docs/conventions.md`, "Order of the operations").
  Consumers draw and list operations in this order (stereography: poles, faces, face lists), so it
  should mean something and stay stable; the closure order had no meaning of its own. The closure of
  the stored generators stays the source of the set; the ordering throws if ITA's generators give a
  different set. In the Birss convention the order is birss-app's (above).
- **Generators per convention** (maintainer, 2026-11-18, #25, #27): `generators` returns ITA's
  selected generators in the ITC convention and birss-app's (the stored ones) in the Birss
  convention (`docs/conventions.md`, "Generators").
- **Cartesian floating-point matrices with snapping** (maintainer, 2026-11-08, #13), as in
  birss-app, so its tests carry over; exact lattice-basis matrices when a consumer needs them.
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
  also covers `2mm` and `m2m`, which ITA does not list. ITC Vol. D Table 1.5.2.3 is transcribed with
  the magnetic groups.
- **Stored frame and settings** (2026-11-09, #14): data are stored once, in Birss's frame (setting
  1); every setting, the ITC ones included, is a rotation of it. A setting index names a physical
  frame and means the same in both conventions; the convention picks the default and the symbols and
  how the operations are presented (order, generators, axis signs), not their set. One data set then
  serves both conventions, and the Birss print tests apply directly.
- **birss-app is the reference where print leaves a choice open** (maintainer, 2026-11-09, #17):
  symcrys follows birss-app's current implementation unless it is wrong on the subject. The choices
  for the crystal classes were checked against birss-app 2be5fe3: D3h keeps the key and ITC
  default `-6m2` (print state in `docs/conventions.md`, "Keys"), and the Birss symbols that Birss
  does not print are derived as birss-app reads them. Where birss-app is not wrong but can be
  improved, symcrys improves on it only after clarifying with Thomas; `docs/conventions.md` records
  the difference with its reason, and #19 collects what birss-app takes over when it moves onto
  symcrys.
- **Site symmetry and Wyckoff positions** (maintainer, 2026-11-18, #24 item 1; asked before
  implementation): Wyckoff positions in the ITC convention only, because neither Birss nor birss-app
  has them (no Birss output to follow); the site symmetry itself, plain computation, in both. The
  representative is ITA's printed point and face as strings plus one numeric face (hkl) with its
  Cartesian normal, since the apps work with face poles. "Lies on the element" uses an optional
  `tolerance`, default `EPSILON`, so that stereography can pass 10⁻⁴ for its rounded links while
  symcrys projects onto the fixed space. `mm2` settings 2 and 3, which ITA does not print, are
  derived from setting 1 by rotation, with a test that reads the oriented symbol independently, as
  for the symbols. `siteSymmetry` takes any list of operations, so that a consumer can use it for
  the operations of a distorted crystal (stereography, `analyzeGroup`); whether stereography uses it
  so is decided when stereography moves (#24). The print anchor is ITA 6th ed. Table 3.2.3.2
  (`references/`); the 5th edition (Table 10.1.2.2, via stereography's form catalogue) is an
  additional check by `audit/wyckoff-2006`, not the reference (docs/conventions.md, "Site symmetry
  and Wyckoff positions").
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
  reversal at all (operations `{ matrix }`, no time parity, no `type`, the time-even properties
  only), and a question that involves time reversal is an error that names the magnetic API,
  because a wrong reading should fail, not answer. Chosen while implementing: `timeParity: 'i'` and
  `timeReversal: false` are accepted in what a caller passes in, so that data of the magnetic API
  without time reversal can be handed on; for the same reason, in the other direction, the
  magnetic API refuses an operation that does not say whether it is combined with time reversal
  (operations of the crystallographic API), instead of reading it as a white group; a search
  (`findPointGroup`, `isPointGroupKey`) answers "not found" for a magnetic symbol, because not
  finding is the correct answer there; the magnetic API has the names of the crystallographic
  one also for the lists (`POINT_GROUP_KEYS` are there the 122 keys, `findPointGroup` finds all
  groups); Wyckoff positions stay with the crystallographic API, because ITA tabulates them for
  the classes only. One implementation serves both: the modules compute for all 122 groups, as
  the magnetic API exports them, and `crystalClasses.ts` checks what comes in and leaves time
  reversal out of what goes back, so the two agree by construction and every print-verified test
  serves both (`entryPoints.test.ts` checks the agreement). This replaces the first design of #13,
  one set of functions taking all 122 keys with a list of magnetic keys beside the classes. A new
  function is added to the shared modules and exported by both entry points, with its wrapper in
  `crystalClasses.ts` if a key, an operation or a tensor passes through it.
- **A search reads its argument as a symbol** (maintainer, 2026-11-20, #46): `findPointGroup`
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
- **Six settings of `2'm'm`** (maintainer, 2026-11-20, #19): an orthorhombic group gets a setting
  for every distinct orientation of its axes. birss-app's standing decision (at most three settings
  per group, by the axis that carries the unique element) does not cover the one group whose three
  elements all differ; it has six orientations, and print uses all of them (Birss, four tables of
  ITC Vol. D, Paufler), so a reader who takes a symbol from print must be able to select it.
  Settings 1 to 3 keep birss-app's frames and indices, so its pins hold unchanged; 4 to 6 are added
  after them. This goes beyond birss-app with Thomas' agreement to the proposal (the rule above); #19 records it for
  birss-app. Not changed: the monoclinic groups keep two settings (unique axis b and c; a is not a
  standard setting, as in birss-app).
- **Magnetic point groups: data** (2026-11-19, #13): stored like the classes, in the Birss frame
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
  quadrupole SHG of centrosymmetric crystals needs rank 4.
- **Names** (maintainer, 2026-11-19): `tensorForm(key, spec, options)`,
  `tensorFormOf(operations, spec)`, `rotateTensor(tensor, rotation, spec)`; in the magnetic API
  `TensorSpec` with birss-app's fields (`rank`, `parity`, `timeParity`, `intrinsic`), so birss-app
  passes its specifications unchanged; in the crystallographic API without `timeParity` (#47).
- **Free parameters are the pivots of the reduced row echelon form**: the lowest component
  independent of those before it. This is birss-app's rule since its Q0 reduction, so in the Birss
  convention the parameters agree with birss-app by name and order without a rule of their own
  (behavioural pins, `packages/ts/src/tensors/birssApp.pins.json`), and in the ITC convention the same rule
  applies to the ITC setting.
- **An index symmetry that does not apply at the rank is an error** (2026-11-19): birss-app ignores
  `'voigt'` at rank 3 and the like; a library call with it is a mistake of the caller, and silently
  computing another tensor would hide it.
- **Time reversal is built in** (#13): an operation with `timeReversal` changes the sign of a
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
  for now; `allowedProperties` returns the names only (the
  form is one `tensorForm` call away); one name per kind of tensor, so second-harmonic generation,
  which has the tensor of `'piezoelectric'`, gets no name of its own.
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
  semantics) and the notes in its copy of the tables, `birss-tables/`, which is ahead of the
  repository manganite/birss-tables. What symcrys finds beyond that goes to #19.
- **Speed** (#30, measured 2026-11-19): birss-app's reduction, bundled, takes under QuickJS
  (`quickjs-ng`) 3–112 ms per class for the SHG tensor and up to about 0.3 s at rank 4 (m-3m), 10–35
  times Node; enough for a Python layer that calls symcrys a few times per material. Forms per
  class, setting and kind of tensor are cached.
