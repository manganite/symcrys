"""symcrys: crystallographic symmetry calculations, from Python.

A thin layer over the TypeScript library symcrys of the same version, which runs in an embedded
JavaScript engine (quickjs-ng). Every function here calls the function of the same name in the
library (camelCase there, snake_case here) and returns its result as plain Python data, matrices
and vectors as NumPy arrays (rules in ``symcrys._convert``). The conventions, frames and print
sources are documented once, for both languages: https://manganite.github.io/symcrys/conventions.html

This module is the crystallographic API: the 32 crystal classes, without time reversal. The
magnetic point groups, time-odd tensors and operations with time reversal are in
``symcrys.magnetic``, under the same function names; there ``"32"`` is the white group, and a
crystal without magnetic order has the grey group of its class (quartz: ``"321'"``). A question
that involves time reversal raises ``SymcrysError`` here (docs/conventions.md, "Two entry points").

Each call costs about a millisecond or more (the forms of rank-4 tensors up to a few tenths of a
second); fetch operations or forms once and compute with NumPy, rather than calling in a loop.
"""

from __future__ import annotations

from typing import Any, Literal, Mapping, Optional, Sequence, TypedDict

import numpy as np
from numpy.typing import ArrayLike, NDArray

from . import _shared
from ._convert import from_js
from ._engine import SymcrysError
from ._shared import Convention, IntrinsicSymmetry, SiteSymmetry, TensorForm, TensorParity

TensorPropertyName = Literal["pyroelectric", "ferroaxial", "piezoelectric", "gyrotropic"]


class TensorSpec(TypedDict):
    """The kind of tensor."""

    rank: int
    parity: TensorParity
    intrinsic: IntrinsicSymmetry


class Operation(TypedDict):
    matrix: NDArray[np.float64]


__all__ = [
    "CRYSTAL_FORM_TYPES",
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
    "crystal_forms",
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
    "magnetic",
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
    "wyckoff_position_of",
    "wyckoff_positions",
]

VERSION: str = _shared.value("VERSION")
"""The version of symcrys, the same for the TypeScript and the Python package."""
__version__ = VERSION
POINT_GROUP_KEYS: tuple[str, ...] = tuple(_shared.value("POINT_GROUP_KEYS"))
"""Keys of the 32 crystal classes: the ITC short symbol of the class (docs/conventions.md, "Keys").
"""
LATTICE_SYMMETRY_DIRECTIONS: dict[str, list[NDArray[np.int64]]] = _shared.lattice_symmetry_directions(
    "LATTICE_SYMMETRY_DIRECTIONS"
)
"""The directions of each position of the full symbol, per family, as printed in ITA Table 2.1.3.1
(hexagonal family: the row "Hexagonal", which also serves the trigonal classes with hexagonal axes).
Monoclinic: the full symbol reads along a, b, c (ITA 6th ed. § 2.1.3.15, p. 171), the orthorhombic
row. Triclinic: no symmetry direction.

In Python: family → one int64 array of shape (n, 3) per position, the n directions [uvw] as rows.
"""
TENSOR_PROPERTIES: dict[str, dict[str, Any]] = from_js(_shared.value("TENSOR_PROPERTIES"))
"""The named tensor properties of the crystal classes: those of time-even tensors. ``'gyrotropic'``
is optical activity. The properties of time-odd tensors (``'ferromagnetic'``, …) are in the magnetic
API.
"""
CRYSTAL_FORM_TYPES: list[dict[str, Any]] = from_js(_shared.value("CRYSTAL_FORM_TYPES"))
"""The 47 crystal forms of ITA Table 3.2.1.3 (6th ed., pp. 724–726) with ITA's numbers, English
names, numbers of faces and eigensymmetries: ``CRYSTAL_FORM_TYPES[n - 1]`` is form n. Each crystal
form of ``crystal_forms`` names its form by this number (docs/conventions.md, "Crystal forms").
"""


def _call(name: str, *args: Any, floats: bool = False) -> Any:
    return _shared.call(name, *args, floats=floats)


# --- point groups -------------------------------------------------------------------------------


