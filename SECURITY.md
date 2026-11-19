# Security policy

symcrys is a library for crystallographic symmetry calculations in two packages of one version:
the TypeScript package on npm, which has no runtime dependencies, and the Python package on PyPI,
which runs the same TypeScript code in an embedded JavaScript engine and depends on `quickjs-ng` and
NumPy. The library code does no I/O (no network, no file system) and uses no DOM. Only the latest
released version of both packages receives fixes. A vulnerability that affects an application built
on symcrys can also be reported in that application's repository.

## Reporting a vulnerability

Please do **not** open a public issue. Instead, report it privately in this repository under
**Security → [Report a vulnerability](https://github.com/manganite/symcrys/security/advisories/new)**
([how to report privately](https://docs.github.com/en/code-security/how-tos/report-and-fix-vulnerabilities/report-privately)).
Helpful details are the affected version and file, and the steps that show the problem.
