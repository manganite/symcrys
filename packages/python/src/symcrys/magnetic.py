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
from ._engine import SymcrysError
from ._shared import MAGNETIC, IntrinsicSymmetry, SiteSymmetry, TensorForm, TensorParity

TimeParity = Literal["i", "c"]
TensorPropertyName = Literal[
    "pyroelectric", "ferroaxial", "piezoelectric", "gyrotropic", "ferromagnetic", "magnetoelectric", "piezomagnetic"
]


class TensorSpec(TypedDict):
    """The kind of tensor (keys also accepted in camelCase, e.g. ``timeParity``)."""

    rank: int
    parity: TensorParity
    time_parity: TimeParity
    intrinsic: IntrinsicSymmetry


class Operation(TypedDict):
    matrix: NDArray[np.float64]
    time_reversal: bool


__all__ = [
    "LATTICE_SYMMETRY_DIRECTIONS",
    "POINT_GROUP_KEYS",
    "TENSOR_PROPERTIES",
    "VERSION",
    "SymcrysError",
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
    "is_chiral_of",
    "is_point_group_key",
    "lattice_operations",
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
    "symbol",
    "symmetry_directions",
    "tensor_form",
    "tensor_form_of",
]

VERSION: str = _shared.value(MAGNETIC + "VERSION")
"""The version of symcrys, the same for the TypeScript and the Python package."""
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


def find_point_group(hm: str) -> Optional[dict[str, Any]]:
    """Finds one of the 122 magnetic point groups (the 32 crystal classes included) by a symbol: the
    short symbol of a setting, a full symbol, or the key (spaces are ignored). A prime ``'`` marks
    time reversal: ``4'/mmm'``, ``2221'``. A symbol that names one setting gives that setting; the
    key, and a short symbol that several settings share (the monoclinic ones: ``2'`` for unique axis
    b and c), give the ITC default setting. Returns None if nothing matches, also for a value that
    is not a string. Symbols are written as in this library, with ``-`` for the overbar
    (``m'-3'm``).
    """
    args = [hm]
    result = _call("findPointGroup", *args)
    return None if result is None else dict(result)


def settings(key: str) -> list[dict[str, Any]]:
    """The settings of a point group, with their symbols and the ITC default."""
    args = [key]
    return list(_call("settings", *args))


def operations(key: str, *, setting: Optional[Union[int, str]] = None) -> list[Operation]:
    """All operations of the point group in the requested setting (default: the ITC default
    setting), in ITA's order: identity first, then as ITA numbers the general position of the
    crystal class; an operation of a magnetic group has the number it has in the class, and a grey
    group lists the class first, then the same sequence with time reversal (docs/conventions.md,
    "Order of the operations"). The matrices are Cartesian (docs/conventions.md, "Cartesian frame").

    Parameters
    ----------
    setting : keyword-only, optional
        The setting: its 1-based index, or its ITC symbol, short or full (spaces ignored: ``'312'``,
        ``'3 1 2'``, ``'1 1 2'``). A symbol that several settings share (``'2'`` for unique axis b
        and c) is an error that names them. Default: the ITC default setting.

    Returns
    -------
    list of dict
        Dicts ``{"matrix", "time_reversal"}``; each matrix is a float64 array of shape (3, 3).
    """
    return list(_call("operations", key, _shared.options(setting=setting)))


def generators(key: str, *, setting: Optional[Union[int, str]] = None) -> list[Operation]:
    """Generators of the point group in the requested setting (docs/conventions.md, "Generators"):
    ITA's selected generators in printed order, without the identity and ITA's lattice translations,
    so the list is empty for ``1``; for ``mm2`` settings 2 and 3, which ITA does not list, those of
    setting 1 carried into their frame; for a magnetic group, those of its class with the time
    reversal they have in the group, for a grey group followed by ``1'``.

    Parameters
    ----------
    setting : keyword-only, optional
        The setting: its 1-based index, or its ITC symbol, short or full (spaces ignored: ``'312'``,
        ``'3 1 2'``, ``'1 1 2'``). A symbol that several settings share (``'2'`` for unique axis b
        and c) is an error that names them. Default: the ITC default setting.

    Returns
    -------
    list of dict
        Dicts ``{"matrix", "time_reversal"}``; each matrix is a float64 array of shape (3, 3).
    """
    return list(_call("generators", key, _shared.options(setting=setting)))


