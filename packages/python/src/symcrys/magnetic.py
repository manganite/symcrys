"""symcrys.magnetic: the magnetic API, for the 122 magnetic point groups, with time reversal.

The functions have the names they have in ``symcrys``, the crystallographic API; the module decides
which reading a key has. Here a key of type ``'I'`` (``"32"``) is a white (colourless) group: the
symmetry of a magnetically ordered crystal in which time reversal does not occur at all. A crystal
without magnetic order has the grey group of its class (quartz: ``"321'"``), which allows no
time-odd property. Operations carry ``time_reversal``, a tensor specification ``time_parity``
(docs/conventions.md, "Two entry points").
"""

from __future__ import annotations

from typing import Any, Literal, Mapping, Optional, Sequence, TypedDict

import numpy as np
from numpy.typing import ArrayLike, NDArray

from . import _shared
from ._convert import from_js
from ._engine import SymcrysError
from ._shared import MAGNETIC, Convention, IntrinsicSymmetry, SiteSymmetry, TensorForm, TensorParity

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
    "find_point_group",
    "generators",
    "holohedry",
    "is_centrosymmetric_of",
    "is_chiral_of",
    "is_point_group_key",
    "lattice_operations",
    "lattice_basis",
    "operations",
    "orbit",
    "orbit_of",
    "point_group",
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


def find_point_group(hm: str, convention: Optional[Convention] = None) -> Optional[dict[str, Any]]:
    """Finds one of the 122 magnetic point groups (the 32 crystal classes included) by a symbol in
    the given convention (default ``'itc'``): the short symbol of a setting, a full symbol, or the
    key (spaces are ignored). A prime ``'`` marks time reversal: ``4'/mmm'``, ``2221'``. A symbol
    that names one setting gives that setting; the key, and a short symbol that several settings
    share (the monoclinic ones: ``2'`` for unique axis b and c), give the default setting of the
    convention. In the Birss convention two keys are the Birss symbol of a setting that is not the
    default (``mm'm'`` and ``6'/mmm'``, setting 2; Birss prints ``m'm'm`` and ``6'/mm'm`` for these
    groups) and give that setting, like any symbol. Returns None if nothing matches, also for a
    value that is not a string. Symbols are written as in this library: ``-`` for the overbar, also
    in the Birss convention (``m'-3'm``, where Birss prints ``m'3m``; docs/conventions.md, "Where
    ITC and Birss differ").
    """
    args = [hm] if convention is None else [hm, convention]
    result = _call("findPointGroup", *args)
    return None if result is None else dict(result)


def settings(key: str, convention: Optional[Convention] = None) -> list[dict[str, Any]]:
    """The settings of a point group, with symbols and the default of the given convention (default
    ``'itc'``).
    """
    args = [key] if convention is None else [key, convention]
    return list(_call("settings", *args))


def operations(key: str, *, convention: Optional[Convention] = None, setting: Optional[int] = None) -> list[Operation]:
    """All operations of the point group in the requested setting (default: the convention's default
    setting). ITC convention: in ITA's order, identity first, then as ITA numbers the general
    position of the crystal class; an operation of a magnetic group has the number it has in the
    class, and a grey group lists the class first, then the same sequence with time reversal. Birss
    convention: in birss-app's order (docs/conventions.md, "Order of the operations"). The matrices
    are Cartesian (docs/conventions.md, "Cartesian frame").

    Parameters
    ----------
    convention : keyword-only, optional
        Default ``'itc'``.
    setting : keyword-only, optional
        1-based setting index; default: the default setting of the convention.

    Returns
    -------
    list of dict
        Dicts ``{"matrix", "time_reversal"}``; each matrix is a float64 array of shape (3, 3).
    """
    return list(_call("operations", key, _shared.options(convention=convention, setting=setting)))


def generators(key: str, *, convention: Optional[Convention] = None, setting: Optional[int] = None) -> list[Operation]:
    """Generators of the point group in the requested setting (docs/conventions.md, "Generators").
    ITC convention: ITA's selected generators in printed order, without the identity and ITA's
    lattice translations, so the list is empty for ``1``; for ``mm2`` settings 2 and 3, which ITA
    does not list, those of setting 1 carried into their frame; for a magnetic group, those of its
    class with the time reversal they have in the group, for a grey group followed by ``1'``. Birss
    convention: birss-app's generators (for ``1`` the identity, as in birss-app).

    Parameters
    ----------
    convention : keyword-only, optional
        Default ``'itc'``.
    setting : keyword-only, optional
        1-based setting index; default: the default setting of the convention.

    Returns
    -------
    list of dict
        Dicts ``{"matrix", "time_reversal"}``; each matrix is a float64 array of shape (3, 3).
    """
    return list(_call("generators", key, _shared.options(convention=convention, setting=setting)))


def symbol(
    key: str,
    *,
    convention: Optional[Convention] = None,
    setting: Optional[int] = None,
    form: Optional[Literal["short", "full", "schoenflies"]] = None,
) -> str:
    """A symbol of the point group in the requested convention and setting.

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


def describe_operations(
    key: str, *, convention: Optional[Convention] = None, setting: Optional[int] = None
) -> list[dict[str, Any]]:
    """Each operation of the point group described geometrically, in the order of ``operations`` for
    the same key and options. Axes are named by the symmetry direction they lie along: in the ITC
    convention with the sign of ITA Table 2.1.3.1, in the Birss convention signed as birss-app signs
    them (first non-zero Cartesian component positive); the sign fixes what the sense refers to.

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
    """True if the group generated by ``operations`` contains the inversion, not combined with time
    reversal: e.g. for the operations of a distorted crystal. A list that is not closed is closed
    first. For a point group given by its key, read ``point_group(key)["centrosymmetric"]``.
    """
    return bool(_call("isCentrosymmetricOf", list(operations)))


