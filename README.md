# symcrys

Crystallographic symmetry calculations in TypeScript: point groups, both crystallographic and
magnetic, with their settings, symbols and properties, and the property tensors they allow. A
library without runtime dependencies that runs unbundled in browsers and in Node, and a Python
package of the same version that runs it in an embedded JavaScript engine.

| Package                 | Folder                               | Install               |
| ----------------------- | ------------------------------------ | --------------------- |
| TypeScript / JavaScript | [`packages/ts`](packages/ts)         | `npm install symcrys` |
| Python ≥ 3.10           | [`packages/python`](packages/python) | `pip install symcrys` |

> **Status: pre-release.** So far: the 32 crystal classes and the 122 magnetic point groups, with
> their settings, symbols, symmetry elements, site symmetry, the forms of property tensors of rank 0
> to 4 and named properties (piezoelectric, ferroaxial, ferromagnetic, …); for the crystal classes
> also Wyckoff positions. The API will change without notice until 1.0.0.

## Scope

symcrys holds calculations, not presentation. Planned, in this order:

1. Point groups: the 32 crystallographic and the 122 magnetic point groups as data (generators),
   group generation, settings, Hermann–Mauguin, Schoenflies and Shubnikov symbols, derived
   properties (centrosymmetric, polar, chiral, magnetoelectric …), subgroups.
2. Plane groups.
3. Space groups.

Property tensors: the symmetry-reduced form of a tensor of rank 0 to 4 under a point group or any
set of operations, from birss-app; results are numbers (coefficient matrices). Rendering (LaTeX,
SVG, relation strings, view models) and translated display names stay in the applications that use
symcrys.

**Conventions.** Point groups follow the _International Tables for Crystallography_ by default
(Vol. A for the crystal classes, Vol. D Ch. 1.5 for the magnetic point groups). The convention of
Birss, _Symmetry and Magnetism_ (1966), is available as an option. Where the two differ is
documented in [`docs/conventions.md`](docs/conventions.md).

**Two entry points.** `symcrys` is the crystallographic API: the 32 crystal classes, without time
reversal. `symcrys/magnetic` is the magnetic API: the 122 magnetic point groups, under the same
function names. The import decides how a key is read. In a purely crystallographic application
`'32'` is a crystal class, that of quartz. Where magnetism plays a part, `'32'` is a white group,
the symmetry of a magnetically ordered crystal, and quartz has the grey group `"321'"`. A question
that involves time reversal is an error in the crystallographic API
([`docs/conventions.md`](docs/conventions.md), "Two entry points").

