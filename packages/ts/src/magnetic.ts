/**
 * The magnetic API of symcrys (`symcrys/magnetic`): the 122 magnetic point groups, with time
 * reversal. Everything exported here is covered by SemVer (see GUIDE.md), like the exports of
 * `index.ts`.
 *
 * The functions have the names they have in the crystallographic API (`index.ts`); the import
 * decides which reading a key has. Here a key of type `'I'` (`'32'`) is a white (colourless)
 * group: the symmetry of a magnetically ordered crystal in which time reversal does not occur at
 * all. A crystal without magnetic order has the grey group of its class (quartz: `"321'"`), which
 * allows no time-odd property (docs/conventions.md, "Two entry points").
 */
export { VERSION } from './version.js';
export { EPSILON, type ToleranceOptions } from './tolerances.js';

export type { Mat3, Vec3 } from './linalg.js';
export type { CartesianOperation, Operation } from './operations.js';
export { crystalFamily, type CrystalFamily, type CrystalSystem, type LatticeSystem } from './lattice.js';
export {
  angleBetweenDirections,
  angleBetweenPlanes,
  faceNormal,
  isValidCell,
  latticeFromParameters,
  latticeParameters,
  metricTensor,
  reciprocalBasis,
  type CellAngles,
  type CellOperation,
  type IsValidCellOptions,
  type LatticeParameters,
} from './cell.js';
export {
  directionFromFourIndices,
  directionToFourIndices,
  planeFromFourIndices,
  planeToFourIndices,
  millerIndices,
  reduceIndices,
  zoneAxis,
  type FourIndices,
  type MillerValues,
} from './indices.js';
export {
  changeOfCoordinates,
  type AffineOperation,
  type CoordinateChange,
  type CoordinateQuantities,
  type CoordinateTransformation,
  type InverseTransformation,
  type TransformedOperation,
} from './coordinates.js';
export { cellTransformation, type BravaisLattice, type Cell, type OrthorhombicSetting } from './cellTransformation.js';

import type {
  PointGroupKey as ClassKey,
  MagneticPointGroupKey,
  PointGroup as PointGroupOf,
  PointGroupInSetting as PointGroupInSettingOf,
} from './pointGroups/pointGroups.js';

/**
 * The key of a crystal class, one of the 32: the type of `crystalClass` and `laueClass` of a point
 * group and of `holohedry()`. In the crystallographic API this is `PointGroupKey`.
 */
export type CrystalClassKey = ClassKey;
/** The key of a magnetic point group: a crystal class (white group), a grey or a black-and-white group. */
export type PointGroupKey = MagneticPointGroupKey;
/** A magnetic point group with the properties that are fixed by its operations (docs/conventions.md, "Properties"). */
export type PointGroup<K extends PointGroupKey = PointGroupKey> = PointGroupOf<K>;
/** A point group in a given setting. */
export type PointGroupInSetting = PointGroupInSettingOf<PointGroupKey>;

export {
  MAGNETIC_POINT_GROUP_KEYS as POINT_GROUP_KEYS,
  findMagneticPointGroup as findPointGroup,
  generators,
  isMagneticPointGroupKey as isPointGroupKey,
  latticeSystems,
  magneticPointGroups as pointGroups,
  operations,
  pointGroup,
  settings,
  symbol,
  type PointGroupType,
  type Setting,
  type AxesOptions,
  type SettingOptions,
  type SymbolOptions,
} from './pointGroups/pointGroups.js';
export { holohedry, isCentrosymmetricOf, isEnantiomorphicOf } from './pointGroups/properties.js';
export { LATTICE_SYMMETRY_DIRECTIONS, type Uvw } from './symmetryDirections.js';
export {
  describeOperations,
  symmetryDirections,
  type Axis,
  type DirectionElements,
  type OperationDescription,
  type OperationKind,
  type SymmetryDirection,
} from './pointGroups/elements.js';
export { residualMagneticOperations as residualOperations, type MagneticCellOperation } from './cell.js';
export { siteSymmetryOf, type SiteSymmetry } from './siteSymmetry.js';
export { siteSymmetry, type Hkl } from './pointGroups/wyckoff.js';
export {
  describeOperationsOf,
  pointGroupOf,
  type CartesianAxis,
  type CartesianOperationDescription,
  type IdentifiedPointGroup,
} from './pointGroups/identify.js';
export { orbit, orbitOf, type DirectionOrbitEntry, type FaceOrbitEntry, type OrbitPole } from './pointGroups/orbits.js';
export {
  latticeBasis,
  type CartesianDirection,
  type DirectionIndices,
  type DirectionInput,
  type FaceIndices,
} from './pointGroups/directions.js';
export {
  rotateTensor,
  tensorForm,
  tensorFormOf,
  type IntrinsicSymmetry,
  type TensorForm,
  type TensorKind,
  type TensorRank,
  type TensorSpec,
  type TimeParity,
} from './tensors/tensorForm.js';
export { TENSOR_PROPERTIES, type TensorProperty, type TensorPropertyName } from './tensors/propertyTable.js';
export { fromVoigt, toVoigt, type VoigtFactor, type VoigtOptions } from './tensors/voigt.js';
export {
  allowedProperties,
  allowedPropertiesOf,
  allowsProperty,
  allowsPropertyOf,
} from './tensors/tensorProperties.js';
