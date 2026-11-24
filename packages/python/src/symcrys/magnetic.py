"""symcrys.magnetic: the magnetic API, for the 122 magnetic point groups, with time reversal.

The functions have the names they have in ``symcrys``, the crystallographic API; the module decides
which reading a key has. Here a key of type ``'I'`` (``"32"``) is a white (colourless) group: the
symmetry of a magnetically ordered crystal in which time reversal does not occur at all. A crystal
without magnetic order has the grey group of its class (quartz: ``"321'"``), which allows no
time-odd property. Operations carry ``time_reversal``, a tensor specification ``time_parity``
(docs/conventions.md, "Two entry points").
"""

from __future__ import annotations

from typing import Any, Literal, Mapping, Optional, Sequence, TypedDict, Union

import numpy as np
from numpy.typing import ArrayLike, NDArray

from . import _shared
from ._convert import from_js
from ._engine import SymcrysError, SymcrysInternalError
from ._shared import MAGNETIC, IntrinsicSymmetry, SiteSymmetry, TensorForm, TensorKind

TimeParity = Literal["even", "odd"]
TensorPropertyName = Literal[
    "pyroelectric", "ferroaxial", "piezoelectric", "gyrotropic", "ferromagnetic", "magnetoelectric", "piezomagnetic"
]


class TensorSpec(TypedDict):
    """The kind of tensor (keys also accepted in camelCase, e.g. ``timeParity``)."""

    rank: int
    kind: TensorKind
    time_parity: TimeParity
    intrinsic: IntrinsicSymmetry


class Operation(TypedDict):
    matrix: NDArray[np.float64]
    cartesian: NDArray[np.float64]
    time_reversal: bool


__all__ = [
    "LATTICE_SYMMETRY_DIRECTIONS",
    "POINT_GROUP_KEYS",
    "TENSOR_PROPERTIES",
    "EPSILON",
    "VERSION",
    "SymcrysError",
    "SymcrysInternalError",
    "TensorForm",
    "TensorSpec",
    "allowed_properties",
    "allowed_properties_of",
    "allows_property",
    "allows_property_of",
    "crystal_family",
    "describe_operations",
    "describe_operations_of",
    "find_point_group",
    "generators",
    "holohedry",
    "is_centrosymmetric_of",
    "is_enantiomorphic_of",
    "is_point_group_key",
    "lattice_basis",
    "lattice_from_parameters",
    "lattice_parameters",
    "is_valid_cell",
    "metric_tensor",
    "reciprocal_basis",
    "angle_between_directions",
    "angle_between_planes",
    "residual_operations",
    "reduce_indices",
    "plane_to_four_indices",
    "plane_from_four_indices",
    "direction_to_four_indices",
    "direction_from_four_indices",
    "zone_axis",
    "change_of_axes",
    "operations",
    "orbit",
    "orbit_of",
    "point_group",
    "point_group_of",
    "point_groups",
    "rotate_tensor",
    "settings",
    "site_symmetry",
    "site_symmetry_of",
    "symbol",
    "symmetry_directions",
    "tensor_form",
    "tensor_form_of",
]

VERSION: str = _shared.value(MAGNETIC + "VERSION")
"""The version of symcrys, the same for the TypeScript and the Python package."""
EPSILON: float = float(_shared.value(MAGNETIC + "EPSILON"))
"""The default tolerance of every function that compares numbers a caller passes in (operations,
directions, points): two numbers closer than this count as equal, in the metric of their kind
(docs/conventions.md, "Tolerances").
"""
POINT_GROUP_KEYS: tuple[str, ...] = tuple(_shared.value(MAGNETIC + "POINT_GROUP_KEYS"))
"""Keys of the 122 magnetic point groups: the 32 crystal classes (white groups), the 32 grey groups
and the 58 black-and-white groups, in this order (docs/conventions.md, "Keys").
"""
LATTICE_SYMMETRY_DIRECTIONS: dict[str, list[NDArray[np.int64]]] = _shared.lattice_symmetry_directions(
    MAGNETIC + "LATTICE_SYMMETRY_DIRECTIONS"
)
"""The directions of each position of the full symbol, per family, as printed in ITA Table 2.1.3.1
(hexagonal family: the row "Hexagonal", which also serves the trigonal classes with hexagonal axes).
Monoclinic: the full symbol reads along a, b, c (ITA 6th ed. § 2.1.3.15, p. 171), the orthorhombic
row. Triclinic: no symmetry direction.

In Python: family → one int64 array of shape (n, 3) per position, the n directions [uvw] as rows.
"""
TENSOR_PROPERTIES: dict[str, dict[str, Any]] = from_js(_shared.value(MAGNETIC + "TENSOR_PROPERTIES"))
"""The named tensor properties. For each name, the tensor that describes the property, what it is,
and its print source. ``'gyrotropic'`` is optical activity.
"""


def _call(name: str, *args: Any, floats: bool = False) -> Any:
    return _shared.call(MAGNETIC + name, *args, floats=floats)


# --- point groups -------------------------------------------------------------------------------


def point_groups() -> list[dict[str, Any]]:
    """All 122 magnetic point groups, in the order of ``POINT_GROUP_KEYS`` of the magnetic API: the
    32 crystal classes (type I), the 32 grey groups (type II) in the same order, and the 58
    black-and-white groups (type III) in the order of ITC Vol. D Table 1.5.2.3.
    """
    return list(_call("pointGroups"))


def point_group(key: str) -> dict[str, Any]:
    """The point group with this key: a crystal class or a magnetic point group. Raises SymcrysError
    for an unknown key.
    """
    return dict(_call("pointGroup", key))


def is_point_group_key(key: str) -> bool:
    """True if ``key`` is the key of one of the 122 magnetic point groups (the 32 crystal classes
    included).
    """
    return bool(_call("isPointGroupKey", key))


