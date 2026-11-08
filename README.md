# symcrys

Crystallographic symmetry calculations in TypeScript: point groups, both crystallographic and
magnetic, with their settings, symbols and properties, and the property tensors they allow. A
library without runtime dependencies that runs unbundled in browsers and in Node.

> **Status: pre-release.** The repository holds the scaffold only; the only export is `VERSION`.
> The API will change without notice until 1.0.0.

## Scope

symcrys holds calculations, not presentation. Planned, in this order:

1. Point groups: the 32 crystallographic and the 122 magnetic point groups as data (generators),
   group generation, settings, Hermann–Mauguin, Schoenflies and Shubnikov symbols, derived
   properties (centrosymmetric, polar, chiral, magnetoelectric …), subgroups.
2. Plane groups.
3. Space groups.

The tensor calculations of birss-app (tensor forms, projections) move here as well; their place in
this order is not yet fixed. Rendering (LaTeX, SVG, view models) and translated
display names stay in the applications that use symcrys.

**Conventions.** Point groups follow the _International Tables for Crystallography_ by default
(Vol. A for the crystal classes, Vol. D Ch. 1.5 for the magnetic point groups). The convention of
Birss, _Symmetry and Magnetism_ (1966), is available as an option. Where the two differ is
documented in `docs/` as the point groups arrive.

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
import { VERSION } from 'symcrys';
```

Without a build step, copy `dist/` (from the tarball, or built with `npm run build`) next to your
code and import `dist/index.js` directly: every module in `dist/` imports only relative `.js`
paths.

## Development

Development requires Node 22 (22.13 or later) or 24; CI runs on both. The library itself needs only
an ES2022 runtime with ES modules.

```bash
npm install
npm run typecheck      # TypeScript 6: tests and scripts with Node types, library code without
npm run typecheck:ts7  # the same with TypeScript 7
npm run lint           # ESLint
npm run format:check   # Prettier (npm run format fixes)
npm test               # vitest
npm run build          # dist/: JavaScript, .d.ts, source maps
npm run check:dist     # dist/ loads, imports only relative .js paths, has no test-only code
```

Audits under `audit/` compare the code bases symcrys draws on. They are run by hand, with
[birss-app](https://github.com/manganite/birss-app) and
[stereography](https://github.com/manganite/stereography) checked out next to this repository:
`npm run audit:point-groups` writes `audit/point-groups/report.md`.

CI runs these seven gates on every pull request, on Node 22 and 24. Tests sit next to their
module (`foo.ts`, `foo.test.ts`). Working rules for contributors, human or agent: `CLAUDE.md`.

## Releases

1. Release PR: version in `package.json`, `package-lock.json` (`npm install --package-lock-only`)
   and `src/version.ts`; move the `Unreleased` entries of `CHANGELOG.md` under
   `## [X.Y.Z] - YYYY-MM-DD` and update the link definitions at the bottom (`[Unreleased]` compares
   `vX.Y.Z...HEAD`, `[X.Y.Z]` points to the release).
2. After the merge: `git fetch origin`, check that `origin/main` is the merge commit of the release PR,
   then `git tag -a vX.Y.Z -m "symcrys X.Y.Z" origin/main && git push origin vX.Y.Z`.
3. The tag runs `.github/workflows/release.yml`: it checks that the tag matches `package.json`,
   runs all gates, and creates the GitHub release with the `CHANGELOG.md` section as notes and the
   `npm pack` tarball attached. Check that the workflow is green and the release carries
   `symcrys-X.Y.Z.tgz`.

**npm.** The `npm` job of `release.yml` submits the same tarball to npm as a staged version
(trusted publishing, no token). Its log shows the tarball's shasum and integrity and the stage id. The version
goes live only after approval with two-factor authentication (npm 11.15 or later):

1. `npm stage list symcrys`, then `npm stage view <stage-id>`: version and shasum must match the log
   of the `npm` job (or "Staged Packages" on npmjs.com).
2. `npm stage approve <stage-id>`.
3. `npm view symcrys` shows the version as `latest`.

If staging fails, re-run the `npm` job (a staged version cannot be staged twice, so check
`npm stage list` first). An authentication error usually means the trusted publisher on npmjs.com
does not match (repository, workflow `release.yml`); the stage step runs with `--loglevel verbose`,
so its log shows the OIDC exchange. As a fallback, stage the release asset by hand:
`npm stage publish ./symcrys-X.Y.Z.tgz` (then without provenance, which only CI can attest).

## Licence

[MIT](LICENSE) © 2026 Thomas Lottermoser
