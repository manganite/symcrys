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

| Path                   | What                                                                                                                                              |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/ts`          | the npm package `symcrys`: `src/`, `dist/`, `package.json`, `tsconfig.build.json`, a README for npm; `api/`, the API reports (not in the package) |
| `packages/python`      | the PyPI package `symcrys`: `pyproject.toml`, `src/symcrys/`, `tests/`, `examples/`                                                               |
| `references/`, `docs/` | shared by both packages; `docs/` is also the source of the documentation site                                                                     |
| `scripts/`, `audit/`   | repository tools: `check-dist.mjs`, `bundle-python.mjs`, `python-api.mjs`; the audits against sibling checkouts                                   |
| root `package.json`    | private npm workspace: the dev dependencies and the gates                                                                                         |

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
  birss-app. Exception: scripts under `audit/` may read sibling checkouts (`../stereography`,
  `../plane-groups`); they are run by hand, never by the build, the tests or CI. Lint and format
  apply to them like to any other file, except generated reports (`audit/**/report.md`), which
  Prettier leaves alone. The scripts are not type-checked, because they import the sibling
  checkouts.
- **Relative imports carry the `.js` extension** (`NodeNext`), so `dist/` runs in browsers and in
  Node without a bundler.

## Where things go

| What                                                                                         | Where                                       |
| -------------------------------------------------------------------------------------------- | ------------------------------------------- |
| Working mode, process, decisions with their reason                                           | this file                                   |
| Purpose, use, build commands, release procedure                                              | `README.md`                                 |
| Changes per version                                                                          | `CHANGELOG.md` (Keep a Changelog)           |
| Supported versions, how to report a vulnerability                                            | `SECURITY.md`                               |
| Open work, ideas, open questions                                                             | GitHub issues of this repository            |
| Conventions (axis frames, settings, symbols, Birss as second check) with their print anchors | `docs/conventions.md`                       |
| Guides and examples for users (the documentation site)                                       | `docs/` (Sphinx with MyST)                  |
| What a function or type does                                                                 | its TSDoc comment in `packages/ts/src`      |
| Transcribed reference tables re-parsed by tests                                              | `references/`, with source and printed page |

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
- **Newnham for property tensors** (Thomas, 2026-11-25): R. E. Newnham, _Properties of Materials:
  Anisotropy, Symmetry, Structure_ (Oxford University Press, 2005), in Zotero (`G32GB96M`, PDF
  `UKXAALX2`; metadata checked against the title page and the imprint). The printed page is the PDF
  page number − 13 (page index − 12 counting from 0; checked on every numbered page). It gives the
  property tensors with their symmetry and their matrices, chapter by chapter (pyroelectricity,
  dielectric constant, piezoelectricity, elasticity, magnetic phenomena, electro-optic and nonlinear
  optical effects, optical activity), and so a further print check of the tensor forms and the Voigt
  conventions beside ITC Vol. D and Birss; consult it before putting a question on property tensors
  to Thomas. Its forms are in the IEEE settings (§ 4.3, p. 26: orthorhombic c < a < b; trigonal and
  hexagonal Z₁ ∥ a, Z₃ ∥ c, as symcrys), so a comparison brings both into one frame first, as for
  Birss.

## Pure ITC (decided 2026-11-22)

Decided by Thomas on 2026-11-22 (#106, #110), after a review of 0.10.0 and an audit of the API
against ITC: earlier decisions had led to special solutions for the existing apps, which is not a
good way. symcrys is efficient, logically structured, user-friendly and **strictly ITC**; an
application adapts to symcrys, not the other way round. The ITC migration (#121, 0.11) brought the
code to this state; the decisions below follow it.

- **One convention, ITC.** There is no option `convention` and no Birss output mode, and birss-app's
  order of the operations, its generators and its axis signs are not API behaviour. The conversion
  to Birss's presentation belongs in birss-app (#125).
- **No special solutions for applications.** An application's choice is no reason. A choice that
  print leaves open is made by ITC's conventions where they extend to the case, otherwise with
  Thomas, and recorded here. The special solutions found in 0.10 are listed in #110; none of these
  patterns is extended in new work.
  Example (maintainer, 2026-11-21, #24): stereography keeps its own Cartesian frame and rotates
  symcrys' results into it; symcrys is meant to be useful to other users too, who expect ITC.
- **ITC is the source of the data.** The data are stored in the ITC frame (#122); nothing is
  derived from Birss. Long-term clarity and the inner structure of the project come before the
  amount of work. The print-verified Birss tests (Birss Tables 3, 4a–4f, 6, 7 and the generating
  matrices σ(N) of eq. (2.17); Tables 3 and σ(N) confirmed by Thomas on 2026-11-22) stay as an
  independent second print check: Birss's operations and the ITC forms are carried into one frame
  and compared there (`testUtils/birssFrame.ts`).
- **Settings as ITC prints them.** Only settings that ITC prints, selected by their ITC symbol
  with the index as a second handle (#116, #123), including unique axis a and the rhombohedral
  axes (#111). "Printed by ITC" means printed as the symbol of the point group in that orientation
  anywhere in ITC, not only in ITA Table 3.2.3.2 (Thomas, 2026-11-22, after a search of the
  volumes): so `mm2` keeps `2mm` and `m2m` (ITA 2016 § 1.6.4, p. 114, "the three point groups
  2mm, m2m and mm2"; ITC Vol. D Tables 1.2.3.1, p. 49, and 1.5.7.1, p. 135), and `2'm'm` keeps all
  six orientations (ITC Vol. D pp. 111, 113, 135–136, 139–140). The inventory of what ITC prints is
  `references/itc/orientations.md`. Its reading (Thomas, 2026-11-23, #121): a grey group has every
  setting of its class, since it is the class with time reversal (ITC Vol. D eq. (1.5.2.1)),
  although ITC prints grey groups in their standard orientation only; a symbol in a list of group
  types without a frame counts as printed in the orientation its positions name (so `6'/mmm'`
  keeps `6'/mm'm`, Vol. D Table 1.2.6.12, p. 66); orientations that ITC prints only as site
  symmetries in another lattice (`2.mm`, `mm2` turned 30° in a hexagonal cell) are not settings.
  Every trigonal group has the rhombohedral setting of its class, a black-and-white group where
  the hexagonal setting it comes from exists (Thomas, 2026-11-23).
- **Tolerant input**, in every entry point, where it is a pure normalisation before the comparison
  and the input stays unambiguous (spaces, overbar spellings such as `-`, a combining overbar or
  `bar`, prime variants, Birss's printed forms such as `m3m`); an input that could match two groups
  is an error that lists the candidates (#96). A Schoenflies symbol names the group and gives its
  default setting (Thomas, 2026-11-23, #96). Spaces carry no meaning, since print writes the
  symbols without them; a symbol that names several settings gives the standard (ITC default)
  setting, also in `{ setting }`, as a name without ITA's headline means the standard; the other
  settings are chosen by the options `axes` (`'hexagonal'`, which holds for every group of the
  hexagonal family, or `'rhombohedral'`) and `uniqueAxis`, named as ITA's headlines name them, in
  every function with `setting` and in `findPointGroup`; criteria that no setting meets are an
  error (Thomas, 2026-11-23, #151, revising his earlier answers in #96 and #150; `notation.ts`;
  `docs/conventions.md`, "Reading symbols"). Chosen while implementing (#151): further spellings
  that are unambiguous (listed in `docs/conventions.md`, "Reading symbols"); `{ setting }` reads
  Birss's cubic symbols too, but no Schoenflies symbol, which names no setting.
- **Signs of axes:** the axis of an operation (for a reflection, its normal) carries the sign of its
  Seitz symbol (ITA 6th ed., Tables 1.4.2.1/1.4.2.2), in every entry point; Table 2.1.3.1 stays the
  anchor of the lattice symmetry directions (#114; for the plane groups, #107). Chosen while
  implementing (#121, the last step): the axis takes the direction of the Seitz symbol of its matrix
  W, transcribed from ITA 2016 Tables 1.4.2.1–1.4.2.3 (`pointGroups/seitzData.ts`), since neither
  rule at hand gives the printed directions: "first non-zero component positive" fails on `2₋₁₀₁`
  and `m₋₁₀₁` of the cubic table, the sign of Table 2.1.3.1 on `2₁₁₀` of the hexagonal one; in the plane the shortest normal with its first non-zero
  component positive is the Seitz direction of Tables 1.4.2.4 and 1.4.2.5 for every operation, so
  the plane groups keep that rule (tested against the tables).
- **Reference edition:** ITA 6th ed. (2016). Exception, until there is another solution: what comes
  from the space-group tables (Ch. 2.3) keeps the 5th ed. (2006, Part 7) as anchor, because
  transcribing and checking the 230 space groups from as many separate PDFs of the 2016 edition is
  not feasible (#124). This is the one place for the reference edition.

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

- Tests sit next to their module (`foo.ts`, `foo.test.ts`), as in birss-app; the test of a repository
  script next to the script (`scripts/assemble-site.test.mjs`), which vitest collects too.
- **Test-only code** is `*.test.ts`, `*.fixtures.ts`, `*.pins.json` and anything in a `testUtils/`
  folder (in `packages/ts/src`). It is
  type-checked with Node types (tests read `references/` from disk), may import Node built-ins,
  and is left out of `dist/` and the npm package; `check:dist` fails if any of it is built. Any
  other file in `src/` is library code.
- **Consistency tests** compare symcrys with itself under a change that must not matter: another
  unit, basis or setting (`invariance.test.ts`, #69), another entry point (`entryPoints.test.ts`).
  They find contradictions, not wrong values, and are no correctness authority; the expected values
  of correctness tests come from print ("Correctness and provenance").
- Test classes by file suffix: `*.reference.test.ts` (re-parse print transcriptions),
  `*.audit.test.ts` (exhaustive coverage), `*.pins.test.ts` (behavioural pins), plain `*.test.ts`.
  `npm test` runs all of them; no subset is a
  gate of its own.
- **Captured fixtures are JSON** (maintainer, 2026-11-19, #30): a capture script writes
  `*.pins.json` (one entry per line, left alone by Prettier, not in the npm package), so that the
  tests of another language read the same files; `src/testUtils/` reads them for the TypeScript
  tests. Hand-written fixtures in `.ts` move to JSON when they are next touched.
- **Python tests** (`packages/python/tests`, pytest) read the same `references/` and `*.pins.json`
  and have no expected values of their own (#30); in addition they test the layer itself (names,
  conversions, errors) and run the example notebooks.
- **ITC baseline pins** (#121): captured before the ITC migration as its safety net, kept as
  regression pins. `testUtils/itcBaseline.ts` collects the output of all three entry points over
  the public API; `audit/itc-baseline` (`npm run audit:itc-baseline`) writes it from a clean
  checkout as `itcBaseline.pins.json` in `pointGroups/`, `tensors/` and `spaceGroups/`, and
  `itcBaseline.pins.test.ts` compares. A PR that changes a pin lists every change and why, then
  re-captures; a change of the API's shape (a rename, a removed field) changes only
  `itcBaseline.ts`, which maps the current API back to the shape of the pins. Python does not read
  these pins; its own tests cover the layer.
- **Test timeout** 30 s (`vitest.config.ts`): several exhaustive tests take one to two seconds alone
  and four times that with every file in parallel on a slower machine (WSL, 12 workers).

## Public API and versions

- Public API = everything exported from the entries in `exports` of `package.json`: `src/index.ts`
  (`symcrys`, the crystallographic API), `src/magnetic.ts` (`symcrys/magnetic`, the magnetic
  API; "Point groups" below) and `src/plane.ts` (`symcrys/plane`, the plane groups; "Plane groups"
  below). Everything else is internal and may change freely. The API reports in `packages/ts/api/`
  (#56) show it; a PR that changes them changes the public API.
- **Own structure, named anchors** (Thomas, 2026-11-25, #120, #194, with birss-app as a model):
  symcrys organizes crystallographic data and methods in a structure of its own, and every name in
  it, of a function, parameter, field, type or internal identifier, says what the thing is in
  crystallographic terms (`cellTransformation`, `CELL_CHANGES`, `formType: 'tetragonal-prism'`).
  The usual notation of the field is that content and is used as it is: symbols, Wyckoff letters,
  coordinates such as `x,-y,z`, Miller indices `h,0,l`, the names of forms, group numbers. Results
  carry content only; the print sources that anchor their correctness are cited in the code (a
  comment or TSDoc `@remarks`), in `docs/` and in `references/`, and test-only code may be named
  after the anchor it checks. Data are derived where the group or the lattice gives them, and stored
  otherwise, in the form the calculation needs.
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
  arguments, and another object parameter its fields as arguments, those every signature requires
  positional, the others keyword-only (`lattice_from_parameters(3, 3, 5, 90, 90, 120)`,
  `orbit(key, hkl=…)`; #137 H2); arrays of numbers become NumPy arrays (`float64` for Cartesian matrices and vectors,
  tensor bases and relations; `int64` for index lists, Miller indices, lattice directions and the
  matrices W of the operations), by
  the name of their field (`packages/python/api.json`, "arrays"; `symcrys.plane` with a list of its
  own); a record becomes a dict, typed by a TypedDict of the same name as its TypeScript interface,
  and a list of operations one record of arrays, `Operations` ("Operations in Python" below);
  a `RangeError` of the library (wrong input) raises `SymcrysError`, a `ValueError`, any other
  error `SymcrysInternalError`, a `RuntimeError` (#137 D2). A new export of `src/index.ts` gets
  its Python function in `symcrys`, one of `src/magnetic.ts` in `symcrys.magnetic`, one of
  `src/plane.ts` in `symcrys.plane`, in the same PR, by `npm run docs:python` ("The Python modules
  are generated" below); a test fails until it has one.
- **One description of every export: its TSDoc comment** (maintainer, 2026-11-20, #29). The
  TypeScript reference is generated from it (TypeDoc), and so are the docstrings of the Python
  functions, constants and TypedDicts (`scripts/python-api.mjs`, `npm run docs:python`, which writes
  `symcrys/__init__.py`, `symcrys/magnetic.py` and `symcrys/plane.py`), by the rules above: names in
  snake_case, the options object as a "Parameters" section of keyword arguments, `RangeError` as
  `SymcrysError`, `undefined`/`true`/`false` as `None`/`True`/`False`. Hand-written for Python is
  only what Python alone has, the shapes and dtypes of the NumPy arrays
  (`packages/python/docstrings.json`), and the module docstrings. So the summary of a TSDoc comment
  is written for both languages; what holds for TypeScript only (a frozen result, a test that keeps
  a value in step) goes into `@remarks`, which the Python docstrings leave out. The docstrings are
  committed, so that editors show them; the gate `docs` fails if one is missing or stale, or if a
  TypeScript name is left in it. A PR that changes a TSDoc comment runs `npm run docs:python`.
- **The Python modules are generated** (#99, #137 H2; Thomas, 2026-11-24, generator before the
  changes of H1 and H2; #121 step 12a): `scripts/python-api.mjs` writes `symcrys/__init__.py`,
  `symcrys/magnetic.py` and `symcrys/plane.py` in full from the TypeScript entry points (TypeDoc's
  JSON): signatures, bodies, docstrings, a TypedDict for every record and a Literal type for every
  named union of strings, and `__all__`. Each result is converted by a schema written from its
  TypeScript type (`_convert.convert`), so the two languages cannot drift, and the gate `docs`
  fails on a stale module, not only on a stale docstring. Hand-written are `packages/python/api.json`
  (how TypeScript types become Python types where the types do not say it: the dtype of an array
  field, int or float for a number, a function's own argument or body in `_shared.py`, the fields
  of `Operations`; the
  module docstrings),
  `packages/python/docstrings.json` (the Returns sections), and the modules `_shared.py`,
  `_convert.py`, `_engine.py`. Chosen while implementing: the names of the TypedDicts are those of
  the TypeScript interfaces (`symcrys.plane.PlaneOperation`); each module
  has its own TypedDicts (a `PointGroup` of `symcrys.magnetic` has `type`); an optional field is
  `NotRequired` and every TypedDict `@final`, so that a type checker narrows a union by a key; a
  number not listed as int or float, an array field not listed as float64 or int64, a type the
  generator cannot read and an entry of `api.json` no module uses are errors of the generator. A
  key of a group is `str` in every field and parameter (tested, `test_api.py`), so a key type is
  written out in TypeScript, not derived from a list: the declarations expand a derived type to
  its values, and the generator reads a key by the name of its type (#97, review).
- **Operations in Python** (#137 H1, decided by Thomas on 2026-11-22, the type, a bare array in
  `symcrys.magnetic` and the access per operation on 2026-11-24; #121 step 12b): `operations`,
  `generators` and `residual_operations` give `Operations`, a frozen dataclass of read-only arrays,
  one row per operation: `matrix` (n, 3, 3) int64 and `cartesian` (n, 3, 3) float64, in
  `symcrys.magnetic` also `time_reversal` (n,) bool, in `symcrys.plane` `matrix` (n, 2, 2) and
  `translation` (n, 2). Beside the arrays, `ops[i]` and `for op in ops` give one operation as a dict
  (the TypedDict of the TypeScript record, `Operation` or `PlaneOperation`), and `ops[mask]` or
  `ops[[0, 2]]` an `Operations` of those rows, so that loops written for lists keep working. Every
  function that takes operations accepts `Operations`, a list of dicts, and in `symcrys` an array
  of Cartesian matrices (n, 3, 3); `symcrys.magnetic` refuses such an array, since it does not say
  which operations carry time reversal, and `symcrys.plane` has no Cartesian matrices. Chosen while
  implementing: the class is generated from the TypeScript record with the dtypes and shapes of
  `api.json` ("operations"); a caller may build one, its arrays checked (shape, one n, integers for
  W, booleans for `time_reversal`), equal only to itself, read-only also after a copy or a pickle;
  `site_symmetry_of` and `orbit_of` of `symcrys.magnetic` take operations without time reversal,
  also as an array, since they do not depend on it; `residual_operations` passes the caller's
  operations to the library as they are and needs every field of those it keeps (it returns
  them).
- **Keyword arguments and tensor shapes in Python** (#137 H2, decided by Thomas on 2026-11-22; #98;
  #121 step 12c): an object parameter of the TypeScript API becomes its fields as arguments
  (`lattice_from_parameters(a, b, c, alpha, beta, gamma)`, `is_valid_cell(alpha, beta, gamma)`,
  `miller_indices(printed, h=…, k=…, l=…)`, `orbit(key, hkl=…)` or `uvw=…`), and the overloads of a
  TypeScript function become Python `@overload`s (`orbit` with `hkl=` gives `list[FaceOrbitEntry]`);
  `tensor_form` gives each basis tensor in its shape (p, 3, …, 3), the relations stay rows over the
  flat components; `rotate_tensor` keeps the shape of the tensor, (3, …, 3) or flat, and takes
  stacks of tensors and rotations as leading axes, broadcast as in NumPy. Chosen while
  implementing: the library rotates one tensor by one rotation per call and the Python layer loops
  (batched calls were measured and left out, #100, "Speed"); an object parameter's fields are documented by their TSDoc, so `orbit`
  got the named types `FaceIndices` and `DirectionIndices` in TypeScript.
- **The engine stays replaceable** (#30): the whole boundary is one function, `call(name,
argsJson) → resultJson` (`_engine.py`, `scripts/bundle-python.mjs`; a name of the magnetic API has
  the prefix `magnetic.`, one of the plane API `plane.`), so another backend
  (Pyodide in JupyterLite) replaces one module. Not now: that second backend and a display layer
  such as `_repr_latex_` (presentation; ideas in #30).

## Git, PRs and releases

- Never commit to `main` (the only exception was the initial commit that created it). Short-lived
  branch (`feature/`, `fix/`, `refactor/`, `docs/`, `chore/`, `audit/`), Conventional Commits
  (`type(scope): summary`), PR to `main`, merged with a merge commit (no squash).
- **Gates**, run by CI on every PR, these eight on Node 22 and 24: `typecheck`, `typecheck:ts7`,
  `lint`, `format:check`, `test`, `build`, `check:dist`, `api:check` (the API reports current,
  #56); and `python` on Python 3.10 and the newest
  (bundle, build sdist and wheel, install the wheel into a fresh environment, `mypy --strict`,
  `pytest`; maintainer, 2026-11-19, from the first PR of the Python package); and `docs` (#29):
  `npm run docs:check` (TypeDoc with every warning an error: an undocumented export, a broken
  link, a referenced type that is not exported; the Python docstrings current; the TypeScript
  examples of the site type-check) and `npm run docs:site` (Sphinx with `-W -n`: every example and
  notebook executed, every reference resolved). A report names all ten with their result; a
  skipped one is named as skipped. The external links (`npm run docs:linkcheck`) are checked by
  the job `linkcheck` (`linkcheck.yml`: on every PR, weekly and by hand), which is not a gate: a
  site elsewhere that is down for a while must not block a merge (maintainer, 2026-11-21). A red
  `linkcheck` is still looked at, and a link that is really dead is fixed. The job `coverage` of
  `ci.yml` keeps the coverage of the library by the tests as an artefact (`npm run test:coverage`,
  #69, chosen while implementing on Thomas' go-ahead of 2026-11-25): a report to see which paths no
  test reaches, not a gate and no percentage to reach. Locally: `npm run
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
- **Documentation site** (#29): built from the tag by `release.yml` (jobs `site` and `pages`, with
  the sites of the earlier releases, #57) and published on GitHub Pages,
  [manganite.github.io/symcrys](https://manganite.github.io/symcrys/).
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
- **vitest** as in birss-app (there 4.1, here 5.1); its tests moved over with relative imports
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
  `TENSOR_PROPERTIES`. A failing example fails the gate `docs`. The browser example (`docs/browser.md`,
  #65; decided by Thomas on 2026-11-25, asked with options): its logic (`form.js`) takes the module as an argument
  and runs in Node when the site is built, the page script is type-checked against the DOM
  (`docs:check`), and the site serves the page with a copy of `dist/` under `browser/`, the build
  failing if a file of it is missing; there is no
  headless browser in the gates: the page is simple, and a browser in CI would be a heavy dev
  dependency for it.
- **Conventions are included, not copied**: `docs/conventions.md` is a page of the site.
- **Versioned pages from 0.14** (#57; Thomas, 2026-11-25, asked with options, revising "from 1.0.0"
  of 2026-11-20, since 1.0 waits): each release attaches its built site to the GitHub release
  (`symcrys-site-X.Y.Z.tar.gz`, job `site` of `release.yml`), and the job `pages` assembles the sites
  of all releases (`scripts/assemble-site.mjs`): the newest at the root, so the URLs stay as they
  are, and the newest PATCH of each MINOR under `/X.Y/`, with `versions.json` for a small version
  menu of our own in the sidebar (`docs/_templates/sidebar/versions.html`; furo has none). No branch,
  no change of the Pages settings; the title names the version of each page, and every page's
  canonical link points to the root. Releases before 0.14 carry no site and stay off. Chosen while
  implementing (review of PR #192): the site is attached in a job of its own with write access and no
  dependencies, after npm and PyPI; only releases that carry a site are downloaded, and a failed
  download fails the job; a PATCH of an older MINOR goes under its folder and leaves the root.
- **Short READMEs** (root, `packages/ts` for npm, `packages/python` for PyPI): what symcrys is, how
  to install, one short example, the link to the site. The root README keeps development and
  releases.
- **An API report** (`@microsoft/api-extractor`, which ships TypeScript 6.0.3 itself and keeps it on
  a move to TypeScript 7; #56): one report per entry point, `packages/ts/api/symcrys.api.md`,
  `symcrys-magnetic.api.md`, `symcrys-plane.api.md`, read from the declarations in `dist/`; a PR
  that changes the public API shows it as a diff of these files, and the gate `api:check` fails if
  one is stale (`npm run api:report` writes them). Every type a public signature uses is in the
  report (#190; Thomas, 2026-11-25, PR #191, asked with options): the signatures name exported
  types, not internal namespaces, and the types behind the aliases of `symcrys/magnetic` and
  `symcrys/plane` (`PointGroupKey = MagneticPointGroupKey`, …), which the entry points do not export
  by name, are written out by api-extractor under their internal names, renamed on a clash
  (`PointGroup_2`; `includeForgottenExports`, marked `ae-forgotten-export`), so a change of their
  fields shows too. `scripts/check-api-reports.mjs`, part of `api:check`, lists these types and
  fails on another one, on a namespace written out and on a warning that names a source file, so
  that nothing internal comes in with a reference. Chosen while implementing: the TSDoc messages of
  api-extractor are off, since TypeDoc checks the comments in the gate `docs`, and escaping `<` or
  `>` with a backslash, as api-extractor's parser wants, would put backslashes into the Python
  docstrings (TypeDoc keeps them there, unlike for `{` and `}`); no release tags (`@public`), as all
  exports of an entry point are public; reports with LF line endings.
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

### Point groups

The conventions themselves are in `docs/conventions.md`; here, what was decided and why.

- **Keys are ITC short symbols of the class** (maintainer, 2026-11-08, #13): for the 32 classes ITA's
  short symbols, for the magnetic groups the short symbols of ITC Vol. D Table 1.5.2.3; a grey
  group is the class key followed by `1'`. D3h keeps the key `-6m2`; `-62m`, which ITA's tables of
  classes print, is the symbol of its second setting (#137 B1, Thomas, 2026-11-22; #115;
  `docs/conventions.md`, "Keys").
- **Error types** (#137 D2, decided by Thomas on 2026-11-22; #92; #121 step 8b): wrong input is a
  `RangeError` in TypeScript, a plain `Error` (or a `TypeError`) only a fault of symcrys; in Python
  `SymcrysError` (a `ValueError`) for a `RangeError` and `SymcrysInternalError` (a `RuntimeError`)
  for anything else. Chosen while implementing: an options argument that is not a plain object, and
  a key a function does not know (a misspelling such as `uniqueaxis`), are RangeErrors
  (`checks.ts`, `checkOptions`; the plan of step 8 on #121); a function that passes part of its
  options on passes only the keys of the callee. `inputErrors.test.ts` calls every function of the
  three entry points with wrong values in every position and fails for a TypeError or an `Error`,
  and for a new export it does not call.
- **One tolerance contract** (#137 D1, decided by Thomas on 2026-11-22; #93, #89, #133; #121 step
  8a): one option type, `ToleranceOptions`, for every function that compares numbers of a caller,
  `EPSILON` exported, one check (finite, above 0, below the bound of the metric, `null` refused) and
  one metric per kind of object (`docs/conventions.md`, "Tolerances"). Chosen while implementing:
  the metric tensor of `residualOperations` keeps its relative metric as a fourth kind, since it
  compares G and not the operations; the bounds are 0.1 (operations), 1 (directions), 1/2 (points),
  1 (metric); `rotateTensor` and the plane `describeOperationsOf` take the tolerance too. #89 is
  fixed by making the caller's group exact before the projection (averaging over the group table,
  `closure.ts`), taking the rank from the trace of the group average, and seeking the pivots
  relative to the distance of the caller's matrices from that group (the rank read off the pivots
  failed in a general orientation, review of the step); the pivot threshold relative to the tolerance alone, as
  #137 proposed, failed for tolerances well above the actual errors and for small genuine pivots in a
  general orientation (tested before the choice). One tolerant closure (`closeWithin`) serves these
  functions and `pointGroupOf`.
- **One name for the axis, and smaller uniformity** (#137 C3, C4, decided by Thomas on 2026-11-22;
  #121 step 7d): the axis of an operation is `axis` in every entry point, for a reflection its normal
  (in `symcrys/plane` in the descriptions and the lines of `symmetryElements` too); `isDefault` also in `symcrys/plane`; the plane `orbit` gives `{ point,
operations }`; `undefined`, never `null` (`zoneAxis`); every result frozen and `readonly` (tested
  over every function of the three entry points; `residualOperations` freezes its list, not the
  caller's operations); parameter names `direction1`, `direction2`, `plane1`, `plane2`, `symbol`; the
  origin of a plane group as its site symmetry (`2..` for `p2mg`), derived since #194 (Thomas,
  2026-11-25, asked with options). The Wyckoff `coordinates` of the point groups are the printed list too (Thomas,
  2026-11-23: transcribed in full from ITA Table 3.2.3.2; the second part of step 7d).
- **Names of ITA** (#137 C1, C2, decided by Thomas on 2026-11-22; #121 step 7c): the suffix `…Of`
  means "of a list of operations" and only that: `siteSymmetryOf(operations, direction)` beside
  `siteSymmetry(key, direction, options)`, and `wyckoffPosition(key, x)` (also in `symcrys/plane`);
  ITA's terms: in operation descriptions `n` (ITA 2016 § 1.2.1, p. 12) and the kinds `'reflection'`,
  `'glide-reflection'` (ITA Table 2.1.2.1, p. 145, names the operations so, and the elements mirror
  and glide line, which `symmetryElements` keeps), `enantiomorphic` and `isEnantiomorphicOf` (ITA
  § 3.2.2.1.3, p. 738), in `symcrys/plane` `rotationPoints`, and no field `order` in
  `planeGroup(key)` (it is the number of operations).
  Chosen while implementing: a rotation point carries `n` too, as the operation that it is the
  element of; `siteSymmetry(key, …)` is in both point-group entry points, with the options of
  `wyckoffPosition` (`setting`, `axes`, `uniqueAxis`, `tolerance`).
- **Fixed properties are fields of `pointGroup()`** (maintainer, 2026-11-20, #41; decided on the
  call sites of stereography and birss-app, listed in #41): what is fixed once the group is named
  (`crystalSystem`, `order`, `centrosymmetric`, `polar`, `enantiomorphic`, `laueClass`; in the
  magnetic API also `type`, `crystalClass`) is data of the record, so that there is one way to ask
  (a consumer that passes a function writes `(key) => pointGroup(key).polar`). A key and a list of
  operations are two cases: for the operations of a distorted crystal or a site symmetry there are
  `isCentrosymmetricOf(operations)` and `isEnantiomorphicOf(operations)`, named like `tensorFormOf`
  and asking of the list what it asks (orthogonal matrices; in the magnetic API `timeReversal`);
  polar is there `allowsPropertyOf(operations, 'pyroelectric')`, and a Laue class needs the group
  identified first. The holohedry is a function of the lattice system ("Holohedry by lattice
  system").
- **Faces with numbers** (#137 G3, G4, decided by Thomas on 2026-11-22 and, how the two fit
  together, on 2026-11-24; #110 item 10; #115 item 2; #121 step 11b): the Wyckoff positions and
  crystal forms give their faces only as ITA prints them (`millerIndices`, with letters), since
  fixed numbers would be a choice of symcrys inside print-anchored records, and a normal without a
  cell is wrong for every real monoclinic and triclinic cell. Two functions give the rest: `millerIndices(printed, { h, k, l })` substitutes a
  caller's values and gives three indices, i dropped for hexagonal axes as `orbit` takes them
  (`planeToFourIndices` gives four), and `faceNormal(basis, hkl)` gives the unit normal in a cell,
  so a normal never exists without one. Chosen while implementing: both in both entry points, with
  the index functions; inside, the positions are still checked with the face 3, 2, 1 (5, 2, 1 with
  rhombohedral axes, 1, 2, 3 under |h| < |l|), from which the ITC baseline pins also take the
  numeric face (`representative`) that their shape still has.
- **Holohedry by lattice system** (#137 G1, decided by Thomas on 2026-11-22; #113; #121 step 11a):
  the holohedry belongs to the lattice system, as ITA defines it (ITA 2016 § 1.3.4.4.2 and Table
  1.3.4.1, p. 39): a type `LatticeSystem` with ITA's seven names, `holohedry(latticeSystem)` and
  `latticeSystems(key)`, which gives `hexagonal` and `rhombohedral` for a trigonal class, since
  lattice systems classify lattices, not point groups; an application names the lattice system it
  means (stereography `'hexagonal'`, birss-app `'rhombohedral'`). Chosen while implementing: `latticeSystems` is a
  function, as G1 (a) names it, in both entry points (a magnetic group has the lattice systems of
  its class); `holohedry('trigonal')` is an error that names the two lattice systems.
- **Symmetry elements as structured data** (maintainer, 2026-11-18, #16): symcrys describes each
  operation (`describeOperations`: kind, n, axis, sense, and in the magnetic API time reversal) and
  the elements along each symmetry direction (`symmetryDirections`); strings such as `4⁺ 0,0,z` or
  `2_z` stay in the applications, which also translate them. An axis is given both as a lattice
  direction [uvw] and as a Cartesian unit vector, with the sign of its Seitz symbol ("Pure ITC",
  #114), which fixes what the sense refers to; the symmetry directions follow ITA Table 2.1.3.1
  (`docs/conventions.md`, "Symmetry directions and elements"). For the monoclinic groups they are
  the three positions of the full symbol (a, b, c, ITA § 2.1.3.15), although Table 2.1.3.1 lists
  only the unique axis (Thomas, 2026-11-25, #115 item 1, asked with options: documented rather than
  changed, since the positions are what the full symbol reads and a change would break the API).
- **Operations in ITA's order, ITA's generators** (maintainer, 2026-11-18,
  crystallography-common#99; #25, #27): `operations` returns the operations as ITA numbers them,
  built coset by coset from ITA's selected generators, and `generators` returns those generators
  (`docs/conventions.md`, "Order of the operations", "Generators"). Consumers draw and list
  operations in this order (stereography: poles, faces, face lists), so it should mean something
  and stay stable; a closure order has no meaning of its own. The data are ITA's selected
  generators (`pointGroups/itaOrder.ts`, #122). An index into a list of operations is 0-based, ITA's
  number of the operation its index + 1, and numbers such as a setting's `index` count from 1
  (Thomas, 2026-11-25, #115 item 4, asked with options: stated in one place,
  `docs/conventions.md`, "Indices and numbering", rather than 1-based indices, which would be
  unusual for arrays in TypeScript and Python and would break the API).
- **Cartesian floating-point matrices with snapping** (maintainer, 2026-11-08, #13), as in
  birss-app, whose tests came with them; the exact matrix W in the lattice basis is the field
  `matrix` of every operation ("The operation record").
- **The operation record** (#137 A2, decided by Thomas on 2026-11-22; #94; #121 step 6d): an
  operation is `{ matrix, cartesian }`, in the magnetic API with `timeReversal`: `matrix` is ITA's
  W in the lattice basis in every entry point (as in `symcrys/plane`), `cartesian` the orthogonal
  matrix; there is no separate list of lattice operations. Every function that takes operations from a caller and
  computes with Cartesian matrices reads `cartesian` and refuses a record without it, so that W
  cannot pass for a Cartesian matrix silently; `residualOperations` reads `matrix` and refuses one
  that is not integer. Chosen while implementing: inside the library the calculations work on
  `CartesianOperation` (`{ cartesian, timeReversal }`), so a record of the API passes as it is and
  a caller may build `{ cartesian }` alone. In Python a list of operations is one record of arrays,
  `Operations` ("Operations in Python").
- **Properties that need tensors** come with the tensor module (maintainer, 2026-11-08, #13), as
  named tensor properties ("Tensors" below, #41).
- **Hexagonal frame x ∥ a, z ∥ c** (maintainer, 2026-11-08, #6): ITC Vol. D puts the secondary
  direction of the trigonal groups along x₁ as well, and birss-app's print-verified tensor tests
  hold in this frame (`docs/conventions.md`, "Cartesian frame").
- **ITC anchor for the crystal classes** (maintainer, 2026-11-09, #13, #18): the operations of
  every ITC setting that ITA lists must equal its general position printed in ITA Table 3.2.3.2, a
  print anchor (class (a)) and so stronger than a derivation; it is also the basis of the exact
  matrices W of the operations. In addition the ITC symbol of each setting, read along the symmetry
  directions of ITA Table 2.1.3.1 and closed independently, must give the same operations; this
  also covers `2mm`, `m2m` and monoclinic unique axis a, which ITA does not list. ITC Vol. D Table 1.5.2.3 is transcribed with
  the magnetic groups.
- **Stored frame and settings** (Thomas, 2026-11-22, #110 point 1; #122, #116, #123): the data are
  stored in the ITC frame: ITA's selected generators as exact integer matrices in the lattice basis
  of each printed setting (`pointGroups/itaOrder.ts`), the settings ITA does not print (`2mm`,
  `m2m`, unique axis a) derived by a change of basis (`pointGroups/itcData.ts`), and for the
  magnetic groups the full symbols per setting (`pointGroups/itcMagneticData.ts`); a setting is
  selected by its ITC symbol or by its index, numbered as `docs/conventions.md` ("Settings") gives
  them (the orthorhombic ones by the column order of ITA 2016 Table 1.5.4.4, #137 A4; monoclinic
  unique axis a is setting 3, #137 A5). A crystal class has the same settings, with the same
  indices, in both point-group entry points.
- **Site symmetry and Wyckoff positions** (maintainer, 2026-11-18, #24 item 1; asked before
  implementation): Wyckoff positions for the 32 crystal classes, as ITA tabulates them; the site
  symmetry itself, plain computation, in both point-group entry points. A position gives ITA's
  printed point and face as strings ("Faces with numbers" for faces with numbers and their normals).
  "Lies on the element" uses an optional `tolerance`, default `EPSILON` ("One tolerance contract"),
  so that stereography can pass 10⁻⁴ for its rounded links while symcrys projects onto the fixed
  space. `mm2` settings 2 and 3 and monoclinic unique axis a, which ITA does not print, are derived
  from setting 1 by a permutation of the axes (settings cab and bca of ITA 2016 Table 1.5.4.4,
  #122), with a test that reads the oriented symbol independently, as for the symbols.
  `siteSymmetryOf` takes any list of operations, so that a consumer can use it for the operations
  of a distorted crystal (stereography, `analyzeGroup`). The print anchor is ITA 6th ed. Table
  3.2.3.2 (`references/`); the 5th edition (Table 10.1.2.2, via stereography's form catalogue) is
  an additional check by `audit/wyckoff-2006`, not the reference (`docs/conventions.md`, "Site
  symmetry and Wyckoff positions").
- **Crystal forms, group identification, orbits** (maintainer, 2026-11-21, #24 items 2 and 3;
  asked before implementation). **Data of a form:** a table of the 47 forms of ITA Table 3.2.1.3
  (`CRYSTAL_FORM_TYPES`, by a key made of the first usual name, `'tetragonal-prism'`, since #194:
  English names, number of faces, eigensymmetry), to which the forms of a class refer by that key;
  the English names are terms of the print source, like the
  symbols, while names in other languages (stereography's German ones) and the link ids stay in the
  apps; point forms are left out. Crystal forms are given for the crystal classes only, like the
  Wyckoff positions they belong to. **Names**, in the `…Of` scheme: `crystalForms(key, { setting })`;
  `pointGroupOf(operations)` beside `pointGroup(key)`; `orbit(key, …)`, exact in the lattice basis
  from the integer matrices W, which do not depend on the cell angles (ITA prints them as the
  general position), and `orbitOf(operations, direction)`, Cartesian, with coinciding poles merged;
  both in both point-group entry points (a face's orbit does not depend on time reversal).
  **Tolerance:** an optional `tolerance`, default `EPSILON`, as for `siteSymmetry`.
  **Identification:** `pointGroupOf` closes the list into a group, returns the key always and the
  setting only if the operations equal those of a setting in symcrys's frame, `undefined` if they
  form no crystallographic point group; the elements of any list of operations come from
  `describeOperationsOf`. The print anchor of the forms is ITA 6th ed. Tables 3.2.3.2 and 3.2.1.3,
  checked against each other; stereography's catalogue (ITA 2006) is an additional check by
  `audit/forms-2006`, not the reference (`docs/conventions.md`, "Crystal forms"). Chosen while
  implementing: `pointGroupOf` names the group by how often each combination of determinant, trace
  and time reversal occurs, which differs for all 122 groups (tested) and so names any point group
  in any orientation; `describeOperationsOf` signs its Cartesian axes so that the first non-zero
  component is positive, since no lattice names them (`docs/conventions.md`, "Point group of a list
  of operations"); a Seitz symbol needs a lattice. #110 had put the rule, birss-app's, among what
  goes; Thomas kept it on 2026-11-24 as symcrys's own rule for a list without a lattice, the
  Cartesian analogue of a fixed axis with the sense given against it.
- **Rhombohedral axes** (#111, #121 step 6c; the setting itself decided by Thomas on 2026-11-23,
  "Pure ITC" above): the obverse axes in the hexagonal cell of setting 1 (ITA 2016 Table 1.5.1.1,
  p. 78), so the Cartesian operations are those of setting 1. Chosen while implementing, recorded on
  Thomas' OK (2026-11-23, PR #148): **`pointGroupOf`** names such operations setting 1, since the
  two settings hold the same Cartesian operations and a list of them cannot say which basis is
  meant; **a key is the key** in `findPointGroup`, also where it is the symbol of another setting
  (`32` gives setting 1, not the rhombohedral setting 3), the
  rhombohedral setting is chosen by `{ axes: 'rhombohedral' }` (#96, step 7b); the face with which
  the positions are checked inside ("Faces with numbers") takes h = 5, k = 2, l = 1 with
  rhombohedral axes, since (321) lies there on the limiting form (h,k,2k−h) and h = 4 would give
  printed faces with a common factor ((4,2,−6), (4,2,0)). The symbols of the magnetic groups in the rhombohedral setting
  follow the rule for all black-and-white symbols (the symbol of the class in that frame with the
  primes of the operations).
- **Change of the coordinate system** (#120, #137 G2, decided by Thomas on 2026-11-25, asked with
  proposals and a recommendation): one function, `changeOfCoordinates({ linearPart, originShift },
quantities, { tolerance })`, in all three entry points (3 × 3, and 2 × 2 in `symcrys/plane`), which
  transforms the quantities given (points, directions, planes, metric, operations) by ITA 2016 § 1.5
  and gives the inverse pair; it replaces `changeOfAxes`. P, p and the operations are read as
  fractions and transformed exactly: each number as the simplest fraction within the tolerance
  (Thomas, 2026-11-25, after the review showed that a bound of 12 on the denominator, his first
  answer, refuses the function's own inverse pair, q = −1/24 for H₁ with p = 1/8). Chosen while implementing: the fields are `linearPart` and
  `originShift`, ITA's words for P and p (§§ 1.5.1.2, 1.5.1.3), since `P` and `p` would be one name in
  Python; an operation whose W′ is not integral is refused (the record's `matrix` has integer
  entries), and a transformed operation is `{ matrix, translation }` alone, w′ not reduced modulo the
  lattice, as ITA writes it (other fields, `cartesian` and `timeReversal`, are matched by index; in
  Python the result is a list of these records, not `Operations`, which needs `cartesian`); the print
  anchors are ITA's worked examples of Chapter 1.5 and rows of
  Table 1.5.1.1 (`references/itc/vol-a-2016-1.5-transformations.md`); the Python generator takes
  two object parameters of one signature, and a list of operations as a field of one.
- **Cells of a lattice** (#120; Thomas, 2026-11-25, asked with a design and a recommendation, after
  rejecting a list of the printed rows with their pages and texts, "Own structure, named anchors"
  above):
  `cellTransformation(bravaisLattice, fromCell, toCell)` gives `{ linearPart }`, P from one named cell
  to another, for `changeOfCoordinates`; the change back swaps the cells. The Bravais lattice is
  ITA's symbol (Table 1.3.4.1), a cell is named by the fields of `Cell`, in the words the API has
  already (`uniqueAxis`, `axes`, `setting`, `centring`) and `cellChoice` and `cell` (the index of C₁,
  H₁, R₁ …), `{}` the conventional cell in the standard setting. The data are the rows of ITA 2016
  Table 1.5.1.1, internal, with the cells each row joins; any two cells of a lattice are joined by a
  product of them, exactly. Chosen while implementing: the triple hexagonal cell R of rows 30–35 is
  R₁ obverse (rows 36–41 are row 16 times rows 30–35, tested); a cell that ITA names among several
  (C₁, C₂ …) needs its `cell`, except the hexagonal axes of `hR`, whose standard is R₁ obverse; the
  primitive cell of `oI` and `oF` only in the standard setting, which is what ITA gives; the monoclinic
  cells of `hR` by centring and index (C₁–C₃, A₁–A₃, as ITA's figures name them), not by cell choice,
  since they keep their centring and differ in the unique axis, which is the opposite of a monoclinic
  cell choice (review of PR #193; `docs/conventions.md`, "Cells of a lattice"); in Python the
  two cells are mappings (`cell_transformation("hR", {}, {"axes": "rhombohedral"})`), since their
  fields would collide as arguments (api.json, "mappings").
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
  reversal at all (operations `{ matrix, cartesian }`, no time parity, no `type`, the time-even
  properties only), and a question that involves time reversal is an error that names the magnetic
  API, because a wrong reading should fail, not answer. Chosen while implementing, and kept by Thomas
  on 2026-11-25 (#110 item 8: it serves the two entry points of symcrys, not an application, and an
  explicit `'even'` or `false` cannot give a wrong answer): `timeParity: 'even'` and
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
- **Magnetic point groups: order and generators** (maintainer, 2026-11-19,
  #13; asked before implementation): ITC Vol. D prints neither (Table 1.5.2.3 groups the operators),
  so an operation of a black-and-white group keeps the number ITA gives it in the crystal class,
  time reversal being a mark on the operation, and a grey group lists the class first, then the
  same sequence with time reversal. The other proposal, the subgroup without time reversal first
  and its coset after it (ITC Vol. D eq. (1.5.2.2)), would have changed the numbers against the
  class. The generators follow the same idea: those of the class with their time reversal, for a
  grey group followed by `1'` (chosen while implementing).
- **Six settings of `2'm'm`** (maintainer, 2026-11-20, #19; "Pure ITC"): an orthorhombic group has
  a setting for every distinct orientation of its axes that ITC prints; `2'm'm`, the one group whose
  three elements all differ, has six, all printed in ITC Vol. D, and print uses all of them (Birss,
  four tables of ITC Vol. D, Paufler), so a reader who takes a symbol from print can select it. The
  six are numbered by the column order of ITA 2016 Table 1.5.4.4 (#137 A4; `docs/conventions.md`,
  "Settings").
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
- **Shubnikov symbols** (#137 B4, decided by Thomas on 2026-11-25, asked with proposals and a
  recommendation): `symbol(key, { form: 'shubnikov' })` in both point-group entry points, for every
  setting the same symbol (it names no orientation), written as print shows it, with the combining
  overbar and low line (U+0305, U+0332) and `·`, not with `-`, since Shubnikov's overbar is a
  rotoreflection; a grey group, which ITC does not print, gets the symbol of its class (Thomas chose
  a derived symbol over an error) with `·` and an underlined 1, as Shubnikov & Belov, _Colored
  Symmetry_ (1964), pp. 113–114, write it (`m·1̲`, `4·1̲`; the separator decided by the print, which
  Thomas added to Zotero for the question, 2026-11-25); `findPointGroup` does not read the
  form (an exception to the read-back rule, `docs/conventions.md`, "Reading symbols"). Chosen while
  implementing: a symbol with a character that only Shubnikov writes (underline, `:`, `·`) is a
  RangeError of `findPointGroup`, rather than read as something else; the data are column 3 of the
  transcription of Table 1.5.2.3 (`pointGroups/shubnikovData.ts`, compared with it by
  `shubnikov.reference.test.ts`).
- **Magnetic point groups: data** (2026-11-19, #13; #122, #109): stored are the ITC full symbols of
  the black-and-white groups, one per setting, and the time reversal of their operations is derived
  from them (`pointGroups/itcMagneticData.ts`). Not stored: the grey groups (class and time
  reversal, ITC Vol. D eq. (1.5.2.1)). The print (58 full symbols of ITC Vol. D Table 1.5.2.3, 58
  symbols of Birss Table 6) checks the symbols. The types `'I'`, `'II'`, `'III'` are those of ITC
  Vol. D Table 1.2.6.12 ("Symbols per volume"; `docs/conventions.md`, "Types").
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

- **The tensor specification** (#137 E1, E2, decided by Thomas on 2026-11-22; #117; #121 step 9a):
  `{ rank, kind, timeParity, intrinsic }` with `kind` `'polar'`/`'axial'` (ITC's "parity" is the
  behaviour under inversion, under which a polar vector is odd) and `timeParity` `'even'`/`'odd'`
  (ITC Vol. D's terms, replacing Birss's `'i'`/`'c'`); `intrinsic` descriptive, each value with its
  Jahn symbol in the TSDoc as Gallego et al. write them (_Acta Cryst._ A75, 438 (2019), pp. 439–440,
  after Jahn 1949; Zotero `UP3I7WGX`, `Y7PSZEWG`): `'symmetric-first-pair'`, `'symmetric-last-pair'`, `'symmetric-pairs'`,
  `'symmetric-pairs-exchangeable'`, `'antisymmetric'` (rank 2) and `'totally-symmetric'`. Chosen
  while implementing: a specification with the names of Birss and of 0.10 (`parity`, `'i'`/`'c'`, `'ij'`,
  `'jk'`, `'ij_kl'`, `'voigt'`) is a RangeError that names the current ones; `'totally-symmetric'`
  from rank 2;
  an antisymmetric index symmetry is computed with signed orbits of the index permutations.
- **Named properties and parameters in ITC's terms** (#137 E3, E4, decided by Thomas on 2026-11-22;
  #118; #121 step 9b): `'ferrotoroidic'` (rank 1, polar, time-odd) as the eighth property, anchored
  in ITC Vol. D § 1.5.8.1, footnote 3, p. 140 (its 31 groups are those whose printed
  magnetoelectric matrix in Table 1.5.8.1 is not symmetric) and in Gallego et al. (2019), p. 440
  (polar toroidal moment, aV); `'gyrotropic'` stays, with ITA's "optical activity"; `'ferroaxial'`
  stays, marked in `source` and the docs as not from ITC, with Gallego et al. (axial toroidal
  moment, eV) beside Hlinka et al. The free parameters keep symcrys's rule (the lowest independent
  component), documented as not ITC's choice; numeric `toVoigt`/`fromVoigt` with ITC's factors
  (ITC Vol. D eq. (1.5.7.4) and § 1.1.4.10), as E3 (a) says, not with Gallego's unity factors.
- **Voigt's notation** (#137 E3, decided by Thomas on 2026-11-25, asked with proposals and a
  recommendation, 0.12): ITC defines the factor of the components with α = 4, 5, 6 per quantity and
  per index pair (2 for strain, d, Λ, s, Q; 1 for stress, e, c, p; π has 1 and 2), so the
  specification does not fix it: an option `factors`, one 1 or 2 per contracted pair, required for a
  specification and for `'piezoelectric'` (its tensor serves the piezoelectric d, `[2]`, and
  second-harmonic generation, which ITC contracts with `[1]`, § 1.7.2.2.1.3, p. 185; Thomas,
  2026-11-25, after the review), with ITC's `[2]` as the default of `'piezomagnetic'`; the layout follows `intrinsic` (rank 2
  symmetric: 6; rank 3: 3 × 6 for the last pair, 6 × 3 for the first; rank 4: 6 × 6), and a tensor
  without the index symmetry of its specification is a RangeError. Chosen while implementing: the
  tolerance of that check is relative to the largest component (bound 1, as the metric); in Python
  `to_voigt` takes a tensor of shape (3, …, 3) or flat, and `from_voigt` gives the shape (3, …, 3);
  the print anchors are the relations of § 1.1.4.10 and eq. (1.5.7.4)
  (`references/itc/vol-d-1.1.4.10-voigt.md`), the diagrams of § 1.1.4.10.6 and Table 1.5.7.1, read
  as printed in this notation.
- **Gallego et al. (2019) as the model of the tensor notation** (Thomas, 2026-11-24): the extended
  Jahn symbols of Gallego et al. (MTENSOR of the Bilbao Crystallographic Server; prefix e axial,
  a time-odd, square and curly brackets for symmetric and antisymmetric indices) are the model for
  how symcrys names kinds of tensors, as an efficient notation; symcrys does not rebuild their
  software (its lists of properties, its abbreviated notation with unity factors, the starred
  Onsager symbols of transport and optical tensors). Their ferroic vectors (p. 440: P of type V, M
  aeV, polar toroidal T aV, axial toroidal A eV) are a source of the named properties.
- **Results as numbers, not text** (maintainer, 2026-11-19, #30; asked before implementation):
  `tensorForm` and `tensorFormOf` return the basis in reduced row echelon form, the free parameters
  as index lists and the relations as coefficient rows. Relation strings
  (`\chi_{xxx} = -\chi_{xyy}`), LaTeX, Nye diagrams, Voigt matrices and trigonometric polynomials stay in the
  applications. Numbers serve every consumer (birss-app, the teaching apps, Python with NumPy);
  strings would fix one presentation, and this is the decision that is expensive to change later.
- **Scope: symmetry only** (maintainer, 2026-11-19): the form for a point group and for any list of
  operations, the named properties, rotation of a tensor. birss-app's SHG source terms (`computeShg`),
  lab geometry, simulator and polarimetry are applications of the forms and stay in birss-app.
- **Ranks 0 to 4** (maintainer, 2026-11-19): the print anchors for rank 4 exist, and
  electric-quadrupole SHG of centrosymmetric crystals needs rank 4. Rank 4 is anchored in ITC by the
  diagrams of ITC Vol. D § 1.1.4.10.6 (#39; printed pp. 27–29, PDF pages 26–28; 29 for the crystal
  classes, compared with the computed forms, and one for the spherical system, compared with the
  isotropic tensors written out by hand), and by Birss Table 4f and Hoshi (1995) as further checks.
  Reading the diagrams: crossing lines at 550 dpi, followed end to end; a dot with a half circle
  around it is passed by the line, not linked; where a line runs through a dot without ending there
  and without a bridge (44 in the diagrams of 3, -3), the printed count and the dot's own links
  decide, and the reading is noted in the transcription
  (`references/itc/vol-d-1.1.4.10.6-rank-4-forms.md`).
- **Names** (maintainer, 2026-11-19): `tensorForm(key, spec, options)`,
  `tensorFormOf(operations, spec, options)`, `rotateTensor(tensor, rotation, spec, options)`, with the
  specification of "The tensor specification"; in the crystallographic API without `timeParity`
  (#47).
- **Free parameters are the pivots of the reduced row echelon form**: the lowest component
  independent of those before it, birss-app's rule since its Q0 reduction, applied to the ITC
  setting; documented as not ITC's choice (#137 E4, "Named properties and parameters in ITC's
  terms").
- **An index symmetry that does not apply at the rank is an error** (2026-11-19): birss-app ignores
  `'voigt'` at rank 3 and the like; a library call with it is a mistake of the caller, and silently
  computing another tensor would hide it.
- **Time reversal is built in** (#13): an operation with `timeReversal` changes the sign of a
  time-odd tensor, so the magnetic point groups use the same tensor code, and in the magnetic API
  `tensorForm` and the functions for named properties take all 122 keys. Their forms are anchored in
  ITC Vol. D Tables 1.5.2.4, 1.5.7.1 and 1.5.8.1, with Birss's Table 7 and Tables 4b–4f as the
  second print check (`docs/conventions.md`, "Tensors").
- **Crystal class and white group are two readings of one key** (maintainer, 2026-11-20): the 32
  crystal classes are not simply the 32 white magnetic groups. In a purely crystallographic context
  quartz has the class `32`; in the context of magnetism it has the grey group `321'`, and `32`
  there means a magnetically ordered crystal without any time reversal in its symmetry (Birss p. 84,
  Paufler p. 60). The operations are the same, so the key is the same string, and the entry point
  says which reading is meant ("Two entry points" above). birss-app does not make the distinction
  clear yet (#19).
- **Named tensor properties, one generic call** (maintainer, 2026-11-19, #41; names asked before
  implementation, 2026-11-20): a property that is the question whether a tensor is allowed is an
  entry of the table `TENSOR_PROPERTIES` (name → `TensorSpec`, description; the source in the code
  and the docs since #194), not a
  function of its own, so a new property is a line of data, and the same call serves a key and any
  list of operations: `allowsProperty(key, name)`, `allowedProperties(key)`,
  `allowsPropertyOf(operations, name)`, `allowedPropertiesOf(operations)`; `tensorForm` and
  `tensorFormOf` (and `rotateTensor`) take a name in place of a specification.
  Chosen by Thomas among the proposals: `allows…` rather than `has…`, because symmetry allows a
  property and does not say the crystal has it; names as adjectives (`'pyroelectric'`,
  `'piezoelectric'`, `'gyrotropic'` for optical activity, `'ferromagnetic'`, `'magnetoelectric'`,
  `'piezomagnetic'`; the three time-odd ones in the magnetic API only, #47); these six and no more
  for now (`'ferroaxial'` came as the seventh, `'ferrotoroidic'` as the eighth, both below); `allowedProperties` returns the names only (the
  form is one `tensorForm` call away); one name per kind of tensor, so second-harmonic generation,
  which has the tensor of `'piezoelectric'`, gets no name of its own.
- **`'ferroaxial'`, the seventh property** (maintainer, 2026-11-20, #41): Thomas' group works on
  ferroaxial materials beside chiral ones (NiTiO₃, class `-3`) and asked for a query for "axial".
  It is a named property like the others, a time-even axial vector, in both APIs; Thomas agreed to
  the name `'ferroaxial'` rather than "axial", because `'axial'` already is the parity of a tensor
  and most of the named properties have an axial tensor. Not a field of `pointGroup()`: a question
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
  on Birss's tables (errata, the meaning of the brackets) is usually decided and reasoned there; the
  settings and the types of groups follow ITC ("Pure ITC"). Before asking Thomas or deciding anew, read birss-app's `STATUS.md` (standing decisions),
  `docs/references/` (conventions, Birss/ITC divergences), `docs/findings/` (book errors, bracket
  semantics) and the notes in its copy of the tables, `birss-tables/`. The repository
  manganite/birss-tables holds the same tables (synchronized in manganite/birss-tables#4); only in
  birss-app are `table-nomenclature.md` and the scripts in `birss-tables/tools/` that generate it
  (with a transcription of ITC Vol. D Table 1.5.2.3 in `generate_nomenclature.py`) and birss-app's
  data. What symcrys finds beyond that goes to #19.
- **Speed** (#30, measured 2026-11-19): birss-app's reduction, bundled, takes under QuickJS
  (`quickjs-ng`) 3–112 ms per class for the SHG tensor and up to about 0.3 s at rank 4 (m-3m), 10–35
  times Node; enough for a Python layer that calls symcrys a few times per material. Forms per
  class, setting and kind of tensor are cached, and the groups and forms of the last 64 lists of
  operations a caller passed (#100, 2026-11-25, chosen while implementing: a Python loop over one
  list costs no closure; keyed by the numbers the function reads and the tolerance). A yes/no
  question of a named property reads the trace of the group average without the row reduction, and
  `rotateTensor` contracts one index at a time. Batched calls of the Python layer (one engine call
  for a stack) were measured and left out: a Python call of a cheap function costs about 0.1 ms with
  its conversions and JSON, the engine round trip itself far less, and the computation in QuickJS
  takes most of the time (`rotate_tensor` of 2000 tensors: 543 ms looped, about 500 ms in one call).

### Plane groups (and later space groups)

Decided by Thomas on 2026-11-22 (#31, where the questions, the proposals and the answers are
recorded), asked before implementation, each among proposals with a recommendation; what is chosen
while implementing gets its own note here.

- **Exact inside, plain numbers at the API; a type of its own** (#31 question 1): an operation with
  a translation is computed exactly, the matrix as integers in the lattice basis and the translation
  as fractions (integer numerator over the smallest denominator), so that comparing operations and
  points of the group data modulo the lattice needs no tolerance. At the API it is
  `{ matrix, translation }` in the lattice basis: `matrix` a d × d matrix with integer entries, the
  `matrix` of the point groups with `translation` added, and `translation` as
  numbers (1/3 as the nearest double), as spglib gives its symmetry (integer rotations, float
  translations), which is what users of such a library expect. An operation of a point group is
  `{ matrix, cartesian }` with the same W ("The operation record"). The alternatives were
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
  `'reflection'` and `'glide-reflection'` are ITA's ("Names of ITA"). The line of a mirror or glide is
  given by its direction and one point; the point on y = 0 (on x = 0 for a line along a) is one fixed
  choice among many, so that equal lines give equal data. Checked against print: the symbols written
  from the description reproduce every printed "Symmetry operations" entry of the 17 groups
  (`describe.reference.test.ts`); invariants that do not depend on the computation (a centre is
  fixed, a point of the line moves by the glide vector) cover the operations shifted by lattice
  translations, where print has no centres of order ≥ 3 away from the origin.
- **Points: orbit, site symmetry, Wyckoff position** (chosen while implementing, PR #79;
  `src/spaceGroups/positions.ts`): a point from a caller has floating-point coordinates in the
  lattice basis, so these functions work in floating point on the exact operations, with the
  `tolerance` measured per coordinate modulo the lattice (default `EPSILON`); a tolerance in the
  lattice basis needs no metric, which a plane group does not fix; it must stay below 1/2. The
  Wyckoff position, the site symmetry and the orbit of a point follow from its distance to the
  printed positions ("Distance to a Wyckoff position"), so letter and oriented symbol come from
  print, not from a rule of symcrys. Checked: every printed point of every Wyckoff position of the
  17 groups, displaced by about 3·10⁻⁸ in both directions, gives its printed letter, multiplicity,
  symbol and printed orbit (`positions.reference.test.ts`).
- **Distance to a Wyckoff position** (#137 F1, decided by Thomas on 2026-11-22 and, the two open
  points, on 2026-11-24; #108, #85; #121 step 10a): `wyckoffDistances(key, point, { basis })` gives,
  for every printed position (the distance of the point to the point set of a position, as
  plane-groups snaps a point, rather than of its images) the nearest point of its point set and the
  distance, per lattice coordinate (the larger of |Δx|, |Δy| modulo the lattice, the metric of the
  tolerance for points) without a basis, Euclidean with one. `wyckoffPosition` decides by that
  distance (the most special position within the tolerance, the nearest among equal
  multiplicities), and `siteSymmetry` and `orbit` set the point onto that position: one notion,
  the site symmetry the |G|/multiplicity operations nearest to fixing the set point, the orbit its
  cosets (no second tolerance; review of the step).
  The snapping policy belongs to the applications. Chosen while implementing: the nearest point
  of a line per coordinate is found where a component vanishes or the two are equal (the
  minimum of the larger of two linear functions); the basis has the columns a, b.
- **Elements and the asymmetric unit as data** (#137 F2, F3, decided by Thomas on 2026-11-22; see
  also #110 items 12 and 13, and #121 step 10b): `symmetryElements(key, { box })` gives each element
  once modulo the lattice, the centring included (rotation points in [0, 1)²; lines as a point and a
  direction), with `box`
  all translates that meet a box, the lines not clipped; `asymmetricUnit` gives all printed
  inequalities in printed order and the polygon with, per edge, the index of the inequality that
  holds it. Chosen while implementing: the point of a line is where it crosses y = 0 (x = 0 for a
  line along a), as in the descriptions of the operations, and of a class the translate whose point
  lies nearest to 0 from above; a box is its two corners, a line or a point allowed, at most a million
  rotation points. Exact rationals inside, as the rest of the module (`src/spaceGroups/cell.ts`).
  Checked against print (`cell.reference.test.ts`): the printed vertices (hexagonal groups) and the
  printed inequalities read as text; centres and mirror lines from the Wyckoff positions (no free
  parameter and a rotation; one free parameter and a mirror) with their lattice translates; every
  printed glide; all lines also derived independently from the printed general position (ITA
  prints no glide line of p4mm, p3m1, p31m, p6mm), in a box exactly; and from the group alone the
  area 1/|G|, one image of a general point inside, each line the element of an operation, the
  lines mapped onto themselves.
- **The symbol of a plane group** (#137 F4, the part for 0.11, decided by Thomas on 2026-11-22;
  see also #97 and #121 step 10c): `symbol(key, { form: 'short' | 'full' })` of `symcrys/plane` takes
  the key of a plane group too, and `planeGroup` has no field of a symbol beside its key, so that a
  symbol is asked for in one way in every entry point. The full symbol has its positions separated by
  spaces, as in the other entry points (Thomas, 2026-11-24: `p 1 m 1`, and later `P 1 21/c 1` for
  the space groups). Chosen while implementing: a plane point group, for which ITA prints no other
  full symbol (Ch. 3.2, p. 721; Table 3.2.3.1), gives its symbol spaced (`3 m 1`). The lookups and
  lists (#97, 0.12): `isPlaneGroupKey`, `isPointGroupKey`, `findPlaneGroup`, `findPointGroup`,
  `planeGroups()`, `pointGroups()`; `findPlaneGroup` gives `{ key }` (Thomas, 2026-11-24), the shape
  of `findPointGroup` without a setting, which a plane group does not have. Chosen while
  implementing: they read the key and the full symbol, spaces ignored, the lattice letter in lower
  case only (an upper-case letter begins a space-group symbol); `{ setting }` takes the symbol of a
  setting too, as in the other entry points (#123).
- **Lattices and cells of the plane** (#119, #137 G5, decided by Thomas on 2026-11-24, asked with
  proposals and a recommendation): the Bravais lattice and the Patterson symmetry are fields of
  `planeGroup(key)`, the Laue class a field of the plane `pointGroup(key)` (fixed by the key, as
  "Fixed properties are fields of `pointGroup()`"); the restrictions on the cell parameters of ITA
  Table 2.1.1.1 are data per crystal system, `cellRestrictions(system)`; the cell functions for
  d = 2 come with them, with the names of the other entry points (`latticeFromParameters`,
  `latticeParameters`, `metricTensor`, `reciprocalBasis`). Chosen while implementing: the Laue class
  is computed by ITA's rule (the twofold rotation, the centre of the plane, added; § 3.2.1.1,
  p. 720) and anchored twice in print (the boxed groups of Table 2.1.1.1, and the printed Patterson
  symmetry of every plane group, the symmorphic group of its lattice with that Laue class); the
  Patterson symmetry is stored as printed; the Bravais lattice is the family symbol of the table
  with the lattice letter of the group; the record of the restrictions has `parameters`, `equal`,
  `angles` and `nonAcute`, the last for the footnote § of the table (γ of the oblique system); a
  basis is the type `Mat2` (two rows of two numbers, as `Mat3`), and a cell flat within rounding or
  with edges whose products overflow or vanish is refused by the criterion of the 3D cell functions
  (review). `residualOperations` for d = 2 followed in 0.13 (#119; chosen while implementing: as in
  3D, the caller's operations are kept as they are, read by their integer `matrix`; in Python the
  kept rows of the caller's `Operations`).
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
  recommendation): **`planeGroup(key)`** names the function that gives a plane group (number, point
  group, system, centring, origin; the symbols by `symbol`), not `spaceGroup` as recommended (one
  name for plane and space): a name that says what it is serves teaching and the apps;
  `symcrys/space` will have `spaceGroup`. The other names come from the other entry points
  (`operations`, `generators`, `wyckoffPositions`, `siteSymmetry`, `orbit`, `describeOperations`)
  and take the key of a plane group or of a plane point group. **The plane point groups in the
  lattice basis** (integer 2 × 2 matrices, the type of the plane groups, so that the point group of
  a plane group is its linear part), and `3m` in two settings, `3m1` and `31m`, as in p3m1 and
  p31m. **Asymmetric unit and symmetry elements as numbers in symcrys**, so that the calculation is
  in one place for all apps ("Elements and the asymmetric unit as data"). Asked in a second round
  (Thomas, 2026-11-22, #31, all four recommendations taken): **functions of a point take the key**,
  `siteSymmetry(key, point)`, `wyckoffPosition(key, point)`, `orbit(key, point)` with
  `{ tolerance }` (the site symmetry needs the group modulo the lattice; arbitrary lists of
  operations belong to the determination); **names** `asymmetricUnit(key)` and
  `symmetryElements(key)`, ITA's terms; **plane point groups** with ten keys as in ITA Table
  3.2.1.1 and `3m` in the settings 1 = `3m1` and 2 = `31m` (`{ setting }`, `pointGroup`, `symbol`,
  as in `symcrys`); their **positions and edge forms** (ITA Table 3.2.3.1) later, #81. Chosen while
  implementing (PR #82): a Wyckoff position gives all printed coordinates of its (0,0)+ set
  (`coordinates`, a list), since ITA prints them all for the plane groups; fields and functions as
  in `symcrys` where the notion is the same (`crystalSystem`, `settings(key)` as a list of settings
  with `index`, `symbol`, `isDefault`; review of PR #82). In Python a translation, a point and a
  vertex are float64 even where their entries are integers, a direction of a line int64 (the plane
  list of `api.json`, "arrays"). Asked in a third round (Thomas, 2026-11-22, #84, #85;
  recommendations taken): **`describeOperationsOf(operations)`** describes any list of operations
  of the plane, the name of the other entry points for the same notion; a translation is read as a
  fraction with a denominator of at most 12, within the tolerance. **`axis`** of a mirror or glide
  line, its symmetry direction in the lattice basis (ITA Table 2.1.3.1; sign: #107, #114), in the
  descriptions and in each line of `symmetryElements`, so that an application can assign a line to a
  position of the symbol without a metric.
- **Print anchor: ITA 6th edition (2016), Chapter 2.2** (#31, asked together with the four
  questions; the reference edition and its exception: "Pure ITC"). The
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
  description, `describe.reference.test.ts`) and the reflection conditions (not transcribed: plane-groups leaves
  diffraction to the diffraction app); the selected generators must close into the printed general
  position, or `planeGroupOperations` throws, as for the point groups.