def find_point_group(
    symbol: str,
    *,
    axes: Optional[Literal["hexagonal", "rhombohedral"]] = None,
    unique_axis: Optional[Literal["a", "b", "c"]] = None,
) -> Optional[dict[str, Any]]:
    """Finds one of the 122 magnetic point groups (the 32 crystal classes included) by a symbol,
    read tolerantly. A prime marks time reversal: ``4'/mmm'``, ``2221'``. It reads, spaces ignored
    (#96; docs/conventions.md, "Reading symbols"): the key; the short or full symbol of a setting
    (``312``, ``1 1 2``); a Schoenflies symbol, ITA's or ITC Vol. D's (``D3``, ``C3i``, ``S6``);
    Birss's cubic symbols without the overbar on the 3 (``m3m``). A symbol that names several
    settings (the key ``32``, which is also the symbol of the setting with rhombohedral axes; ``2``
    for unique axis b, c and a; any Schoenflies symbol) gives the standard (ITC default) setting,
    unless the options ``axes`` or ``unique_axis`` choose another, as the headlines of ITA name the
    settings (the option ``axes`` set to ``'rhombohedral'`` for the key ``32``).

    Spellings: the overbar as ``-``, ``−``, a combining overbar or ``¯`` after the digit (``m3̄m``),
    ``bar3`` (also with a backslash and braces, as in LaTeX); the prime as ``'``, ``′``, ``ʹ`` or
    ``’``; Schoenflies subscripts also as Unicode or LaTeX subscripts (``D₃d(S₆)``, ``D_{3d}``).
    Returns None if nothing matches, also for a value that is not a string; a symbol that names
    several groups raises SymcrysError that lists them.

    Parameters
    ----------
    axes : keyword-only, optional
        The axes, as ITA's headlines name them: ``'rhombohedral'`` chooses the setting with
        rhombohedral axes of a trigonal group, ``'hexagonal'`` one with hexagonal axes, which every
        group of the hexagonal family has. A SymcrysError for another family.
    unique_axis : keyword-only, optional
        The unique axis of a monoclinic group, as ITA's headlines name it (``'b'``, the standard,
        ``'c'``, ``'a'``). A SymcrysError for another system.
    """
    result = _call("findPointGroup", symbol, _shared.options(axes=axes, unique_axis=unique_axis))
    return None if result is None else dict(result)


def settings(key: str) -> list[dict[str, Any]]:
    """The settings of a point group, with their symbols and the ITC default."""
    args = [key]
    return list(_call("settings", *args))


def operations(
    key: str,
    *,
    setting: Optional[Union[int, str]] = None,
    axes: Optional[Literal["hexagonal", "rhombohedral"]] = None,
    unique_axis: Optional[Literal["a", "b", "c"]] = None,
) -> list[Operation]:
    """All operations of the point group in the requested setting (default: the ITC default
    setting), in ITA's order: identity first, then as ITA numbers the general position of the
    crystal class; an operation of a magnetic group has the number it has in the class, and a grey
    group lists the class first, then the same sequence with time reversal (docs/conventions.md,
    "Order of the operations"). Each operation is ITA's matrix W in the lattice basis of the setting
    (``matrix``) with the same operation as a Cartesian matrix (``cartesian``) and its time reversal
    (docs/conventions.md, "Operations").

    Parameters
    ----------
    axes : keyword-only, optional
        The axes, as ITA's headlines name them: ``'rhombohedral'`` chooses the setting with
        rhombohedral axes of a trigonal group, ``'hexagonal'`` one with hexagonal axes, which every
        group of the hexagonal family has. A SymcrysError for another family.
    unique_axis : keyword-only, optional
        The unique axis of a monoclinic group, as ITA's headlines name it (``'b'``, the standard,
        ``'c'``, ``'a'``). A SymcrysError for another system.
    setting : keyword-only, optional
        The setting: its 1-based index, or a symbol, read as ``find_point_group`` reads it (spaces
        ignored: ``'312'``, ``'3 1 2'``, ``'1 1 2'``). A symbol that several settings share (the key
        ``'32'``, ``'2'`` for unique axis b, c and a) gives the standard (ITC default) setting,
        unless ``axes`` or ``unique_axis`` chooses another. Default: the ITC default setting.

    Returns
    -------
    list of dict
        Dicts ``{"matrix", "cartesian", "time_reversal"}``; ``matrix`` is a float64 array of shape
        (3, 3) holding integers (the fixed rule for matrices), ``cartesian`` a float64 array of
        shape (3, 3).
    """
    return list(_call("operations", key, _shared.options(setting=setting, axes=axes, unique_axis=unique_axis)))


def generators(
    key: str,
    *,
    setting: Optional[Union[int, str]] = None,
    axes: Optional[Literal["hexagonal", "rhombohedral"]] = None,
    unique_axis: Optional[Literal["a", "b", "c"]] = None,
) -> list[Operation]:
    """Generators of the point group in the requested setting (docs/conventions.md, "Generators"):
    ITA's selected generators in printed order, without the identity and ITA's lattice translations,
    so the list is empty for ``1``; for the settings ITA does not print (``mm2`` settings 2 and 3,
    monoclinic unique axis a), those of setting 1 carried into their frame; for a magnetic group,
    those of its class with the time reversal they have in the group, for a grey group followed by
    ``1'``.

    Parameters
    ----------
    axes : keyword-only, optional
        The axes, as ITA's headlines name them: ``'rhombohedral'`` chooses the setting with
        rhombohedral axes of a trigonal group, ``'hexagonal'`` one with hexagonal axes, which every
        group of the hexagonal family has. A SymcrysError for another family.
    unique_axis : keyword-only, optional
        The unique axis of a monoclinic group, as ITA's headlines name it (``'b'``, the standard,
        ``'c'``, ``'a'``). A SymcrysError for another system.
    setting : keyword-only, optional
        The setting: its 1-based index, or a symbol, read as ``find_point_group`` reads it (spaces
        ignored: ``'312'``, ``'3 1 2'``, ``'1 1 2'``). A symbol that several settings share (the key
        ``'32'``, ``'2'`` for unique axis b, c and a) gives the standard (ITC default) setting,
        unless ``axes`` or ``unique_axis`` chooses another. Default: the ITC default setting.

    Returns
    -------
    list of dict
        Dicts ``{"matrix", "cartesian", "time_reversal"}``; ``matrix`` is a float64 array of shape
        (3, 3) holding integers (the fixed rule for matrices), ``cartesian`` a float64 array of
        shape (3, 3).
    """
    return list(_call("generators", key, _shared.options(setting=setting, axes=axes, unique_axis=unique_axis)))