def point_groups() -> list[dict[str, Any]]:
    """All 32 crystal classes, in the order of ``POINT_GROUP_KEYS`` (by crystal system, as in ITA).
    """
    return list(_call("pointGroups"))


def point_group(key: str) -> dict[str, Any]:
    """The crystal class with this key. Raises SymcrysError for an unknown key."""
    return dict(_call("pointGroup", key))


def is_point_group_key(key: str) -> bool:
    """True if ``key`` is the key of one of the 32 crystal classes."""
    return bool(_call("isPointGroupKey", key))


def find_point_group(hm: str, convention: Optional[Convention] = None) -> Optional[dict[str, Any]]:
    """Finds a crystal class by a Hermann–Mauguin symbol in the given convention (default
    ``'itc'``): the short symbol of a setting, a full symbol, or the key (spaces are ignored). A
    symbol that names one setting gives that setting; the key, and a short symbol that several
    settings share (the monoclinic ones: ``2`` for unique axis b and c), give the default setting of
    the convention. Returns None if nothing matches, also for a value that is not a string and for
    the symbol of a magnetic group with time reversal. Symbols are written as in this library: ``-``
    for the overbar, also in the Birss convention (``m-3m``, where Birss prints ``m3m``;
    docs/conventions.md, "Where ITC and Birss differ").
    """
    args = [hm] if convention is None else [hm, convention]
    result = _call("findPointGroup", *args)
    return None if result is None else dict(result)


def settings(key: str, convention: Optional[Convention] = None) -> list[dict[str, Any]]:
    """The settings of a crystal class, with symbols and the default of the given convention
    (default ``'itc'``).
    """
    args = [key] if convention is None else [key, convention]
    return list(_call("settings", *args))


def operations(key: str, *, convention: Optional[Convention] = None, setting: Optional[int] = None) -> list[Operation]:
    """All operations of the crystal class in the requested setting (default: the convention's
    default setting). ITC convention: in ITA's order, identity first, then as ITA numbers the
    general position. Birss convention: in birss-app's order (docs/conventions.md, "Order of the
    operations"). The matrices are Cartesian (docs/conventions.md, "Cartesian frame").

    Parameters
    ----------
    convention : keyword-only, optional
        Default ``'itc'``.
    setting : keyword-only, optional
        1-based setting index; default: the default setting of the convention.

    Returns
    -------
    list of dict
        Dicts ``{"matrix"}``; each matrix is a float64 array of shape (3, 3).
    """
    return list(_call("operations", key, _shared.options(convention=convention, setting=setting)))


def generators(key: str, *, convention: Optional[Convention] = None, setting: Optional[int] = None) -> list[Operation]:
    """Generators of the crystal class in the requested setting (docs/conventions.md, "Generators").
    ITC convention: ITA's selected generators in printed order, without the identity and ITA's
    lattice translations, so the list is empty for ``1``; for ``mm2`` settings 2 and 3, which ITA
    does not list, those of setting 1 carried into their frame. Birss convention: birss-app's
    generators (for ``1`` the identity, as in birss-app).

    Parameters
    ----------
    convention : keyword-only, optional
        Default ``'itc'``.
    setting : keyword-only, optional
        1-based setting index; default: the default setting of the convention.

    Returns
    -------
    list of dict
        Dicts ``{"matrix"}``; each matrix is a float64 array of shape (3, 3).
    """
    return list(_call("generators", key, _shared.options(convention=convention, setting=setting)))


def symbol(
    key: str,
    *,
    convention: Optional[Convention] = None,
    setting: Optional[int] = None,
    form: Optional[Literal["short", "full", "schoenflies"]] = None,
) -> str:
    """A symbol of the crystal class in the requested convention and setting.

    Parameters
    ----------
    convention : keyword-only, optional
        Default ``'itc'``.
    setting : keyword-only, optional
        1-based setting index; default: the default setting of the convention.
    form : keyword-only, optional
        ``'short'`` (default): short symbol of the setting, e.g. ``321`` (ITC) for class ``32``.
        ``'full'``: full symbol, positions separated by spaces, e.g. ``-3 2/m 1``.
        ``'schoenflies'``: Schoenflies symbol, subscripts written inline (``C3v``, ``D2d``, ``Oh``).
    """
    return str(_call("symbol", key, _shared.options(convention=convention, setting=setting, form=form)))


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
    result: dict[str, float] = _call("latticeParameters", np.asarray(basis, dtype=np.float64))
    return result


