"""symcrys: crystallographic symmetry calculations, from Python.

A thin layer over the TypeScript library symcrys of the same version, which runs in an embedded
JavaScript engine (quickjs-ng). Every function here calls the function of the same name in the
library (camelCase there, snake_case here) and returns its result as plain Python data, matrices
and vectors as NumPy arrays (rules in ``symcrys._convert``). The conventions, frames and print
sources are documented once, for both languages: https://github.com/manganite/symcrys/blob/main/docs/conventions.md

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
    "lattice_basis",
    "magnetic",
    "operations",
    "point_group",
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
__version__ = VERSION
POINT_GROUP_KEYS: tuple[str, ...] = tuple(_shared.value("POINT_GROUP_KEYS"))
"""Keys of the 32 crystal classes."""
LATTICE_SYMMETRY_DIRECTIONS: dict[str, list[NDArray[np.int64]]] = _shared.lattice_symmetry_directions(
    "LATTICE_SYMMETRY_DIRECTIONS"
)
"""Per crystal family, per position of the symbol: the lattice directions [uvw], shape (n, 3)."""
TENSOR_PROPERTIES: dict[str, dict[str, Any]] = from_js(_shared.value("TENSOR_PROPERTIES"))
"""The named tensor properties of the crystal classes, those of time-even tensors: name → ``{"spec", "description", "source"}`` (``"gyrotropic"`` is optical activity)."""


def _call(name: str, *args: Any, floats: bool = False) -> Any:
    return _shared.call(name, *args, floats=floats)


# --- point groups -------------------------------------------------------------------------------


def point_groups() -> list[dict[str, Any]]:
    """The 32 crystal classes: key, crystal system, order and the properties fixed by the operations
    (centrosymmetric, polar, chiral, Laue class)."""
    return list(_call("pointGroups"))


def point_group(key: str) -> dict[str, Any]:
    """One crystal class by its key (``"-3m"``)."""
    return dict(_call("pointGroup", key))


def is_point_group_key(key: str) -> bool:
    """True for the key of one of the 32 crystal classes."""
    return bool(_call("isPointGroupKey", key))


def find_point_group(hm: str, convention: Optional[Convention] = None) -> Optional[dict[str, Any]]:
    """Key and setting of the crystal class with this Hermann–Mauguin symbol, or None."""
    args = [hm] if convention is None else [hm, convention]
    result = _call("findPointGroup", *args)
    return None if result is None else dict(result)


def settings(key: str, convention: Optional[Convention] = None) -> list[dict[str, Any]]:
    """The settings of a crystal class: index, symbols, unique axis, whether default in the convention."""
    args = [key] if convention is None else [key, convention]
    return list(_call("settings", *args))


def operations(key: str, *, convention: Optional[Convention] = None, setting: Optional[int] = None) -> list[Operation]:
    """All operations of a crystal class in a setting: Cartesian 3×3 matrices."""
    return list(_call("operations", key, _shared.options(convention=convention, setting=setting)))


def generators(key: str, *, convention: Optional[Convention] = None, setting: Optional[int] = None) -> list[Operation]:
    return list(_call("generators", key, _shared.options(convention=convention, setting=setting)))


def symbol(
    key: str,
    *,
    convention: Optional[Convention] = None,
    setting: Optional[int] = None,
    form: Optional[Literal["short", "full", "schoenflies"]] = None,
) -> str:
    return str(_call("symbol", key, _shared.options(convention=convention, setting=setting, form=form)))


def crystal_family(system: str) -> str:
    return str(_call("crystalFamily", system))


def holohedry(system: str) -> str:
    """The holohedry of a crystal system: the class that is the point symmetry of its lattice.

    ``holohedry("trigonal")`` is ``"-3m"``; the symmetry of the hexagonal lattice, which the
    trigonal classes also occur with, is ``holohedry(crystal_family("trigonal"))``, ``"6/mmm"``.
    """
    return str(_call("holohedry", system))


def lattice_basis(family: str) -> NDArray[np.float64]:
    """Columns a, b, c of the conventional basis in the Cartesian frame (families with fixed angles)."""
    return np.asarray(_call("latticeBasis", family, floats=True), dtype=np.float64)


def describe_operations(
    key: str, *, convention: Optional[Convention] = None, setting: Optional[int] = None
) -> list[dict[str, Any]]:
    """Kind, order, axis and sense of each operation, in the order of ``operations``."""
    return list(_call("describeOperations", key, _shared.options(convention=convention, setting=setting)))


def symmetry_directions(
    key: str, *, convention: Optional[Convention] = None, setting: Optional[int] = None
) -> list[dict[str, Any]]:
    return list(_call("symmetryDirections", key, _shared.options(convention=convention, setting=setting)))


# --- properties of a list of operations ----------------------------------------------------------


def is_centrosymmetric_of(operations: Sequence[Mapping[str, Any]]) -> bool:
    """True if the group generated by the operations contains the inversion.

    For a point group given by its key, read ``point_group(key)["centrosymmetric"]``.
    """
    return bool(_call("isCentrosymmetricOf", list(operations)))


def is_chiral_of(operations: Sequence[Mapping[str, Any]]) -> bool:
    """True if the group generated by the operations has proper rotations only.

    For a point group given by its key, read ``point_group(key)["chiral"]``. Polar is the named
    property ``"pyroelectric"``: ``allows_property_of(operations, "pyroelectric")``.
    """
    return bool(_call("isChiralOf", list(operations)))


# --- site symmetry and Wyckoff positions ----------------------------------------------------------


def site_symmetry(
    operations: Sequence[Mapping[str, Any]], direction: ArrayLike, *, tolerance: Optional[float] = None
) -> SiteSymmetry:
    """The operations (indices into ``operations``) that leave a direction fixed, and its multiplicity."""
    return _shared.site(
        _call("siteSymmetry", list(operations), np.asarray(direction), _shared.options(tolerance=tolerance))
    )


def wyckoff_positions(
    key: str, *, convention: Optional[Convention] = None, setting: Optional[int] = None
) -> list[dict[str, Any]]:
    """ITA's Wyckoff positions of a class for directions (ITC convention)."""
    return list(_call("wyckoffPositions", key, _shared.options(convention=convention, setting=setting)))


