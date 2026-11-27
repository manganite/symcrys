# CLAUDE.md – symcrys

How work is done in this repository, by humans and agents. The binding rules of the library are in
the guide, which this file loads:

@GUIDE.md

symcrys is its own project: the guide (`LEITFADEN.md`) and `CLAUDE.md` of the crystallography app
family do not apply here. Where another document disagrees on process, this file wins.

## Working with the maintainer

- Conversation in German; everything in the repository in English.
- Ask when something is unclear; do not guess. Say so when you do not know. Precise, verifiable, to
  the point. Proactive proposals are welcome.
- The maintainer is the domain authority. A question of convention or design goes to the
  maintainer with the options and a recommendation, before implementing. The answer becomes a rule
  in `GUIDE.md` or a convention in `docs/conventions.md`, worded as what holds; the discussion stays
  in the issue.
- A choice that print leaves open and ITC's conventions do not settle is decided with the
  maintainer, never by what an application happens to do.
- A new runtime dependency only with the maintainer's consent.

## Layout

| Path                   | What                                                                                                                                     |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/ts`          | the npm package `symcrys`: `src/`, `dist/`, `package.json`, `tsconfig.build.json`, README; `api/`, the API reports (not packed)          |
| `packages/python`      | the PyPI package `symcrys`: `pyproject.toml`, `src/symcrys/`, `tests/`, `examples/`, `api.json`, `docstrings.json`                       |
| `references/`, `docs/` | shared by both packages; `docs/` is also the source of the documentation site                                                            |
| `scripts/`, `audit/`   | repository tools (`check-dist.mjs`, `bundle-python.mjs`, `python-api.mjs`, `check-wording.mjs`, …); the audits against sibling checkouts |
| root `package.json`    | private npm workspace: the dev dependencies and the gates                                                                                |

`src/`, `dist/` and `tsconfig.build.json` without a prefix are those of `packages/ts`. A checkout
for crystallography-common's `sync.mjs --kern` is `packages/ts` of a symcrys checkout.

## Where things go

| What                                                                         | Where                                       |
| ---------------------------------------------------------------------------- | ------------------------------------------- |
| The binding rules of the library                                             | `GUIDE.md`                                  |
| Way of working, process, literature handling                                 | this file                                   |
| Purpose, use, build commands, release procedure                              | `README.md`                                 |
| Changes per version                                                          | `CHANGELOG.md` (Keep a Changelog)           |
| Supported versions, how to report a vulnerability                            | `SECURITY.md`                               |
| Open work, ideas, questions; reasons and history of decisions                | GitHub issues and pull requests             |
| Conventions (frames, settings, symbols, tolerances) with their print anchors | `docs/conventions.md`                       |
| Guides and examples for users (the documentation site)                       | `docs/` (Sphinx with MyST)                  |
| What a function or type does                                                 | its TSDoc comment in `packages/ts/src`      |
| Transcribed reference tables re-parsed by tests                              | `references/`, with source and printed page |

A pull request that changes a rule, a convention or the process updates `GUIDE.md`,
`docs/conventions.md` or this file in the same pull request. There is no folder of decision
records: reasons live in issues and pull requests.

## Literature and sources

- Crystallographic and physical claims are checked against print with the printed page
  (`GUIDE.md`, "Correctness and tests"). The sources are in the maintainer's Zotero, collection
  _Projekte › Crystallography-Apps_, which holds the literature of the whole app family. A source
  newly cited in symcrys is added there; if it is missing, import it by DOI or ISBN and check its
  metadata against the printed source (for a book: authors, year, edition and publisher against the
  title page). Ask the maintainer for a volume that is not at hand.
- **Before asking a question of convention or group theory**, consult besides ITC and Birss:
  Litvin (magnetic groups; _Acta Cryst._ A**64**, 419 (2008)), Koster, Dimmock, Wheeler & Statz,
  _Properties of the Thirty-Two Point Groups_ (1963), Liboff, _Primer for Point and Space Groups_
  (2004; no PDF in Zotero), Paufler, _Physikalische Kristallographie_ (1986), and for group theory
  Wipf, Rosebrock, Brückler and Glosauer (editions and page offsets in `CLAUDE.md` of
  crystallography-common, "Literatur"). For property tensors: Newnham, _Properties of Materials_
  (2005), whose forms are in the IEEE settings (§ 4.3, p. 26), so a comparison brings both into one
  frame first.
- **Before asking about Birss's tables** (errata, the meaning of the brackets), read birss-app's
  `STATUS.md`, `docs/references/`, `docs/findings/` and the notes in `birss-tables/`.
- **Where the sources are** (Zotero item, PDF, printed page p from the PDF page n or the page index i
  counted from 0):

  | Source                     | Item / PDF              | Printed page                                                                                                                                                                                                                                                            |
  | -------------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | ITA 6th ed. (2016)         | `7NZ258UB` / `NFV3Z3M9` | p = n − 5 for pp. 2–139; p = n − 3 for Ch. 2.1 (pp. 142–174); plane group N on n = 177 + N; p = n + 503 for pp. 720–865                                                                                                                                                 |
  | ITA 5th ed. (2006)         | `3SDKZZFX` / `9PB3CSII` | p = n − 11 in Part 6 (pp. 92–109); p = n − 7 in Part 7                                                                                                                                                                                                                  |
  | ITC Vol. D, 2nd ed. (2013) | `YQKTNYVN` / `8TM6DPPM` | p = n + 1 = i + 2                                                                                                                                                                                                                                                       |
  | Birss (1966)               | `WKMPAPCY` / `ATQHPS7X` | two printed pages per PDF page; Tables 3, 6 (pp. 91–98, n = 55–59) and 7 (pp. 103–108, n = 61–64) rotated by 90°                                                                                                                                                        |
  | Newnham (2005)             | `G32GB96M` / `UKXAALX2` | p = n − 13; IEEE axes (orthorhombic c < a < b; trigonal and hexagonal Z₁ ∥ a, Z₃ ∥ c)                                                                                                                                                                                   |
  | Paufler (1986)             | `6WFKM9X8` / `7SL8TECS` | the scan repeats pages, so the offset grows (22 at p. 60, 40 at p. 316): read the printed number. Counts of the magnetic properties (31, 58, 66; pp. 66, 140, 240) as ITC Vol. D; Tables 6.11 (p. 141) and 7.6 (pp. 240 ff.) give the forms after Bhagavantam and Birss |
  | Frank (1965)               | `JUFIBJSH` / `HCKTL6NT` | p = n + 861                                                                                                                                                                                                                                                             |
  | Shubnikov & Belov (1964)   | `PD7DF9V6` / `3WP3F6T6` | p = i − 29                                                                                                                                                                                                                                                              |

- **Reading print.** The text layers lose primes, overbars and underlines (ITC Vol. D prints a
  prime as `0`), signs and factors, and take fractions apart: tables are read from the page image,
  enlarged where a prime, an overbar or an underline matters (Birss marks time reversal by an
  underline). The text layer serves to find pages and, where it keeps the overbars (ITA 2016
  Chapters 2.2 and 3.2, ITA 2006), as a second check. Crossing lines in diagrams (ITC Vol. D
  § 1.1.4.10.6) are read at about 550 dpi and followed end to end; the reading is noted in the
  transcription.
- The head note of a file in `references/` (`GUIDE.md`, "Correctness and tests") cites its source
  as a reference (authors, work, edition, year, chapter, table, printed page) and leaves the working
  details of reading (files, PDF pages, resolutions) to the table above.

## Making a change

The rules are in `GUIDE.md`; here the commands and the places in the code.

- **A test that fails before its fix** goes onto `main` marked: `it.fails` in vitest,
  `pytest.mark.xfail(strict=True)` in Python, with the issue in the name or the reason. It passes
  while it fails; the fix that makes it pass turns it red, and the pull request of the fix removes
  the mark.
- **Pins:** the ITC baseline pins and the API pins are re-captured from a clean checkout with
  `npm run audit:itc-baseline`; a change of the API's shape alone changes
  `testUtils/itcBaseline.ts`, which maps the current API back to the shape of the ITC baseline
  pins, while the API pins are re-captured in the new shape. A new export gets its calls in
  `testUtils/apiCalls.ts`.
- **A new point-group function:** its wrapper goes into `crystalClasses.ts` if a key, an operation
  or a tensor passes through it.
- **After changing a TSDoc comment or an export**: `npm run build && npm run docs:python`, and
  commit the generated Python modules; `npm run api:report` for the API reports.
- `npm run lint` runs `scripts/check-wording.mjs` besides ESLint.

## Git and pull requests

- Never commit to `main`. Short-lived branch (`feature/`, `fix/`, `refactor/`, `docs/`, `chore/`,
  `audit/`), Conventional Commits (`type(scope): summary`), pull request to `main`, merged with a
  merge commit (no squash).
- **Gates**, run by CI on every pull request: on Node 22 and 24 `typecheck`, `typecheck:ts7`,
  `lint`, `format:check`, `test`, `build`, `check:dist`, `api:check`; `python` on Python 3.10 and
  the newest (bundle, sdist and wheel, install into a fresh environment, `mypy --strict`, `pytest`);
  and `docs` (`npm run docs:check` and `npm run docs:site`). A report names all ten with their
  result, a skipped one as skipped. Not gates: `linkcheck` (external links; a red run is still
  looked at and a dead link fixed) and `coverage` (a report of untested paths, no percentage to
  reach). Local commands: `README.md`, "Development".
- **Review by an independent agent** before reporting to the maintainer, on every pull request: an
  agent that does not know the work gets only repository, branch and purpose, and checks the diff
  for errors, edge cases, contradictions with `GUIDE.md` and this file, and domain claims against
  code and sources. Findings are verified, then fixed or answered, and listed in the pull request
  under "Review".
- **Merge only on the maintainer's explicit OK.**
- Commits end with `Co-Authored-By: …`, in sessions with a link (claude.ai) also with
  `Claude-Session: …`. On the maintainer's computer commit and tag with
  `git config user.email 6277652+manganite@users.noreply.github.com` (GitHub rejects the private
  address, GH007). In a cloud session Claude commits with its own signed identity.

## Releases

- Procedure: `README.md`, "Releases". The release pull request is merged on the maintainer's OK.
- **The tag:** Claude Code on the maintainer's computer sets it once the release pull request is
  merged, after checking that `origin/main` is the merge commit of that pull request
  (`release.yml` refuses a tag that is not on `main`); in a cloud session, where pushing a tag
  fails, the maintainer sets it. Afterwards `release.yml` must be green.
- **npm:** `release.yml` stages each tagged version (`npm stage publish`, trusted publishing); the
  maintainer approves it with 2FA. Never publish from a working copy other than a clean checkout of
  the tag. No placeholder packages.
- **PyPI:** the same tag builds sdist and wheel and attaches them to the GitHub release; the job
  `pypi` publishes them by trusted publishing in the environment `pypi`, which needs the
  maintainer's approval of each run.
- **Documentation site:** built from the tag by `release.yml` and published on GitHub Pages
  ([manganite.github.io/symcrys](https://manganite.github.io/symcrys/)), the newest release at the
  root and the newest PATCH of each MINOR under `/X.Y/`.

## Repository settings

- The ruleset `main` allows changes only through a pull request, merged with a merge commit, with
  `gates (22)`, `gates (24)`, `python (3.10)`, `python (3.x)` and `docs` green on a branch up to date
  with `main`; no force push, no deletion. It requires no approval, since GitHub does not let the
  owner approve their own pull requests; the maintainer's OK stays a process rule. Admins may bypass
  only through a pull request (e.g. when a check itself is broken). Squash and rebase merges are
  off; head branches are deleted after merge.
- GitHub Pages has the source "GitHub Actions"; the environment `github-pages` has a deployment rule
  for tags `v*.*.*`.

## Cloud-session limits (claude.ai)

- Tag push and the tag API fail (403).
- GraphQL is blocked, so no `gh pr create` or `gh issue view`. Use REST:
  `gh api repos/manganite/symcrys/pulls -f title=… -f head=<branch> -f base=main -f body=…`;
  merge with `gh api -X PUT repos/manganite/symcrys/pulls/N/merge -f merge_method=merge`.
- A draft pull request cannot be marked ready (GraphQL only): open regular pull requests.
- The session's GitHub access rewrites the "Generated with Claude Code" footer of pull request
  texts; put the session link on its own line above it.

## Consumers (for orientation; symcrys does not depend on them)

- **Teaching apps** (stereography, plane-groups): copy `dist/` of a tagged version into `lib/kern/`
  with a MANIFEST, via `sync.mjs` of crystallography-common; they stay build-free, and their
  `checkJs` reads the `.d.ts`.
- **birss-app:** npm dependency with a pinned version; the conversion to Birss's presentation is
  done there.
- All consumers call symcrys by its English names and take a new version when they choose.