def symbol(
    key: str,
    *,
    setting: Optional[Union[int, str]] = None,
    form: Optional[Literal["short", "full", "schoenflies"]] = None,
) -> str:
    """A symbol of the point group in the requested setting.

    Parameters
    ----------
    setting : keyword-only, optional
        The setting: its 1-based index, or its ITC symbol, short or full (spaces ignored: ``'312'``,
        ``'3 1 2'``, ``'1 1 2'``). A symbol that several settings share (``'2'`` for unique axis b
        and c) is an error that names them. Default: the ITC default setting.
    form : keyword-only, optional
        ``'short'`` (default): short symbol of the setting, e.g. ``321`` (ITC) for class ``32``.
        ``'full'``: full symbol, positions separated by spaces, e.g. ``-3 2/m 1``.
        ``'schoenflies'``: Schoenflies symbol, subscripts written inline (``C3v``, ``D2d``, ``Oh``).
    """
    return str(_call("symbol", key, _shared.options(setting=setting, form=form)))


def crystal_family(system: str) -> str:
    """The crystal family of a crystal system: trigonal and hexagonal form the hexagonal family."""
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
    return np.asarray(_call("latticeFromParameters", dict(parameters), floats=True), dtype=np.float64)


def lattice_parameters(basis: ArrayLike) -> dict[str, float]:
    """The lattice parameters of a basis given as the columns of a Cartesian matrix: the edge
    lengths and the angles in degrees. Independent of the orientation of the basis in the Cartesian
    frame (and of its handedness). Raises SymcrysError for a singular matrix.
    """
    result: dict[str, Any] = _call("latticeParameters", np.asarray(basis, dtype=np.float64))
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
    return bool(_call("isValidCell", dict(angles), _shared.options(min_volume_ratio=min_volume_ratio)))


def metric_tensor(basis: ArrayLike) -> NDArray[np.float64]:
    """The metric tensor G = AᵀA of a basis A (columns a, b, c): g_ij = a_i · a_j, in the unit of
    the edge lengths squared.
    """
    return np.asarray(_call("metricTensor", np.asarray(basis, dtype=np.float64), floats=True), dtype=np.float64)


def reciprocal_basis(basis: ArrayLike) -> NDArray[np.float64]:
    """The reciprocal basis B = A⁻ᵀ of a basis A (columns a, b, c) as the columns a*, b*, c*, with
    a_i · a*_j = δ_ij (no factor 2π), in the inverse unit of the edge lengths.
    """
    return np.asarray(_call("reciprocalBasis", np.asarray(basis, dtype=np.float64), floats=True), dtype=np.float64)


def angle_between_directions(basis: ArrayLike, u: ArrayLike, v: ArrayLike) -> float:
    """The angle in degrees between two lattice directions [uvw] (coordinates in the basis, columns
    a, b, c), 0° to 180°. Raises SymcrysError for a zero vector.
    """
    return float(_call("angleBetweenDirections", np.asarray(basis, dtype=np.float64), np.asarray(u), np.asarray(v)))


def angle_between_planes(basis: ArrayLike, h: ArrayLike, k: ArrayLike) -> float:
    """The angle in degrees between the normals of two planes (hkl), 0° to 180°: the angle between
    the reciprocal vectors h·a* + k·b* + l·c*. For two faces this is 180° minus the interior
    dihedral angle. Raises SymcrysError for a zero vector.
    """
    return float(_call("angleBetweenPlanes", np.asarray(basis, dtype=np.float64), np.asarray(h), np.asarray(k)))


