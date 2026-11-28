---
file_format: mystnb
kernelspec:
  name: python3
  display_name: Python 3
---

# Getting started

The same calls in TypeScript and in Python. Every example on this page is run when the site is
built, and the output shown is what it printed.

Before reading matrices: an operation has `matrix`, ITA's W in the lattice basis a, b, c, and
`cartesian`, the same operation in a right-handed orthonormal frame x, y, z (row-major, acting on
column vectors). Where the lattice basis sits in that frame depends on the family (x ∥ a and z ∥ c
for hexagonal axes, the monoclinic unique axis along y by default): the table is in
[Conventions](conventions.md), "Cartesian frame". A tensor form is in the same Cartesian frame, and
its components are listed row-major (`xxx`, `xxy`, …).

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

The plane groups and the plane point groups are in `symcrys/plane`, in the lattice basis
([Plane groups](plane-groups.md); [Conventions](conventions.md), "Plane groups"):

```{ts-example} plane.ts

```

Without a build step, copy `dist/` of the package (from the npm tarball, or from the release on
GitHub) next to your code and import `dist/index.js`, `dist/magnetic.js` or `dist/plane.js`: every module imports
only relative `.js` paths ([In the browser](browser.md), with a complete page).

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
symcrys.symbol("32"), symcrys.symbol("32", setting=2), symcrys.symbol("32", form="schoenflies")
```

```{code-cell} ipython3
ops = symcrys.operations("32")  # one record of arrays: ops.matrix, ops.cartesian, len(ops) == 6
ops.matrix[1], ops.cartesian[1]  # ITA's W in the lattice basis, and the Cartesian matrix
```

```{code-cell} ipython3
SHG = {"rank": 3, "kind": "polar", "intrinsic": "symmetric-last-pair"}
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

The plane API is the module `symcrys.plane`:

```{code-cell} ipython3
from symcrys import plane

plane.wyckoff_position("p6mm", point=[1 / 3, 2 / 3]), plane.asymmetric_unit("p6mm")["vertices"]
```

Wrong input (an unknown key, a vector of the wrong length, an argument of the wrong type) raises
`symcrys.SymcrysError`, a subclass of `ValueError`; a fault of symcrys itself raises
`symcrys.SymcrysInternalError`, a `RuntimeError`, so that `except ValueError` does not hide it:

```{code-cell} ipython3
try:
    symcrys.point_group("7")
except symcrys.SymcrysError as e:
    print(e)
```

A call costs about a millisecond once its result is cached; the first call for a group takes up to
about 0.1 s, the form of a rank-4 tensor up to a few tenths of a second, and the first
`point_group_of` builds a table of the groups ([Conventions](conventions.md), "Point group of a
list of operations"). A list of operations passed again
(`tensor_form_of` in a loop) is answered from a cache. Fetch operations and forms once, then compute
with NumPy. These timings are indicative (measured on one machine): the package runs the library in
an embedded JavaScript engine, and all calls go through that one engine behind one lock, so threads
do not run them in parallel. Threads may call the package at any time. A process made by
`multiprocessing` with `spawn` (or `forkserver`) starts its own engine; one made by `fork` inherits
the engine of its parent, and a fork waits for a call of another thread to end, so that the child can
call it. For parallel work, separate processes each have their own engine.

## What to read next

- Which key to use for a material, crystal class or magnetic group:
  [Two readings of a key](readings.md).
- Which setting, and why the components of a tensor depend on it:
  [Conventions](conventions.md), in particular "Settings" and "Cartesian frame".
- How a tensor form is given (basis, parameters, relations): [Tensors](tensors.md).
- The crystal forms of a class, basic and limiting, and orbits of faces:
  [Crystal forms, orbits and distorted crystals](forms.md).