def symbol(
    key: str,
    *,
    setting: Optional[Union[int, str]] = None,
    axes: Optional[Literal["hexagonal", "rhombohedral"]] = None,
    unique_axis: Optional[Literal["a", "b", "c"]] = None,
    form: Optional[Literal["short", "full", "schoenflies"]] = None,
) -> str:
    """A symbol of the point group in the requested setting. The default setting of a grey or
    black-and-white group has its key as short symbol (``32'``, as ITC Vol. D Table 1.5.2.3 prints
    it; ``321'``), a crystal class ITA's symbol (``321``), and the Schoenflies symbols follow ITC
    Vol. D (``S6``, ``D3d(S6)``; docs/conventions.md, "Symbols").

    Parameters
    ----------
    axes : keyword-only, optional
        The axes, as ITA's headlines name them: ``'rhombohedral'`` chooses the setting with
        rhombohedral axes of a trigonal group, ``'hexagonal'`` one with hexagonal axes, which every
        group of the hexagonal family has. A SymcrysError for another family.
    unique_axis : keyword-only, optional
        The unique axis of a monoclinic group, as ITA's headlines name it (``'b'``, the standard,
        ``'c'``, ``'a'``). A SymcrysError for another system.
    setting : keyword-only, optional
        The setting: its 1-based index, or a symbol, read as ``find_point_group`` reads it (spaces
        ignored: ``'312'``, ``'3 1 2'``, ``'1 1 2'``). A symbol that several settings share (the key
        ``'32'``, ``'2'`` for unique axis b, c and a) gives the standard (ITC default) setting,
        unless ``axes`` or ``unique_axis`` chooses another. Default: the ITC default setting.
    form : keyword-only, optional
        ``'short'`` (default): short symbol of the setting, e.g. ``321`` for class ``32`` (ITA Table
        3.2.3.2); in the magnetic API the default setting of a grey or black-and-white group has its
        key as short symbol (``32'`` as ITC Vol. D Table 1.5.2.3 prints it; ``321'``, the class key
        and ``1'``). ``'full'``: full symbol, positions separated by spaces, e.g. ``-3 2/m 1``.
        ``'schoenflies'``: Schoenflies symbol, subscripts written inline (``C3v``, ``D2d``, ``Oh``);
        ``C3i`` for the class -3 in the crystallographic API (ITA), ``S6`` in the magnetic API (ITC
        Vol. D: ``S6(C3)``, ``D3d(S6)``).
    """
    return str(_call("symbol", key, _shared.options(setting=setting, axes=axes, unique_axis=unique_axis, form=form)))


def crystal_family(system: str) -> str:
    """The crystal family of a crystal system: trigonal and hexagonal form the hexagonal family.
    Throws a SymcrysError for anything that is not one of the seven crystal systems.
    """
    return str(_call("crystalFamily", system))


def holohedry(system: str) -> str:
    """The holohedry of a crystal system: the crystal class that is the point symmetry of a lattice
    of the system (ITA Table 2.1.1.1, the Laue groups in full boxes). For the trigonal system it is
    ``-3m``, the symmetry of the rhombohedral lattice. The trigonal classes also occur with the
    hexagonal lattice, whose symmetry is ``6/mmm``: the holohedry of the crystal family is
    ``holohedry(crystal_family(system))``, which is what the lattice basis of this library
    (``lattice_basis``, hexagonal axes for both systems) has.
    """
    return str(_call("holohedry", system))


def lattice_basis(family: str) -> NDArray[np.float64]:
    """The conventional basis vectors a, b, c as the **columns** of a Cartesian matrix, with unit
    edge lengths. Hexagonal family (hexagonal axes): x ∥ a, z ∥ c, y = z × x, so b points at 120°
    from a. Orthorhombic, tetragonal, cubic: x ∥ a, y ∥ b, z ∥ c.

    The edge lengths are set to 1 because the symmetry directions of these families, and so the
    point operations, do not depend on them. For a direction [uvw] that is not a symmetry direction,
    scale the columns by the real edge lengths first.

    Returns
    -------
    numpy.ndarray
        A float64 array of shape (3, 3), a new array on each call; a, b, c are its columns.
    """
    return np.asarray(_call("latticeBasis", family, floats=True), dtype=np.float64)


# --- cell, metric, indices ----------------------------------------------------------------------


def lattice_from_parameters(parameters: Mapping[str, float]) -> NDArray[np.float64]:
    """The Cartesian basis of a cell as the columns of a 3×3 matrix, in the frame of this library
    for a general cell: a along x, b in the xy plane (y > 0 for γ < 180°), c towards +z. It is the
    frame of ``lattice_basis`` where that exists (hexagonal axes: x ∥ a, z ∥ c), so a cell with the
    angles of a family has that family's basis scaled by the edge lengths. For the monoclinic family
    with unique axis b, b lies along y (docs/conventions.md, "Cell, metric and indices"). The basis
    is right-handed. Raises SymcrysError for an edge that is not positive and for angles that give
    no cell.
    """
    return np.asarray(_call("latticeFromParameters", _shared.mapping(parameters, "parameters"), floats=True), dtype=np.float64)


def lattice_parameters(basis: ArrayLike) -> dict[str, float]:
    """The lattice parameters of a basis given as the columns of a Cartesian matrix: the edge
    lengths and the angles in degrees. Independent of the orientation of the basis in the Cartesian
    frame (and of its handedness). Raises SymcrysError for a singular matrix.
    """
    result: dict[str, Any] = _call("latticeParameters", _shared.array(basis, "basis", np.float64))
    return {k: float(v) for k, v in result.items()}


