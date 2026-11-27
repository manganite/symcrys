# Guide – symcrys

The binding rules of the library: what symcrys is, how it treats its sources, how its API is
shaped, and how correctness is secured. They apply to every change, by anyone. A rule that does not
fit a case is changed here, once the change is agreed (`CLAUDE.md`), in the same pull request; it
is not bypassed. The conventions themselves
(frames, settings, symbols, tolerances) are in [`docs/conventions.md`](docs/conventions.md); how
work in this repository is done is in [`CLAUDE.md`](CLAUDE.md).

## 1. Purpose and scope

- symcrys is the shared computational core for crystallographic symmetry: groups as data, group
  generation, symbols and settings, derived properties, site symmetry, Wyckoff positions, orbits,
  crystal forms, changes of coordinates, and the forms of property tensors.
- It holds **calculations, not presentation.** LaTeX, SVG, relation strings, Nye diagrams, view
  models and display names in other languages stay in the applications.
- **Symmetry only.** Applications of the results (second-harmonic source terms, laboratory
  geometry, simulation) are not part of symcrys.
- It is a library in its own right: usable without any particular application, extensible,
  English throughout (identifiers, comments, documentation, commit messages).
- **Two packages, one implementation:** the TypeScript library (`packages/ts`, npm) and a thin
  Python layer (`packages/python`, PyPI) that runs the bundled `dist/` of the same version in an
  embedded JavaScript engine. Every calculation is written, tested and documented once, in
  TypeScript; the results of the two agree up to the last bit of a float.

## 2. ITC as the standard

- **One convention: ITC.** Conventions, symbols and nomenclature follow the _International Tables
  for Crystallography_: Vol. A for the crystal classes and the plane groups, Vol. D for the
  magnetic point groups and property tensors. There is no other convention and no option to choose
  one.
- **Reference edition:** ITA 6th ed. (2016). Exception: what comes from the space-group tables
  (Ch. 2.3) is anchored in the 5th ed. (2006, Part 7). This is the one place that states it.
- **No special solutions for applications.** An application's choice is no reason for behaviour of
  the API; an application whose frame, setting or symbol differs from ITC converts in the
  application.
- **A choice print leaves open** is made by ITC's conventions where they extend to the case;
  otherwise it is a convention of symcrys, stated as such in `docs/conventions.md`.
- **Settings are those ITC prints**: an orientation is a setting if ITC prints the symbol of the
  group in that orientation in any volume (the exact reading: `docs/conventions.md`, "Settings").
  A setting is selected by its ITC symbol, with its index as a second handle.
- **Signs of axes:** the axis of an operation (for a reflection, its normal) carries the sign of
  its Seitz symbol (ITA 2016 § 1.4.2), in every entry point; ITA Table 2.1.3.1 is the anchor of the
  lattice symmetry directions.
- **Birss is a second print check**, not a source: Birss's tables are carried into the ITC frame
  and compared there. Nothing is derived from Birss.

## 3. Own structure: data minimal, everything else computed

ITC sets the standard; symcrys processes the content in a structure of its own and computes its
results. It is not a digital interface to printed tables.

- **Library data are only:**
  - generators and centrings;
  - the time-reversal assignment of the black-and-white groups;
  - vocabulary (names of crystal forms, of lattices);
  - explicitly named convention data that cannot be derived (each one marked as such in the code
    and in `docs/conventions.md`).
- **Everything else is computed** from these: operations and their order, Wyckoff positions,
  crystal forms, symbols, signs of axes, cell changes, tensor forms.
- **No library module holds a table in printed form or printed order**, except vocabulary: the
  established names of the field are standard vocabulary, not inventions of a print source, and
  stay as they are (the 47 crystal forms with the numbers of faces and eigensymmetries that define
  them, `formTypes.ts`), named by their content, never by the table that prints them. Notation in
  results (`x,-y,z`, `h,0,l`, symbols) is formatted output of computed structures. One module
  still holds a printed table and is rebuilt by this rule: `PLANE_FAMILIES` of
  `spaceGroups/planeLattice.ts` (the cell restrictions follow from the holohedry); no new one is
  added.