def residual_operations(
    operations: Sequence[Mapping[str, Any]], basis: ArrayLike, *, tolerance: Optional[float] = None
) -> list[Operation]:
    """The operations of a list that keep the metric of a cell: W with WᵀGW = G, G the metric tensor
    of ``basis``. The operations are integer matrices on lattice coordinates, as
    ``lattice_operations`` gives them; the list is taken as it is and the kept operations are the
    ones of the list, in its order. The deviation counts relative to the largest entry of G
    (``tolerance``, default ``EPSILON``). Every operation must say whether it is combined with time
    reversal (``time_reversal``), which is kept; one that does not (an operation of the
    crystallographic API) raises SymcrysError.

    Parameters
    ----------
    tolerance : keyword-only, optional
        The largest accepted deviation of WᵀGW from G, relative to the largest entry of G; default
        ``EPSILON``.
    """
    return list(
        _call(
            "residualOperations",
            _shared.operation_list(operations),
            np.asarray(basis, dtype=np.float64),
            _shared.options(tolerance=tolerance),
        )
    )


def reduce_indices(indices: ArrayLike) -> NDArray[np.int64]:
    """The indices divided by their greatest common divisor, signs kept. Raises SymcrysError for
    non-integers and for all zeros.
    """
    return np.asarray(_call("reduceIndices", np.asarray(indices)), dtype=np.int64)


def plane_to_four_indices(hkl: ArrayLike) -> NDArray[np.int64]:
    """The plane (hkl) of hexagonal axes as (hkil) with i = −(h + k)."""
    return np.asarray(_call("planeToFourIndices", np.asarray(hkl)), dtype=np.int64)


def plane_from_four_indices(hkil: ArrayLike) -> NDArray[np.int64]:
    """The plane (hkil) as (hkl); raises SymcrysError unless i = −(h + k)."""
    return np.asarray(_call("planeFromFourIndices", np.asarray(hkil)), dtype=np.int64)


def direction_to_four_indices(uvw: ArrayLike) -> NDArray[np.int64]:
    """The direction [uvw] of hexagonal axes as [UVTW], reduced: U = (2u − v)/3, V = (2v − u)/3, T =
    −(U + V), W = w, scaled to the smallest integers.
    """
    return np.asarray(_call("directionToFourIndices", np.asarray(uvw)), dtype=np.int64)


def direction_from_four_indices(uvtw: ArrayLike) -> NDArray[np.int64]:
    """The direction [UVTW] as [uvw], reduced: u = U − T, v = V − T, w = W; raises SymcrysError
    unless T = −(U + V).
    """
    return np.asarray(_call("directionFromFourIndices", np.asarray(uvtw)), dtype=np.int64)


def zone_axis(h1: ArrayLike, h2: ArrayLike) -> Optional[NDArray[np.int64]]:
    """The zone axis [uvw] of two planes (hkl), which must not be zero vectors: the solution of the
    zone law hu + kv + lw = 0, the cross product h₁ × h₂ reduced (so its sign follows the order of
    the planes), or ``None`` for parallel planes.
    """
    result = _call("zoneAxis", np.asarray(h1), np.asarray(h2))
    return None if result is None else np.asarray(result, dtype=np.int64)


def change_of_axes(p: ArrayLike) -> dict[str, NDArray[np.float64]]:
    """The transformation of indices for a change of basis (a′, b′, c′) = (a, b, c)·P (ITA Vol. A,
    2006, Section 5.1.3): the columns of ``P`` are the new basis vectors in the old one. The
    coordinates of a direction transform with Q = P⁻¹, the indices of a plane with Pᵀ, so that hu +
    kv + lw is the same in both bases. Raises SymcrysError unless det P > 0 (a right-handed basis),
    and for a P that is singular within rounding (the absolute value of det P at most 10⁻⁹ times the
    product of its column lengths).
    """
    result: dict[str, NDArray[np.float64]] = _call("changeOfAxes", np.asarray(p, dtype=np.float64))
    return result