def is_valid_cell(angles: Mapping[str, float], *, min_volume_ratio: Optional[float] = None) -> bool:
    """Whether three angles (degrees) belong to a cell: each between 0° and 180°, and the three axes
    not in one plane (the volume radicand 1 − cos²α − cos²β − cos²γ + 2 cos α cos β cos γ exceeds
    10⁻¹², i.e. V/(abc) > 10⁻⁶: a cell that is flat within rounding is refused). With
    ``min_volume_ratio`` (from 0 to 1, default 0) also refuses nearly flat cells, whose ratio
    V/(abc), the square root of the radicand, is smaller. Raises SymcrysError for a
    ``min_volume_ratio`` that is not a number from 0 to 1.

    Parameters
    ----------
    min_volume_ratio : keyword-only, optional
        The smallest accepted ratio V/(abc) of the cell volume to the volume of the box of its edge
        lengths, from 0 to 1 (1 only for orthogonal axes); default 0, which accepts every cell that
        ``is_valid_cell`` otherwise accepts. A ratio near 0 is a nearly flat cell.
    """
    return bool(_call("isValidCell", _shared.mapping(angles, "angles"), _shared.options(min_volume_ratio=min_volume_ratio)))


def metric_tensor(basis: ArrayLike) -> NDArray[np.float64]:
    """The metric tensor G = AᵀA of a basis A (columns a, b, c): g_ij = a_i · a_j, in the unit of
    the edge lengths squared.
    """
    return np.asarray(_call("metricTensor", _shared.array(basis, "basis", np.float64), floats=True), dtype=np.float64)


def reciprocal_basis(basis: ArrayLike) -> NDArray[np.float64]:
    """The reciprocal basis B = A⁻ᵀ of a basis A (columns a, b, c) as the columns a*, b*, c*, with
    a_i · a*_j = δ_ij (no factor 2π), in the inverse unit of the edge lengths.
    """
    return np.asarray(_call("reciprocalBasis", _shared.array(basis, "basis", np.float64), floats=True), dtype=np.float64)


def angle_between_directions(basis: ArrayLike, direction1: ArrayLike, direction2: ArrayLike) -> float:
    """The angle in degrees between two lattice directions [uvw] (coordinates in the basis, columns
    a, b, c), 0° to 180°. Raises SymcrysError for a zero vector.
    """
    return float(_call("angleBetweenDirections", _shared.array(basis, "basis", np.float64), _shared.array(direction1, "direction1"), _shared.array(direction2, "direction2")))


def angle_between_planes(basis: ArrayLike, plane1: ArrayLike, plane2: ArrayLike) -> float:
    """The angle in degrees between the normals of two planes (hkl), 0° to 180°: the angle between
    the reciprocal vectors h·a* + k·b* + l·c*. For two faces this is 180° minus the interior
    dihedral angle. Raises SymcrysError for a zero vector.
    """
    return float(_call("angleBetweenPlanes", _shared.array(basis, "basis", np.float64), _shared.array(plane1, "plane1"), _shared.array(plane2, "plane2")))


def residual_operations(
    operations: Sequence[Mapping[str, Any]], basis: ArrayLike, *, tolerance: Optional[float] = None
) -> list[Operation]:
    """The operations of a list that keep the metric of a cell: W with WᵀGW = G, G the metric tensor
    of ``basis``. The operations are read by ``matrix``, the integer matrix W on lattice
    coordinates, as ``operations`` gives them; the list is taken as it is and the kept operations
    are the ones of the list, in its order. The deviation counts relative to the largest entry of G
    (``tolerance``, default ``EPSILON``). Every operation must say whether it is combined with time
    reversal (``time_reversal``), which is kept; one that does not (an operation of the
    crystallographic API) raises SymcrysError.

    Parameters
    ----------
    tolerance : keyword-only, optional
        Two numbers closer than this count as equal; default ``EPSILON`` (10⁻⁶). It is measured per
        matrix entry for operations, as the distance of unit vectors for directions and per
        coordinate modulo the lattice for points (docs/conventions.md, "Tolerances").
    """
    return list(
        _call(
            "residualOperations",
            _shared.operation_list(operations, ("matrix",)),
            _shared.array(basis, "basis", np.float64),
            _shared.options(tolerance=tolerance),
        )
    )


def reduce_indices(indices: ArrayLike) -> NDArray[np.int64]:
    """The indices divided by their greatest common divisor, signs kept. Raises SymcrysError for
    non-integers and for all zeros.
    """
    return np.asarray(_call("reduceIndices", _shared.array(indices, "indices")), dtype=np.int64)


def plane_to_four_indices(hkl: ArrayLike) -> NDArray[np.int64]:
    """The plane (hkl) of hexagonal axes as (hkil) with i = −(h + k)."""
    return np.asarray(_call("planeToFourIndices", _shared.array(hkl, "hkl")), dtype=np.int64)


def plane_from_four_indices(hkil: ArrayLike) -> NDArray[np.int64]:
    """The plane (hkil) as (hkl); raises SymcrysError unless i = −(h + k)."""
    return np.asarray(_call("planeFromFourIndices", _shared.array(hkil, "hkil")), dtype=np.int64)


def direction_to_four_indices(uvw: ArrayLike) -> NDArray[np.int64]:
    """The direction [uvw] of hexagonal axes as [UVTW], reduced: U = (2u − v)/3, V = (2v − u)/3, T =
    −(U + V), W = w, scaled to the smallest integers.
    """
    return np.asarray(_call("directionToFourIndices", _shared.array(uvw, "uvw")), dtype=np.int64)


def direction_from_four_indices(uvtw: ArrayLike) -> NDArray[np.int64]:
    """The direction [UVTW] as [uvw], reduced: u = U − T, v = V − T, w = W; raises SymcrysError
    unless T = −(U + V).
    """
    return np.asarray(_call("directionFromFourIndices", _shared.array(uvtw, "uvtw")), dtype=np.int64)


