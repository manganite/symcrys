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

Not yet on npm. Each release on GitHub carries the package as `symcrys-X.Y.Z.tgz`:

```bash
npm install https://github.com/manganite/symcrys/releases/download/vX.Y.Z/symcrys-X.Y.Z.tgz
```

```ts
import { VERSION } from 'symcrys';
```

Without a build step, copy `dist/` (from the tarball, or built with `npm run build`) next to your
code and import `dist/index.js` directly: every module in `dist/` imports only relative `.js`
paths.

## Development

Requires Node 22.12 or later.

```bash
npm install
npm run typecheck      # TypeScript 6, src/ including tests
npm run typecheck:ts7  # the same with TypeScript 7 (fetched by npx)
npm run lint           # ESLint
npm run format:check   # Prettier (npm run format fixes)
npm test               # vitest
npm run build          # dist/: JavaScript, .d.ts, source maps
npm run check:dist     # dist/ loads, imports only relative .js paths, has no tests
```

CI runs these seven gates on every pull request, on Node 22 and 24. Tests sit next to their
module (`foo.ts`, `foo.test.ts`). Working rules for contributors, human or agent: `CLAUDE.md`.

## Releases

1. Release PR: version in `package.json`, `package-lock.json` (`npm install --package-lock-only`)
   and `src/version.ts`; move the `Unreleased` entries of `CHANGELOG.md` under
   `## [X.Y.Z] - YYYY-MM-DD` and add the compare link at the bottom.
2. After the merge, on the merge commit of the release PR:
   `git tag -a vX.Y.Z -m "symcrys X.Y.Z" && git push origin vX.Y.Z`.
3. The tag runs `.github/workflows/release.yml`: it checks that the tag matches `package.json`,
   runs all gates, and creates the GitHub release with the `CHANGELOG.md` section as notes and the
   `npm pack` tarball attached.

**npm** (not yet set up). The first version is published by hand from a clean checkout of the
tag: `npm login` (account with two-factor authentication), then `npm publish`. After that,
"Trusted Publishing" for `manganite/symcrys` and `release.yml` can be configured on npmjs.com, so
that later tags publish without a token.

## Licence

[MIT](LICENSE) © 2026 Thomas Lottermoser
