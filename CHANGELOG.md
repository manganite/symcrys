# Changelog

All notable changes to symcrys are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html) as described in `CLAUDE.md`.

## [Unreleased]

### Added

- The 32 crystallographic point groups (crystal classes): `pointGroups`, `pointGroup`,
  `POINT_GROUP_KEYS`, `isPointGroupKey`, `findPointGroup`; their settings (`settings`), operations
  and generators as Cartesian matrices (`operations`, `generators`), and short, full and
  Schoenflies symbols (`symbol`), each in the ITC convention (default) or the Birss convention;
  with the types `Convention`, `PointGroup`, `PointGroupKey`, `Setting`, `Operation`, `Mat3`,
  `Vec3` and others.
- Properties that follow from the operations: `isCentrosymmetric`, `isPolar`, `isChiral`,
  `laueClass`.
- `latticeBasis` and `crystalFamily`: the conventional lattice basis in the Cartesian frame
  (hexagonal family: x ∥ a, z ∥ c).
- `docs/conventions.md`: frames, settings, symbols and the differences between ITC and Birss.
- Symmetry directions and elements: `LATTICE_SYMMETRY_DIRECTIONS` (ITA Table 2.1.3.1; monoclinic: the axes a, b,
  c of the full symbol; with the type `Uvw`), `symmetryDirections` (per position of the full symbol, the elements along each direction)
  and `describeOperations` (kind, n, axis as [uvw] and Cartesian, sense of each operation, as in the
  symmetry operations printed in ITA), with the types `Axis`, `DirectionElements`,
  `OperationDescription`, `OperationKind`, `SymmetryDirection` (#16).

### Changed

- `operations` lists the operations in ITA's order (the numbering of the general position in ITA
  Table 3.2.3.2), built from ITA's selected generators, in both conventions; before, they came in the
  order of the closure (crystallography-common#99).
- `generators` returns ITA's selected generators of the setting in printed order (ITA 5th ed.,
  "Generators selected"), in both conventions; before, it returned the generators stored in Birss's
  frame, which are neither ITA's nor Birss's printed ones.

## [0.1.1] - 2026-11-08

### Changed

- npm: 0.1.0 was published by hand; from this version on, each release is staged on npm by the
  release workflow (trusted publishing) and goes live after approval by the maintainer.

## [0.1.0] - 2026-11-08

### Added

- Project scaffold: TypeScript build to `dist/` (ES modules with type declarations), tests, lint,
  format check, CI and release workflow. The only export so far is `VERSION`.

[Unreleased]: https://github.com/manganite/symcrys/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/manganite/symcrys/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/manganite/symcrys/releases/tag/v0.1.0
