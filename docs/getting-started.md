---
file_format: mystnb
kernelspec:
  name: python3
  display_name: Python 3
---

# Getting started

The same calls in TypeScript and in Python. Every example on this page is run when the site is
built, and the output shown is what it printed.

## TypeScript

```bash
npm install symcrys
```

`symcrys` is the crystallographic API: the 32 crystal classes, without time reversal. A crystal
class is named by its key, the ITC short symbol of the class (`'32'`, `'m-3m'`; `-` stands for
the overbar).

```{ts-example} getting-started.ts

```

The magnetic point groups are in `symcrys/magnetic`, under the same names. There an operation
carries `timeReversal`, and a tensor specification `timeParity`:

```{ts-example} magnetic.ts

```

Without a build step, copy `dist/` of the package (from the npm tarball, or from the release on
GitHub) next to your code and import `dist/index.js` or `dist/magnetic.js`: every module imports
only relative `.js` paths.

## Python

```bash
pip install symcrys
```

The names are those of TypeScript in snake_case, an options object becomes keyword arguments, and
arrays of numbers become NumPy arrays.

```{code-cell} ipython3
import symcrys

symcrys.point_group("32")
```

```{code-cell} ipython3
symcrys.symbol("32"), symcrys.symbol("32", convention="birss"), symcrys.symbol("32", form="schoenflies")
```

```{code-cell} ipython3
symcrys.operations("32")[1]["matrix"]
```

```{code-cell} ipython3
SHG = {"rank": 3, "parity": "polar", "intrinsic": "jk"}
form = symcrys.tensor_form("mm2", SHG)
form["parameters"]  # the free components as index lists: xxz, yyz, zxx, zyy, zzz
```

```{code-cell} ipython3
symcrys.allowed_properties("32")
```

The magnetic API is the module `symcrys.magnetic`:

```{code-cell} ipython3
from symcrys import magnetic

magnetic.allowed_properties("m'm'2"), magnetic.tensor_form("m'm'2", "ferromagnetic")["parameters"]
```

An error of the library raises `symcrys.SymcrysError`, a subclass of `ValueError`:

```{code-cell} ipython3
try:
    symcrys.point_group("7")
except symcrys.SymcrysError as e:
    print(e)
```

A call costs about a millisecond once its result is cached; the first call for a group takes up to
about 0.1 s, the form of a rank-4 tensor up to a few tenths of a second. Fetch operations and forms
once, then compute with NumPy.

## What to read next

- Which key to use for a material, crystal class or magnetic group:
  [Two readings of a key](readings.md).
- Which setting and which convention, and why the components of a tensor depend on them:
  [Conventions](conventions.md), in particular "Settings" and "Cartesian frame".
- How a tensor form is given (basis, parameters, relations): [Tensors](tensors.md).
- The crystal forms of a class, basic and limiting, and orbits of faces:
  [Crystal forms, orbits and distorted crystals](forms.md).