def describe_operations(
    key: str, *, setting: Optional[Union[int, str]] = None
) -> list[dict[str, Any]]:
    """Each operation of the point group described geometrically, in the order of ``operations`` for
    the same key and options. Axes are named by the symmetry direction they lie along, with the sign
    of ITA Table 2.1.3.1; the sign fixes what the sense refers to.

    Parameters
    ----------
    setting : keyword-only, optional
        The setting: its 1-based index, or its ITC symbol, short or full (spaces ignored: ``'312'``,
        ``'3 1 2'``, ``'1 1 2'``). A symbol that several settings share (``'2'`` for unique axis b
        and c) is an error that names them. Default: the ITC default setting.

    Returns
    -------
    list of dict
        In each, ``axis`` (if present) has ``lattice`` (int64, shape (3,)) and ``cartesian``
        (float64, shape (3,)).
    """
    return list(_call("describeOperations", key, _shared.options(setting=setting)))


def point_group_of(
    operations: Sequence[Mapping[str, Any]], *, tolerance: Optional[float] = None
) -> Optional[dict[str, Any]]:
    """The point group generated by a list of Cartesian operations, for instance those left after
    distorting a crystal: its key, and the setting whose operations it equals in the frame of
    symcrys (absent if the group is the point group in another orientation). The list is closed into
    a group first, two matrices being equal when no entry differs by ``tolerance`` (default
    ``EPSILON``) or more. Time reversal counts: a list with time reversal gives a magnetic point
    group. Returns None if the operations generate no point group (an operation of order 5, a group
    larger than 96). Raises SymcrysError for a matrix that is not orthogonal (within ``tolerance``,
    at least ``EPSILON``) and for an operation that does not say whether it is combined with time
    reversal. The classes ``1`` and ``-1`` have one setting and no orientation, so they always have
    setting 1.

    Parameters
    ----------
    tolerance : keyword-only, optional
        Two matrices are the same operation if no entry differs by this much or more, and a matrix
        counts as orthogonal and crystallographic within it. Default ``EPSILON`` (10⁻⁶); a caller
        whose matrices carry rounding errors passes a larger value, below 0.1.
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
    given by its key, ``describe_operations`` names them. Raises SymcrysError for a matrix that is
    not orthogonal or not a crystallographic operation (a rotation part by an angle other than
    360°/n, n = 1, 2, 3, 4, 6), both within ``tolerance`` (default ``EPSILON``, as for
    ``point_group_of``), and for an operation that does not say whether it is combined with time
    reversal.

    Parameters
    ----------
    tolerance : keyword-only, optional
        Two matrices are the same operation if no entry differs by this much or more, and a matrix
        counts as orthogonal and crystallographic within it. Default ``EPSILON`` (10⁻⁶); a caller
        whose matrices carry rounding errors passes a larger value, below 0.1.

    Returns
    -------
    list of dict
        In each, ``axis`` (if present) has ``cartesian`` (float64, shape (3,)).
    """
    return list(_call("describeOperationsOf", _shared.operation_list(operations), _shared.options(tolerance=tolerance)))


def symmetry_directions(
    key: str, *, setting: Optional[Union[int, str]] = None
) -> list[dict[str, Any]]:
    """The positions of the full Hermann–Mauguin symbol in the requested setting, each with its
    symmetry directions (ITA Table 2.1.3.1) and the symmetry elements along them. All positions of
    the crystal family are listed, also those the symbol of the class leaves out (then without
    ``symbol``); the triclinic family has none. A direction carries the same ``lattice`` and
    ``cartesian`` vectors as the axis of ``describe_operations`` along it, so match the two by
    value.

    Parameters
    ----------
    setting : keyword-only, optional
        The setting: its 1-based index, or its ITC symbol, short or full (spaces ignored: ``'312'``,
        ``'3 1 2'``, ``'1 1 2'``). A symbol that several settings share (``'2'`` for unique axis b
        and c) is an error that names them. Default: the ITC default setting.

    Returns
    -------
    list of dict
        Each entry of ``directions`` has ``lattice`` (int64, shape (3,)) and ``cartesian`` (float64,
        shape (3,)).
    """
    return list(_call("symmetryDirections", key, _shared.options(setting=setting)))