- **`references/` is only the anchor of the tests**, never the source of an API result.
- **Names say what a thing is in crystallographic terms**: functions, parameters, fields, types and
  internal identifiers (`cellTransformation`, `formType: 'tetragonal-prism'`). The usual notation of
  the field (symbols, Wyckoff letters, Miller indices, group numbers) is used as it is. A print
  source is cited in a comment or in `@remarks`, never in a name of library code; test-only code may
  be named after the anchor it checks.

## 4. Library code

Library code is everything in `packages/ts/src` except test-only code ("Correctness and tests").

- **No DOM, no UI, no I/O.** `tsconfig.build.json` type-checks it without DOM or Node types; ESLint
  forbids environment globals and any non-relative import there.
- **No runtime dependencies** in the TypeScript package. The Python package depends on `quickjs-ng`
  and NumPy only. A new runtime dependency is a decision of its own (`CLAUDE.md`).
- **`dist/` runs unbundled** in browsers and in Node: relative imports carry the `.js` extension
  (`NodeNext`), and `scripts/check-dist.mjs` fails on any other import or type reference in `dist/`.
- **One-way dependency.** symcrys knows nothing of the applications that use it. Only scripts under
  `audit/` may read sibling checkouts; they are run by hand, never by the build, the tests or CI.

## 5. The API

### Entry points

- The public API is what the entries in `exports` of `packages/ts/package.json` export:
  `symcrys` (the 32 crystal classes), `symcrys/magnetic` (the 122 magnetic point groups) and
  `symcrys/plane` (the 17 plane groups and 10 plane point groups). Everything else is internal.
- **The import decides how a key is read**, with the same function names in every entry point
  where the notion is the same. `32` in `symcrys` is the crystal class; in `symcrys/magnetic` it is
  the white group, and a crystal without magnetic order has the grey group `321'`.
- **The crystallographic API has no time reversal.** A question that involves it (a magnetic key, a
  time-odd property, an operation with `timeReversal: true`) is an error that names the magnetic
  API. `timeParity: 'even'` and `timeReversal: false` are accepted, so that data of the magnetic API
  without time reversal can be passed on. Where the result depends on time reversal (tensors,
  identification), the magnetic API refuses an operation that does not say whether it carries it;
  the functions whose result does not depend on it (`siteSymmetryOf`, `orbitOf`,
  `changeOfCoordinates`) read it as false when it is left out.
- **One implementation serves both point-group entry points**: the shared modules compute for all
  122 groups, and `crystalClasses.ts` checks what comes in and leaves time reversal out of what goes
  back. A new point-group function goes into the shared modules and is exported by both, unless it
  exists for the crystal classes only (as the Wyckoff positions and crystal forms, which ITA
  tabulates for the classes).

### Shape of calls and results

- **Plain data at the boundary**: numbers, strings, booleans, arrays and plain objects; no classes,
  functions, `Map` or `Set` as arguments or results, so that another language can pass everything
  as JSON.
- **Results are numbers, not text**: tensor forms as bases, index lists and coefficient rows;
  operations as matrices; descriptions as structured fields.
- **Results are frozen** and typed `readonly`; "not found" is `undefined`, never `null`.
- **Options** are one plain object as the last argument; a key the function does not know is an
  error.
- **Names:** the suffix `…Of` means "of a list of operations" and only that (`siteSymmetry(key, …)`
  beside `siteSymmetryOf(operations, …)`); terms are ITA's (`n`, `'reflection'`,
  `'glide-reflection'`, `enantiomorphic`). One parameter has one name in every entry point.
- **What is fixed once a group is named is a field of `pointGroup(key)`** (system, order,
  centrosymmetric, polar, enantiomorphic, Laue class); a question asked of a list of operations is
  an `…Of` function.
- **A property that is the question whether a tensor is allowed** is one entry of
  `TENSOR_PROPERTIES`, asked by `allowsProperty` and its relatives, never a function of its own. One
  name per kind of tensor.

