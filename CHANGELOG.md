# Changelog

All notable changes to symcrys are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html) as described in `CLAUDE.md`.

## [Unreleased]

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
  `'piezoelectric'` and `'gyrotropic'`; the magnetic API has in addition `'ferromagnetic'`,
  `'magnetoelectric'` and `'piezomagnetic'`. Types `TensorProperty`, `TensorPropertyName`.
- `2'm'm` has six settings, one for every orientation of its axes: 1 to 3 as in birss-app, and 4
  `m'2'm`, 5 `mm'2'`, 6 `2'mm'`, which ITC Vol. D and Paufler print. Two settings share each
  `uniqueAxis` (the normal of the mirror plane without time reversal), so for this group the symbol
  or the index identifies a setting, not the axis.
- Python: the module `symcrys.magnetic`; `TENSOR_PROPERTIES`, `allows_property`,
  `allowed_properties`, `allows_property_of`, `allowed_properties_of`, and names in `tensor_form`,
  `tensor_form_of` and `rotate_tensor`, in both modules.

### Changed

- The crystallographic API (`symcrys`) no longer mentions time reversal (#47); what 0.5.0 had of
  it is now in the magnetic API:
  - An operation is `{ matrix }`: `Operation` and `OperationDescription` have no `timeReversal`
    (Python: no `time_reversal`). A list of operations passed in may still carry
    `timeReversal: false`; `true` is a `RangeError`.
  - `TensorSpec` has no `timeParity` (Python: no `time_parity`). `timeParity: 'i'` is still
    accepted; `'c'` is a `RangeError` (in 0.5.0 it gave the form of the time-even tensor).
  - `PointGroup` has no `type` (it was `'I'` for every class). The types `PointGroupType` and
    `TimeParity` are exported by the magnetic API only.
  - A key of a magnetic point group, the name of a time-odd property, a time-odd tensor and an
    operation with time reversal are a `RangeError` (Python: `SymcrysError`) that names the
    magnetic API.

### Removed

- `isPiezoelectric` (Python: `is_piezoelectric`): use `allowsProperty(key, 'piezoelectric')`
  (`allows_property(key, "piezoelectric")`), which gives the same for the 32 crystal classes (#41).

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

[Unreleased]: https://github.com/manganite/symcrys/compare/v0.5.0...HEAD
[0.5.0]: https://github.com/manganite/symcrys/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/manganite/symcrys/compare/v0.3.1...v0.4.0
[0.3.1]: https://github.com/manganite/symcrys/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/manganite/symcrys/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/manganite/symcrys/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/manganite/symcrys/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/manganite/symcrys/releases/tag/v0.1.0