def zone_axis(h1: ArrayLike, h2: ArrayLike) -> Optional[NDArray[np.int64]]:
    """The zone axis [uvw] of two planes (hkl), which must not be zero vectors: the solution of the
    zone law hu + kv + lw = 0, the cross product h₁ × h₂ reduced (so its sign follows the order of
    the planes), or ``None`` for parallel planes.
    """
    result = _call("zoneAxis", _shared.array(h1, "h1"), _shared.array(h2, "h2"))
    return None if result is None else np.asarray(result, dtype=np.int64)


def change_of_axes(p: ArrayLike) -> dict[str, NDArray[np.float64]]:
    """The transformation of indices for a change of basis (a′, b′, c′) = (a, b, c)·P (ITA Vol. A,
    2006, Section 5.1.3): the columns of ``P`` are the new basis vectors in the old one. The
    coordinates of a direction transform with Q = P⁻¹, the indices of a plane with Pᵀ, so that hu +
    kv + lw is the same in both bases. Raises SymcrysError unless det P > 0 (a right-handed basis),
    and for a P that is singular within rounding (the absolute value of det P at most 10⁻⁹ times the
    product of its column lengths).
    """
    result: dict[str, NDArray[np.float64]] = _call("changeOfAxes", _shared.array(p, "p", np.float64))
    return result


def describe_operations(
    key: str,
    *,
    setting: Optional[Union[int, str]] = None,
    axes: Optional[Literal["hexagonal", "rhombohedral"]] = None,
    unique_axis: Optional[Literal["a", "b", "c"]] = None,
) -> list[dict[str, Any]]:
    """Each operation of the point group described geometrically, in the order of ``operations`` for
    the same key and options. Axes are named by the symmetry direction they lie along, with the sign
    of ITA Table 2.1.3.1; the sign fixes what the sense refers to.

    Parameters
    ----------
    axes : keyword-only, optional
        The axes, as ITA's headlines name them: ``'rhombohedral'`` chooses the setting with
        rhombohedral axes of a trigonal group, ``'hexagonal'`` one with hexagonal axes, which every
        group of the hexagonal family has. A SymcrysError for another family.
    unique_axis : keyword-only, optional
        The unique axis of a monoclinic group, as ITA's headlines name it (``'b'``, the standard,
        ``'c'``, ``'a'``). A SymcrysError for another system.
    setting : keyword-only, optional
        The setting: its 1-based index, or a symbol, read as ``find_point_group`` reads it (spaces
        ignored: ``'312'``, ``'3 1 2'``, ``'1 1 2'``). A symbol that several settings share (the key
        ``'32'``, ``'2'`` for unique axis b, c and a) gives the standard (ITC default) setting,
        unless ``axes`` or ``unique_axis`` chooses another. Default: the ITC default setting.

    Returns
    -------
    list of dict
        In each, ``axis`` (if present) has ``lattice`` (int64, shape (3,)) and ``cartesian``
        (float64, shape (3,)).
    """
    return list(_call("describeOperations", key, _shared.options(setting=setting, axes=axes, unique_axis=unique_axis)))


def point_group_of(
    operations: Sequence[Mapping[str, Any]], *, tolerance: Optional[float] = None
) -> Optional[dict[str, Any]]:
    """The point group generated by a list of Cartesian operations, for instance those left after
    distorting a crystal: its key, and the setting whose operations it equals in the frame of
    symcrys (absent if the group is the point group in another orientation). The list is closed into
    a group first, two matrices being equal when no entry differs by ``tolerance`` (default
    ``EPSILON``) or more. Time reversal counts: a list with time reversal gives a magnetic point
    group. Returns None if the operations generate no point group (an operation of order 5, a group
    larger than 96). Raises SymcrysError for an operation without an orthogonal Cartesian matrix
    (``cartesian``; within ``tolerance``, at least ``EPSILON``) and for an operation that does not
    say whether it is combined with time reversal. The classes ``1`` and ``-1`` have one setting and
    no orientation, so they always have setting 1.

    Parameters
    ----------
    tolerance : keyword-only, optional
        Two numbers closer than this count as equal; default ``EPSILON`` (10⁻⁶). It is measured per
        matrix entry for operations, as the distance of unit vectors for directions and per
        coordinate modulo the lattice for points (docs/conventions.md, "Tolerances").
    """
    result = _call("pointGroupOf", _shared.operation_list(operations), _shared.options(tolerance=tolerance))
    return None if result is None else dict(result)


def describe_operations_of(
    operations: Sequence[Mapping[str, Any]], *, tolerance: Optional[float] = None
) -> list[dict[str, Any]]:
    """Each operation of a list described geometrically, in the order of the list: kind, n, the
    Cartesian axis (rotation or rotoinversion axis, mirror normal) with its first non-zero
    component, in the order x, y, z, positive, and for n ≥ 3 the sense about that axis. The axes are
    not named by lattice directions, since the list need not belong to a setting; for a point group
    given by its key, ``describe_operations`` names them. Raises SymcrysError for an operation
    without an orthogonal Cartesian matrix (``cartesian``) or not a crystallographic operation (a
    rotation part by an angle other than 360°/n, n = 1, 2, 3, 4, 6), both within ``tolerance``
    (default ``EPSILON``, as for ``point_group_of``), and for an operation that does not say whether
    it is combined with time reversal.

    Parameters
    ----------
    tolerance : keyword-only, optional
        Two numbers closer than this count as equal; default ``EPSILON`` (10⁻⁶). It is measured per
        matrix entry for operations, as the distance of unit vectors for directions and per
        coordinate modulo the lattice for points (docs/conventions.md, "Tolerances").

    Returns
    -------
    list of dict
        In each, ``axis`` (if present) has ``cartesian`` (float64, shape (3,)).
    """
    return list(_call("describeOperationsOf", _shared.operation_list(operations), _shared.options(tolerance=tolerance)))


