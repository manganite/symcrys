---
file_format: mystnb
kernelspec:
  name: python3
  display_name: Python 3
---

# Crystal forms, orbits and distorted crystals

A crystal form is a set of faces that a point group makes equivalent. ITA (6th ed.) lists, for every
crystal class and every Wyckoff position, the forms that occur there: the **basic** form and the
**limiting** forms, which have the same face symmetry but a higher eigensymmetry. symcrys gives these
lists, in the ITC convention, together with ITA's table of the 47 forms (number, English name,
number of faces, eigensymmetry). The rules and the print anchors are in
[Conventions](conventions.md), "Crystal forms" and "Site symmetry and Wyckoff positions".

## TypeScript

```{ts-example} crystal-forms.ts

```

A form names its kind by its number in `CRYSTAL_FORM_TYPES`; an application that shows the names
in another language keeps its own table by these numbers.

## Python

```{code-cell} ipython3
import symcrys

for f in symcrys.crystal_forms("-43m"):
    form = symcrys.CRYSTAL_FORM_TYPES[f["form_type"] - 1]
    print(f["letter"], f["basic"], f["miller_indices"], f.get("condition", ""), form["name"])
```

Each form has a representative face with numbers, its Miller indices and its Cartesian unit normal
in the frame of the setting, e.g. to draw its pole or to compute its site symmetry:

```{code-cell} ipython3
f = symcrys.crystal_forms("-43m")[2]
f["representative"]["hkl"], f["representative"]["cartesian"]
```

## Orbits and the lattice basis

The faces of a form are the orbit of one face. `orbit` computes it exactly, in integers, from the
operations in the lattice basis (`latticeOperations`); `orbitOf` computes it for a Cartesian
direction under any list of operations, for instance those left after distorting a crystal. In
hexagonal axes a face transforms otherwise than a lattice direction
([Conventions](conventions.md), "Lattice basis and orbits").

```{ts-example} orbits.ts

```

```{code-cell} ipython3
[f["hkl"] for f in symcrys.orbit("-3m", {"hkl": [1, 0, 1]})]
```

```{code-cell} ipython3
symcrys.lattice_operations("3")[1]["matrix"]  # integers, as a float64 array
```

## A distorted crystal

The operations that a distortion leaves form a point group, usually in an orientation that is not a
setting of symcrys. `pointGroupOf` names it, and `describeOperationsOf` gives its elements with
Cartesian axes ([Conventions](conventions.md), "Point group of a list of operations").

```{ts-example} distorted.ts

```

```{code-cell} ipython3
import numpy as np

kept = [op for op in symcrys.operations("m-3m") if np.allclose(op["matrix"] @ [1, 1, 1], [1, 1, 1])
        or np.allclose(op["matrix"] @ [1, 1, 1], [-1, -1, -1])]
symcrys.point_group_of(kept)
```
