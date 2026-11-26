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
lists, together with ITA's table of the 47 forms (number, English name,
number of faces, eigensymmetry). The rules and the print anchors are in
[Conventions](conventions.md), "Crystal forms" and "Site symmetry and Wyckoff positions".

## TypeScript

```{ts-example} crystal-forms.ts

```

A form names its kind by its key in `CRYSTAL_FORM_TYPES` (`'tetragonal-prism'`), which gives the
usual English names, the number of faces and the eigensymmetry; an application that shows the names
in another language keeps its own table by these keys.

## Python

```{code-cell} ipython3
import symcrys

for f in symcrys.crystal_forms("-43m"):
    form = symcrys.CRYSTAL_FORM_TYPES[f["form_type"]]
    print(f["letter"], f["basic"], f["miller_indices"], f.get("condition", ""), form["name"])
```

The Miller indices of a form are written with letters. `miller_indices` substitutes values of your
choice, and `face_normal` gives the pole of that face in a cell, e.g. to draw it or to compute its
site symmetry (the cell decides the pole: for monoclinic and triclinic crystals give the real cell,
`lattice_from_parameters`):

```{code-cell} ipython3
f = symcrys.crystal_forms("-43m")[2]  # h,h,l with |h| < |l|, the trigon-tritetrahedron
hkl = symcrys.miller_indices(f["miller_indices"], h=1, l=3)
hkl, symcrys.face_normal(symcrys.lattice_basis("cubic"), hkl)
```

## Orbits and the lattice basis

The faces of a form are the orbit of one face. `orbit` computes it exactly, in integers, from the
matrices W of the operations in the lattice basis (`matrix` of each operation); `orbitOf` computes it for a Cartesian
direction under any point group given as its list of operations, for instance those left after
distorting a crystal. In
hexagonal axes a face transforms otherwise than a lattice direction
([Conventions](conventions.md), "Lattice basis and orbits").

```{ts-example} orbits.ts

```

```{code-cell} ipython3
[f["hkl"] for f in symcrys.orbit("-3m", hkl=[1, 0, 1])]
```

```{code-cell} ipython3
symcrys.operations("3").matrix[1]  # W in the lattice basis, an int64 array
```

## A distorted crystal

The operations that a distortion leaves form a point group, usually in an orientation that is not a
setting of symcrys. `pointGroupOf` names it, and `describeOperationsOf` gives its elements with
Cartesian axes ([Conventions](conventions.md), "Point group of a list of operations").

```{ts-example} distorted.ts

```

```{code-cell} ipython3
import numpy as np

ops = symcrys.operations("m-3m")
image = ops.cartesian @ [1, 1, 1]  # the image of [111] under every operation at once
kept = ops[np.isclose(np.abs(image.sum(axis=1)), 3)]  # those that keep the line [111]: ±[111]
symcrys.point_group_of(kept)
```