def is_chiral_of(operations: Sequence[Mapping[str, Any]]) -> bool:
    """True if the group generated by ``operations`` is chiral: proper rotations only, with or
    without time reversal (products of proper rotations are proper, so the list need not be closed).
    For a point group given by its key, read ``point_group(key)["chiral"]``.
    """
    return bool(_call("isChiralOf", list(operations)))


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
    group, ``multiplicity`` may not be an integer. Raises SymcrysError for a zero vector, and if the
    closed operations fix no common direction (a tolerance far too large, e.g. 0.5).

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
    """The operations of a point group in the conventional lattice basis (a, b, c; for the trigonal
    classes the hexagonal axes), in the order and with the time reversal of ``operations`` for the
    same setting and convention: integer matrices W acting on the coordinates of a lattice vector
    [uvw], W = B⁻¹·R·B with the basis B of ``lattice_basis`` and the Cartesian matrix R. They do not
    depend on the cell angles, so they exist for every family; for the monoclinic and triclinic
    families a, b, c are taken along x, y, z, as for the Wyckoff positions. In the ITC convention
    they are the matrices of ITA's general position (6th ed., Table 3.2.3.2).

    Parameters
    ----------
    convention : keyword-only, optional
        Default ``'itc'``.
    setting : keyword-only, optional
        1-based setting index; default: the default setting of the convention.

    Returns
    -------
    list of dict
        Dicts ``{"matrix", "time_reversal"}``; each matrix is a float64 array of shape (3, 3)
        holding integers (the fixed rule for matrices).
    """
    return list(_call("latticeOperations", key, _shared.options(convention=convention, setting=setting)))


def orbit(
    key: str,
    indices: Mapping[str, ArrayLike],
    *,
    convention: Optional[Convention] = None,
    setting: Optional[int] = None,
) -> list[dict[str, Any]]:
    """The orbit of a face (hkl) or of a lattice direction [uvw] under a point group, exactly, in
    the lattice basis: the distinct faces (directions), in the order in which the operations reach
    them (so in the ITC convention the given face first), each with the indices of the operations
    that map the given one onto it. A face transforms with the inverse transpose of a lattice
    operation, h' = W⁻ᵀ·h, a direction with the operation itself, u' = W·u. The number of entries is
    the multiplicity of the face (direction), and the operations of the first entry, if it is the
    given one, are its site symmetry. Time reversal plays no part. Raises SymcrysError unless
    exactly one of ``hkl`` and ``uvw`` is given, as three integers not all zero (hexagonal axes:
    three indices, without i).

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
    group. Time reversal is ignored. Raises SymcrysError for a zero vector and for a matrix that is
    not orthogonal (Cartesian; not one of ``lattice_operations``).

    Parameters
    ----------
    tolerance : keyword-only, optional
        A direction counts as fixed by an operation if the operation moves its unit vector by less
        than this (Euclidean distance). Default 10⁻⁶; a caller whose directions carry rounding
        errors (e.g. read from a rounded link) passes a larger value.

    Returns
    -------
    list of dict
        In each, ``direction`` is a float64 array of shape (3,) and ``operations`` an int64 array of
        shape (n,).
    """
    return list(
        _call("orbitOf", list(operations), np.asarray(direction), _shared.options(tolerance=tolerance))
    )

# --- tensors -------------------------------------------------------------------------------------


def tensor_form(
    key: str,
    spec: TensorSpec | Mapping[str, Any] | TensorPropertyName,
    *,
    convention: Optional[Convention] = None,
    setting: Optional[int] = None,
) -> TensorForm:
    """The form of a tensor under a point group, a crystal class or a magnetic point group, in the
    requested setting (default: the default setting of the convention, ``'itc'`` unless given). The
    tensor is given by its specification or by the name of a property in ``TENSOR_PROPERTIES``
    (``'piezoelectric'``). The convention matters only through the setting: the same setting index
    gives the same form in both conventions (docs/conventions.md, "Tensors").

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
    Cartesian and orthogonal, and each says whether it is combined with time reversal
    (``time_reversal``, ``True`` or ``False``); a list that is not closed is closed first.

    Returns
    -------
    dict
        ``basis`` float64 array of shape (p, 3**rank), ``parameters`` int64 array of shape (p,
        rank), ``relations`` float64 array of shape (3**rank - p, 3**rank), ``rank``; p is the
        number of free parameters.
    """
    return _shared.form(_call("tensorFormOf", list(operations), _shared.spec(spec)))


def allows_property(key: str, name: TensorPropertyName) -> bool:
    """True if the point group allows the named property, e.g. ``allows_property('-6m2',
    'piezoelectric')``. It does not depend on setting or convention. Raises SymcrysError for an
    unknown key or name.
    """
    return bool(_call("allowsProperty", key, name))


def allowed_properties(key: str) -> list[str]:
    """The named properties the point group allows, in the order of ``TENSOR_PROPERTIES``."""
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
