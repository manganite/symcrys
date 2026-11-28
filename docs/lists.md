---
file_format: mystnb
kernelspec:
  name: python3
  display_name: Python 3
---

# Functions of a list of operations

A function whose name ends in `Of` (Python `_of`) takes a list of operations instead of a key:
operations of a distorted crystal, of a site, or read from a file. These functions differ in what
they read from an operation, whether the list must be the whole group, what the tolerance measures
and what the result refers to. This page collects that per family; the reference of each function
has the details, and [Conventions](conventions.md) the reasons and print sources.

## Point groups: `symcrys` and `symcrys/magnetic`

An operation is a record. `cartesian` is the orthogonal matrix in the Cartesian frame of symcrys
([Conventions](conventions.md), "Cartesian frame"), `matrix` the integer matrix W in the lattice
basis of a setting, and in `symcrys/magnetic` `timeReversal` says whether the operation is primed.
`operations(key)` gives all three; a function reads only the fields it needs.

| Functions                                                   | Read                                                | The list                                      | The tolerance measures                                          | The result                                                      |
| ----------------------------------------------------------- | --------------------------------------------------- | --------------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------- |
| `pointGroupOf`, `isCentrosymmetricOf`, `isEnantiomorphicOf` | `cartesian`; `timeReversal` (magnetic)              | generators suffice: it is closed into a group | each matrix entry                                               | the group: its key, and the setting if it is one                |
| `tensorFormOf`, `allowsPropertyOf`, `allowedPropertiesOf`   | `cartesian`; `timeReversal` (magnetic)              | generators suffice                            | each matrix entry                                               | the form in the Cartesian frame of the operations               |
| `describeOperationsOf`                                      | `cartesian`; `timeReversal` (magnetic)              | each operation alone, not closed              | each matrix entry                                               | one description per operation, in the order of the list         |
| `siteSymmetryOf`, `orbitOf`                                 | `cartesian`; `timeReversal` optional, read as false | the whole group, each operation once          | the distance of the unit vector of the direction to the element | indices into the list                                           |
| `residualOperationsOf`                                      | `matrix`; `timeReversal` (magnetic)                 | taken as it is                                | each entry of WᵀGW − G, relative to the largest entry of G      | the operations of the list that keep the metric, in its order   |
| `changeOfCoordinates` (its quantity `operations`)           | `matrix`, `translation`; `timeReversal` (magnetic)  | taken as it is                                | each entry of P and W, read as a fraction                       | each operation in the new coordinates, in the order of the list |

- **Generators or the whole group.** The functions that close the list give the same answer for
  `generators(key)` and `operations(key)`. `siteSymmetryOf` and `orbitOf` give indices into the
  list, so the list must be the whole group, each operation once; a list of generators is refused
  with a message that says what is missing.
- **Time reversal.** In `symcrys/magnetic`, a function that depends on time reversal refuses an
  operation without `timeReversal`. A direction does not depend on it, so `siteSymmetryOf` and
  `orbitOf` read a missing one as false. `changeOfCoordinates` carries it through when every
  operation gives it.
- **Cartesian or lattice matrices.** A function that computes with Cartesian matrices reads
  `cartesian` and refuses a record without it, so that a lattice matrix W cannot pass for one; and
  the other way round for `residualOperationsOf` and `changeOfCoordinates`. In Python, where a
  function reads `cartesian`, an array of shape (n, 3, 3) is read as the Cartesian matrices in
  `symcrys`; in `symcrys.magnetic` it is refused, since it does not say which operations are primed.

## Plane groups: `symcrys/plane`

An operation of the plane is `{ matrix, translation }` in the lattice basis, as ITA prints the
general position.

| Functions                      | The list                                                | The tolerance measures                                      | The result                                                      |
| ------------------------------ | ------------------------------------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------- |
| `pointGroupOf`, `planeGroupOf` | generators suffice: it is closed modulo the lattice     | each matrix entry (W is integral within it)                 | the group: its key, and the setting if it is one                |
| `describeOperationsOf`         | each operation alone                                    | each matrix entry; translations per coordinate              | one description per operation, in the order of the list         |
| `siteSymmetryOf`, `orbitOf`    | the whole group modulo the lattice, each operation once | for a point, the distance per coordinate modulo the lattice | indices into the list                                           |
| `residualOperationsOf`         | taken as it is                                          | each entry of WᵀGW − G, relative to the largest entry of G  | the operations of the list that keep the metric, in its order   |
| `changeOfCoordinates`          | taken as it is                                          | each entry of P and W, read as a fraction                   | each operation in the new coordinates, in the order of the list |

`planeGroupOf` needs the operations in a conventional cell of their lattice ([Plane
groups](plane-groups.md)).

## Which basis: the reference basis and the cell of a material

`latticeBasis(key)` is the reference basis of a setting: a, b, c of the conventional cell with
edges of length 1, in the Cartesian frame of symcrys (hexagonal axes: a = b = c = 1, γ = 120°). It
fixes how the lattice directions and faces of a setting lie in that frame, which is all that the
symmetry of a crystal class needs. It is not the cell of a material: angles between directions
that are not fixed by the symmetry, and the operations that a real cell keeps, depend on the
lattice parameters. For those, the basis comes from `latticeFromParameters`.

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

The operations that a cell keeps are those of its metric. A hexagonal cell keeps the 24 of 6/mmm;
an orthorhombic group in a cell with β = 100° keeps those of a monoclinic one; the cubic operations
in a rhombohedral cell (a = b = c, α = β = γ = 85°) keep 12, the class −3m with its threefold axis
along [111], which is no setting of symcrys, so the result has no setting.

```{code-cell} ipython3
monoclinic = symcrys.lattice_from_parameters(a=5, b=6, c=7, alpha=90, beta=100, gamma=90)
rhombohedral = symcrys.lattice_from_parameters(a=5, b=5, c=5, alpha=85, beta=85, gamma=85)
[
    len(symcrys.residual_operations_of(symcrys.operations("6/mmm"), quartz)),
    symcrys.point_group_of(symcrys.residual_operations_of(symcrys.operations("mmm"), monoclinic)),
    symcrys.point_group_of(symcrys.residual_operations_of(symcrys.operations("m-3m"), rhombohedral)),
]
```

`residual_operations_of` reads the matrices W, so its operations are those of a setting whose
lattice basis is that of the cell; the result keeps the records of the list, `cartesian` included,
for the functions that read it.