def symmetry_directions(
    key: str,
    *,
    setting: Optional[Union[int, str]] = None,
    axes: Optional[Literal["hexagonal", "rhombohedral"]] = None,
    unique_axis: Optional[Literal["a", "b", "c"]] = None,
) -> list[dict[str, Any]]:
    """The positions of the full Hermann–Mauguin symbol in the requested setting, each with its
    symmetry directions (ITA Table 2.1.3.1) and the symmetry elements along them. All positions of
    the crystal family are listed (for rhombohedral axes the two of that row of the table), also
    those the symbol of the class leaves out (then without ``symbol``); the triclinic family has
    none. A direction carries the same ``lattice`` and ``cartesian`` vectors as the axis of
    ``describe_operations`` along it, so match the two by value.

    Parameters
    ----------
    axes : keyword-only, optional
        The axes, as ITA's headlines name them: ``'rhombohedral'`` chooses the setting with
        rhombohedral axes of a trigonal group, ``'hexagonal'`` one with hexagonal axes, which every
        group of the hexagonal family has. A SymcrysError for another family.
    unique_axis : keyword-only, optional
        The unique axis of a monoclinic group, as ITA's headlines name it (``'b'``, the standard,
        ``'c'``, ``'a'``). A SymcrysError for another system.
    setting : keyword-only, optional
        The setting: its 1-based index, or a symbol, read as ``find_point_group`` reads it (spaces
        ignored: ``'312'``, ``'3 1 2'``, ``'1 1 2'``). A symbol that several settings share (the key
        ``'32'``, ``'2'`` for unique axis b, c and a) gives the standard (ITC default) setting,
        unless ``axes`` or ``unique_axis`` chooses another. Default: the ITC default setting.

    Returns
    -------
    list of dict
        Each entry of ``directions`` has ``lattice`` (int64, shape (3,)) and ``cartesian`` (float64,
        shape (3,)).
    """
    return list(_call("symmetryDirections", key, _shared.options(setting=setting, axes=axes, unique_axis=unique_axis)))


# --- properties of a list of operations ----------------------------------------------------------


def is_centrosymmetric_of(operations: Sequence[Mapping[str, Any]], *, tolerance: Optional[float] = None) -> bool:
    """True if the group generated by ``operations`` contains the inversion, not combined with time
    reversal: e.g. for the operations of a distorted crystal. The list is closed into a group within
    the tolerance first, as ``tensor_form_of`` closes it, and the inversion is sought within the
    tolerance. For a point group given by its key, read ``point_group(key)["centrosymmetric"]``.
    Raises SymcrysError as ``tensor_form_of``.

    Parameters
    ----------
    tolerance : keyword-only, optional
        Two numbers closer than this count as equal; default ``EPSILON`` (10⁻⁶). It is measured per
        matrix entry for operations, as the distance of unit vectors for directions and per
        coordinate modulo the lattice for points (docs/conventions.md, "Tolerances").
    """
    return bool(_call("isCentrosymmetricOf", _shared.operation_list(operations), _shared.options(tolerance=tolerance)))


def is_enantiomorphic_of(operations: Sequence[Mapping[str, Any]], *, tolerance: Optional[float] = None) -> bool:
    """True if the group generated by ``operations`` is enantiomorphic: proper rotations only, with
    or without time reversal (ITA § 3.2.2.1.3; products of proper rotations are proper, so the list
    need not be closed). For a point group given by its key, read
    ``point_group(key)["enantiomorphic"]``. Throws a SymcrysError for an operation without an
    orthogonal Cartesian matrix (``cartesian``; within the tolerance) and for an operation that does
    not say whether it is combined with time reversal.

    Parameters
    ----------
    tolerance : keyword-only, optional
        Two numbers closer than this count as equal; default ``EPSILON`` (10⁻⁶). It is measured per
        matrix entry for operations, as the distance of unit vectors for directions and per
        coordinate modulo the lattice for points (docs/conventions.md, "Tolerances").
    """
    return bool(_call("isEnantiomorphicOf", _shared.operation_list(operations), _shared.options(tolerance=tolerance)))


# --- site symmetry ----------------------------------------------------------


def site_symmetry_of(
    operations: Sequence[Mapping[str, Any]], direction: ArrayLike, *, tolerance: Optional[float] = None
) -> SiteSymmetry:
    """The site symmetry of ``direction`` (any non-zero vector, Cartesian) under ``operations``,
    which may be any list of point operations (for instance those of a distorted crystal). Time
    reversal is ignored: a direction or a face normal is not changed by it. The operations fixing
    the direction within the tolerance are closed under the products found in the list and the
    direction is set onto their fixed space, repeated until stable, so that for a group the result
    is a subgroup and the set direction lies exactly on its elements. For a list that is not a
    group, ``multiplicity`` may not be an integer. Each operation is read by its Cartesian matrix
    (``cartesian``). Raises SymcrysError for an operation without an orthogonal Cartesian matrix
    (``cartesian``; within ``tolerance``, at least ``EPSILON``), for a zero vector, and if the
    closed operations fix no common direction or do not settle into a group (a tolerance far too
    large, e.g. 0.5).

    Parameters
    ----------
    tolerance : keyword-only, optional
        Two numbers closer than this count as equal; default ``EPSILON`` (10⁻⁶). It is measured per
        matrix entry for operations, as the distance of unit vectors for directions and per
        coordinate modulo the lattice for points (docs/conventions.md, "Tolerances").

    Returns
    -------
    dict
        ``operations`` int64 array of shape (n,), ``direction`` float64 array of shape (3,),
        ``multiplicity``, ``general``.
    """
    return _shared.site(
        _call("siteSymmetryOf", _shared.operation_list(operations), _shared.array(direction, "direction"), _shared.options(tolerance=tolerance))
    )


def site_symmetry(
    key: str,
    direction: ArrayLike,
    *,
    setting: Optional[Union[int, str]] = None,
    axes: Optional[Literal["hexagonal", "rhombohedral"]] = None,
    unique_axis: Optional[Literal["a", "b", "c"]] = None,
    tolerance: Optional[float] = None,
) -> SiteSymmetry:
    """The site symmetry of a direction (any non-zero Cartesian vector) under a point group in a
    setting: ``site_symmetry_of`` applied to ``operations(key, options)``, so the indices refer to
    those operations (#137 C1). Time reversal is ignored. Raises SymcrysError as
    ``site_symmetry_of`` does.

    Returns
    -------
    dict
        ``operations`` int64 array of shape (n,), ``direction`` float64 array of shape (3,),
        ``multiplicity``, ``general``.
    """
    return _shared.site(
        _call(
            "siteSymmetry",
            key,
            _shared.array(direction, "direction"),
            _shared.options(setting=setting, axes=axes, unique_axis=unique_axis, tolerance=tolerance),
        )
    )


