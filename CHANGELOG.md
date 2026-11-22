# Changelog

All notable changes to symcrys are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html) as described in `CLAUDE.md`.

## [Unreleased]

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

[Unreleased]: https://github.com/manganite/symcrys/compare/v0.8.1...HEAD
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
