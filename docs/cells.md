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
numbers, three and four indices of hexagonal axes, the zone law, and the transformation for a change
of axes. Lengths have the unit you give them, angles are in degrees.

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
len(symcrys.residual_operations(ops, basis)), len(symcrys.residual_operations(ops, distorted))
```