### Input

- **Keys** are the ITC short symbols (`docs/conventions.md`, "Keys").
- **Tolerant input** is a pure normalisation before the comparison (spaces, spellings of the
  overbar and the prime, the printed cubic and grey-group spellings, Schoenflies symbols, the short
  symbols of the plane groups of International Tables (1952)). It never changes the
  meaning: an input that could name two groups or settings is an error that lists the candidates,
  and a string symcrys writes is read back as the same group or refused, never as another group.
- **A wrong input is an error, never a silent answer.** A vector in the wrong basis, a list that is
  not a group where a group is needed, an index symmetry that does not apply at the rank, a tolerance
  that cannot hold: each is refused with a message that says what is wrong and how to pass it. A
  function that answers such input silently has a bug.
- **Operations** are records `{ matrix, cartesian }` (with `timeReversal` in the magnetic API;
  `{ matrix, translation }` in the plane). A function that computes with Cartesian matrices reads
  `cartesian` and refuses a record without it, so that W cannot pass for a Cartesian matrix.
- **One tolerance contract**: every function that compares numbers of a caller takes
  `{ tolerance }`, default `EPSILON`, with one check and one metric per kind of object
  (`docs/conventions.md`, "Tolerances").
- **Errors:** wrong input is a `RangeError` whose message says what is wrong; a `TypeError` or a
  plain `Error` is a fault of symcrys.

### Numbers

- Cartesian matrices are floating point, snapped to exact values during closure. Whatever lives in
  a lattice basis is exact: integer matrices W, translations as rationals inside (pairs of safe
  integers in lowest terms; an intermediate value outside the safe integers throws rather than
  rounds), plain numbers at the API.
- Indices into lists are 0-based; numbers that ITA or symcrys assigns (settings, positions of a
  symbol, group numbers) count from 1.

## 6. The Python layer

- **The Python API follows the TypeScript API by fixed rules** (`_convert.py`): names camelCase →
  snake_case; an options object becomes keyword-only arguments, another object parameter its fields
  as arguments; arrays of numbers become NumPy arrays, chosen by the field name
  (`packages/python/api.json`): `int64` for indices, Miller indices, lattice directions and the
  matrices W, `float64` for every other array (Cartesian matrices and vectors, tensor bases and
  relations, translations and points of the plane); a
  record becomes a dict typed by a TypedDict of the TypeScript interface's name; a list of
  operations becomes one `Operations` record of arrays; a `RangeError` raises `SymcrysError` (a
  `ValueError`), any other error `SymcrysInternalError` (a `RuntimeError`).
- **The modules are generated** from the TypeScript entry points (`scripts/python-api.mjs`):
  signatures, bodies, docstrings, TypedDicts, Literal types and `__all__`. Hand-written are only
  `api.json`, `docstrings.json` and the modules `_shared.py`, `_convert.py`, `_engine.py`.
- **Every export has a Python function** in the matching module (`symcrys`, `symcrys.magnetic`,
  `symcrys.plane`), in the same pull request; a test fails until it has one.
- **The engine stays replaceable**: the whole boundary is one function, `call(name, argsJson) →
resultJson`.

## 7. Correctness and tests

- **Print is the authority.** Every crystallographic or physical claim is checked against a print
  source with its printed page; output of an application is never an authority.
- **Anti-circularity.** Expected values of correctness tests come from print, directly or by an
  independent derivation calibrated against print, never from symcrys.
- **Three classes of fixtures**, recorded in each fixture's `source` or `note`: (a) print-verified;
  (b) independently derived and calibrated against (a); (c) behavioural pins captured from a
  known-good revision. Pins detect regressions and are no authority; they are re-captured, never
  edited to turn green.
- **Safety net first.** Before a change of data or mathematics, the relevant fixture is extended
  and green. A change of a pin is listed with its reason in the pull request, then re-captured.
