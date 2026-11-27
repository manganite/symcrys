---
file_format: mystnb
kernelspec:
  name: python3
  display_name: Python 3
---

# Plane groups

The entry point `symcrys/plane` (Python: `symcrys.plane`) holds the 17 plane groups and the 10 plane
point groups of ITA (6th ed., Chapters 2.2 and 3.2). Everything is in the lattice basis: an
operation is ITA's pair (W, w), `matrix` with integer entries and `translation` with fractions as
numbers, in the order of ITA's general position; points, the asymmetric unit and the symmetry
elements have coordinates x, y in the cell. A metric enters only where you give a cell. The rules
and the print anchors are in [Conventions](conventions.md), "Plane groups". Functions are named as in
TypeScript; in Python they are in snake case (`wyckoffPositions` → `plane.wyckoff_positions`), as
[Getting started](getting-started.md) explains.

## Keys, symbols and the data of a group

A key is the symbol ITA prints: `'p2mg'`, `'c2mm'` for a plane group, `'2mm'`, `'4mm'`, `'3m'` for a
plane point group (the plane point group of a plane group is its linear part). `planeGroup` gives
the data of a group (number, point group, crystal system, Patterson symmetry, centring, the site
symmetry of the origin) and its Bravais lattice, the symbols come from `symbol`, and
`findPlaneGroup` reads a symbol in the forms `symbol` writes.

```{code-cell} ipython3
from symcrys import plane

plane.plane_group("p4gm")
```

```{code-cell} ipython3
plane.symbol("p4gm", form="full"), plane.find_plane_group("p 4 g m"), plane.point_group("4mm")
```

## Operations and their geometric description

`operations` gives the general position in ITA's order, `generators` ITA's selected generators.
`describeOperations` says what each operation is, as the block "Symmetry operations" of ITA does,
but as numbers: kind, n, sense, the centre of a rotation (`point`), the line of a mirror or glide
(a `point`, its direction and its symmetry direction `axis`) and the glide part. Symbols such as
`g(1/2,1/2) x,x` are left to the application.

```{code-cell} ipython3
ops = plane.operations("p4gm")
ops.matrix[4], ops.translation[4]  # (5) b 1/4,y: -x+1/2, y+1/2
```

```{code-cell} ipython3
plane.describe_operations("p4gm")[4:8]
```

`describeOperationsOf` describes any list of operations of the plane in the same way, for instance
those found in a pattern.

## Operations of a pattern: plane group, site symmetry, orbit

`planeGroupOf` names the plane group of operations found in a pattern, given in a conventional cell
of its lattice; generators suffice, and the origin does not matter (translations are read as
fractions with denominators up to 12). Setting 1 means they are ITA's operations of that group;
with another origin or orientation it is absent. `pointGroupOf` names the plane point group of the
linear parts, and `siteSymmetryOf` and `orbitOf` answer for the list what `siteSymmetry` and
`orbit` answer for a key, with the same measure: the distance of the point to the symmetry
element:

```{code-cell} ipython3
found = [{"matrix": [[-1, 0], [0, 1]], "translation": [0.5, 0.5]}, {"matrix": [[0, -1], [1, 0]], "translation": [0, 0]}]
plane.plane_group_of(found), plane.point_group_of(found)
```

```{code-cell} ipython3
plane.site_symmetry_of(plane.operations("p4gm"), point=[0.5, 0])
```

## Points: Wyckoff position, site symmetry, orbit

A point is given in the lattice basis. `wyckoffPositions` lists the positions as ITA prints them,
with all coordinates of the (0,0)+ set. `wyckoffPosition`, `siteSymmetry` and `orbit` set a point
onto the position it lies on within a tolerance (per coordinate, modulo the lattice; default
`EPSILON`), so that a point read from a drawing gets the symmetry of the position it is meant to be
on:

```{code-cell} ipython3
for w in plane.wyckoff_positions("p4gm"):
    print(w["letter"], w["multiplicity"], w["site_symmetry"], w["coordinates"])
```