# --- properties of a list of operations ----------------------------------------------------------


def is_centrosymmetric_of(operations: Sequence[Mapping[str, Any]]) -> bool:
    """True if the group generated by ``operations`` contains the inversion, not combined with time
    reversal: e.g. for the operations of a distorted crystal. A list that is not closed is closed
    first. For a point group given by its key, read ``point_group(key)["centrosymmetric"]``. Raises
    SymcrysError for a matrix that is not orthogonal and for an operation that does not say whether
    it is combined with time reversal.
    """
    return bool(_call("isCentrosymmetricOf", _shared.operation_list(operations)))


def is_chiral_of(operations: Sequence[Mapping[str, Any]]) -> bool:
    """True if the group generated by ``operations`` is chiral: proper rotations only, with or
    without time reversal (products of proper rotations are proper, so the list need not be closed).
    For a point group given by its key, read ``point_group(key)["chiral"]``. Raises SymcrysError for
    a matrix that is not orthogonal and for an operation that does not say whether it is combined
    with time reversal.
    """
    return bool(_call("isChiralOf", _shared.operation_list(operations)))


# --- site symmetry ----------------------------------------------------------


def site_symmetry(
    operations: Sequence[Mapping[str, Any]], direction: ArrayLike, *, tolerance: Optional[float] = None
) -> SiteSymmetry:
    """The site symmetry of ``direction`` (any non-zero vector, Cartesian) under ``operations``,
    which may be any list of point operations (for instance those of a distorted crystal). Time
    reversal is ignored: a direction or a face normal is not changed by it. The operations fixing
    the direction within the tolerance are closed under the products found in the list and the
    direction is set onto their fixed space, repeated until stable, so that for a group the result
    is a subgroup and the set direction lies exactly on its elements. For a list that is not a
    group, ``multiplicity`` may not be an integer. The matrices must be Cartesian and orthogonal
    (not those of ``lattice_operations``). Raises SymcrysError for a matrix that is not orthogonal
    (within ``tolerance``, at least ``EPSILON``), for a zero vector, and if the closed operations
    fix no common direction or do not settle into a group (a tolerance far too large, e.g. 0.5).

    Parameters
    ----------
    tolerance : keyword-only, optional
        A direction counts as fixed by an operation if the operation moves its unit vector by less
        than this (Euclidean distance). Default 10⁻⁶; a caller whose directions carry rounding
        errors (e.g. read from a rounded link) passes a larger value.

    Returns
    -------
    dict
        ``operations`` int64 array of shape (n,), ``direction`` float64 array of shape (3,),
        ``multiplicity``, ``general``.
    """
    return _shared.site(
        _call("siteSymmetry", _shared.operation_list(operations), np.asarray(direction), _shared.options(tolerance=tolerance))
    )