def is_valid_cell(angles: Mapping[str, float], *, min_volume_ratio: Optional[float] = None) -> bool:
    """Whether three angles (degrees) belong to a cell: each between 0° and 180°, and the three axes
    not in one plane (the volume radicand 1 − cos²α − cos²β − cos²γ + 2 cos α cos β cos γ is
    positive). With ``min_volume_ratio`` also refuses nearly flat cells, whose ratio V/(abc), the
    square root of the radicand, is smaller.

    Parameters
    ----------
    min_volume_ratio : keyword-only, optional
        The smallest accepted ratio V/(abc) of the cell volume to the volume of the box of its edge
        lengths; default 0, which accepts every cell that has a volume. A ratio near 0 is a nearly
        flat cell.
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
    a, b, c), 0° to 180°. Throws for a zero vector.
    """
    return float(_call("angleBetweenDirections", np.asarray(basis, dtype=np.float64), np.asarray(u), np.asarray(v)))


def angle_between_planes(basis: ArrayLike, h: ArrayLike, k: ArrayLike) -> float:
    """The angle in degrees between the normals of two planes (hkl), 0° to 180°: the angle between
    the reciprocal vectors h·a* + k·b* + l·c*. For two faces this is 180° minus the interior
    dihedral angle. Throws for a zero vector.
    """
    return float(_call("angleBetweenPlanes", np.asarray(basis, dtype=np.float64), np.asarray(h), np.asarray(k)))


