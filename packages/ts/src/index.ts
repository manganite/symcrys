/**
 * Public API of symcrys: the crystallographic API, for the 32 crystal classes and without time
 * reversal. The magnetic point groups, time-odd tensors and operations with time reversal are in
 * the magnetic API, `symcrys/magnetic` (`magnetic.ts`), under the same function names
 * (docs/conventions.md, "Two entry points"). Everything exported here and there is covered by
 * SemVer (see CLAUDE.md); everything else is internal.
 */
export { VERSION } from './version.js';
export { EPSILON, type ToleranceOptions } from './tolerances.js';

export type { Mat3, Vec3 } from './linalg.js';
export {
  crystalFamily,
  latticeBasis,
  type CrystalFamily,
  type CrystalSystem,
  type FixedAngleFamily,
  type LatticeSystem,
} from './lattice.js';
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

export type { PointGroupKey, Setting, AxesOptions, SettingOptions, SymbolOptions } from './pointGroups/pointGroups.js';
export { LATTICE_SYMMETRY_DIRECTIONS, type Uvw } from './symmetryDirections.js';
export type { Axis, DirectionElements, OperationKind, SymmetryDirection } from './pointGroups/elements.js';
export type { SiteSymmetry } from './siteSymmetry.js';
export type { Hkl, WyckoffPosition } from './pointGroups/wyckoff.js';
export type { CrystalForm, CrystalFormType, CrystalFormTypeKey } from './pointGroups/crystalForms.js';
export type {
  DirectionIndices,
  DirectionOrbitEntry,
  FaceIndices,
  FaceOrbitEntry,
  OrbitPole,
} from './pointGroups/orbits.js';
export type { CartesianAxis } from './pointGroups/identify.js';
export type { IntrinsicSymmetry, TensorForm, TensorKind, TensorRank } from './tensors/tensorForm.js';

export {
  CRYSTAL_FORM_TYPES,
  POINT_GROUP_KEYS,
  TENSOR_PROPERTIES,
  allowedProperties,
  allowedPropertiesOf,
  allowsProperty,
  allowsPropertyOf,
  crystalForms,
  describeOperations,
  describeOperationsOf,
  findPointGroup,
  generators,
  holohedry,
  isCentrosymmetricOf,
  isEnantiomorphicOf,
  isPointGroupKey,
  latticeSystems,
  residualOperations,
  operations,
  orbit,
  orbitOf,
  pointGroup,
  pointGroupOf,
  pointGroups,
  rotateTensor,
  toVoigt,
  fromVoigt,
  settings,
  siteSymmetry,
  siteSymmetryOf,
  symbol,
  symmetryDirections,
  tensorForm,
  tensorFormOf,
  wyckoffPosition,
  wyckoffPositions,
  type CartesianOperation,
  type CartesianOperationDescription,
  type CellOperation,
  type IdentifiedPointGroup,
  type Operation,
  type OperationDescription,
  type PointGroup,
  type PointGroupInSetting,
  type TensorProperty,
  type TensorPropertyName,
  type TensorSpec,
} from './crystalClasses.js';
export type { VoigtFactor, VoigtOptions } from './tensors/voigt.js';