def lattice_operations(
    key: str, *, setting: Optional[Union[int, str]] = None
) -> list[Operation]:
    """The operations of a point group in the conventional lattice basis (a, b, c; for the trigonal
    classes the hexagonal axes), in the order and with the time reversal of ``operations`` for the
    same setting: integer matrices W acting on the coordinates of a lattice vector [uvw], W =
    B⁻¹·R·B with the basis B of ``lattice_basis`` and the Cartesian matrix R. They do not depend on
    the cell angles, so they exist for every family; for the monoclinic and triclinic families a, b,
    c are taken along x, y, z, as for the Wyckoff positions. They are the matrices of ITA's general
    position (6th ed., Table 3.2.3.2). Not orthogonal in general: pass them to no function that
    takes Cartesian operations (docs/conventions.md, "Lattice basis and orbits").

    Parameters
    ----------
    setting : keyword-only, optional
        The setting: its 1-based index, or its ITC symbol, short or full (spaces ignored: ``'312'``,
        ``'3 1 2'``, ``'1 1 2'``). A symbol that several settings share (``'2'`` for unique axis b
        and c) is an error that names them. Default: the ITC default setting.

    Returns
    -------
    list of dict
        Dicts ``{"matrix", "time_reversal"}``; each matrix is a float64 array of shape (3, 3)
        holding integers (the fixed rule for matrices).
    """
    return list(_call("latticeOperations", key, _shared.options(setting=setting)))