- **`references/`** holds transcriptions of printed tables with source and printed page. A file
  changes only by transcription from print or by correction against it; its head note states the
  source, when the transcription was made and how it was checked, and follows the state of that
  source; what symcrys does with the data (which settings it has) belongs in `docs/conventions.md`,
  not there. Prettier and ESLint leave these files alone.
- **Tests sit next to their module** (`foo.ts`, `foo.test.ts`). Test-only code is `*.test.ts`,
  `*.fixtures.ts`, `*.pins.json` and `testUtils/`; it may use Node, is type-checked with Node
  types, and is never built into `dist/` or packed.
- **Kinds of tests**, by suffix: `*.reference.test.ts` re-parse print transcriptions,
  `*.audit.test.ts` cover exhaustively, `*.pins.test.ts` compare with pins. Consistency tests
  (`invariance.test.ts`, `entryPoints.test.ts`) compare symcrys with itself under a change that must
  not matter; they find contradictions, not wrong values. `npm test` runs all of them.
- **Fixtures are JSON** (`*.pins.json`, one entry per line), so that the tests of both languages
  can read the same files; a hand-written fixture in `.ts` moves to JSON when it is next touched.
  The ITC baseline pins are the regression net of the TypeScript tests over all three entry points.
- **The API pins** (`api.pins.json`): calls of every export but the version as data with their
  answers, every function of a key for every group and setting. Both languages replay them, Python
  through its layer, its keys, dtypes and numbers checked by the rules of "The Python layer".
- **Python tests** read the same `references/` (for correctness) and the API pins (for the
  layer) and have no expected values of their own; in addition they test the layer itself and run
  the example notebooks.

## 8. Documentation

- **Every kind of information has one place** (`CLAUDE.md`, "Where things go"); elsewhere it is
  linked, not repeated.
- **The current state only.** Documentation, comments and TSDoc describe what holds now. How it
  was reached (alternatives, discussions, earlier versions) is kept in issues, pull requests,
  `CHANGELOG.md` and git.
- **Neutral wording.** Rules and documentation state what holds ("Settings are those ITC prints"),
  not who said it or when: no names of persons, no dates of decisions, no quotations from
  conversations, no issue numbers in what users read. A rule may carry a one-line reason where that
  prevents reopening a question. `scripts/check-wording.mjs`, part of `npm run lint`, enforces this.
- **One description of every export: its TSDoc comment.** The TypeScript reference and the Python
  docstrings are generated from it. Its summary is written for both languages; what holds for
  TypeScript only, and the print sources, go into `@remarks`.
- **Everything shown runs**: TypeScript examples of the site are files run against the build,
  Python cells and notebooks are executed, and a failing example fails the gate `docs`.
- **READMEs are short**: what symcrys is, how to install it, one example, the link to the site.

## 9. Versions and changes

- **SemVer.** Before 1.0.0: MINOR for new features and any breaking change, PATCH for fixes. From
  1.0.0 on: MAJOR for breaking changes.
- **One version for both packages** (`src/version.ts`, `packages/ts/package.json`,
  `packages/python/pyproject.toml`), checked by tests in both languages.
- **`CHANGELOG.md`** (Keep a Changelog) has an entry for every change to the public API or to
  calculated results. A correction says what was wrong and since which version it is fixed.
- **The API reports** (`packages/ts/api/*.api.md`) show the public API; a pull request that changes
  them changes the public API.

## 10. Toolchain

- **TypeScript 6, kept valid under 7** (the gate `typecheck:ts7`), so that switching is a version
  bump once the linter supports 7.
- **Two type checks:** library code without environment types, everything else with Node types.
- **vitest** for tests, **Prettier** for formatting, **TypeDoc** and **Sphinx with MyST** for the
  documentation; the tools of the site are pinned in `docs/requirements.txt` and
  `docs/constraints.txt`.
- **No `engines` field**: the library needs only ES2022 with ES modules.
- **`exports` with `default`**, so that `require('symcrys')` and tools that resolve only `default`
  work.
- **The npm package ships `src/`** without test-only code, so that source maps resolve.
