---
file_format: mystnb
kernelspec:
  name: python3
  display_name: Python 3
---

# Functions of a list of operations

A function whose name ends in `Of` (Python `_of`) takes a list of operations instead of a key:
operations of a distorted crystal, of a site, or read from a file. These functions differ in what
they read from an operation, whether the list must be the whole group and what their result is.
This page puts that side by side, and points to where each rule is stated:
[Conventions](conventions.md), "Operations" (the fields of an operation), "Tolerances" (what a
tolerance measures, per kind of object) and "Two entry points" (time reversal); the reference of
each function has the details.

## Point groups: `symcrys` and `symcrys/magnetic`

| Functions                                         | Read                                                         | The list                                   | Tolerance ("Tolerances") | The result                                                 |
| ------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------ | ------------------------ | ---------------------------------------------------------- |
| `pointGroupOf`                                    | `cartesian`, `timeReversal`                                  | generators suffice: it is closed           | operations               | the key, and the setting if the group is one               |
| `isCentrosymmetricOf`                             | `cartesian`, `timeReversal`                                  | generators suffice: it is closed           | operations               | true or false                                              |
| `isEnantiomorphicOf`                              | `cartesian`, `timeReversal`                                  | generators suffice: each operation is read | operations               | true or false                                              |
| `tensorFormOf`                                    | `cartesian`, `timeReversal`                                  | generators suffice: it is closed           | operations               | the form, in the Cartesian frame of the operations         |
| `allowsPropertyOf`, `allowedPropertiesOf`         | `cartesian`, `timeReversal`                                  | generators suffice: it is closed           | operations               | true or false; the names of the properties                 |
| `describeOperationsOf`                            | `cartesian`, `timeReversal`                                  | each operation alone, not closed           | operations               | one description per operation, in the order of the list    |
| `siteSymmetryOf`, `orbitOf`                       | `cartesian`; `timeReversal` if given                         | the whole group, each operation once       | directions               | indices into the list                                      |
| `residualOperationsOf`                            | `matrix`, `timeReversal`                                     | taken as it is                             | the metric of a cell     | the records of the list that keep the metric, in its order |
| `changeOfCoordinates` (its quantity `operations`) | `matrix`, `translation` if given; `timeReversal` all or none | taken as it is                             | operations               | each operation in the new coordinates, in the order given  |

`timeReversal` is read in `symcrys/magnetic` only. There, every function of a list refuses an
operation without it, except `siteSymmetryOf` and `orbitOf`, which read it as false, and
`changeOfCoordinates`, which carries it through when every operation gives it.

- **Generators or the whole group.** A function that closes the list gives the same answer for
  `generators(key)` and `operations(key)`; so does `isEnantiomorphicOf`, which asks of each
  operation whether it is proper. `siteSymmetryOf` and `orbitOf` give indices into the list, so the
  list must be the whole group, each operation once; generators are refused with a message that
  says what is missing.
- **Cartesian or lattice matrices.** Which field a function reads, and why a record without it is
  refused: "Operations", "Operations from a caller". In Python, where a function reads `cartesian`,
  a bare array of shape (n, 3, 3) is read as the Cartesian matrices; in `symcrys.magnetic` only
  `site_symmetry_of` and `orbit_of` take one, the others refuse it, since it does not say which
  operations are primed.

## Plane groups: `symcrys/plane`

An operation of the plane is `{ matrix, translation }` in the lattice basis ("Plane groups").

| Functions                   | Read                             | The list                                                                                                         | Tolerance ("Tolerances")                                          | The result                                                 |
| --------------------------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------- |
| `pointGroupOf`              | `matrix`, `translation`          | generators suffice: the linear parts are closed                                                                  | operations                                                        | the key, and the setting if the group is one               |
| `planeGroupOf`              | `matrix`, `translation`          | generators suffice: closed modulo the lattice, in a conventional cell                                            | operations                                                        | the key, and the setting if the group is one               |
| `describeOperationsOf`      | `matrix`, `translation`          | each operation alone                                                                                             | operations                                                        | one description per operation, in the order of the list    |
| `siteSymmetryOf`, `orbitOf` | `matrix`, `translation`          | for a point the whole group modulo the lattice, each operation once; for a direction or an edge its linear parts | points of the plane (a point); none, exact (a direction, an edge) | indices into the list                                      |
| `residualOperationsOf`      | `matrix`                         | taken as it is                                                                                                   | the metric of a cell                                              | the records of the list that keep the metric, in its order |
| `changeOfCoordinates`       | `matrix`, `translation` if given | taken as it is                                                                                                   | operations                                                        | each operation in the new coordinates, in the order given  |

How a list of the plane is read, and the precision its operations need: "Plane groups", "Lists of
operations".

## Which basis: the reference basis and the cell of a material

`latticeBasis(key)` is the reference basis of a setting in the Cartesian frame of symcrys
("Cartesian frame"; for hexagonal axes a = b = c = 1, γ = 120°). It fixes how the lattice
directions and faces of a setting lie in that frame, which is all that the symmetry of a crystal
class needs. It is not the cell of a material: angles between directions that the symmetry does not
fix, and the operations a real cell keeps, depend on its lattice parameters. For those, the basis
comes from `latticeFromParameters`.

```{code-cell} ipython3
import numpy as np
import symcrys

reference = symcrys.lattice_basis("32")
quartz = symcrys.lattice_from_parameters(a=4.913, b=4.913, c=5.405, alpha=90, beta=90, gamma=120)
np.round(reference, 4), np.round(quartz, 4)
```

The angle between [100] and [101] depends on c/a: 45° in the reference basis, about 47.7° in
quartz.

```{code-cell} ipython3
symcrys.angle_between_directions(reference, [1, 0, 0], [1, 0, 1]), symcrys.angle_between_directions(quartz, [1, 0, 0], [1, 0, 1])
```

`residual_operations_of` gives the operations of a list whose matrix W keeps the metric of a cell:
those of a setting, with the cell of a material in place of the reference basis of that setting.
A hexagonal cell keeps the 24 operations of 6/mmm. The operations of mmm in a cell with β = 100°
keep 4, the class 2/m in setting 1 (unique axis b). The operations of m-3m in a rhombohedral cell
(a = b = c, α = β = γ = 85°, its axes those of the cubic setting) keep 12, the class −3m with its
threefold axis along the body diagonal of the cubic cell, (1, 1, 1)/√3 in the Cartesian frame; the
settings of −3m have it along z, so the result has no setting.

```{code-cell} ipython3
monoclinic = symcrys.lattice_from_parameters(a=5, b=6, c=7, alpha=90, beta=100, gamma=90)
rhombohedral = symcrys.lattice_from_parameters(a=5, b=5, c=5, alpha=85, beta=85, gamma=85)
[
    len(symcrys.residual_operations_of(symcrys.operations("6/mmm"), quartz)),
    symcrys.point_group_of(symcrys.residual_operations_of(symcrys.operations("mmm"), monoclinic)),
    symcrys.point_group_of(symcrys.residual_operations_of(symcrys.operations("m-3m"), rhombohedral)),
]
```

The kept records are those of the list, with their `cartesian`: the matrices in the frame of the
setting they came from (R = B·W·B⁻¹ with the reference basis B), not in a frame of the cell passed
in. A form computed from them (`tensorFormOf`) is in the frame of the setting; for the frame of
the material, rotate it (`rotateTensors`).