def orbit(
    key: str,
    indices: Mapping[str, ArrayLike],
    *,
    setting: Optional[Union[int, str]] = None,
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
    setting : keyword-only, optional
        The setting: its 1-based index, or its ITC symbol, short or full (spaces ignored: ``'312'``,
        ``'3 1 2'``, ``'1 1 2'``). A symbol that several settings share (``'2'`` for unique axis b
        and c) is an error that names them. Default: the ITC default setting.

    Returns
    -------
    list of dict
        In each, ``hkl`` (or ``uvw``) is an int64 array of shape (3,) and ``operations`` an int64
        array of shape (n,); ``indices`` is a dict ``{"hkl": ...}`` or ``{"uvw": ...}``.
    """
    return list(_call("orbit", key, dict(indices), _shared.options(setting=setting)))


def orbit_of(
    operations: Sequence[Mapping[str, Any]], direction: ArrayLike, *, tolerance: Optional[float] = None
) -> list[dict[str, Any]]:
    """The orbit of a direction (any non-zero vector, Cartesian, e.g. a face normal) under a list of
    operations, for instance those of a distorted crystal: the images of its unit vector under each
    operation, coinciding images merged (closer than ``tolerance``, default ``EPSILON``, as for
    ``site_symmetry``), in the order in which the operations reach them, each with the indices of
    the operations that map the direction there. The list is taken as it is, not closed into a
    group. Time reversal is ignored. Raises SymcrysError for a zero vector and for a matrix that is
    not orthogonal (Cartesian, not one of ``lattice_operations``; within ``tolerance``, at least
    ``EPSILON``).

    Parameters
    ----------
    tolerance : keyword-only, optional
        Two images count as one pole if their unit vectors are closer than this (Euclidean
        distance). Default 10⁻⁶; a caller whose directions carry rounding errors passes a larger
        value.

    Returns
    -------
    list of dict
        In each, ``direction`` is a float64 array of shape (3,) and ``operations`` an int64 array of
        shape (n,).
    """
    return list(
        _call("orbitOf", _shared.operation_list(operations), np.asarray(direction), _shared.options(tolerance=tolerance))
    )


# --- tensors -------------------------------------------------------------------------------------


def tensor_form(
    key: str,
    spec: TensorSpec | Mapping[str, Any] | TensorPropertyName,
    *,
    setting: Optional[Union[int, str]] = None,
) -> TensorForm:
    """The form of a tensor under a point group, a crystal class or a magnetic point group, in the
    requested setting (default: the ITC default setting). The tensor is given by its specification
    or by the name of a property in ``TENSOR_PROPERTIES`` (``'piezoelectric'``; docs/conventions.md,
    "Tensors").

    Parameters
    ----------
    setting : keyword-only, optional
        The setting: its 1-based index, or its ITC symbol, short or full (spaces ignored: ``'312'``,
        ``'3 1 2'``, ``'1 1 2'``). A symbol that several settings share (``'2'`` for unique axis b
        and c) is an error that names them. Default: the ITC default setting.

    Returns
    -------
    dict
        ``basis`` float64 array of shape (p, 3**rank), ``parameters`` int64 array of shape (p,
        rank), ``relations`` float64 array of shape (3**rank - p, 3**rank), ``rank``; p is the
        number of free parameters. A row of ``basis`` reshaped to ``(3,) * rank`` is a tensor.
    """
    return _shared.form(
        _call("tensorForm", key, _shared.spec(spec), _shared.options(setting=setting))
    )


def tensor_form_of(
    operations: Sequence[Mapping[str, Any]], spec: TensorSpec | Mapping[str, Any] | TensorPropertyName
) -> TensorForm:
    """The form of a tensor under the group generated by ``operations``, e.g. the site symmetry of a
    surface normal (``site_symmetry``) or the operations of a distorted crystal. The tensor is given
    by its specification or by the name of a property in ``TENSOR_PROPERTIES``. The operations are
    Cartesian and orthogonal, and each says whether it is combined with time reversal
    (``time_reversal``, ``True`` or ``False``); a list that is not closed is closed first. Raises
    SymcrysError for a matrix that is not orthogonal and for an operation that does not say whether
    it is combined with time reversal.

    Returns
    -------
    dict
        ``basis`` float64 array of shape (p, 3**rank), ``parameters`` int64 array of shape (p,
        rank), ``relations`` float64 array of shape (3**rank - p, 3**rank), ``rank``; p is the
        number of free parameters.
    """
    return _shared.form(_call("tensorFormOf", _shared.operation_list(operations), _shared.spec(spec)))


def allows_property(key: str, name: TensorPropertyName) -> bool:
    """True if the point group allows the named property, e.g. ``allows_property('-6m2',
    'piezoelectric')``. It does not depend on the setting. Raises SymcrysError for an unknown key or
    name.
    """
    return bool(_call("allowsProperty", key, name))


def allowed_properties(key: str) -> list[str]:
    """The named properties the point group allows, in the order of ``TENSOR_PROPERTIES``."""
    return list(_call("allowedProperties", key))


def allows_property_of(operations: Sequence[Mapping[str, Any]], name: TensorPropertyName) -> bool:
    """True if the group generated by ``operations`` allows the named property, e.g. for the site
    symmetry of a surface normal or the operations of a distorted crystal. The matrices must be
    Cartesian and orthogonal; a list that is not closed is closed first. Raises SymcrysError for a
    matrix that is not orthogonal and for an operation that does not say whether it is combined with
    time reversal.
    """
    return bool(_call("allowsPropertyOf", _shared.operation_list(operations), name))


def allowed_properties_of(operations: Sequence[Mapping[str, Any]]) -> list[str]:
    """The named properties the group generated by ``operations`` allows. Checks the operations as
    ``allows_property_of``.
    """
    return list(_call("allowedPropertiesOf", _shared.operation_list(operations)))


def rotate_tensor(
    tensor: ArrayLike, rotation: ArrayLike, spec: TensorSpec | Mapping[str, Any] | TensorPropertyName
) -> NDArray[np.float64]:
    """The components of ``tensor`` (length 3^rank, flat index) in a frame rotated by the orthogonal
    matrix ``rotation``: t′_{i…} = f·Σ R_{ia}…R_{…}·t_{a…}, with f = det(R) for an axial tensor and
    1 for a polar one. To express a tensor in the frame of a surface, pass the matrix whose rows are
    the new axes in the old frame. Time parity plays no part. The kind of tensor is given by its
    specification or by the name of a property in ``TENSOR_PROPERTIES``.

    Returns
    -------
    numpy.ndarray
        A float64 array of shape (3**rank,); ``tensor`` may have any shape with 3**rank entries (it
        is flattened in C order).
    """
    flat = np.asarray(tensor, dtype=np.float64).reshape(-1)
    return np.asarray(
        _call("rotateTensor", flat, np.asarray(rotation), _shared.spec(spec), floats=True), dtype=np.float64
    )
