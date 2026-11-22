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
> also Wyckoff positions and crystal forms; the 17 plane groups with their operations, Wyckoff
> positions, asymmetric unit and symmetry elements. Until 1.0.0 a MINOR version may change the API; every
> change to the API or to calculated results is recorded in [`CHANGELOG.md`](CHANGELOG.md).

## Scope

symcrys holds calculations, not presentation. It has:

1. Point groups: the 32 crystallographic and the 122 magnetic point groups as data (generators),
   group generation, settings, Hermann–Mauguin and Schoenflies symbols, derived properties
   (centrosymmetric, polar, chiral, the named tensor properties), site symmetry, Wyckoff positions,
   crystal forms, orbits, and the point group of any list of operations.
2. Plane groups and plane point groups (`symcrys/plane`).

Planned: space groups (`symcrys/space`).

Property tensors: the symmetry-reduced form of a tensor of rank 0 to 4 under a point group or any
set of operations, from birss-app; results are numbers (coefficient matrices). Rendering (LaTeX,
SVG, relation strings, view models) and translated display names stay in the applications that use
symcrys.

**Conventions.** Point groups follow the _International Tables for Crystallography_ by default;
the convention of Birss, _Symmetry and Magnetism_ (1966), is an option. **Two entry points:**
`symcrys` for the 32 crystal classes, `symcrys/magnetic` for the 122 magnetic point groups, under the
same function names; the import decides how a key such as `'32'` is read. A third, `symcrys/plane`,
holds the plane groups and plane point groups.

symcrys is the computational core of the crystallography teaching apps
([stereography](https://github.com/manganite/stereography),
[plane-groups](https://github.com/manganite/plane-groups)) and of
[birss-app](https://github.com/manganite/birss-app); its calculations start from those of
birss-app.

## Documentation

**[manganite.github.io/symcrys](https://manganite.github.io/symcrys/)**: getting started in
TypeScript and Python, the two readings of a key, the conventions, tensors and named properties,
examples (second-harmonic generation at surfaces) and the reference for both languages. The
conventions with their print sources are kept in [`docs/conventions.md`](docs/conventions.md),
which the site includes.

```ts
import { allowedProperties, symbol, tensorForm } from 'symcrys';

symbol('32'); // '321': ITC short symbol of the default setting
tensorForm('mm2', { rank: 3, parity: 'polar', intrinsic: 'jk' }).parameters; // xxz, yyz, zxx, zyy, zzz
allowedProperties('32'); // ['piezoelectric', 'gyrotropic']: quartz
```

```python
import symcrys

symcrys.tensor_form("mm2", {"rank": 3, "parity": "polar", "intrinsic": "jk"})["parameters"]
symcrys.magnetic.allowed_properties("321'")  # ['piezoelectric', 'gyrotropic']: quartz, the grey group
```

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

The documentation site (`docs/`, Sphinx with MyST; the TypeScript reference by TypeDoc) needs
the built package installed in Python and the documentation tools (`docs/requirements.txt`, not
dependencies of the packages):

```bash
npm run build && npm run bundle:python
PIP_CONSTRAINT=docs/constraints.txt python -m pip install -e packages/python -r docs/requirements.txt
npm run docs:check     # TypeDoc (fails on warnings), Python docstrings current, examples type-check
npm run docs:site      # build/docs/html: every example and notebook executed, every reference resolved
npm run docs:linkcheck # external links (CI: workflow Links, not a gate)
```

The docstrings of the Python package are written from the TSDoc comments: after changing a TSDoc
comment, run `npm run docs:python` and commit the result (`scripts/python-docstrings.mjs`;
what only Python has, the shapes of the NumPy arrays, is in `packages/python/docstrings.json`).

Audits under `audit/` compare the code bases symcrys draws on. They are run by hand, with
[birss-app](https://github.com/manganite/birss-app) and
[stereography](https://github.com/manganite/stereography) checked out next to this repository:
`npm run audit:point-groups` writes `audit/point-groups/report.md`; `npm run audit:wyckoff-2006`,
`audit:forms-2006` and `audit:plane-groups-2006` compare with the 5th edition of ITA as transcribed
in stereography and in [plane-groups](https://github.com/manganite/plane-groups) (checked out next to
this repository as well); and `npm run audit:birss-app`
captures the pins of the Birss convention as JSON (`packages/ts/src/pointGroups/birssApp.pins.json`
for the operations of all 122 magnetic point groups, `packages/ts/src/tensors/birssApp.pins.json` for the tensor forms).

CI runs these seven gates on every pull request, on Node 22 and 24, the gate `python` (bundle,
build sdist and wheel, install the wheel, `mypy`, `pytest`) on Python 3.10 and the newest, and the
gate `docs` (`docs:check` and `docs:site` above); the external links (`docs:linkcheck`) are
checked by the workflow Links, which is not a gate. Tests sit next to their
module (`foo.ts`, `foo.test.ts`). Working rules for contributors, human or agent: `CLAUDE.md`.

## Releases

1. Release PR: version in `packages/ts/package.json`, `package-lock.json` (`npm install
--package-lock-only`), `packages/ts/src/version.ts` and `packages/python/pyproject.toml`, and the stored output of
   `symcrys.VERSION` in `packages/python/examples/surface-shg.ipynb`; move the `Unreleased` entries of `CHANGELOG.md` under
   `## [X.Y.Z] - YYYY-MM-DD` and update the link definitions at the bottom (`[Unreleased]` compares
   `vX.Y.Z...HEAD`, `[X.Y.Z]` compares the previous tag with `vX.Y.Z`).
2. After the merge: `git fetch origin`, check that `origin/main` is the merge commit of the release PR,
   then `git tag -a vX.Y.Z -m "symcrys X.Y.Z" origin/main && git push origin vX.Y.Z`.
3. The tag runs `.github/workflows/release.yml`: it checks that the tagged commit is on `main` and that the tag matches both packages,
   runs all gates, and creates the GitHub release with the `CHANGELOG.md` section as notes and the
   `npm pack` tarball, the Python sdist and the wheel attached. Check that the workflow is green
   and the release carries `symcrys-X.Y.Z.tgz`, `symcrys-X.Y.Z.tar.gz` and
   `symcrys-X.Y.Z-py3-none-any.whl`.

**Documentation site.** The jobs `site` and `pages` of `release.yml` build the site from the tag
and publish it on GitHub Pages (environment `github-pages`, no approval). Afterwards the site shows
the new version in its title: [manganite.github.io/symcrys](https://manganite.github.io/symcrys/).
This rests on two settings (Thomas): Settings › Pages, source "GitHub Actions"; Settings ›
Environments › `github-pages`, a deployment rule for tags `v*.*.*` (without it the deployment from
a tag is refused).

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
