# Changelog

All notable changes to symcrys are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html) as described in `CLAUDE.md`.

## [Unreleased]

### Added

- Site symmetry and Wyckoff positions for directions (face normals), #24 item 1: `siteSymmetry`
  (the operations of any list that fix a direction, with the direction set onto their fixed space,
  the multiplicity and an optional `tolerance`), `wyckoffPositions` (per point group and ITC setting
  ITA's letter, multiplicity, oriented site-symmetry symbol, printed representative point and face,
  a numeric face (hkl) with its Cartesian normal, and the indices of its site symmetry in
  `operations`) and `wyckoffPositionOf` (the Wyckoff position of any direction, by conjugate site
  symmetry); with the types `SiteSymmetry`, `SiteSymmetryOptions`, `WyckoffPosition`,
  `WyckoffOptions`, `Hkl`. Wyckoff positions exist in the ITC convention only; the point at the
  origin (letter o) is not a direction and is left out.
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

[Unreleased]: https://github.com/manganite/symcrys/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/manganite/symcrys/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/manganite/symcrys/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/manganite/symcrys/releases/tag/v0.1.0