def residual_operations(
    operations: Sequence[Mapping[str, Any]], basis: ArrayLike, *, tolerance: Optional[float] = None
) -> list[Operation]:
    """The operations of a list that keep the metric of a cell: W with WᵀGW = G, G the metric tensor
    of ``basis``. The operations are integer matrices on lattice coordinates, as
    ``lattice_operations`` gives them; the list is taken as it is and the kept operations are the
    ones of the list, in its order. The deviation counts relative to the largest entry of G
    (``tolerance``, default ``EPSILON``). An operation combined with time reversal belongs to the
    magnetic API.

    Parameters
    ----------
    tolerance : keyword-only, optional
        The largest accepted deviation of WᵀGW from G, relative to the largest entry of G; default
        ``EPSILON``.
    """
    return list(
        _call(
            "residualOperations",
            list(operations),
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
    """The zone axis [uvw] of two planes (hkl): the solution of the zone law hu + kv + lw = 0, the
    cross product h₁ × h₂ reduced (so its sign follows the order of the planes), or ``null`` for
    parallel planes.
    """
    result = _call("zoneAxis", np.asarray(h1), np.asarray(h2))
    return None if result is None else np.asarray(result, dtype=np.int64)


def change_of_axes(p: ArrayLike) -> dict[str, NDArray[np.float64]]:
    """The transformation of indices for a change of basis (a′, b′, c′) = (a, b, c)·P (ITA Vol. A,
    2006, Section 5.1.3): the columns of ``P`` are the new basis vectors in the old one. The
    coordinates of a direction transform with Q = P⁻¹, the indices of a plane with Pᵀ, so that hu +
    kv + lw is the same in both bases. Raises SymcrysError unless det P > 0 (a right-handed basis).
    """
    result: dict[str, NDArray[np.float64]] = _call("changeOfAxes", np.asarray(p, dtype=np.float64))
    return result


def describe_operations(
    key: str, *, convention: Optional[Convention] = None, setting: Optional[int] = None
) -> list[dict[str, Any]]:
    """Each operation of the crystal class described geometrically, in the order of ``operations``
    for the same key and options. Axes are named by the symmetry direction they lie along: in the
    ITC convention with the sign of ITA Table 2.1.3.1, in the Birss convention signed as birss-app
    signs them (first non-zero Cartesian component positive); the sign fixes what the sense refers
    to.

    Parameters
    ----------
    convention : keyword-only, optional
        Default ``'itc'``.
    setting : keyword-only, optional
        1-based setting index; default: the default setting of the convention.

    Returns
    -------
    list of dict
        In each, ``axis`` (if present) has ``lattice`` (int64, shape (3,)) and ``cartesian``
        (float64, shape (3,)).
    """
    return list(_call("describeOperations", key, _shared.options(convention=convention, setting=setting)))


def point_group_of(
    operations: Sequence[Mapping[str, Any]], *, tolerance: Optional[float] = None
) -> Optional[dict[str, Any]]:
    """The crystal class generated by a list of Cartesian operations, for instance those left after
    distorting a crystal: its key, and the setting whose operations it equals in the frame of
    symcrys (absent if the group is the class in another orientation, e.g. a threefold axis along
    [111]). The list is closed into a group first, two matrices being equal when no entry differs by
    ``tolerance`` (default ``EPSILON``) or more. Returns None if the operations generate no crystal
    class (an operation of order 5, a group larger than 48). Raises SymcrysError for a matrix that
    is not orthogonal (within ``tolerance``, at least ``EPSILON``). The classes ``1`` and ``-1``
    have no orientation, so they always have setting 1. The first call builds a table of the groups
    (about 0.1 s; docs/conventions.md, "Point group of a list of operations").

    Parameters
    ----------
    tolerance : keyword-only, optional
        Two matrices are the same operation if no entry differs by this much or more, and a matrix
        counts as orthogonal and crystallographic within it. Default ``EPSILON`` (10⁻⁶); a caller
        whose matrices carry rounding errors passes a larger value, below 0.1.
    """
    result = _call("pointGroupOf", list(operations), _shared.options(tolerance=tolerance))
    return None if result is None else dict(result)


def describe_operations_of(
    operations: Sequence[Mapping[str, Any]], *, tolerance: Optional[float] = None
) -> list[dict[str, Any]]:
    """Each operation of a list described geometrically, in the order of the list: kind, n, the
    Cartesian axis (rotation or rotoinversion axis, mirror normal) with its first non-zero
    component, in the order x, y, z, positive, and for n ≥ 3 the sense about that axis. The axes are
    not named by lattice directions, since the list need not belong to a setting; for a crystal
    class given by its key, ``describe_operations`` names them. Raises SymcrysError for a matrix
    that is not orthogonal or not a crystallographic operation (a rotation part by an angle other
    than 360°/n, n = 1, 2, 3, 4, 6), both within ``tolerance`` (default ``EPSILON``, as for
    ``point_group_of``).

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
    return list(_call("describeOperationsOf", list(operations), _shared.options(tolerance=tolerance)))


def symmetry_directions(
    key: str, *, convention: Optional[Convention] = None, setting: Optional[int] = None
) -> list[dict[str, Any]]:
    """The positions of the full Hermann–Mauguin symbol in the requested convention and setting,
    each with its symmetry directions (ITA Table 2.1.3.1) and the symmetry elements along them. All
    positions of the crystal family are listed, also those the symbol of the class leaves out (then
    without ``symbol``); the triclinic family has none. The directions keep the sign of Table
    2.1.3.1 in both conventions; in the Birss convention an axis of ``describe_operations`` may be
    reversed, so match it to a direction whose dot product with it is ±1, not by identity.

    Parameters
    ----------
    convention : keyword-only, optional
        Default ``'itc'``.
    setting : keyword-only, optional
        1-based setting index; default: the default setting of the convention.

    Returns
    -------
    list of dict
        Each entry of ``directions`` has ``lattice`` (int64, shape (3,)) and ``cartesian`` (float64,
        shape (3,)).
    """
    return list(_call("symmetryDirections", key, _shared.options(convention=convention, setting=setting)))


# --- properties of a list of operations ----------------------------------------------------------


def is_centrosymmetric_of(operations: Sequence[Mapping[str, Any]]) -> bool:
    """True if the group generated by ``operations`` contains the inversion, e.g. for the operations
    of a distorted crystal. A list that is not closed is closed first. For a crystal class, read
    ``point_group(key)["centrosymmetric"]``.
    """
    return bool(_call("isCentrosymmetricOf", list(operations)))


def is_chiral_of(operations: Sequence[Mapping[str, Any]]) -> bool:
    """True if the group generated by ``operations`` is chiral: proper rotations only. For a crystal
    class, read ``point_group(key)["chiral"]``. Polar is the named property ``'pyroelectric'``:
    ``allows_property_of(operations, 'pyroelectric')``.
    """
    return bool(_call("isChiralOf", list(operations)))


# --- site symmetry and Wyckoff positions ----------------------------------------------------------


def site_symmetry(
    operations: Sequence[Mapping[str, Any]], direction: ArrayLike, *, tolerance: Optional[float] = None
) -> SiteSymmetry:
    """The site symmetry of ``direction`` (any non-zero vector, Cartesian) under ``operations``,
    which may be any list of point operations (for instance those of a distorted crystal). The
    operations fixing the direction within the tolerance are closed under the products found in the
    list and the direction is set onto their fixed space, repeated until stable, so that for a group
    the result is a subgroup and the set direction lies exactly on its elements. For a list that is
    not a group, ``multiplicity`` may not be an integer. Raises SymcrysError for a zero vector, and
    if the closed operations fix no common direction (a tolerance far too large, e.g. 0.5).

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
        _call("siteSymmetry", list(operations), np.asarray(direction), _shared.options(tolerance=tolerance))
    )


def lattice_operations(
    key: str, *, convention: Optional[Convention] = None, setting: Optional[int] = None
) -> list[Operation]:
    """The operations of the crystal class in the conventional lattice basis (a, b, c; for the
    trigonal classes the hexagonal axes), in the order of ``operations`` for the same setting and
    convention: integer matrices W acting on the coordinates of a lattice direction [uvw], W =
    B⁻¹·R·B with the basis B of ``lattice_basis`` and the Cartesian matrix R of ``operations``. They
    do not depend on the cell angles, so they exist for every family; for the monoclinic and
    triclinic families a, b, c are taken along x, y, z, as for the Wyckoff positions. In the ITC
    convention they are the matrices of ITA's general position (6th ed., Table 3.2.3.2). Not
    orthogonal in general: pass them to no function that takes Cartesian operations
    (docs/conventions.md, "Lattice basis and orbits").

    Parameters
    ----------
    convention : keyword-only, optional
        Default ``'itc'``.
    setting : keyword-only, optional
        1-based setting index; default: the default setting of the convention.

    Returns
    -------
    list of dict
        Dicts ``{"matrix"}``; each matrix is a float64 array of shape (3, 3) holding integers (the
        fixed rule for matrices).
    """
    return list(_call("latticeOperations", key, _shared.options(convention=convention, setting=setting)))


def orbit(
    key: str,
    indices: Mapping[str, ArrayLike],
    *,
    convention: Optional[Convention] = None,
    setting: Optional[int] = None,
) -> list[dict[str, Any]]:
    """The orbit of a face (hkl) or of a lattice direction [uvw] under a crystal class, exactly, in
    the lattice basis: the distinct faces (directions), in the order in which the operations reach
    them (so in the ITC convention the given face first), each with the indices of the operations
    that map the given one onto it. A face transforms with the inverse transpose of a lattice
    operation, h' = W⁻ᵀ·h, a direction with the operation itself, u' = W·u. The number of entries is
    the multiplicity of the face (direction). Raises SymcrysError unless exactly one of ``hkl`` and
    ``uvw`` is given, as three integers not all zero (hexagonal axes: three indices, without i).

    Parameters
    ----------
    convention : keyword-only, optional
        Default ``'itc'``.
    setting : keyword-only, optional
        1-based setting index; default: the default setting of the convention.

    Returns
    -------
    list of dict
        In each, ``hkl`` (or ``uvw``) is an int64 array of shape (3,) and ``operations`` an int64
        array of shape (n,); ``indices`` is a dict ``{"hkl": ...}`` or ``{"uvw": ...}``.
    """
    return list(_call("orbit", key, dict(indices), _shared.options(convention=convention, setting=setting)))


def orbit_of(
    operations: Sequence[Mapping[str, Any]], direction: ArrayLike, *, tolerance: Optional[float] = None
) -> list[dict[str, Any]]:
    """The orbit of a direction (any non-zero vector, Cartesian, e.g. a face normal) under a list of
    operations, for instance those of a distorted crystal: the images of its unit vector under each
    operation, coinciding images merged (closer than ``tolerance``, default ``EPSILON``, as for
    ``site_symmetry``), in the order in which the operations reach them, each with the indices of
    the operations that map the direction there. The list is taken as it is, not closed into a
    group. Raises SymcrysError for a zero vector and for a matrix that is not orthogonal.

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
        _call("orbitOf", list(operations), np.asarray(direction), _shared.options(tolerance=tolerance))
    )


def wyckoff_positions(
    key: str, *, convention: Optional[Convention] = None, setting: Optional[int] = None
) -> list[dict[str, Any]]:
    """The Wyckoff positions of a crystal class for directions, as ITA tabulates them (general
    position first), in the ITC convention only (docs/conventions.md, "Site symmetry and Wyckoff
    positions").

    Parameters
    ----------
    convention : keyword-only, optional
        Default ``'itc'``.
    setting : keyword-only, optional
        1-based setting index; default: the default setting of the convention.

    Returns
    -------
    list of dict
        In each, ``representative`` has ``hkl`` (int64, shape (3,)) and ``cartesian`` (float64,
        shape (3,)), ``site_symmetry_operations`` is an int64 array of shape (n,).
    """
    return list(_call("wyckoffPositions", key, _shared.options(convention=convention, setting=setting)))


def wyckoff_position_of(
    key: str,
    direction: ArrayLike,
    *,
    convention: Optional[Convention] = None,
    setting: Optional[int] = None,
    tolerance: Optional[float] = None,
) -> dict[str, Any]:
    """The Wyckoff position of a direction (Cartesian) in a crystal class: the position whose site
    symmetry is conjugate to that of the direction (ITA's definition). ``tolerance`` as for
    ``site_symmetry``.

    Parameters
    ----------
    convention : keyword-only, optional
        Default ``'itc'``.
    setting : keyword-only, optional
        1-based setting index; default: the default setting of the convention.
    tolerance : keyword-only, optional
        A direction counts as fixed by an operation if the operation moves its unit vector by less
        than this (Euclidean distance). Default 10⁻⁶; a caller whose directions carry rounding
        errors (e.g. read from a rounded link) passes a larger value.

    Returns
    -------
    dict
        ``representative`` has ``hkl`` (int64, shape (3,)) and ``cartesian`` (float64, shape (3,)),
        ``site_symmetry_operations`` is an int64 array of shape (n,).
    """
    return dict(
        _call(
            "wyckoffPositionOf",
            key,
            np.asarray(direction),
            _shared.options(convention=convention, setting=setting, tolerance=tolerance),
        )
    )


# --- crystal forms -------------------------------------------------------------------------------


def crystal_forms(
    key: str, *, convention: Optional[Convention] = None, setting: Optional[int] = None
) -> list[dict[str, Any]]:
    """The crystal forms of a crystal class, as ITA 6th ed. Table 3.2.3.2 prints them: for each
    Wyckoff position (general position first) its basic form (two for the cubic faces (hhl) of -43m
    and m-3m), then its limiting forms. In the ITC convention only, like the Wyckoff positions
    (docs/conventions.md, "Crystal forms").

    Parameters
    ----------
    convention : keyword-only, optional
        Default ``'itc'``.
    setting : keyword-only, optional
        1-based setting index; default: the default setting of the convention.

    Returns
    -------
    list of dict
        In each, ``representative`` has ``hkl`` (int64, shape (3,)) and ``cartesian`` (float64,
        shape (3,)).
    """
    return list(_call("crystalForms", key, _shared.options(convention=convention, setting=setting)))


# --- tensors -------------------------------------------------------------------------------------


def tensor_form(
    key: str,
    spec: TensorSpec | Mapping[str, Any] | TensorPropertyName,
    *,
    convention: Optional[Convention] = None,
    setting: Optional[int] = None,
) -> TensorForm:
    """The form of a tensor under a crystal class in the requested setting (default: the default
    setting of the convention, ``'itc'`` unless given). The tensor is given by its specification or
    by the name of a property in ``TENSOR_PROPERTIES`` (``'piezoelectric'``). The convention matters
    only through the setting: the same setting index gives the same form in both conventions
    (docs/conventions.md, "Tensors").

    Parameters
    ----------
    convention : keyword-only, optional
        Default ``'itc'``.
    setting : keyword-only, optional
        1-based setting index; default: the default setting of the convention.

    Returns
    -------
    dict
        ``basis`` float64 array of shape (p, 3**rank), ``parameters`` int64 array of shape (p,
        rank), ``relations`` float64 array of shape (3**rank - p, 3**rank), ``rank``; p is the
        number of free parameters. A row of ``basis`` reshaped to ``(3,) * rank`` is a tensor.
    """
    return _shared.form(
        _call("tensorForm", key, _shared.spec(spec), _shared.options(convention=convention, setting=setting))
    )


def tensor_form_of(
    operations: Sequence[Mapping[str, Any]], spec: TensorSpec | Mapping[str, Any] | TensorPropertyName
) -> TensorForm:
    """The form of a tensor under the group generated by ``operations``, e.g. the site symmetry of a
    surface normal (``site_symmetry``) or the operations of a distorted crystal. The tensor is given
    by its specification or by the name of a property in ``TENSOR_PROPERTIES``. The operations are
    Cartesian and orthogonal; a list that is not closed is closed first.

    Returns
    -------
    dict
        ``basis`` float64 array of shape (p, 3**rank), ``parameters`` int64 array of shape (p,
        rank), ``relations`` float64 array of shape (3**rank - p, 3**rank), ``rank``; p is the
        number of free parameters.
    """
    return _shared.form(_call("tensorFormOf", list(operations), _shared.spec(spec)))


def allows_property(key: str, name: TensorPropertyName) -> bool:
    """True if the crystal class allows the named property, e.g. ``allows_property('-6m2',
    'piezoelectric')``: the tensor that describes it (``TENSOR_PROPERTIES``) has a non-zero form
    under the class. Symmetry only allows a property; whether a crystal shows it is a question of
    the material. It does not depend on setting or convention. Raises SymcrysError for an unknown
    key or name.
    """
    return bool(_call("allowsProperty", key, name))


def allowed_properties(key: str) -> list[str]:
    """The named properties the crystal class allows, in the order of ``TENSOR_PROPERTIES``."""
    return list(_call("allowedProperties", key))


def allows_property_of(operations: Sequence[Mapping[str, Any]], name: TensorPropertyName) -> bool:
    """True if the group generated by ``operations`` allows the named property, e.g. for the site
    symmetry of a surface normal or the operations of a distorted crystal.
    """
    return bool(_call("allowsPropertyOf", list(operations), name))


def allowed_properties_of(operations: Sequence[Mapping[str, Any]]) -> list[str]:
    """The named properties the group generated by ``operations`` allows."""
    return list(_call("allowedPropertiesOf", list(operations)))


def rotate_tensor(
    tensor: ArrayLike, rotation: ArrayLike, spec: TensorSpec | Mapping[str, Any] | TensorPropertyName
) -> NDArray[np.float64]:
    """The components of ``tensor`` (length 3^rank, flat index) in a frame rotated by the orthogonal
    matrix ``rotation``: t′_{i…} = f·Σ R_{ia}…R_{…}·t_{a…}, with f = det(R) for an axial tensor and
    1 for a polar one. To express a tensor in the frame of a surface, pass the matrix whose rows are
    the new axes in the old frame. The kind of tensor is given by its specification or by the name
    of a property in ``TENSOR_PROPERTIES``.

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


from . import magnetic  # noqa: E402  (the magnetic API, also reachable as symcrys.magnetic)