def orbit(
    key: str,
    indices: Mapping[str, ArrayLike],
    *,
    setting: Optional[Union[int, str]] = None,
    axes: Optional[Literal["hexagonal", "rhombohedral"]] = None,
    unique_axis: Optional[Literal["a", "b", "c"]] = None,
) -> list[dict[str, Any]]:
    """The orbit of a face (hkl) or of a lattice direction [uvw] under a point group, exactly, in
    the lattice basis: the distinct faces (directions), in the order in which the operations reach
    them (so the given face first), each with the indices of the operations that map the given one
    onto it. A face transforms with the inverse transpose of a lattice operation, h' = W⁻ᵀ·h, a
    direction with the operation itself, u' = W·u. The number of entries is the multiplicity of the
    face (direction), and the operations of the first entry, if it is the given one, are its site
    symmetry. Time reversal plays no part. Raises SymcrysError unless exactly one of ``hkl`` and
    ``uvw`` is given, as three integers not all zero (hexagonal axes: three indices, without i).

    Parameters
    ----------
    axes : keyword-only, optional
        The axes, as ITA's headlines name them: ``'rhombohedral'`` chooses the setting with
        rhombohedral axes of a trigonal group, ``'hexagonal'`` one with hexagonal axes, which every
        group of the hexagonal family has. A SymcrysError for another family.
    unique_axis : keyword-only, optional
        The unique axis of a monoclinic group, as ITA's headlines name it (``'b'``, the standard,
        ``'c'``, ``'a'``). A SymcrysError for another system.
    setting : keyword-only, optional
        The setting: its 1-based index, or a symbol, read as ``find_point_group`` reads it (spaces
        ignored: ``'312'``, ``'3 1 2'``, ``'1 1 2'``). A symbol that several settings share (the key
        ``'32'``, ``'2'`` for unique axis b, c and a) gives the standard (ITC default) setting,
        unless ``axes`` or ``unique_axis`` chooses another. Default: the ITC default setting.

    Returns
    -------
    list of dict
        In each, ``hkl`` (or ``uvw``) is an int64 array of shape (3,) and ``operations`` an int64
        array of shape (n,); ``indices`` is a dict ``{"hkl": ...}`` or ``{"uvw": ...}``.
    """
    return list(_call("orbit", key, _shared.mapping(indices, "indices"), _shared.options(setting=setting, axes=axes, unique_axis=unique_axis)))


def orbit_of(
    operations: Sequence[Mapping[str, Any]], direction: ArrayLike, *, tolerance: Optional[float] = None
) -> list[dict[str, Any]]:
    """The orbit of a direction (any non-zero vector, Cartesian, e.g. a face normal) under a list of
    operations, for instance those of a distorted crystal: the images of its unit vector under each
    operation, coinciding images merged (closer than ``tolerance``, default ``EPSILON``, as for
    ``site_symmetry_of``), in the order in which the operations reach them, each with the indices of
    the operations that map the direction there. The list is taken as it is, not closed into a
    group. Time reversal is ignored. Raises SymcrysError for a zero vector and for an operation
    without an orthogonal Cartesian matrix (``cartesian``; within ``tolerance``, at least
    ``EPSILON``).

    Parameters
    ----------
    tolerance : keyword-only, optional
        Two numbers closer than this count as equal; default ``EPSILON`` (10⁻⁶). It is measured per
        matrix entry for operations, as the distance of unit vectors for directions and per
        coordinate modulo the lattice for points (docs/conventions.md, "Tolerances").

    Returns
    -------
    list of dict
        In each, ``direction`` is a float64 array of shape (3,) and ``operations`` an int64 array of
        shape (n,).
    """
    return list(
        _call("orbitOf", _shared.operation_list(operations), _shared.array(direction, "direction"), _shared.options(tolerance=tolerance))
    )


# --- tensors -------------------------------------------------------------------------------------


def tensor_form(
    key: str,
    spec: TensorSpec | Mapping[str, Any] | TensorPropertyName,
    *,
    setting: Optional[Union[int, str]] = None,
    axes: Optional[Literal["hexagonal", "rhombohedral"]] = None,
    unique_axis: Optional[Literal["a", "b", "c"]] = None,
) -> TensorForm:
    """The form of a tensor under a point group, a crystal class or a magnetic point group, in the
    requested setting (default: the ITC default setting). The tensor is given by its specification
    or by the name of a property in ``TENSOR_PROPERTIES`` (``'piezoelectric'``; docs/conventions.md,
    "Tensors").

    Parameters
    ----------
    axes : keyword-only, optional
        The axes, as ITA's headlines name them: ``'rhombohedral'`` chooses the setting with
        rhombohedral axes of a trigonal group, ``'hexagonal'`` one with hexagonal axes, which every
        group of the hexagonal family has. A SymcrysError for another family.
    unique_axis : keyword-only, optional
        The unique axis of a monoclinic group, as ITA's headlines name it (``'b'``, the standard,
        ``'c'``, ``'a'``). A SymcrysError for another system.
    setting : keyword-only, optional
        The setting: its 1-based index, or a symbol, read as ``find_point_group`` reads it (spaces
        ignored: ``'312'``, ``'3 1 2'``, ``'1 1 2'``). A symbol that several settings share (the key
        ``'32'``, ``'2'`` for unique axis b, c and a) gives the standard (ITC default) setting,
        unless ``axes`` or ``unique_axis`` chooses another. Default: the ITC default setting.

    Returns
    -------
    dict
        ``basis`` float64 array of shape (p, 3**rank), ``parameters`` int64 array of shape (p,
        rank), ``relations`` float64 array of shape (3**rank - p, 3**rank), ``rank``; p is the
        number of free parameters. A row of ``basis`` reshaped to ``(3,) * rank`` is a tensor.
    """
    return _shared.form(
        _call("tensorForm", key, _shared.spec(spec), _shared.options(setting=setting, axes=axes, unique_axis=unique_axis))
    )