```{code-cell} ipython3
plane.site_symmetry("p4gm", point=[0.5, 0.003], tolerance=0.01)
```

```{code-cell} ipython3
[entry["point"] for entry in plane.orbit("p4gm", point=[0.1, 0.3])]  # a general point: 8 images
```

Which position a dragged point should snap to, and within which radius, is a choice of the
application. `wyckoffDistances` gives the numbers for it: the distance of the point to each
position and the nearest point of the position, per coordinate or, with a cell, in its length unit.
The symmetry elements in a box, with all their lattice translates, are what a drawing needs:

```{ts-example} plane-groups.ts

```

## Positions and edge forms of the plane point groups

The directions in the plane fall into Wyckoff positions of a plane point group, as the face normals
do for a crystal class. `wyckoffPositions` takes the key of a plane point group too (and the setting
of `3m`) and gives each position with its coordinate doublets, the first edge of its basic form and
the operations of its site symmetry. `crystalForms` gives the edge forms, the crystal forms of a
two-dimensional crystal: for each position the basic form, then a limiting form where there is one,
each named by its kind in `CRYSTAL_FORM_TYPES` (`'ditetragon'`, `'pair-of-parallel-edges'`). The
point at the origin is left out, as for the crystal classes. An edge (hk) transforms as Miller
indices do, to (hk)·W⁻¹; in the hexagonal groups the first doublet and the first edge of a special
position may lie on different, conjugate mirror lines (in 3m1, position a prints the direction x,x̄
and the edge (101̄), whose normal is along 2x̄,x̄), and the site symmetry is that of the edge, as
for the faces of a crystal class.

`siteSymmetry`, `wyckoffPosition` and `orbit` take a lattice direction (`uv`) or an edge (`hk`)
with the key of a plane point group, exactly, as the crystal classes take `uvw` and `hkl`:

```{code-cell} ipython3
plane.wyckoff_position("6mm", hk=[1, 0])["letter"], [e["hk"] for e in plane.orbit("4mm", hk=[1, 2])]
```

```{code-cell} ipython3
for f in plane.crystal_forms("3m", setting="31m"):
    kind = plane.CRYSTAL_FORM_TYPES[f["form_type"]]
    print(f["letter"], f["site_symmetry"], f["basic"], f"({f['miller_indices']})", kind["name"], kind["edges"])
```

## Asymmetric unit and symmetry elements

`asymmetricUnit` gives ITA's printed inequalities, each [a, b, c] for a·x + b·y ≤ c, and the polygon
they bound, with the inequality that holds each edge. `symmetryElements` gives each rotation point
and each mirror and glide line once modulo the lattice (with `box`, every translate that meets it):

```{code-cell} ipython3
unit = plane.asymmetric_unit("p4gm")
unit["vertices"], unit["edges"]
```

```{code-cell} ipython3
elements = plane.symmetry_elements("p4gm")
[(p["n"], p["point"]) for p in elements["rotation_points"]]
```

## Cells of the plane

The cell functions of the 3D API exist for 2 × 2 matrices, with a basis whose columns are a and b,
and `cellRestrictions` gives the restrictions on the cell parameters of each crystal system of the
plane (ITA Table 2.1.1.1):

```{code-cell} ipython3
basis = plane.lattice_from_parameters(4.0, 5.0, 100.0)
plane.metric_tensor(basis), plane.cell_restrictions("hexagonal")
```

`residualOperations` keeps the operations of a list whose matrix W leaves the metric of a cell
unchanged, WᵀGW = G: the point symmetry that a distorted lattice keeps, e.g. of p4mm in a cell with
a ≠ b:

```{code-cell} ipython3
kept = plane.residual_operations(plane.operations("p4mm"), plane.lattice_from_parameters(3.0, 3.1, 90.0))
plane.describe_operations_of(kept)
```

`changeOfCoordinates` transforms points, directions, lines (indices), the metric and operations to another
coordinate system of the plane (ITA 2016 § 1.5), as in the other entry points
([Cells, metric, angles and indices](cells.md)).