symcrys is the computational core of the crystallography teaching apps
([stereography](https://github.com/manganite/stereography),
[plane-groups](https://github.com/manganite/plane-groups)) and of
[birss-app](https://github.com/manganite/birss-app); its calculations start from those of
birss-app.

## Use

```bash
npm install symcrys
```

Each release on GitHub also carries the package as `symcrys-X.Y.Z.tgz`.

```ts
import {
  allowedProperties,
  allowsProperty,
  crystalFamily,
  describeOperations,
  holohedry,
  operations,
  pointGroup,
  settings,
  siteSymmetry,
  symbol,
  symmetryDirections,
  tensorForm,
  tensorFormOf,
  wyckoffPositionOf,
  wyckoffPositions,
} from 'symcrys';

symbol('32'); // '321': ITC short symbol of the default setting
symbol('32', { convention: 'birss' }); // '32'
settings('32'); // setting 1: 312, setting 2: 321 (the ITC default)
operations('-3m'); // 12 operations, Cartesian matrices; x ∥ a, z ∥ c
describeOperations('4')[2]; // { kind: 'rotation', order: 4, sense: '+', axis: { lattice: [0, 0, 1], … } }
symmetryDirections('4mm')[1]; // position 2: symbol 'm', directions [100] and [010], each with a mirror
wyckoffPositions('4mm')[2]; // { letter: 'b', multiplicity: 4, siteSymmetry: '..m', millerIndices: 'h,h,l', … }
wyckoffPositionOf('4mm', [0, 0, -1]).letter; // 'a'

const SHG = { rank: 3, parity: 'polar', intrinsic: 'jk' } as const;
tensorForm('mm2', SHG).parameters; // [[0,0,2], [1,1,2], [2,0,0], [2,1,1], [2,2,2]]: xxz, yyz, zxx, zyy, zzz
tensorForm('3m', SHG, { convention: 'birss' }).parameters[0]; // [0, 0, 0]: xxx (ITC default 3m1: xxy)
tensorForm('32', 'piezoelectric').parameters; // [[0,0,0], [0,1,2]]: a property by name, d_111 and d_123
allowsProperty('432', 'piezoelectric'); // false
allowedProperties('32'); // ['piezoelectric', 'gyrotropic']: quartz
allowedProperties('-3'); // ['ferroaxial']: NiTiO₃; tensorForm('-3', 'ferroaxial').parameters is [[2]], along z
pointGroup('32'); // { key: '32', crystalSystem: 'trigonal', order: 6, centrosymmetric: false, polar: false, chiral: true, laueClass: '-3m' }
holohedry('trigonal'); // '-3m'; with hexagonal axes holohedry(crystalFamily('trigonal')): '6/mmm'
// SHG at the (111) surface of an m-3m crystal: the form under the site symmetry of the normal
const ops = operations('m-3m');
tensorFormOf(
  siteSymmetry(ops, [1, 1, 1]).operations.map((i) => ops[i]),
  SHG,
).basis.length; // 4
```

The magnetic point groups, with time reversal:

```ts
import { allowedProperties, operations, pointGroup, tensorForm } from 'symcrys/magnetic';

pointGroup("4'/mmm'"); // { key: "4'/mmm'", type: 'III', crystalClass: '4/mmm', crystalSystem: 'tetragonal', order: 16, centrosymmetric: true, … }
operations("4'/mmm'")[2]; // { matrix: …, timeReversal: true }
allowedProperties("m'm'2"); // six of the seven names: all but 'ferroaxial'
allowedProperties("321'"); // ['piezoelectric', 'gyrotropic']: quartz, the grey group of class 32
allowedProperties('32'); // the white group 32: also 'magnetoelectric', 'piezomagnetic'
tensorForm("m'm'2", 'ferromagnetic').parameters; // [[2]]: M_s along z
tensorForm('mm2', { rank: 3, parity: 'polar', timeParity: 'i', intrinsic: 'jk' }); // a specification names its time parity
```

A form gives the components by flat index (first index slowest: xyz of rank 3 is 5), the basis in
reduced row echelon form and the relations as coefficient rows; see
[`docs/conventions.md`](docs/conventions.md), "Tensors".

Conventions, frames and symbols: [`docs/conventions.md`](docs/conventions.md).

**Python.** The same functions with snake_case names, matrices as NumPy arrays; details and an
example for SHG at a surface in [`packages/python/README.md`](packages/python/README.md) and the
notebook [`packages/python/examples/surface-shg.ipynb`](packages/python/examples/surface-shg.ipynb).

```python
import symcrys

SHG = {"rank": 3, "parity": "polar", "intrinsic": "jk"}
symcrys.tensor_form("mm2", SHG)["parameters"]   # array([[0, 0, 2], [1, 1, 2], [2, 0, 0], [2, 1, 1], [2, 2, 2]])
symcrys.magnetic.allowed_properties("321'")     # ['piezoelectric', 'gyrotropic']: the magnetic API
```

Without a build step, copy `dist/` (from the tarball, or built with `npm run build` into
`packages/ts/dist/`) next to your code and import `dist/index.js` (the magnetic API:
`dist/magnetic.js`) directly: every module in `dist/` imports only relative `.js` paths. With crystallography-common's `sync.mjs --kern`, a checkout is
given as `packages/ts` of the symcrys checkout.

## Development

Development requires Node 22 (22.13 or later) or 24; CI runs on both. The library itself needs only
an ES2022 runtime with ES modules. All commands run in the root of the repository (an npm
workspace with `packages/ts`).

```bash
npm install
npm run typecheck      # TypeScript 6: tests and scripts with Node types, library code without
npm run typecheck:ts7  # the same with TypeScript 7
npm run lint           # ESLint
npm run format:check   # Prettier (npm run format fixes)
npm test               # vitest
npm run build          # packages/ts/dist/: JavaScript, .d.ts, source maps
npm run check:dist     # dist/ loads, imports only relative .js paths, has no test-only code
```

The Python package (Python 3.10 or later) needs the built `dist/`, bundled into one script:

```bash
npm run build && npm run bundle:python   # packages/python/src/symcrys/_bundle.js
cd packages/python
pip install -e ".[test]"
mypy                                     # type check, strict
pytest                                   # reads the same references/ and pins as the TypeScript tests
```

Audits under `audit/` compare the code bases symcrys draws on. They are run by hand, with
[birss-app](https://github.com/manganite/birss-app) and
[stereography](https://github.com/manganite/stereography) checked out next to this repository:
`npm run audit:point-groups` writes `audit/point-groups/report.md`, and `npm run audit:birss-app`
captures the pins of the Birss convention as JSON (`packages/ts/src/pointGroups/birssApp.pins.json`
for the operations of all 122 magnetic point groups, `packages/ts/src/tensors/birssApp.pins.json` for the tensor forms).

CI runs these seven gates on every pull request, on Node 22 and 24, and the gate `python` (bundle,
build sdist and wheel, install the wheel, `mypy`, `pytest`) on Python 3.10 and the newest. Tests sit next to their
module (`foo.ts`, `foo.test.ts`). Working rules for contributors, human or agent: `CLAUDE.md`.

## Releases

1. Release PR: version in `packages/ts/package.json`, `package-lock.json` (`npm install
--package-lock-only`), `packages/ts/src/version.ts` and `packages/python/pyproject.toml`, and the stored output of
   `symcrys.VERSION` in `packages/python/examples/surface-shg.ipynb`; move the `Unreleased` entries of `CHANGELOG.md` under
   `## [X.Y.Z] - YYYY-MM-DD` and update the link definitions at the bottom (`[Unreleased]` compares
   `vX.Y.Z...HEAD`, `[X.Y.Z]` compares the previous tag with `vX.Y.Z`).
2. After the merge: `git fetch origin`, check that `origin/main` is the merge commit of the release PR,
   then `git tag -a vX.Y.Z -m "symcrys X.Y.Z" origin/main && git push origin vX.Y.Z`.
3. The tag runs `.github/workflows/release.yml`: it checks that the tag matches both packages,
   runs all gates, and creates the GitHub release with the `CHANGELOG.md` section as notes and the
   `npm pack` tarball, the Python sdist and the wheel attached. Check that the workflow is green
   and the release carries `symcrys-X.Y.Z.tgz`, `symcrys-X.Y.Z.tar.gz` and
   `symcrys-X.Y.Z-py3-none-any.whl`.

**npm.** The `npm` job of `release.yml` submits the same tarball to npm as a staged version
(trusted publishing, no token). Its log shows the tarball's shasum and integrity and the stage id. The version
goes live only after approval with two-factor authentication (npm 11.15 or later):

1. `npm stage list symcrys`, then `npm stage view <stage-id>`: version and shasum must match the log
   of the `npm` job (or "Staged Packages" on npmjs.com).
2. `npm stage approve <stage-id>`. npm first runs an automated review of the staged version; until
   it has finished, approval fails with `E409 … automated review hasn't finished`. Then approve again
   a little later (for 0.1.1 it took a few minutes).
3. `npm view symcrys` shows the version as `latest`.

If staging fails, re-run the `npm` job (a staged version cannot be staged twice, so check
`npm stage list` first). An authentication error usually means the trusted publisher on npmjs.com
does not match (repository, workflow `release.yml`); the stage step runs with `--loglevel verbose`,
so its log shows the OIDC exchange. As a fallback, stage the release asset by hand:
`npm stage publish ./symcrys-X.Y.Z.tgz` (then without provenance, which only CI can attest).

**PyPI.** The `pypi` job of `release.yml` waits for approval in the GitHub environment `pypi`
(Actions › the run › "Review deployments"), then publishes the same sdist and wheel by trusted
publishing (no token). Check `pip index versions symcrys` afterwards.

What this rests on (set up for 0.5.0, the first release with the Python package):

1. GitHub, Settings › Environments: the environment `pypi` with Thomas as required reviewer,
   deployment branches and tags limited to tags `v*.*.*`.
2. pypi.org, project `symcrys` › Publishing: the trusted publisher with owner `manganite`,
   repository `symcrys`, workflow `release.yml`, environment `pypi`.
3. `python (3.10)` and `python (3.x)` among the required checks of the ruleset `main`.

## Licence

[MIT](LICENSE) © 2026 Thomas Lottermoser