def wyckoff_position_of(
    key: str,
    direction: ArrayLike,
    *,
    convention: Optional[Convention] = None,
    setting: Optional[int] = None,
    tolerance: Optional[float] = None,
) -> dict[str, Any]:
    return dict(
        _call(
            "wyckoffPositionOf",
            key,
            np.asarray(direction),
            _shared.options(convention=convention, setting=setting, tolerance=tolerance),
        )
    )


# --- tensors -------------------------------------------------------------------------------------


def tensor_form(
    key: str,
    spec: TensorSpec | Mapping[str, Any] | TensorPropertyName,
    *,
    convention: Optional[Convention] = None,
    setting: Optional[int] = None,
) -> TensorForm:
    """The form of a property tensor under a crystal class (docs/conventions.md, "Tensors").

    ``spec``: ``{"rank": 3, "parity": "polar", "intrinsic": "jk"}`` or the name
    of a property in ``TENSOR_PROPERTIES`` (``"piezoelectric"``).
    """
    return _shared.form(
        _call("tensorForm", key, _shared.spec(spec), _shared.options(convention=convention, setting=setting))
    )


def tensor_form_of(
    operations: Sequence[Mapping[str, Any]], spec: TensorSpec | Mapping[str, Any] | TensorPropertyName
) -> TensorForm:
    """The form under the group generated by any Cartesian operations, e.g. a site symmetry."""
    return _shared.form(_call("tensorFormOf", list(operations), _shared.spec(spec)))


def allows_property(key: str, name: TensorPropertyName) -> bool:
    """True if the crystal class allows the named property (``TENSOR_PROPERTIES``), e.g. ``"piezoelectric"``."""
    return bool(_call("allowsProperty", key, name))


def allowed_properties(key: str) -> list[str]:
    """The named properties the crystal class allows, in the order of ``TENSOR_PROPERTIES``."""
    return list(_call("allowedProperties", key))


def allows_property_of(operations: Sequence[Mapping[str, Any]], name: TensorPropertyName) -> bool:
    """True if the group generated by the operations allows the named property."""
    return bool(_call("allowsPropertyOf", list(operations), name))


def allowed_properties_of(operations: Sequence[Mapping[str, Any]]) -> list[str]:
    """The named properties the group generated by the operations allows."""
    return list(_call("allowedPropertiesOf", list(operations)))


def rotate_tensor(
    tensor: ArrayLike, rotation: ArrayLike, spec: TensorSpec | Mapping[str, Any] | TensorPropertyName
) -> NDArray[np.float64]:
    """The components (flat, length 3**rank) in a frame rotated by the orthogonal matrix ``rotation``."""
    flat = np.asarray(tensor, dtype=np.float64).reshape(-1)
    return np.asarray(
        _call("rotateTensor", flat, np.asarray(rotation), _shared.spec(spec), floats=True), dtype=np.float64
    )


from . import magnetic  # noqa: E402  (the magnetic API, also reachable as symcrys.magnetic)