def tensor_form_of(
    operations: Sequence[Mapping[str, Any]],
    spec: TensorSpec | Mapping[str, Any] | TensorPropertyName,
    *,
    tolerance: Optional[float] = None,
) -> TensorForm:
    """The form of a tensor under the group generated by ``operations``, e.g. the site symmetry of a
    surface normal (``site_symmetry``) or the operations of a distorted crystal. The tensor is given
    by its specification or by the name of a property in ``TENSOR_PROPERTIES``. Each operation is
    read by its Cartesian matrix (``cartesian``), which must be orthogonal, and each says whether it
    is combined with time reversal (``time_reversal``, ``True`` or ``False``). The list is closed
    into a group within the tolerance, and that group is made exact before the form is computed, so
    that matrices with rounding errors (e.g. rounded to 6 decimals) give the form of the exact
    group, with its number of free parameters (docs/conventions.md, "Tolerances"). Raises
    SymcrysError for an operation without an orthogonal Cartesian matrix (``cartesian``; within the
    tolerance), for an operation that does not say whether it is combined with time reversal, and
    for operations that generate no finite group within the tolerance.

    Parameters
    ----------
    tolerance : keyword-only, optional
        Two numbers closer than this count as equal; default ``EPSILON`` (10⁻⁶). It is measured per
        matrix entry for operations, as the distance of unit vectors for directions and per
        coordinate modulo the lattice for points (docs/conventions.md, "Tolerances").

    Returns
    -------
    dict
        ``basis`` float64 array of shape (p, 3**rank), ``parameters`` int64 array of shape (p,
        rank), ``relations`` float64 array of shape (3**rank - p, 3**rank), ``rank``; p is the
        number of free parameters.
    """
    return _shared.form(
        _call(
            "tensorFormOf",
            _shared.operation_list(operations),
            _shared.spec(spec),
            _shared.options(tolerance=tolerance),
        )
    )


def allows_property(key: str, name: TensorPropertyName) -> bool:
    """True if the point group allows the named property, e.g. ``allows_property('-6m2',
    'piezoelectric')``. It does not depend on the setting. Raises SymcrysError for an unknown key or
    name.
    """
    return bool(_call("allowsProperty", key, name))


def allowed_properties(key: str) -> list[str]:
    """The named properties the point group allows, in the order of ``TENSOR_PROPERTIES``."""
    return list(_call("allowedProperties", key))


def allows_property_of(
    operations: Sequence[Mapping[str, Any]], name: TensorPropertyName, *, tolerance: Optional[float] = None
) -> bool:
    """True if the group generated by ``operations`` allows the named property, e.g. for the site
    symmetry of a surface normal or the operations of a distorted crystal. The operations are read
    and closed as ``tensor_form_of`` reads them, within the tolerance, and it raises SymcrysError as
    ``tensor_form_of`` does.

    Parameters
    ----------
    tolerance : keyword-only, optional
        Two numbers closer than this count as equal; default ``EPSILON`` (10⁻⁶). It is measured per
        matrix entry for operations, as the distance of unit vectors for directions and per
        coordinate modulo the lattice for points (docs/conventions.md, "Tolerances").
    """
    return bool(_call("allowsPropertyOf", _shared.operation_list(operations), name, _shared.options(tolerance=tolerance)))


def allowed_properties_of(operations: Sequence[Mapping[str, Any]], *, tolerance: Optional[float] = None) -> list[str]:
    """The named properties the group generated by ``operations`` allows. Reads the operations as
    ``allows_property_of``.

    Parameters
    ----------
    tolerance : keyword-only, optional
        Two numbers closer than this count as equal; default ``EPSILON`` (10⁻⁶). It is measured per
        matrix entry for operations, as the distance of unit vectors for directions and per
        coordinate modulo the lattice for points (docs/conventions.md, "Tolerances").
    """
    return list(_call("allowedPropertiesOf", _shared.operation_list(operations), _shared.options(tolerance=tolerance)))


def rotate_tensor(
    tensor: ArrayLike,
    rotation: ArrayLike,
    spec: TensorSpec | Mapping[str, Any] | TensorPropertyName,
    *,
    tolerance: Optional[float] = None,
) -> NDArray[np.float64]:
    """The components of ``tensor`` (length 3^rank, flat index) in a frame rotated by the orthogonal
    matrix ``rotation``: t′_{i…} = f·Σ R_{ia}…R_{…}·t_{a…}, with f = det(R) for an axial tensor and
    1 for a polar one. To express a tensor in the frame of a surface, pass the matrix whose rows are
    the new axes in the old frame. Time parity plays no part. The kind of tensor is given by its
    specification or by the name of a property in ``TENSOR_PROPERTIES``. Raises SymcrysError for a
    rotation that is not orthogonal within the tolerance (per matrix entry of RᵀR).

    Parameters
    ----------
    tolerance : keyword-only, optional
        Two numbers closer than this count as equal; default ``EPSILON`` (10⁻⁶). It is measured per
        matrix entry for operations, as the distance of unit vectors for directions and per
        coordinate modulo the lattice for points (docs/conventions.md, "Tolerances").

    Returns
    -------
    numpy.ndarray
        A float64 array of shape (3**rank,); ``tensor`` may have any shape with 3**rank entries (it
        is flattened in C order).
    """
    flat = _shared.array(tensor, "tensor", np.float64).reshape(-1)
    return np.asarray(
        _call(
            "rotateTensor",
            flat,
            _shared.array(rotation, "rotation"),
            _shared.spec(spec),
            _shared.options(tolerance=tolerance),
            floats=True,
        ),
        dtype=np.float64,
    )
