---
file_format: mystnb
kernelspec:
  name: python3
  display_name: Python 3
---

# Cells, metric, angles and indices

A cell is given by its lattice parameters, a basis is the 3×3 matrix whose **columns** are a, b, c
in Cartesian coordinates. From it follow the metric tensor, the reciprocal basis, the angle between
two directions or two faces, and the operations of a point group that a distortion of the cell
leaves ([Conventions](conventions.md), "Cell, metric and indices"). Indices: reduction to coprime
numbers, three and four indices of hexagonal axes, the zone law, and the change of the coordinate
system by a pair (P, p) (ITA 2016 § 1.5), for points, vectors, indices, the metric and operations. Lengths have the unit you give them, angles are in degrees.

## TypeScript

```{ts-example} cell.ts

```

## Python

```{code-cell} ipython3
import symcrys

basis = symcrys.lattice_from_parameters(a=3, b=3, c=5, alpha=90, beta=90, gamma=120)
symcrys.metric_tensor(basis)
```

```{code-cell} ipython3
symcrys.angle_between_planes(basis, [1, 0, 0], [0, 1, 0]), symcrys.direction_to_four_indices([1, 1, 0])
```

```{code-cell} ipython3
ops = symcrys.operations("6/mmm")
distorted = symcrys.lattice_from_parameters(a=3, b=3, c=5, alpha=90, beta=90, gamma=121)
len(symcrys.residual_operations_of(ops, basis)), len(symcrys.residual_operations_of(ops, distorted))
```

A small distortion is a question of the tolerance. A cubic cell strained by 10⁻⁴ along c deviates
from cubic metric by about 2·10⁻⁴ (relative to the largest entry of G): at the default tolerance
(`EPSILON`, 10⁻⁵) it keeps the 16 operations of 4/mmm, at 10⁻³ all 48 of m-3m. A direction 10⁻⁴
off the fourfold axis of 4mm lies on a mirror at the default and on the axis at 10⁻³. What each
tolerance measures is in [Conventions](conventions.md), "Tolerances"; a script whose results are
to be reproduced passes the tolerance it relies on explicitly.

```{code-cell} ipython3
strained = [[1, 0, 0], [0, 1, 0], [0, 0, 1.0001]]
cubic = symcrys.operations("m-3m")
len(symcrys.residual_operations_of(cubic, strained)), len(symcrys.residual_operations_of(cubic, strained, tolerance=1e-3))
```

```{code-cell} ipython3
tilted = [1e-4, 0, 1]
ops = symcrys.operations("4mm")
len(symcrys.site_symmetry_of(ops, tilted)["operations"]), len(symcrys.site_symmetry_of(ops, tilted, tolerance=1e-3)["operations"])
```

```{code-cell} ipython3
# The operations of -3m with rhombohedral axes, from the hexagonal cell of the hR lattice (its standard cell, {}).
P = symcrys.cell_transformation("hR", {}, {"axes": "rhombohedral"})["linear_part"]
change = symcrys.change_of_coordinates(P, operations=symcrys.operations("-3m"), metric=symcrys.metric_tensor(basis))
change["operations"].matrix[1], change["inverse"]["linear_part"]
```
