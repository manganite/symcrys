# Changelog

All notable changes to symcrys are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html) as described in `GUIDE.md`.

## [Unreleased]

### Added

- `findPointGroup` and the option `setting` read the symbols of ITC Vol. D Table 1.2.6.12 (p. 66)
  (#206): the grey groups with `1'` after the first position (`21'/m`, `41'/m`, `61'/m`) and `1'`
  alone for `11'`, and the cubic groups without the prime on the 3 (`m'-3`, `m'-3m`, `m'-3m'`), a
  spelling in common use. The table's `2'2'` is a misprint for `2'2'2` and is not read.

### Changed

- `tensorFormOf`, `pointGroupOf` and the other functions that make a caller's group exact are
  faster on a new list of operations (#208): a group that already satisfies its product table and
  is orthogonal within 10⁻¹² is not averaged, and the product table and the averaging use flat
  arithmetic. 48 operations of m-3m in a general orientation: about 2 ms in Node, was about 12 ms
  (0.9: 6–13 ms); results unchanged.
- `findPointGroup` refuses every Shubnikov symbol that `symbol()` writes without Shubnikov's own
  characters and that does not read as the same group in Hermann–Mauguin, with a RangeError that
  names both readings (#206): `6̅` (-3) was read as -6; `2̅` (-1) and the cubic `3/2`, `6̅/2`, `3/4`,
  `3/4̅`, `6̅/4` were not found. The overbar stays, as ITC Vol. D Table 1.5.2.3 and Shubnikov &
  Belov print it.
- The default tolerance `EPSILON` is 10⁻⁵, was 10⁻⁶ (#204): operations rounded to 6 decimals, the
  usual output of files and other programs, now pass in any orientation (at 10⁻⁶, 21 of the 50
  settings of the 32 classes failed in the frame of symcrys, up to about 40 in general
  orientations); it is also spglib's default `symprec`. Results for exact
  input do not change; for a caller's numbers, values closer than 10⁻⁵ now count as equal.
- `pointGroupOf` throws the RangeError of `tensorFormOf` where the tolerance is the problem (the
  operations close into no finite group), instead of returning `undefined`; `undefined` now means
  a finite group that is not a crystallographic point group (#204). The orthogonality error names the tolerance and the deviation it measured, and
  says to pass a larger tolerance for matrices with rounding errors.
- A direction given to a function of a key names what it is (#202): `siteSymmetry(key, direction)`
  (both point-group entry points) and `wyckoffPosition(key, direction)` (`symcrys`) take a face `{ hkl }`, a
  lattice direction `{ uvw }` or a Cartesian vector `{ cartesian }`, as `orbit` takes `{ hkl }` or
  `{ uvw }`; a bare array is a RangeError. In Python the keyword `hkl=`, `uvw=` or `cartesian=`:
  `site_symmetry("6/mmm", uvw=[2, 1, 0])`. `orbit` refuses `{ cartesian }` and names `orbitOf`.
- `latticeBasis(key, { setting })` replaces `latticeBasis(family)` (#202): the basis B of a point
  group in a setting, `cartesian` = B·W·B⁻¹, for every setting, rhombohedral axes and unique axis a
  included; for the monoclinic and triclinic classes a, b, c along x, y, z, the basis symcrys takes
  for their operations. `latticeBasis('cubic')` becomes `latticeBasis('m-3m')`, `'hexagonal'`
  `'6/mmm'`; the name of a family is a RangeError that names the key to take. The type
  `FixedAngleFamily` is no longer exported. `orbit` refuses fields other than `hkl` and `uvw`.
- `symcrys/plane`: `siteSymmetry`, `wyckoffPosition`, `orbit` and `wyckoffDistances` take the
  point as `{ point: [x, y] }` (#202), named as in their results; in Python unchanged (`point`).
- `siteSymmetryOf` and `orbitOf` (both point-group entry points; in Python `site_symmetry_of`,
  `orbit_of`) take a point group given as all its operations, each once, and refuse a list that is
  not a group with a RangeError that says why: a missing product (time reversal included), an
  operation twice, no identity (#203). An empty list is the group 1, as for `tensorFormOf` and
  `pointGroupOf`; since 0.11.0 it was a RangeError.

### Fixed

- `describeOperationsOf` (both point-group entry points) described a matrix far outside the
  tolerance as a crystallographic operation (#205): it checked only that the trace is an integer
  within 3·tolerance, which near 0° and 180° holds for matrices off by about 10⁻³ (a rotation by
  10⁻³ rad about [1,2,3] was the identity, one by 180° + 10⁻³ rad a twofold rotation). The matrix
  must now equal the operation of its description within three times the tolerance, the factor of
  the trace test. Affected since the
  function was added (0.7.0).
- The functions that close a list of operations into a group (`pointGroupOf`, `tensorFormOf`,
  `allowsPropertyOf`, `allowedPropertiesOf`, `isCentrosymmetricOf`, `isEnantiomorphicOf`) accepted
  a closure that held near copies of one operation, which matrices with rounding errors above the
  tolerance produce: `allowedPropertiesOf` of mm2 in a general orientation rounded to 5 decimals
  at the tolerance 10⁻⁵ lacked `'gyrotropic'`, and `pointGroupOf` returned `undefined` (#204).
  They now refuse it with a RangeError that says to pass a larger tolerance. Affected: `pointGroupOf`
  since it was added, the other functions since they close a list within the tolerance (0.11.0);
  at the default 10⁻⁶ such input mostly failed the orthogonality check instead.
- `siteSymmetry(key, direction)` and `wyckoffPosition(key, direction)` read the direction as a
  Cartesian vector, so ITA's lattice indices gave a wrong answer without an error: the lattice
  direction [210] of 6/mmm lies on a twofold axis (position c, multiplicity 6), but `[2, 1, 0]` gave
  position f, multiplicity 12 (#202). Affected since 0.3.0 (`wyckoffPositionOf`, named
  `wyckoffPosition` since 0.11.0) and 0.11.0 (`siteSymmetry` of a key): results for Cartesian
  vectors were right; lattice indices passed as a Cartesian vector were wrong where B·u (for a face
  B⁻ᵀ·h) has another site symmetry than u itself, which happens only with hexagonal or
  rhombohedral axes.
- `siteSymmetryOf` and `orbitOf` answered a list that is not a group, such as the generators of a
  group, without an error: `siteSymmetryOf(generators('4/mmm'), [1, 0, 0])` gave no operation at all
  and the multiplicity 4, `orbitOf(generators('4/mmm'), [1, 2, 3])` 4 poles instead of 16 (#203).
  So did a list with an operation twice, and in the magnetic API a list closed in its matrices but
  not in time reversal (`1`, `1'`, `2`: multiplicity 1.5). Affected: the site symmetry of a list
  since 0.3.0 (`siteSymmetry(operations, direction)`, named `siteSymmetryOf` since 0.11.0) and
  `orbitOf` since 0.7.0; results for a whole group, each operation once, were right.

## [0.14.0] - 2026-11-26

Changes between the cells of a lattice (#120) and the positions and edge forms of the plane point
groups (#81). One breaking change (#194): results name their content in crystallographic terms and
the sources are cited in the documentation, which changes `TENSOR_PROPERTIES`, `CRYSTAL_FORM_TYPES`,
the plane `origin` and a parameter name of `millerIndices` (below, "Changed"). Beside the API: the
documentation site keeps the pages of each release (#57), with a browser example (#65); API reports
of the three entry points (#56, #190); a coverage report of the tests and consistency tests under
changes of unit, basis and setting (#69); internal names by content and plain citations in
`references/` (#194).

### Added

- The Wyckoff positions and edge forms of the ten plane point groups (#81), in `symcrys/plane`:
  `wyckoffPositions(key, { setting })` takes the key of a plane point group (each position with its
  coordinate doublets, `millerIndices` and `siteSymmetryOperations`), and `crystalForms(key,
{ setting })` gives the edge forms, the crystal forms of a two-dimensional crystal, with
  `CRYSTAL_FORM_TYPES` of the ten kinds (`'single-edge'` … `'dihexagon'`); from ITA 2016
  Table 3.2.3.1. In Python `symcrys.plane.wyckoff_positions`, `crystal_forms` and
  `CRYSTAL_FORM_TYPES`.
- `cellTransformation(bravaisLattice, fromCell, toCell)` (#120): the transformation matrix P from
  one cell of a lattice to another, for `changeOfCoordinates`: the monoclinic cell choices and unique
  axes, the six orthorhombic settings, the primitive cells of I- and F-centred lattices, the C- and F-centred
  tetragonal cells, the orthohexagonal and triple cells of a hexagonal lattice, and the rhombohedral,
  triple hexagonal (obverse, reverse) and monoclinic cells of a rhombohedral lattice, from the
  matrices of ITA 2016 Table 1.5.1.1, any two cells of a lattice joined exactly; with the types
  `BravaisLattice`, `Cell` and `OrthorhombicSetting`. In `symcrys` and `symcrys/magnetic`, in Python
  `cell_transformation`, the cells as dicts.
- Documentation site: versioned pages from this release on (#57). The newest release stays at
  the root, each MINOR keeps its newest PATCH under `/X.Y/` (e.g. `/0.14/`), and a menu in the
  sidebar opens the same page in another version.
- The shapes that the crystallographic API accepts have names, the names of the same notions in
  the magnetic API (#190, Thomas, 2026-11-25): `symcrys` exports `CartesianOperation` (an
  operation read by its Cartesian matrix, `timeReversal: false` accepted); its `CellOperation`
  has the optional `timeReversal?: false` and its `TensorSpec` the optional `timeParity?: 'even'`,
  which the functions accepted before; in Python `TensorSpec` has `time_parity`. `symcrys/magnetic`
  exports `Hkl`, as `symcrys` does. Types only, no change of behaviour.

### Changed

- **Breaking** (#194): results describe their content in crystallographic terms, and the sources
  are cited in the documentation. An entry of `TENSOR_PROPERTIES` is `{ spec, description }`; the
  source of each definition is in its documentation and in docs/conventions.md, "Named properties"
  (formerly the field `source`). `CRYSTAL_FORM_TYPES` is a record by key, the first usual
  name of a form in lower case with hyphens (`'pedion'`, `'tetragonal-prism'`), with `name`,
  `faces` and `eigensymmetry` (formerly a list in ITA's numbering, with a field `number`); `CrystalForm.formType` is that key
  (`'ditetragonal-pyramid'`, formerly 12), and the type `CrystalFormTypeKey` lists the 47 keys.
  `planeGroup(key).origin` of `symcrys/plane` is the site symmetry of the origin (`'2..'` for
  `p2mg`, `'1'` for `p1`; formerly ITA's sentence `'at 2 1 g'`). The first parameter of
  `millerIndices` is named `indices`, in Python too (`printed=` becomes `indices=`).

## [0.13.0] - 2026-11-25

Work on the open issues before 1.0: `residualOperations` for the plane (#119), faster calls for
lists of operations (#100) and a cleaner inside (#101), no breaking change. Beside the API: a guide
page for the plane groups on the site; further print checks of the property tensors (Newnham,
_Properties of Materials_, 2005: piezoelectric, gyration, pyroelectric, dielectric, elastic,
pyromagnetic, magnetoelectric and piezomagnetic matrices) and of the four-index symbols (Frank,
_Acta Cryst._ 18, 862, 1965); the API decisions of #110 and #115 documented ("Indices and
numbering" in the conventions).

### Added

- `residualOperations` in `symcrys/plane` (#119): the operations of a list whose matrix W keeps the
  metric of a plane cell, WᵀGW = G, as in the other entry points; in Python
  `symcrys.plane.residual_operations`, which keeps the rows of the caller's `Operations`. Type
  `PlaneCellOperation`.

### Changed

- Faster calls for lists of operations (#100): `tensorFormOf`, `allowsPropertyOf` and
  `allowedPropertiesOf` keep the groups of the last 64 lists of operations (and `tensorFormOf` the
  forms), so a list passed again (as in a Python loop) costs no closure again;
  `allowsPropertyOf` and `allowedPropertiesOf` read the dimension of the invariant space from the
  trace of the group average instead of computing the full form; `rotateTensor` contracts one index
  at a time, about seven times faster at rank 4. The results are the same, except that
  `rotateTensor` for a rotation with entries other than 0 and ±1 (a hexagonal or trigonal operation,
  or a general rotation) may differ in the last bits (the
  sums are taken in another order, a relative difference of the order of 10⁻¹⁵), and that it gives
  0 where it gave −0 (a zero component of an axial tensor under an improper rotation; visible only
  with `Object.is` in TypeScript).
- Two comparisons with a fixed internal tolerance now follow the one convention of the library,
  "strictly below counts as equal or zero" (#101): `residualOperations` takes an entry of `matrix`
  as an integer when it lies less than 10⁻⁹ from it (before: at most 10⁻⁹), and the row reduction of
  the tensor forms eliminates an entry of 10⁻¹² too (before: only above). A result differs only for
  an input exactly on these bounds.

### Fixed

- `residualOperations` (both point-group entry points) names itself in the error for a basis that is
  not a finite, non-singular 3 × 3 matrix; since 0.8.0 the message named `metricTensor`.
  The check itself is unchanged.

## [0.12.0] - 2026-11-25

The completion of the ITC content planned in #126 and #137 (part I): the plane groups get the lookups
and lists of the other entry points and their lattices and cells, all three entry points the change
of the coordinate system of ITA 2016 § 1.5, the point-group entry points Voigt's notation with ITC's
factors and Shubnikov's symbols. Two breaking changes: `changeOfAxes` is replaced by
`changeOfCoordinates` (migration under "Removed"), and `findPointGroup` refuses a symbol with a
character that only Shubnikov's notation writes ("Changed").

### Added

- **`symcrys/plane`: lookups and lists** (#97, #137 F4): `isPlaneGroupKey`, `isPointGroupKey`,
  `planeGroups()`, `pointGroups()`, `findPlaneGroup(symbol)` (the key or the full symbol, spaces
  ignored: `findPlaneGroup('p 1 m 1')` gives `{ key: 'pm' }`) and `findPointGroup(symbol)` (`'31m'`
  gives `{ key: '3m', setting: 2 }`), as in the other entry points; `{ setting }` takes the symbol of
  a setting too (`{ setting: '31m' }`). Types `PlaneGroupFound`, `PointGroupInSetting`. Python:
  `is_plane_group_key`, `is_point_group_key`, `plane_groups`, `point_groups`, `find_plane_group`,
  `find_point_group` in `symcrys.plane`.
- **`symcrys/plane`: lattices and cells** (#119, #137 G5): `planeGroup(key)` gives `bravaisLattice`
  (`'mp'`, `'op'`, `'oc'`, `'tp'`, `'hp'`, ITA 2016 Table 2.1.1.1, p. 143) and `pattersonSymmetry`
  (as the headline of the group prints it, `'p2mm'` for `p2mg`); `pointGroup(key)` of a plane point
  group gives `laueClass` (the point group with the twofold rotation added, ITA § 3.2.1.1, p. 720);
  `cellRestrictions(system)` the restrictions of Table 2.1.1.1 on the cell parameters as data; and
  the cell functions for 2 × 2 bases, with the names of the other entry points:
  `latticeFromParameters({ a, b, gamma })`, `latticeParameters`, `metricTensor`,
  `reciprocalBasis`. Types `PlaneBravaisLattice`, `CellRestrictions`, `PlaneCellParameter`,
  `PlaneFixedAngles`, `LatticeParameters`, `Mat2`. Python: the same in `symcrys.plane`
  (`lattice_from_parameters(a, b, gamma)`).
- **`changeOfCoordinates`** (#120, #137 G2), in all three entry points (Python
  `change_of_coordinates(linear_part, *, origin_shift=None, points=None, directions=None,
planes=None, metric=None, operations=None, tolerance=None)`): the change of the coordinate system
  by the pair (P, p) of ITA 2016 § 1.5 (pp. 83–85), with det P < 0 allowed, for point coordinates,
  vector coefficients, Miller indices, the metric tensor and operations (W, w), and the inverse pair
  (Q, q); P, p and the operations are read each number as the simplest fraction within the tolerance
  and transformed exactly, so that every result can be passed back. It replaces `changeOfAxes`
  (below). Types: `CoordinateTransformation`, `CoordinateQuantities`, `CoordinateChange`,
  `InverseTransformation`, `AffineOperation`, `TransformedOperation` in each entry point.
- **`toVoigt` and `fromVoigt`** (#137 E3), in `symcrys` and `symcrys/magnetic` (Python `to_voigt`,
  `from_voigt`): a tensor with symmetric index pairs in Voigt's two-index notation and back, with
  ITC's factors (ITC Vol. D § 1.1.4.10, eq. (1.5.7.4)): one factor, 1 or 2, per contracted index pair
  (`{ factors: [2] }` for the piezoelectric d, `[1]` for second-harmonic generation, `[2, 2]` for s,
  `[1, 2]` for π), ITC's `[2]` by default for `'piezomagnetic'`; 6 components at rank 2, 3 × 6 or
  6 × 3 at rank 3, 6 × 6 at rank 4. Types `VoigtFactor`, `VoigtOptions`. In Python `to_voigt` takes a
  tensor of shape (3, …, 3) or flat, and `from_voigt` gives the shape (3, …, 3); in TypeScript a
  tensor is flat.
- **Shubnikov symbols** (#137 B4): `symbol(key, { form: 'shubnikov' })` in `symcrys` and
  `symcrys/magnetic` gives the symbol of ITC Vol. D Table 1.5.2.3 (`2̲:m̲` for `2'/m'`, `6̅/4` for
  `m-3m`), with combining characters for the overbar and the underline; a grey group, which ITC
  does not print, the symbol of its class, `·` and an underlined 1, as Shubnikov & Belov (1964) write
  it (`m·1̲`). `findPointGroup` does not read them, and refuses a symbol with the underline, `:` or
  `·` ("Changed").
- The type `PlaneOperationKind` of `symcrys/plane` (Python `symcrys.plane.PlaneOperationKind`), the
  `kind` of a plane operation description, named as `OperationKind` is in the other entry points.

### Changed

- **Breaking:** `findPointGroup` (both point-group entry points) refuses a symbol with a character
  that only Shubnikov's notation writes (the combining low line U+0332, `:`, `·` and the dot operators U+22C5,
  U+2219) with a RangeError (Python `SymcrysError`); up to 0.11 such a symbol was "not found"
  (`undefined`, Python `None`). A caller that passes text of unknown origin catches the error.
  Shubnikov symbols are written by `symbol(key, { form: 'shubnikov' })` but not read (#137 B4).

### Removed

- **`changeOfAxes`** and its result type `AxisChange` (Python `change_of_axes`), replaced by
  `changeOfCoordinates` (#120, #137 G2), which also takes det P < 0 (refused by `changeOfAxes`), an
  origin shift, points, the metric and operations, and cites ITA 2016 instead of 2006. It computes
  exactly with fractions: each entry of P is read as the simplest fraction within the tolerance
  (default 10⁻⁶; 0.6666667 is 2/3). P is rational in a change between lattice bases, as in ITA; an
  irrational P, which `changeOfAxes` inverted in floating point (a rotation by 30°), is read as
  nearby fractions, accurate to about the tolerance, and a much smaller tolerance can make the
  exact products leave the safe integers (a RangeError):

  | Up to 0.11                                    | From 0.12                                                                     |
  | --------------------------------------------- | ----------------------------------------------------------------------------- |
  | `changeOfAxes(P).direction` (Q = P⁻¹)         | `changeOfCoordinates({ linearPart: P }, {}).inverse.linearPart`               |
  | `changeOfAxes(P).direction` applied to [uvw]  | `changeOfCoordinates({ linearPart: P }, { directions: [uvw] }).directions[0]` |
  | `changeOfAxes(P).plane` (Pᵀ) applied to (hkl) | `changeOfCoordinates({ linearPart: P }, { planes: [hkl] }).planes[0]`         |
  | Python: `symcrys.change_of_axes(P)`           | `symcrys.change_of_coordinates(P, directions=…, planes=…)`                    |

### Fixed

- **Python: the key of a plane point group is `str`**, as every key in the three modules: the fields
  `PointGroup.key`, `PlaneGroup.point_group` (and the new `PointGroupInSetting.key`) of
  `symcrys.plane` were annotated as a `Literal` of the ten keys, in TypeScript's order, since 0.11.0
  (the TypeScript type was derived from the list of keys, and the declarations expand such a type).
  The values were right; a test now checks the annotation of every key.

## [0.11.0] - 2026-11-24

symcrys follows ITC only (#106, #121): the Birss convention is gone, the data are stored in the ITC
frame, and the API uses ITA's terms. Almost every application has to adapt its calls; the table
below lists every removed or renamed function, type, field and option, then the results that change
without a change of the call. The sections after it give each change with its reason.

### Migrating from 0.10

**Calls, types and fields** (TypeScript and JavaScript; the same in `symcrys/magnetic` where it has
the function):

| Up to 0.10                                                                                                      | From 0.11                                                                                     |
| --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| option `convention` (`{ convention: 'itc' }`), type `Convention`                                                | drop it; `convention: 'birss'` is gone (#125)                                                 |
| `settings(key, 'itc')`, `findPointGroup(symbol, 'itc')`                                                         | `settings(key)`, `findPointGroup(symbol)`                                                     |
| `findPointGroup("m'm'm", 'birss')`, Birss's reading of `mm'm'`, `6'/mmm'`                                       | gone: a symbol names an ITC setting                                                           |
| `settings(key)[i].uniqueAxis` of an orthorhombic setting (`mm2`, `2'm'm`, `mm'm'`, …)                           | its `symbol` (`uniqueAxis` is only for the monoclinic settings)                               |
| `{ setting: 2 }` (index)                                                                                        | `{ setting: '312' }` (symbol; the indices changed, "Changed" below), or the index             |
| `operations(key)[i].matrix` (Cartesian)                                                                         | `operations(key)[i].cartesian`                                                                |
| `latticeOperations(key)[i].matrix`                                                                              | `operations(key)[i].matrix`                                                                   |
| `tensorFormOf([{ matrix: R }], …)`, also the other `…Of`                                                        | `tensorFormOf([{ cartesian: R }], …)`                                                         |
| `siteSymmetry(operations, direction)`                                                                           | `siteSymmetryOf(operations, direction)`; `siteSymmetry(key, direction, options)` is new       |
| `wyckoffPositionOf(key, x)`, also in `symcrys/plane`                                                            | `wyckoffPosition(key, x)`                                                                     |
| `pointGroup(key).chiral`, `isChiralOf`                                                                          | `pointGroup(key).enantiomorphic`, `isEnantiomorphicOf`                                        |
| `holohedry('trigonal')`, `holohedry(crystalFamily(system))`                                                     | `holohedry(latticeSystem)`: `'hexagonal'` or `'rhombohedral'`; `latticeSystems(key)`          |
| `wyckoffPositions(key)[i].coordinates` (first triplet)                                                          | `coordinates[0]` (the list of all printed triplets)                                           |
| `representative` of a Wyckoff position or crystal form                                                          | `faceNormal(basis, millerIndices(printed, { h, k, l }))`                                      |
| `zoneAxis(…) === null`                                                                                          | `zoneAxis(…) === undefined`                                                                   |
| description: `order`, kind `'mirror'`                                                                           | `n`, kind `'reflection'`                                                                      |
| tensor `{ parity, timeParity: 'i' \| 'c', intrinsic: 'ij' }`, type `TensorParity`                               | `{ kind, timeParity: 'even' \| 'odd', intrinsic: 'symmetric-first-pair' }`, type `TensorKind` |
| `intrinsic` `'jk'`, `'ij_kl'`, `'voigt'`                                                                        | `'symmetric-last-pair'`, `'symmetric-pairs'`, `'symmetric-pairs-exchangeable'`                |
| `SiteSymmetryOptions`, `OrbitOptions`, `PointGroupOfOptions`, `ResidualOperationsOptions`, plane `PointOptions` | `ToleranceOptions`                                                                            |
| `WyckoffOptions`                                                                                                | `SettingOptions & ToleranceOptions`                                                           |
| plane: `snapToWyckoffPosition(key, point)`, `SnappedPosition`                                                   | `wyckoffDistances(key, point, { basis })`, the snapping in the application                    |
| plane: `planeGroup(key).fullSymbol`, `.order`                                                                   | `symbol(key, { form: 'full' })` (`p 1 m 1`), `operations(key).length`                         |
| plane: setting `default`                                                                                        | `isDefault`                                                                                   |
| plane: description kind `'mirror'`, `'glide'`; `order`; `normal`                                                | `'reflection'`, `'glide-reflection'`; `n`; `axis`                                             |
| plane: `symmetryElements(key).rotations` (`RotationCentre`, `{ order, point }`)                                 | `rotationPoints` (`RotationPoint`, `{ n, point }`)                                            |
| plane: line `normal`, `segment`                                                                                 | `axis`, `point` (the line is not clipped; `{ box }` gives the translates)                     |
| plane: `asymmetricUnit(key).inequalities` (those of the edges)                                                  | `inequalities[e]` for `e` of `edges`; `inequalities` is the printed list                      |
| plane: `orbit(key, point)` (the points)                                                                         | `orbit(key, point).map((e) => e.point)`                                                       |

**Python** (besides the names above in snake_case):

| Up to 0.10                                                                           | From 0.11                                                                                                         |
| ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| keyword `convention=`                                                                | drop it (a `TypeError` now)                                                                                       |
| `lattice_from_parameters({"a": …, …})`, `is_valid_cell({"alpha": …, …})`             | `lattice_from_parameters(a, b, c, alpha, beta, gamma)`, `is_valid_cell(alpha, beta, gamma)`                       |
| `orbit(key, {"hkl": h})`                                                             | `orbit(key, hkl=h)` (or `uvw=`)                                                                                   |
| `operations(key)`: a list of dicts, `matrix` float64 Cartesian                       | `Operations`: `ops.cartesian` (n, 3, 3), `ops.matrix` (n, 3, 3) int64; `ops[i]` a dict                            |
| `lattice_operations(key)`                                                            | `operations(key).matrix`                                                                                          |
| `tensor_form(…)["basis"]` (p, 3**rank)                                               | (p, 3, …, 3); `.reshape(p, -1)` gives the old rows                                                                |
| `rotate_tensor(t, r, spec)`, always flat                                             | keeps the shape of `t` (flat or (3, …, 3)), takes stacks                                                          |
| `except SymcrysError` for every error                                                | `SymcrysError` (a `ValueError`) for wrong input, `SymcrysInternalError` (a `RuntimeError`) for a fault of symcrys |
| `symcrys.plane.Operation`                                                            | `symcrys.plane.PlaneOperation`                                                                                    |
| keyword arguments `find_point_group(hm=…)`, `holohedry(system=…)`                    | `symbol=`, `lattice_system=`                                                                                      |
| `angle_between_directions(basis, u=…, v=…)`, `angle_between_planes(basis, h=…, k=…)` | `direction1=`, `direction2=`; `plane1=`, `plane2=`                                                                |

**Results that change for the same call:**

- the indices of settings (`2`, `m`, `2/m`, `32`, `3m`, `-3m`, `-6m2`, `mm'm'`, `2'm'm` and the
  magnetic groups whose default was setting 2): the ITC default is setting 1;
- symbols of the magnetic API: eight short symbols (`32'`, not `32'1`; `321'`, not `3211'`), and
  Schoenflies `S6` instead of `C3i`;
- the axis of an operation in the hexagonal family: [1, 1, 0] and [2, 1, 0] (were their
  negatives), the sign of the Seitz symbol;
- plane groups: `wyckoffPosition`, `siteSymmetry` and `orbit` near an element within about the
  tolerance; `symmetryElements` gives each element once modulo the lattice; `asymmetricUnit` all
  printed inequalities; `planeGroup(key).origin` spaced as printed (`'at 2 1 g'`, was `'at 21g'`);
  the plane `describeOperationsOf` reads within 10⁻⁶ by default (was 10⁻⁹);
- `findPointGroup` reads more spellings (`m3m`, Schoenflies symbols) that gave `undefined`;
- wrong input throws a `RangeError` (was partly a `TypeError`, partly answered), also for an
  unknown option key; a tolerance of 0 or `null` is refused, and the orthogonality of operations
  is checked within at most 0.1;
- every result is frozen;
- tensor forms of operations with rounding errors and the site symmetry of a grey group at a large
  tolerance are fixed ("Fixed").

### Added

- `FaceIndices` and `DirectionIndices`: the types of the face and the direction that `orbit` takes
  (#121 step 12c), so that their fields are documented.

- **Faces with numbers** (#137 G3, G4, #110, #115, #121 step 11b): `millerIndices(printed,
{ h, k, l })` substitutes values into the Miller indices ITA prints (`'h,h,-2h,l'` with h = 3,
  l = 1 gives (3, 3, 1); i dropped for hexagonal axes), and `faceNormal(basis, hkl)` gives the unit
  normal of a face in a cell; in both entry points and in Python (`miller_indices`, `face_normal`).

- **Lattice systems** (#137 G1, #113, #121 step 11a): the type `LatticeSystem` with ITA's seven
  lattice systems (ITA 2016 Table 1.3.4.1, p. 39) and `latticeSystems(key)`, the lattice systems a
  class acts on: `['hexagonal', 'rhombohedral']` for a trigonal class, one otherwise; in both entry
  points and in Python (`lattice_systems`).

- `wyckoffDistances(key, point, { basis })` in `symcrys/plane` (Python `plane.wyckoff_distances`)
  (#137 F1, #108): the distance of a point to every Wyckoff position of a plane group, with the
  nearest point of each.

- **Monoclinic unique axis a** (#137 A5, #121 step 6c): the monoclinic classes and their grey and
  black-and-white groups get a third setting, unique axis a (`2 1 1`, `m 1 1`, `2/m 1 1`,
  `2' 1 1`, …), as ITC Vol. D prints it; its operations come from unique axis b by a′ = b, b′ = c, c′ = a
  (the column abc of unique axis a in ITA 2016 Table 1.5.4.4 is unique axis b so carried: C121 →
  B211), its Wyckoff positions and crystal forms likewise.
- **Rhombohedral axes** (#111, #121 step 6c): every trigonal group gets a setting with rhombohedral
  axes, as the last setting: `3` and `-3` (setting 2), `32`, `3m`, `-3m` (setting 3, symbols `32`,
  `3m`, `-3m`, full `3 2`, `3 m`, `-3 2/m`), their grey groups, and the black-and-white groups `-3'`,
  `32'`, `3m'`, `-3m'`, `-3'm'`, `-3'm` (Thomas, 2026-11-23). The operations are numbered as ITA prints
  them for rhombohedral axes (from the selected generators of R3, R-3, R32, R3m, R-3m); the lattice
  operations, orbits, symmetry directions ([111]; [1-10], [01-1], [-101]), Wyckoff positions and
  crystal forms are those of ITA Table 3.2.3.2 for rhombohedral axes (pp. 753–759). The axes are the
  obverse ones in the hexagonal cell of setting 1 (ITA 2016 Table 1.5.1.1, p. 78, the matrix Q of R₁ obverse), so the Cartesian
  operations equal those of setting 1: `pointGroupOf` names them setting 1. `findPointGroup('32')`
  gives the default, since `32` is the key; choose the setting by its index or by the axes,
  `{ axes: 'rhombohedral' }` (#96, below).

- **Tolerant reading of symbols** (#96, #121 step 7b): `findPointGroup` (Python `find_point_group`)
  in both entry points reads every symbol `symbol()` writes, Schoenflies symbols included (`Oh`,
  `D4h(D2h)`, `C3i` and `S6` alike; they give the default setting), Birss's cubic symbols (`m3m`,
  `m'3m`), and the spellings of print and pasted text: the overbar as `−`, a combining overbar,
  `¯` after the digit, `bar3` or `\bar{3}`, the prime as `′`, `ʹ` or `’`, Unicode or LaTeX subscripts
  (`C₃ᵥ`, `C_{3v}`). The option `setting` reads the same spellings. A symbol that names several
  groups is a RangeError. Up to 0.10 a Schoenflies symbol, `m3m` or `Oh` gave `undefined`.

- `intrinsic: 'antisymmetric'` (rank 2, Jahn symbol {V²}) and `intrinsic: 'totally-symmetric'` (rank
  2 and above, [Vⁿ], e.g. SHG under Kleinman's condition) (#137 E2).

- The named property `'ferrotoroidic'` (#137 E4, #118), in the magnetic API: a spontaneous toroidal
  moment, a time-odd polar vector (Jahn symbol aV), allowed in 31 magnetic point groups, those for
  which ITC Vol. D (§ 1.5.8.1, footnote 3, p. 140) says that the magnetoelectric tensor need not be
  symmetric. `allowedProperties` of these groups lists it between `'ferromagnetic'` and
  `'magnetoelectric'`. The `source` of `'ferroaxial'` says that the term is not from ITC and cites
  Gallego et al. (2019) as well; its `description` names the vector the axial toroidal moment.

### Changed

- **The axis of an operation has the sign of its Seitz symbol** (#114, #107, #121): in
  `describeOperations` of `symcrys` and `symcrys/magnetic` the axis takes the direction of the
  operation's Seitz symbol (ITA 2016 Tables 1.4.2.1–1.4.2.3), as ITA names the operations. This
  changes the hexagonal family: the twofold axes and mirror normals 2₁₁₀, m₁₁₀ and 2₂₁₀, m₂₁₀ are
  [1, 1, 0] and [2, 1, 0] (were [−1, −1, 0] and [−2, −1, 0], the representatives of ITA Table
  2.1.3.1), with their Cartesian vectors. `symmetryDirections` keeps Table 2.1.3.1, so an axis and
  its direction may be opposite. The plane groups already had the Seitz signs; now tested.

- **Python: keyword arguments and tensor shapes** (#137 H2, #98, #121 step 12c): an object parameter
  is now its fields as arguments: `lattice_from_parameters(a, b, c, alpha, beta, gamma)`,
  `is_valid_cell(alpha, beta, gamma, *, min_volume_ratio=None)`, `orbit(key, *, hkl=None, uvw=None,
…)` (with typed overloads), where each took a dict, and so `miller_indices(printed, *, h=None,
k=None, l=None)` (new in this version).
  `tensor_form` and `tensor_form_of` give `basis` as (p, 3, …, 3), one tensor per parameter (was
  (p, 3**rank)), a scalar (rank 0) as (p,); `rotate_tensor` keeps the shape of the tensor, (3, …, 3)
  or flat (was always flat; a scalar comes back as `()`), and takes stacks of tensors and of
  rotations, broadcast as in NumPy; other shapes with 3**rank entries, such as (3, 9) at rank 3,
  which it took before, are refused.

- **Python: operations as a record of arrays** (#137 H1, #98, #121 step 12b): `operations`,
  `generators` and `residual_operations` return `Operations`, a frozen dataclass with `matrix`
  (n, 3, 3) int64 (was float64), `cartesian` (n, 3, 3) float64 and in `symcrys.magnetic`
  `time_reversal` (n,) bool; in `symcrys.plane` `matrix` (n, 2, 2) int64 and `translation` (n, 2).
  `ops[i]` and `for op in ops` give one operation as a dict, as the list did. Functions that take
  operations accept `Operations`, a list of dicts, and in `symcrys` an array of Cartesian matrices
  (n, 3, 3), which `symcrys.magnetic` refuses (it does not say which operations carry time
  reversal), except `site_symmetry_of` and `orbit_of`, which do not depend on time reversal. In
  `symcrys.magnetic` a dict without `time_reversal` is refused by the Python layer (there too, the
  two functions excepted), and `residual_operations` needs every field of the operations it keeps.

- **Python: the modules are generated from the TypeScript API** (#99, #137 H2, #121 step 12a):
  `symcrys`, `symcrys.magnetic` and `symcrys.plane` are written by `scripts/python-api.mjs`, with a
  TypedDict for every record a function returns (`PointGroup`, `WyckoffPosition`, `SiteSymmetry`,
  …) and a Literal type for every named union of strings (`CrystalSystem`, `LatticeSystem`, …), all
  in `__all__`. The values are as before (type, dtype and shape of every result checked over all
  keys and settings). Renamed: `symcrys.plane.Operation` is `PlaneOperation`, as in TypeScript.

- **`holohedry` takes a lattice system** (#137 G1, #113, #121 step 11a), not a crystal system, as
  ITA defines the holohedry: `holohedry('hexagonal')` is `6/mmm`, `holohedry('rhombohedral')` is
  `-3m`, and `holohedry('trigonal')` is an error. Before, `holohedry('trigonal')` gave `-3m` and the
  symmetry of the hexagonal lattice was read as `holohedry(crystalFamily('trigonal'))`, a crystal
  family passed as a crystal system.

- **The settings are numbered by ITC's rule** (#137 A4, #121 step 6b): the ITC default is setting 1;
  then, for the monoclinic groups, unique axis c; for the orthorhombic groups the further
  orientations in the column order of ITA (2016) Table 1.5.4.4 (abc, ba-c, cab, -cba, bca, a-cb);
  otherwise the other orientation. Up to 0.10 the numbers came from Birss's frame. The operations,
  symbols and tensor forms of a setting are unchanged; only its index is.

  | Groups                                                                                    | Up to 0.10                                           | From 0.11                                            |
  | ----------------------------------------------------------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------- |
  | `2`, `m`, `2/m` and their grey and black-and-white groups                                 | 1 unique axis c, 2 unique axis b (default)           | 1 unique axis b (default), 2 unique axis c           |
  | `32`, `3m`, `-3m` and theirs                                                              | 1 `312`, 2 `321` (default)                           | 1 `321` (default), 2 `312`                           |
  | `-6m2` and its grey group                                                                 | 1 `-62m`, 2 `-6m2` (default)                         | 1 `-6m2` (default), 2 `-62m`                         |
  | `mm'm'`                                                                                   | 1 `m'm'm`, 2 `mm'm'` (default), 3 `m'mm'`            | 1 `mm'm'`, 2 `m'mm'`, 3 `m'm'm`                      |
  | `2'm'm`                                                                                   | `2'm'm`, `m2'm'`, `m'm2'`, `m'2'm`, `mm'2'`, `2'mm'` | `2'm'm`, `m'2'm`, `m2'm'`, `mm'2'`, `m'm2'`, `2'mm'` |
  | the other groups with two settings whose default was setting 2 (`32'`, `3m'`, `6'22'`, …) | default 2                                            | default 1, the other 2                               |

  Code that names a setting by its index should name it by its symbol, which does not change:
  `{ setting: '312' }`.

- **A setting can be given by its ITC symbol** (#123): `{ setting }` takes the index or the short or
  full symbol, spaces ignored; a symbol that several settings share gives the standard setting, and
  the options `axes` and `uniqueAxis` choose another (below).
- **The record of a setting** (#137 A3, C4): `uniqueAxis` only for the monoclinic settings (it
  went for `mm2` and the orthorhombic magnetic groups, where a setting is identified by its symbol),
  and `axes` (`'hexagonal'` or `'rhombohedral'`) for the trigonal settings.

- **An operation is `{ matrix, cartesian }`** (#137 A2, #94, #121 step 6d): `operations` and
  `generators` give each operation as ITA's matrix W in the lattice basis of the setting (`matrix`,
  integer; the coordinate triplets of ITA's general position are its rows) together with the
  orthogonal Cartesian matrix (`cartesian`), in the magnetic API with `timeReversal`. `matrix` so
  means W in every entry point, as in `symcrys/plane`. Up to 0.10 `matrix` was the Cartesian matrix.
  The functions that take operations from a caller and compute with Cartesian matrices
  (`pointGroupOf`, `describeOperationsOf`, `siteSymmetry`, `orbitOf`, `isCentrosymmetricOf`,
  `isChiralOf`, `tensorFormOf`, `allowsPropertyOf`, `allowedPropertiesOf`) read `cartesian` and
  refuse a record without it, with a hint if it has `matrix`; a record of `operations` passes as it
  is. `residualOperations` reads `matrix` and refuses a matrix that is not integer, which before gave
  a wrong answer without an error for a Cartesian matrix (#94). The values themselves are unchanged.
  `symcrys/magnetic` exports the type `CartesianOperation` (`{ cartesian, timeReversal }`), what the
  functions for a list of operations read.

  | Up to 0.10                                                      | From 0.11                                                        |
  | --------------------------------------------------------------- | ---------------------------------------------------------------- |
  | `operations(key)[i].matrix` (Cartesian)                         | `operations(key)[i].cartesian`                                   |
  | `latticeOperations(key)[i].matrix`                              | `operations(key)[i].matrix`                                      |
  | `tensorFormOf([{ matrix: R }], spec)`, also for the other `…Of` | `tensorFormOf([{ cartesian: R }], spec)`                         |
  | `residualOperations(latticeOperations(key), basis)`             | `residualOperations(operations(key), basis)`                     |
  | Python: `op["matrix"]`, `symcrys.lattice_operations(key)`       | `op["cartesian"]`, `symcrys.operations(key)` with `op["matrix"]` |

- **Symbols of the magnetic API as ITC Vol. D prints them** (#137 B2, B3, #121 step 7a):
  - the default setting of a grey or black-and-white group has its key as short symbol (for a
    black-and-white group as Vol. D Table 1.5.2.3 prints it): `symbol("32'")` is `32'`, not `32'1`;
    `symbol("321'")` is `321'`, not `3211'`. Eight groups change: `321'`, `3m1'`, `-3m1'`, `32'`,
    `3m'`, `-3m'`, `-3'm'`, `-3'm`, and their `settings`. The other settings keep their symbols, and
    the old ones still select the default setting. Their rhombohedral setting has the same short
    symbol, which selects the default; `{ axes: 'rhombohedral' }` selects it (#96, below);
  - Schoenflies symbols in `S6` instead of `C3i` (`S6(C3)`, `D3d(S6)`, `C6h(S6)`, `S6R`), as Vol. D
    writes them; the crystallographic API keeps ITA's `C3i`.

- **A symbol that several settings share gives the standard setting; `axes` and `uniqueAxis`
  choose another** (#96, #121 step 7b; Thomas, 2026-11-23): `{ setting: '2' }` gives unique axis b,
  `{ setting: '2', uniqueAxis: 'c' }` or
  `{ uniqueAxis: 'c' }` unique axis c; `{ axes: 'rhombohedral' }` the setting with rhombohedral axes.
  The new options `axes` (`'hexagonal'`, `'rhombohedral'`) and `uniqueAxis` (`'a'`, `'b'`, `'c'`), as
  ITA's headlines name the settings, are taken by every function with the option `setting` and by
  `findPointGroup` (Python `axes=`, `unique_axis=`). Spaces in a symbol carry no meaning.

- **Names of ITA** (#137 C1, C2, #121 step 7c):

  | Up to 0.10                                                          | From 0.11                                                                  |
  | ------------------------------------------------------------------- | -------------------------------------------------------------------------- |
  | `siteSymmetry(operations, direction)` (Python `site_symmetry`)      | `siteSymmetryOf(operations, direction)` (`site_symmetry_of`)               |
  | (none)                                                              | `siteSymmetry(key, direction, { setting, axes, uniqueAxis, tolerance })`   |
  | `wyckoffPositionOf(key, x)`, also in `symcrys/plane`                | `wyckoffPosition(key, x)`                                                  |
  | description `order`, kind `'mirror'`, plane kind `'glide'`          | `n`, `'reflection'`, `'glide-reflection'` (ITA 2016 Table 2.1.2.1, p. 145) |
  | `pointGroup(key).chiral`, `isChiralOf`                              | `enantiomorphic`, `isEnantiomorphicOf` (ITA § 3.2.2.1.3)                   |
  | plane `symmetryElements(key).rotations`, entries `{ order, point }` | `rotationPoints`, entries `{ n, point }`                                   |

  The lines of `symmetryElements` keep `kind: 'mirror' | 'glide'`, the names of the elements. The
  values are unchanged. Python follows by its fixed rules: `site_symmetry_of`, `site_symmetry`,
  `wyckoff_position`, `is_enantiomorphic_of`, the keys `enantiomorphic`, `n`, `rotation_points`.

- **One name for the axis, and smaller uniformity** (#137 C3, C4, #121 step 7d):
  - `symcrys/plane`: a reflection or glide reflection gives its axis, the normal of its line, as
    `axis` (was `normal`), in the descriptions and in the lines of `symmetryElements`, as the axis
    of an operation is named in the point groups; settings have `isDefault` (was `default`);
    `orbit` gives `{ point, operations }` per image (was the bare points); the `origin` of a plane
    group has its positions spaced as printed: `'at 2 1 g'` (was `'at 21g'`), `'at 2 m m'`, …;
  - `zoneAxis` gives `undefined` for parallel planes (was `null`);
  - every result is frozen, nested values included, and typed `readonly`: up to 0.10 the lists of
    `pointGroups`, `settings`, `allowedProperties`, `allowedPropertiesOf`, `residualOperations`, the
    results of `findPointGroup`, `rotateTensor`, the cell and the index functions could be changed
    by a caller;
  - parameter names: `angleBetweenDirections(basis, direction1, direction2)`,
    `angleBetweenPlanes(basis, plane1, plane2)`, `findPointGroup(symbol)`, also in Python.

- **Wyckoff coordinates as printed in full** (#137 C4, #121 step 7d): `coordinates` of a Wyckoff
  position of a crystal class (`wyckoffPositions`, `wyckoffPosition`) is the list of all coordinate
  triplets ITA prints for the position (Table 3.2.3.2), in printed order, as in `symcrys/plane`; up
  to 0.10 it was the first triplet as a string, which is now `coordinates[0]`. In Python a list of
  strings.

- **One tolerance contract** (#137 D1, #93, #121 step 8a):
  - one option type, `ToleranceOptions` (`{ tolerance }`), for every function that compares numbers
    a caller passes in; it replaces `SiteSymmetryOptions`, `OrbitOptions`, `PointGroupOfOptions`,
    `WyckoffOptions` (now `SettingOptions & ToleranceOptions`), `ResidualOperationsOptions` and the
    plane `PointOptions`; `EPSILON` (10⁻⁶) is exported by all three entry points (Python
    `symcrys.EPSILON`, `symcrys.magnetic.EPSILON`, `symcrys.plane.EPSILON`);
  - `tensorFormOf`, `isCentrosymmetricOf`, `isEnantiomorphicOf`, `allowsPropertyOf`,
    `allowedPropertiesOf`, `rotateTensor` and the plane `describeOperationsOf` take a `tolerance`
    (Python: the keyword `tolerance`); the plane `describeOperationsOf` reads translations and
    integer matrices within it, default 10⁻⁶ (was a fixed 10⁻⁹);
  - one check of the tolerance everywhere, with one message: a finite number above 0 and below 0.1
    (operations), 1 (directions), 1/2 (points) or 1 (`residualOperations`); `residualOperations`
    refused only negative values and took 0, now 0 is refused; `null` is refused everywhere (it
    took the default in some functions); comparisons are strict (`<`) everywhere;
  - the plane `describeOperationsOf` refuses a translation within the tolerance of two fractions;
  - `siteSymmetryOf`, `siteSymmetry`, `wyckoffPosition` and `orbitOf` check the orthogonality of
    the operations with their tolerance, at most 0.1 (was the tolerance for directions, up to 1).

- **Error types** (#137 D2, #92, #121 step 8b):
  - wrong input is a `RangeError` in every function of the three entry points, also where it was a
    `TypeError` from inside the library up to 0.10 (`null` or a number for a direction, a tensor
    specification, the parameters of a cell, a rotation or the options);
  - an options argument that is not a plain object (also a `Map`), and an option a function does
    not know (e.g. `{ uniqueaxis: 'a' }` for `uniqueAxis`), are RangeErrors; up to 0.10 an unknown
    option was ignored without notice;
  - wrong input that was answered is a RangeError: `findPointGroup` with a value that is not a
    string (was "not found"), `crystalFamily` with a value that is not a crystal system (returned
    the value), `isValidCell` with an angle that is not a finite number (was `false`; a finite angle
    outside (0°, 180°) still gives `false`), `siteSymmetryOf` and `orbitOf` with an empty list (gave
    multiplicity 0);
  - a direction, point, rotation or tensor must be an array of numbers; a typed array such as
    `Float64Array`, which the types never allowed, is refused;
  - a value in an error message is shown as it is (`NaN`, `1n`), and a BigInt or a value that
    contains itself no longer makes the message itself fail with a TypeError;
  - Python: `SymcrysError` (a `ValueError`) is raised for a `RangeError` of the library and for
    wrong input found by the Python layer; any other error of the library raises the new
    `symcrys.SymcrysInternalError` (a `RuntimeError`, also in `symcrys.magnetic` and
    `symcrys.plane`), so that `except ValueError` does not hide a fault of symcrys; `js_name` of a
    `SymcrysError` is `'RangeError'`; arguments of the wrong type (a ragged array, a string or
    complex numbers for a vector, a list for a mapping, an object JSON cannot write) raise a
    `SymcrysError` that names the argument, where NumPy's or Python's own error came before, and
    so does NaN.

- **The tensor specification in ITC's terms** (#137 E1, E2, #117, #121 step 9a):
  `{ rank, kind, timeParity, intrinsic }`; `kind` (`'polar'`, `'axial'`) replaces `parity`, and
  `timeParity` takes `'even'`/`'odd'` (were Birss's `'i'`/`'c'`); `intrinsic` takes
  `'symmetric-first-pair'`, `'symmetric-last-pair'`, `'symmetric-pairs'` and
  `'symmetric-pairs-exchangeable'` (were `'ij'`, `'jk'`, `'ij_kl'`, `'voigt'`). The type
  `TensorParity` is `TensorKind`. A specification with the names of 0.10 is a RangeError that
  names the new ones. Python: the keys `kind` and `time_parity`, and the same values.

- **One criterion for the position of a point in a plane group** (#137 F1, #108, #121 step 10a):
  `wyckoffPosition` of `symcrys/plane` decides by the distance of the point to a Wyckoff position,
  per lattice coordinate (up to 0.10 by the distance of its images, half as far at a mirror line),
  the most special position within the tolerance; `siteSymmetry` and `orbit` set the point onto
  that position and give its site symmetry and images, so the three agree. Results change for points
  whose distance to an element is comparable to the tolerance (the old criterion reached from about
  a third of it to beyond it, depending on the element), and the set point (`siteSymmetry().point`,
  `orbit`) changes near lines of the hexagonal groups, where it is now the nearest point of the line
  per coordinate rather than the mean of the images.

- **Symmetry elements and asymmetric unit of the plane groups as data** (#137 F2, F3, #110 items
  12, 13, #121 step 10b):
  - `symmetryElements(key)` gives each element once modulo the lattice, the centring included
    (p2: four twofold points, was nine, those in the closed cell [0, 1]²; cm: the lines 0,y and
    1/4,y), lines as a `point` and a direction; the field
    `segment`, the part of a line in the cell, is gone. `symmetryElements(key, { box })` gives all
    lattice translates that meet a box, the lines not clipped.
  - `asymmetricUnit(key)` gives all printed inequalities in printed order, also those that hold no
    edge (p3: x ≤ 2/3, y ≤ 2/3; up to 0.10 left out), the vertices, and the new field `edges`, per
    edge the index of the inequality that holds it (up to 0.10 `inequalities` was that list of
    edge inequalities).
  - Python: `symmetry_elements(key, box=…)`, the line field `point`; `asymmetric_unit` with
    `edges`.

- **`symbol` for plane groups** (#137 F4, #97, #121 step 10c): `symbol(key, { form })` of
  `symcrys/plane` takes the key of a plane group too, the short symbol (the key) or in the form
  `'full'` the full symbol with its positions separated by spaces (`p 1 m 1` for `pm`, as the
  other entry points write full symbols); a plane point group gives `3 m 1` in that form. Python:
  `plane.symbol(key, form=…)`.

### Removed

- The field `representative` of `wyckoffPositions`, `wyckoffPosition` and `crystalForms` (#137 G3,
  G4, #121 step 11b): the face with h, k, l = 3, 2, 1 (1, 2, 3 for the cubic forms with the condition
  |h| < |l|) and its Cartesian normal. Its normal was that of a, b, c along x, y, z for the
  monoclinic and triclinic classes, not the pole of any real cell with free angles. Now
  `faceNormal(basis, millerIndices(printed, values))` with the caller's cell and values; values
  that meet a printed condition are the caller's to choose.

- The field `fullSymbol` of `planeGroup` (`symcrys/plane`; Python `plane_group(key)["full_symbol"]`)
  (#137 F4, #121 step 10c): the full symbol is `symbol(key, { form: 'full' })`, with spaces.

- `snapToWyckoffPosition` of `symcrys/plane` (Python `snap_to_wyckoff_position`) and its result type
  `SnappedPosition` (#137 F1, #108): replaced by `wyckoffDistances(key, point, { basis })`, which
  gives for every Wyckoff position the nearest point and the distance (per lattice coordinate, or
  Euclidean with a basis), on which an application builds its own snapping, e.g. the most special
  position within a radius.

- **`latticeOperations`** (Python `lattice_operations`), in both entry points (#121 step 6d): its
  matrices are the `matrix` of `operations`, index for index.
- **`planeGroup(key).order`** in `symcrys/plane` (#137 C2, #121 step 7c): it was the number of
  `operations` (the multiplicity of the general position), not the order of a group; use
  `operations(key).length`.

- **The Birss convention** (#110, #121 step 5): symcrys follows ITC only. The option `convention`
  goes from every function (`operations`, `generators`, `symbol`, `describeOperations`,
  `symmetryDirections`, `latticeOperations`, `orbit`, `tensorForm`, `wyckoffPositions`,
  `wyckoffPositionOf`, `crystalForms`), and so do the second argument of `settings` and
  `findPointGroup` and the type `Convention`; in Python the keyword and argument `convention`. In
  TypeScript and JavaScript an options object that still has `convention`, or a second argument of
  `settings` or `findPointGroup`, throws a RangeError that names this change, so that a caller
  asking for Birss's presentation is not answered in ITC's without notice; in Python the removed
  keyword raises a `TypeError`. Results in the ITC convention are unchanged. The behavioural pins of
  the Birss convention against birss-app last exist in 0.10.1 (`birssApp.pins.json`), for birss-app
  to take over (#125).

  | Up to 0.10                                                                                                                             | From 0.11                                                                                                                                            |
  | -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
  | `operations(key, { convention: 'itc' })`, also for the other functions                                                                 | `operations(key)`: drop the option                                                                                                                   |
  | `settings(key, 'itc')`, `findPointGroup(hm, 'itc')`                                                                                    | `settings(key)`, `findPointGroup(hm)`                                                                                                                |
  | `import type { Convention } from 'symcrys'`                                                                                            | drop the import                                                                                                                                      |
  | Python: `symcrys.operations(key, convention="itc")`, `symcrys.settings(key, "itc")`                                                    | `symcrys.operations(key)`, `symcrys.settings(key)`                                                                                                   |
  | `convention: 'birss'` (Python `convention="birss"`): Birss's default setting, symbols, order of the operations, generators, axis signs | gone; Birss's presentation is the application's (birss-app, #125). The frames of the two books: docs/conventions.md, "Birss as a second print check" |
  | `findPointGroup("m'm'm", 'birss')` and the reading of `mm'm'`, `6'/mmm'` as Birss symbols (#46)                                        | gone: a key gives the ITC default setting                                                                                                            |

### Fixed

- **Tensor forms of operations with rounding errors** (#89; wrong since 0.4.0, when `tensorFormOf`
  came): operations rounded to 6 decimals (√3/2 as 0.866025), as files and other programs give
  them, were accepted and gave too many free parameters (13 instead of 6 for the piezoelectric
  tensor of `3`), without an error. The operations are now closed into a group within the
  tolerance and made exact first, and the form is that of the exact group; `allowsPropertyOf` and
  `allowedPropertiesOf` read them in the same way (docs/conventions.md, "Tolerances"). Such
  operations need a `tolerance` of about ten times their rounding (10⁻⁵ for 6 decimals): with the
  default they now throw a RangeError that says so, where they gave an answer before, with too many
  free parameters for a tensor form; the same holds for `isCentrosymmetricOf`.
- **Site symmetry of a grey group at a large tolerance** (#133; wrong since 0.6.0, which brought the grey groups): the products of
  the fixing operations were looked up by their matrix alone, so the copy without time reversal
  was always found, and the result could be no subgroup (15 of the 24 operations of `6mm1'` at
  tolerance 0.7). Products are now whole operations.

## [0.10.1] - 2026-11-22

### Fixed

- `tensorFormOf` (Python: `tensor_form_of`) could name the wrong free parameters and give wrong
  relations for operations with float noise that pass its orthogonality check: it read each
  parameter as the first non-zero entry of a basis row, while noise too small to be a pivot stayed
  in the rows. 4mm with a noise of 10⁻⁹ on every entry gave the parameters xxx, zxx, zzz instead of
  xxz, zxx, zzz, and with 2·10⁻⁸ the same parameter twice. Wrong since 0.4.0; the parameters are
  now the pivots of the reduction (#88). Exact operations, `tensorForm` and the named properties
  were not affected. Too many parameters can still come out for operations rounded to 6 decimals and
  for groups in an exactly rotated frame (#89).
- `siteSymmetry` kept the products of a list by the identity of the array, so a caller that changed
  its list in place got products of the old contents: a wrong site symmetry or a RangeError. Wrong since 0.3.1; the products are now kept for one call (#90). The
  Python package was not affected.
- `siteSymmetry` throws a RangeError instead of returning a result that is not a group when the
  operations fixing the direction do not settle, which happens only for a tolerance far too large
  (e.g. 6221' at 0.99 gave 10 of 24 operations); the closure of a list of operations that generates
  no finite group (`tensorFormOf`, `isCentrosymmetricOf`, `isChiralOf`, the property functions) throws a RangeError
  that names the input, instead of a plain `Error` naming an internal function (#91).
- Python: NaN or infinity in an argument raises `SymcrysError` ("must be finite") instead of the
  engine's "unexpected token: 'NaN'"; an array of matrices, or a list of matrices, passed as
  operations raises `SymcrysError` saying what is expected instead of "cannot read property '0' of
  undefined" (#92).
- `TENSOR_PROPERTIES`: the `source` of `'piezoelectric'`, `'magnetoelectric'` and `'piezomagnetic'`
  cites the sections of ITC Vol. D in which the equations stand (§ 1.1.4.10.1, § 1.5.7, § 1.5.8)
  (#118).
- Documentation: `"3'2'"`, which is no magnetic point group, is now `"32'"` (Two readings of a key);
  Birss prints full symbols for six classes, contrary to what the conventions said; further stale
  statements (#129, #130).

## [0.10.0] - 2026-11-22

### Added

- `snapToWyckoffPosition(key, point, { tolerance })` in `symcrys/plane` (Python
  `snap_to_wyckoff_position`): snaps a point onto the most special Wyckoff position within the
  tolerance of it, by its distance to the position, and returns the position with the point on it,
  for applications that let a dragged point snap (#85).
- `describeOperationsOf(operations)` in `symcrys/plane` (Python `describe_operations_of`): any list of
  operations of the plane described as `describeOperations` describes those of a group, for
  products, operations shifted by lattice translations or the operations of a site symmetry (#84).
- A field `normal` for each mirror and glide line, in the descriptions of the operations and in the
  lines of `symmetryElements`: the symmetry direction of the line in the lattice basis, as in ITA
  Table 2.1.3.1, tested against that table and the printed full symbols of the 17 plane groups (#84).

### Changed

- `siteSymmetry` and `wyckoffPositionOf` of `symcrys/plane` are several times faster at special
  positions (in Node about 5 to 10 times at the 4-fold point of p4mm), from a group table per plane
  group, computed once, on which the closure of the site symmetry works, and from parsing the
  printed coordinates of the Wyckoff positions once (#86). Results are unchanged.

## [0.9.0] - 2026-11-22

### Added

- A third entry point, `symcrys/plane` (Python: `symcrys.plane`), for the 17 plane groups and the
  10 plane point groups, in the lattice basis, after ITA (6th ed., 2016) Chapter 2.2 and Table
  3.2.1.1 (#31): `PLANE_GROUP_KEYS`, `POINT_GROUP_KEYS`, `planeGroup`, `pointGroup`, `settings`, `symbol`,
  `operations` and `generators` (`{ matrix, translation }`, matrices with integer entries,
  translations as numbers), `describeOperations` (kind, order, sense, centre or line, glide vector),
  `wyckoffPositions`, `siteSymmetry`, `wyckoffPositionOf` and `orbit` of a point (with
  `tolerance`), `asymmetricUnit` (vertices and one inequality a·x + b·y ≤ c per edge) and
  `symmetryElements` (rotation centres with their order, mirror and glide lines with their segment
  in the cell). `3m` has the settings `3m1` and `31m`. The plane groups are tested against the
  transcription of the printed pages (`references/itc/vol-a-2016-plane-groups.md`); the plane point
  groups are the linear parts of their symmorphic plane groups, checked against those of every
  plane group.

## [0.8.1] - 2026-11-22

### Added

- Documentation site: a description and Open Graph tags on every page, the site's address as the
  canonical link of the landing page, and a `sitemap.xml` written by the build, so that search
  engines find every page (#72).

### Fixed

- `siteSymmetry` (Python: `site_symmetry`), in both entry points, now refuses a matrix that is not
  orthogonal with a RangeError (Python: `SymcrysError`), as the other functions for a list of
  Cartesian operations do. Before, it gave a result that looked valid and was wrong: for the
  stretch diag(2, 1, 1), [100] came out as a general position and [010] as lying on an element.
  Wrong since 0.3.0, in Python since 0.5.0; fixed in 0.8.1. Orthogonal means within the
  `tolerance` of the call, at least 10⁻⁶, as for `pointGroupOf`, so operations rounded to 4
  decimals and passed with `tolerance: 1e-4` are still accepted. Not affected: orthogonal
  operations, such as those of `operations` or of a distorted crystal in Cartesian coordinates.
- A matrix counts as singular by one criterion, relative to the product of its column lengths
  (|det| at most 10⁻⁹ times that product, i.e. V/(abc) ≤ 10⁻⁹ for a cell), so it depends neither
  on the unit of length nor on how different the edges are. Before, `inverse` tested |det| < 10⁻⁶
  absolutely, and the cell functions tested |det| against the cube of the longest edge. Since
  0.8.0, fixed in 0.8.1:
  - `reciprocalBasis` and `angleBetweenPlanes` refused a cell with edges below about 0.01 of its
    unit (e.g. in metres) as singular, although any unit is allowed;
  - all cell functions refused a cell with two edges more than about 3·10⁴ times shorter than the
    third (e.g. c/a > 31 623 with a = b and right angles) as singular;
  - `changeOfAxes` refused a matrix P with small entries (e.g. 0.001·I) and accepted a nearly
    singular one with large entries (|det| ≥ 10⁻⁶ but ≤ 10⁻⁹ times the product of the column
    lengths), which it now refuses with its own message.
    Every other matrix is accepted as before, with the same result.
- `isValidCell` (Python: `is_valid_cell`) refuses a `minVolumeRatio` outside 0 to 1 with a
  RangeError. Before, a negative ratio was accepted and had no effect, and `Infinity` or a ratio
  above 1 refused every cell. Since 0.8.0; fixed in 0.8.1.

### Changed

- `orbitOf` (Python: `orbit_of`) checks orthogonality within its `tolerance` (at least 10⁻⁶), like
  `siteSymmetry` and `pointGroupOf`; before, always within 10⁻⁶.
- The TSDoc (and so the Python docstrings) of every function for a list of Cartesian operations
  states what it checks: orthogonal matrices, in the magnetic API also whether each operation is
  combined with time reversal. The Python docstrings now say "Raises SymcrysError" also where the
  TSDoc wraps "Throws a RangeError" across a line.
- README: until 1.0.0 a MINOR version may change the API, and every change to the API or to
  calculated results is recorded in the CHANGELOG (it said "without notice").

## [0.8.0] - 2026-11-21

### Added

- Geometry of a cell and indices, #24 item 4: `latticeFromParameters` and `latticeParameters` (basis
  of a cell and back; a ∥ x, b in the xy plane, c towards +z), `isValidCell` (three angles give a
  cell, optional `minVolumeRatio`), `metricTensor`, `reciprocalBasis`, `angleBetweenDirections`,
  `angleBetweenPlanes`, `residualOperations` (the operations of a list that keep the metric; also
  in the magnetic API, where every operation must say whether it has time reversal, as for the
  other functions there; `timeReversal` is carried along), `reduceIndices`,
  `planeToFourIndices`, `planeFromFourIndices`, `directionToFourIndices`,
  `directionFromFourIndices`, `zoneAxis` and `changeOfAxes` (transformation of direction
  coordinates and plane indices for a change of basis P). In both entry points (the cell, metric and
  index functions need no group key); in Python the same names in snake_case. Types `LatticeParameters`,
  `CellAngles`, `CellOperation`, `IsValidCellOptions`, `ResidualOperationsOptions`, `AxisChange`,
  `FourIndices`; in the magnetic API also `MagneticCellOperation`. Python: the key `plane` of a result is a float64 array like `matrix`.
  Rules in `docs/conventions.md`, "Cell, metric and indices"; page "Cells, metric, angles and
  indices" on the site.

## [0.7.0] - 2026-11-21

### Added

- Crystal forms of the crystal classes, #24 item 2: `crystalForms(key, { setting })` gives, as ITA
  (6th ed.) Table 3.2.3.2 prints them, the forms of every Wyckoff position, its basic form first,
  then its limiting forms, each with Wyckoff letter, multiplicity, face symmetry, the number of the
  form, ITA's first face (Miller indices as printed, and the condition `|h|<|l|` or `|h|>|l|` of the
  cubic forms (hhl)) and a numeric representative with its Cartesian normal; `CRYSTAL_FORM_TYPES`
  holds the 47 forms of ITA Table 3.2.1.3 (number, English name as printed, number of faces,
  eigensymmetry). Types `CrystalForm`, `CrystalFormType`. ITC convention and crystallographic API
  only, like the Wyckoff positions. In Python `crystal_forms` and `CRYSTAL_FORM_TYPES`.
- `references/itc/vol-a-table-3.2.3.2-face-forms.md` and `vol-a-table-3.2.1.3-crystal-forms.md`:
  the face forms of ITA Table 3.2.3.2 and the 47 forms of Table 3.2.1.3, re-parsed by
  `crystalForms.reference.test.ts`, which also checks the two tables against each other; two
  misprints of Table 3.2.1.3 recorded with errata. `audit/forms-2006` compares with stereography's
  catalogue (ITA 2006): no difference.
- Operations in the lattice basis and orbits, #24 item 3, in both entry points:
  `latticeOperations(key, options)` (the operations as integer matrices in the conventional basis,
  for every family, in the order and shape of `operations`, in the magnetic API with
  `timeReversal`), `orbit(key, { hkl } | { uvw }, options)` (the orbit of a face or a lattice
  direction, exactly, each entry with the operations that lead there) and
  `orbitOf(operations, direction, { tolerance })` (the orbit of a Cartesian direction under any list
  of operations, coinciding poles merged); types `FaceOrbitEntry`, `DirectionOrbitEntry`,
  `OrbitPole`, `OrbitOptions`. In Python `lattice_operations`, `orbit`, `orbit_of`.
- The point group of a list of operations, #24 item 3, in both entry points:
  `pointGroupOf(operations, { tolerance })` gives the key of the group the operations generate and
  the setting whose operations it equals (absent for another orientation), undefined if they
  generate no point group; `describeOperationsOf(operations, { tolerance })` describes the
  operations of any list with Cartesian axes. Types `IdentifiedPointGroup`,
  `CartesianOperationDescription`, `CartesianAxis`, `PointGroupOfOptions`. In Python
  `point_group_of`, `describe_operations_of`.
- `references/itc/vol-a-table-3.2.3.2-general-faces.md`: the faces of the general form of the 16
  entries of ITA Table 3.2.3.2 with hexagonal axes; with the general positions, the print anchor of
  `orbits.reference.test.ts`.
- Documentation: the page "Crystal forms, orbits and distorted crystals", with examples in TypeScript
  and Python.

## [0.6.1] - 2026-11-21

### Added

- A documentation site, [manganite.github.io/symcrys](https://manganite.github.io/symcrys/) (#29):
  getting started in TypeScript and Python, the two readings of a key (crystal class or magnetic
  point group), the conventions, tensors and named properties (the table made from
  `TENSOR_PROPERTIES`), the example notebook on SHG at surfaces, and the reference for both
  languages. Built from the tag and published on GitHub Pages with each release; every example and
  notebook on it is executed when it is built.

### Changed

- The docstrings of the Python package are written from the TSDoc comments of the TypeScript
  sources (#29), so both languages have the same description of every function; they gained a
  section on the keyword arguments and, where NumPy arrays come back, their shapes and dtypes.
  Every export has a TSDoc comment. No change to the API or to calculated results.
- `homepage` of the npm package and `Documentation` of the Python package point to the site.

## [0.6.0] - 2026-11-20

### Added

- Two entry points with the same function names (#47). `symcrys` is the crystallographic API: the
  32 crystal classes, without time reversal. `symcrys/magnetic` (Python: `symcrys.magnetic`) is the
  magnetic API: the 122 magnetic point groups. The import decides how a key is read: in `symcrys`,
  `'32'` is a crystal class (quartz); in `symcrys/magnetic` it is a white group, the symmetry of a
  magnetically ordered crystal, and a crystal without magnetic order has the grey group of its
  class (quartz: `"321'"`). The magnetic API has every function of the crystallographic one except
  `wyckoffPositions` and `wyckoffPositionOf` (docs/conventions.md, "Two entry points").
- In the magnetic API, the 90 magnetic point groups with time reversal (#13): the 32 grey groups
  (type II, `2221'`) and the 58 black-and-white groups (type III, `4'/mmm'`), with their settings,
  symbols, operations and generators in both conventions. Keys are the short symbols of ITC Vol. D
  Table 1.5.2.3 with a prime `'` for time reversal; a grey group is the key of its class followed
  by `1'`. `POINT_GROUP_KEYS` holds all 122 keys, the 32 classes first; `pointGroup` gives the
  `type` (`'I' | 'II' | 'III'`). `findPointGroup` gives the setting a symbol names (#46): in the
  Birss convention the keys `mm'm'` and `6'/mmm'` are the Birss symbols of setting 2 of their
  groups and are found as such. In the ITC convention the operations of a magnetic group are in
  the order of its crystal class; in the Birss convention operations, generators, symbols and
  settings are birss-app's, with three settings of `2'm'm` beyond them (docs/conventions.md,
  "Types", "Settings of the magnetic groups").
- In the magnetic API, tensor forms of the magnetic point groups (#13). A grey group allows no
  time-odd (`'c'`) tensor; the forms of the black-and-white groups are checked against Birss's
  Table 7 (Birss convention, ranks 0 to 4) and against ITC Vol. D Tables 1.5.2.4, 1.5.7.1 and
  1.5.8.1 (ITC convention).
- Named tensor properties (#41): the table `TENSOR_PROPERTIES` (name, kind of tensor, print source)
  and `allowsProperty(key, name)`, `allowedProperties(key)`, `allowsPropertyOf(operations, name)`,
  `allowedPropertiesOf(operations)`. `tensorForm`, `tensorFormOf` and `rotateTensor` take the name
  of a property in place of a specification: `tensorForm('32', 'piezoelectric')`. The
  crystallographic API has the properties of time-even tensors, `'pyroelectric'`,
  `'piezoelectric'`, `'gyrotropic'` and `'ferroaxial'` (below); the magnetic API has in addition `'ferromagnetic'`,
  `'magnetoelectric'` and `'piezomagnetic'`. Types `TensorProperty`, `TensorPropertyName`.
- The named property `'ferroaxial'` in both APIs (#41): a time-even axial vector, allowed by the 13
  classes `1`, `-1`, `2`, `m`, `2/m`, `4`, `-4`, `4/m`, `3`, `-3`, `6`, `-6`, `6/m` (checked
  against Birss's Tables 4a and 4c) and by the 43 magnetic groups of these classes.
  `allowedProperties` lists it second, after `'pyroelectric'`.
- The fixed properties of a point group as fields of `pointGroup(key)` and `pointGroups()` (#41):
  `centrosymmetric`, `polar`, `chiral`, `laueClass`; in the magnetic API also `crystalClass`, the
  key of the class a magnetic group belongs to (Python: `laue_class`, `crystal_class`).
- `holohedry(system)`: the holohedry of a crystal system (ITA Table 2.1.1.1), `'-3m'` for
  `'trigonal'`; `holohedry(crystalFamily(system))` gives the symmetry of the lattice in hexagonal
  axes, `'6/mmm'`, for the trigonal classes.
- `isCentrosymmetricOf(operations)` and `isChiralOf(operations)` for the group generated by any
  list of operations (Python: `is_centrosymmetric_of`, `is_chiral_of`). Like `tensorFormOf` they
  refuse a matrix that is not orthogonal and, in the magnetic API, an operation without
  `timeReversal`.
- In the magnetic API the type `CrystalClassKey`, the key of one of the 32 classes: the type of
  `crystalClass`, `laueClass` and `holohedry()` there.
- `2'm'm` has six settings, one for every orientation of its axes: 1 to 3 as in birss-app, and 4
  `m'2'm`, 5 `mm'2'`, 6 `2'mm'`, which ITC Vol. D and Paufler print. Two settings share each
  `uniqueAxis` (the normal of the mirror plane without time reversal), so for this group the symbol
  or the index identifies a setting, not the axis.
- `references/`: Birss Tables 6 and 7, ITC Vol. D Tables 1.5.2.3, 1.5.2.4, 1.5.7.1 and 1.5.8.1 and
  Paufler's Table A 6 (orthorhombic rows), re-parsed by the tests of the magnetic point groups and
  their tensor forms; and the 30 diagrams of ITC Vol. D § 1.1.4.10.6 (pp. 27–29), the matrices of the
  fourth-rank tensors p, π, Q, c and s for all 32 classes and the spherical system; the tests now check the full rank-4 forms
  of the ITC convention against them, not only the numbers of independent components (#39). No
  calculated result changed.
- Python: the module `symcrys.magnetic`; `TENSOR_PROPERTIES`, `allows_property`,
  `allowed_properties`, `allows_property_of`, `allowed_properties_of`, and names in `tensor_form`,
  `tensor_form_of` and `rotate_tensor`, in both modules; `holohedry`, `is_centrosymmetric_of`,
  `is_chiral_of`.

### Changed

- The crystallographic API (`symcrys`) no longer mentions time reversal (#47); what 0.5.0 had of
  it is now in the magnetic API:
  - An operation is `{ matrix }`: `Operation` and `OperationDescription` have no `timeReversal`
    (Python: no `time_reversal`). A list of operations passed in may still carry
    `timeReversal: false`; `true` is a `RangeError`.
  - `TensorSpec` has no `timeParity` (Python: no `time_parity`). `timeParity: 'i'` is still
    accepted; `'c'` is a `RangeError` (in 0.5.0 `tensorForm` gave the form of the time-even tensor
    for it).
  - `PointGroup` has no `type` (it was `'I'` for every class). The types `PointGroupType` and
    `TimeParity` are exported by the magnetic API only.
  - A key of a magnetic point group, the name of a time-odd property, a time-odd tensor and an
    operation with time reversal are a `RangeError` (Python: `SymcrysError`) that names the
    magnetic API.
- A matrix that contains NaN is refused as not orthogonal by `tensorFormOf` and `rotateTensor`
  (0.5.0 computed with it).

### Fixed

- `tensorFormOf` (Python: `tensor_form_of`) for operations given without `timeReversal`
  (`time_reversal`) that are not a complete group, e.g. generators: the closure combined them with
  time-reversed copies, and the form had too many components (a twofold axis alone: three free
  components of a polar vector instead of one). Wrong since 0.4.0, in Python since 0.5.0; fixed in
  0.6.0. Not affected: a complete group, operations with `timeReversal: false`, and TypeScript
  callers, for whom the type required `timeReversal`. The crystallographic API now reads such an
  operation as its matrix; the magnetic API refuses it and asks for `timeReversal`.

### Removed

- `isPiezoelectric` (Python: `is_piezoelectric`): use `allowsProperty(key, 'piezoelectric')`
  (`allows_property(key, "piezoelectric")`), which gives the same for the 32 crystal classes (#41).
- `isCentrosymmetric`, `isPolar`, `isChiral` and `laueClass` (Python: `is_centrosymmetric`,
  `is_polar`, `is_chiral`, `laue_class`): read the fields of `pointGroup(key)` instead,
  `pointGroup(key).centrosymmetric`, `.polar`, `.chiral`, `.laueClass` (Python:
  `point_group(key)["centrosymmetric"]`, …), which give the same (#41).

## [0.5.0] - 2026-11-19

### Added

- The Python package `symcrys` (`packages/python`, #30): the TypeScript library of the same
  version, bundled and run in quickjs-ng, with every export under its snake_case name
  (`tensor_form`, `site_symmetry`, …), matrices and vectors as NumPy arrays, type hints
  (`py.typed`) and errors as `SymcrysError` (a `ValueError`); for Python 3.10 or later, depending
  on `quickjs-ng` and NumPy. Example notebook `examples/surface-shg.ipynb` (SHG at the surfaces of
  m-3m). First release on PyPI.

### Changed

- Repository layout: the npm package moved to `packages/ts`, the Python package is
  `packages/python`; the npm package keeps its name, files and release tarball; its README on npm is now a short
  one (`packages/ts/README.md`) pointing to the repository, and `repository.directory` names
  `packages/ts`. A
  checkout for crystallography-common's `sync.mjs --kern` is now `packages/ts` of the checkout.

## [0.4.0] - 2026-11-19

### Added

- Tensor forms (#30): `tensorForm(key, spec, options)` gives the form of a property tensor of rank
  0 to 4 (polar or axial, time-even or time-odd, with the index symmetries `'none'`, `'ij'`, `'jk'`,
  `'ij_kl'`, `'voigt'`) under a point group in a setting and convention; `tensorFormOf(operations, spec)`
  under the group generated by any operations, e.g. the site symmetry of a surface normal;
  `rotateTensor` expresses a tensor in a rotated frame. A form is plain numbers: the basis in reduced
  row echelon form, the free parameters as index lists, and the relations as coefficient rows
  (docs/conventions.md, "Tensors"). Types `TensorSpec`, `TensorForm`, `TensorRank`, `TensorParity`,
  `TimeParity`, `IntrinsicSymmetry`. In the Birss convention the forms and free parameters are
  birss-app's.
- `isPiezoelectric`, from the form of the piezoelectric tensor (20 classes, ITA Table 3.2.2.1).
- `references/`: Birss Tables 4a–4f, Yariv Table 16.1, Hoshi et al. (1995) Eqs. (11)–(12) and ITC
  Vol. D §§ 1.1.4.10.6–1.1.4.10.7, re-parsed by the tests of the tensor forms.

### Changed

- The behavioural pins captured from birss-app are JSON (`*.pins.json`), so that tests in other
  languages can read them; the operation pins are unchanged in content.

## [0.3.1] - 2026-11-19

### Fixed

- `siteSymmetry` (and so `wyckoffPositionOf`) for a direction near an element at the edge of the
  tolerance: the operations fixing it within the tolerance were taken as they were, which need not
  be a group (e.g. 6 × 10⁻⁵ off the sixfold axis of 6/mmm with tolerance 10⁻⁴, the sixfold rotations
  count as fixing but the threefold ones not). The direction was then set off the element, the
  multiplicity could be fractional, and `wyckoffPositionOf` threw. Now the fixing operations are
  closed under products and the direction is set onto the fixed space of that group, repeated until
  stable; with a tolerance so large that the group fixes no common direction it throws. Wrong
  since 0.3.0, fixed in 0.3.1; for a group and directions on an element or clearly off it the
  results are unchanged.

## [0.3.0] - 2026-11-19

### Added

- Site symmetry and Wyckoff positions for directions (face normals), #24 item 1: `siteSymmetry`
  (the operations of any list that fix a direction, with the direction set onto their fixed space,
  the multiplicity, whether the position is general, and an optional `tolerance`), `wyckoffPositions` (per point group and ITC setting
  ITA's letter, multiplicity, oriented site-symmetry symbol, printed representative point and face,
  a numeric face (hkl) with its Cartesian normal, and the indices of its site symmetry in
  `operations`) and `wyckoffPositionOf` (the Wyckoff position of any direction, by conjugate site
  symmetry); with the types `SiteSymmetry`, `SiteSymmetryOptions`, `WyckoffPosition`,
  `WyckoffOptions`, `Hkl`. Wyckoff positions exist in the ITC convention only; the point at the
  origin (letter o) is not a direction and is left out. For `mm2` settings 2 and 3 (`2mm`, `m2m`),
  which ITA does not print, they are derived from setting 1 by rotation.
- `references/itc/vol-a-table-3.2.3.2-wyckoff-positions.md`: the Wyckoff positions of ITA (6th ed.)
  Table 3.2.3.2, re-parsed by `wyckoff.reference.test.ts`.

## [0.2.0] - 2026-11-18

### Added

- The 32 crystallographic point groups (crystal classes): `pointGroups`, `pointGroup`,
  `POINT_GROUP_KEYS`, `isPointGroupKey`, `findPointGroup`; their settings (`settings`), operations
  and generators as Cartesian matrices (`operations`, `generators`) and short, full and Schoenflies
  symbols (`symbol`), each in the ITC convention (default) or the Birss convention; with the types
  `Convention`, `PointGroup`, `PointGroupInSetting`, `PointGroupKey`, `PointGroupType`, `Setting`,
  `SettingOptions`, `SymbolOptions`, `Operation`, `Mat3`, `Vec3`.
- Order of the operations and generators (crystallography-common#99): in the ITC convention ITA's
  order, identity first and then as ITA Table 3.2.3.2 numbers the general position, and ITA's
  selected generators in printed order without the identity (ITA 5th ed. Part 7; empty for `1`); in
  the Birss convention birss-app's order, in which the identity need not come first, and birss-app's
  generators (for `1` the identity).
- Properties that follow from the operations: `isCentrosymmetric`, `isPolar`, `isChiral`,
  `laueClass`.
- `crystalFamily` (crystal system → family) and `latticeBasis` (conventional basis a, b, c as
  columns, unit edge lengths, for the families with fixed cell angles; hexagonal: x ∥ a, z ∥ c),
  with the types `CrystalFamily`, `CrystalSystem`, `FixedAngleFamily`.
- Symmetry directions and elements (#16): `LATTICE_SYMMETRY_DIRECTIONS` (ITA Table 2.1.3.1;
  monoclinic: the axes a, b, c of the full symbol; with the type `Uvw`), `symmetryDirections` (per
  position of the full symbol, the elements along each direction; in the Birss convention the
  hexagonal positions 2 and 3 read along y and x) and `describeOperations` (per operation kind,
  `order` (the n of n or n̄), axis as [uvw] and Cartesian, sense and time reversal, as in the
  symmetry operations printed in ITA; in the Birss convention axes signed as birss-app signs them),
  with the types `Axis`, `DirectionElements`, `OperationDescription`, `OperationKind`,
  `SymmetryDirection`.
- `docs/conventions.md`: frames, settings, symbols, order of the operations and generators, and the
  differences between ITC and Birss.

## [0.1.1] - 2026-11-08

### Changed

- npm: 0.1.0 was published by hand; from this version on, each release is staged on npm by the
  release workflow (trusted publishing) and goes live after approval by the maintainer.

## [0.1.0] - 2026-11-08

### Added

- Project scaffold: TypeScript build to `dist/` (ES modules with type declarations), tests, lint,
  format check, CI and release workflow. The only export so far is `VERSION`.

[Unreleased]: https://github.com/manganite/symcrys/compare/v0.14.0...HEAD
[0.14.0]: https://github.com/manganite/symcrys/compare/v0.13.0...v0.14.0
[0.13.0]: https://github.com/manganite/symcrys/compare/v0.12.0...v0.13.0
[0.12.0]: https://github.com/manganite/symcrys/compare/v0.11.0...v0.12.0
[0.11.0]: https://github.com/manganite/symcrys/compare/v0.10.1...v0.11.0
[0.10.1]: https://github.com/manganite/symcrys/compare/v0.10.0...v0.10.1
[0.10.0]: https://github.com/manganite/symcrys/compare/v0.9.0...v0.10.0
[0.9.0]: https://github.com/manganite/symcrys/compare/v0.8.1...v0.9.0
[0.8.1]: https://github.com/manganite/symcrys/compare/v0.8.0...v0.8.1
[0.8.0]: https://github.com/manganite/symcrys/compare/v0.7.0...v0.8.0
[0.7.0]: https://github.com/manganite/symcrys/compare/v0.6.1...v0.7.0
[0.6.1]: https://github.com/manganite/symcrys/compare/v0.6.0...v0.6.1
[0.6.0]: https://github.com/manganite/symcrys/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/manganite/symcrys/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/manganite/symcrys/compare/v0.3.1...v0.4.0
[0.3.1]: https://github.com/manganite/symcrys/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/manganite/symcrys/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/manganite/symcrys/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/manganite/symcrys/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/manganite/symcrys/releases/tag/v0.1.0
