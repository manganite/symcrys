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
TensorPropertyName = Literal["pyroelectric", "piezoelectric", "gyrotropic", "ferromagnetic", "magnetoelectric", "piezomagnetic"]


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
    "is_centrosymmetric",
    "is_chiral",
    "is_point_group_key",
    "is_polar",
    "lattice_basis",
    "laue_class",
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
]

VERSION: str = _shared.value(MAGNETIC + "VERSION")
POINT_GROUP_KEYS: tuple[str, ...] = tuple(_shared.value(MAGNETIC + "POINT_GROUP_KEYS"))
"""Keys of the 122 magnetic point groups: the 32 crystal classes (white groups), 32 grey, 58 black-and-white groups."""
LATTICE_SYMMETRY_DIRECTIONS: dict[str, list[NDArray[np.int64]]] = _shared.lattice_symmetry_directions(
    MAGNETIC + "LATTICE_SYMMETRY_DIRECTIONS"
)
"""Per crystal family, per position of the symbol: the lattice directions [uvw], shape (n, 3)."""
TENSOR_PROPERTIES: dict[str, dict[str, Any]] = from_js(_shared.value(MAGNETIC + "TENSOR_PROPERTIES"))
"""The named tensor properties: name → ``{"spec", "description", "source"}`` (``"gyrotropic"`` is optical activity)."""


def _call(name: str, *args: Any, floats: bool = False) -> Any:
    return _shared.call(MAGNETIC + name, *args, floats=floats)


# --- point groups -------------------------------------------------------------------------------


def point_groups() -> list[dict[str, Any]]:
    """The 122 magnetic point groups (types I, II, III): key, type, crystal system, order."""
    return list(_call("pointGroups"))


def point_group(key: str) -> dict[str, Any]:
    """One magnetic point group by its key (``"4'/mmm'"``; ``"32"`` is the white group)."""
    return dict(_call("pointGroup", key))


def is_point_group_key(key: str) -> bool:
    """True for the key of one of the 122 magnetic point groups."""
    return bool(_call("isPointGroupKey", key))


def find_point_group(hm: str, convention: Optional[Convention] = None) -> Optional[dict[str, Any]]:
    """Key and setting of the magnetic point group with this symbol (a prime ``'`` for time reversal), or None."""
    args = [hm] if convention is None else [hm, convention]
    result = _call("findPointGroup", *args)
    return None if result is None else dict(result)


def settings(key: str, convention: Optional[Convention] = None) -> list[dict[str, Any]]:
    """The settings of a magnetic point group: index, symbols, unique axis, whether default in the convention."""
    args = [key] if convention is None else [key, convention]
    return list(_call("settings", *args))


def operations(key: str, *, convention: Optional[Convention] = None, setting: Optional[int] = None) -> list[Operation]:
    """All operations of a magnetic point group in a setting: Cartesian 3×3 matrices and time reversal."""
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


def is_centrosymmetric(key: str) -> bool:
    return bool(_call("isCentrosymmetric", key))


def is_polar(key: str) -> bool:
    return bool(_call("isPolar", key))


def is_chiral(key: str) -> bool:
    return bool(_call("isChiral", key))


def laue_class(key: str) -> str:
    return str(_call("laueClass", key))


def crystal_family(system: str) -> str:
    return str(_call("crystalFamily", system))


def lattice_basis(family: str) -> NDArray[np.float64]:
    """Columns a, b, c of the conventional basis in the Cartesian frame (families with fixed angles)."""
    return np.asarray(_call("latticeBasis", family, floats=True), dtype=np.float64)


def describe_operations(
    key: str, *, convention: Optional[Convention] = None, setting: Optional[int] = None
) -> list[dict[str, Any]]:
    """Kind, order, axis, sense and time reversal of each operation, in the order of ``operations``."""
    return list(_call("describeOperations", key, _shared.options(convention=convention, setting=setting)))


def symmetry_directions(
    key: str, *, convention: Optional[Convention] = None, setting: Optional[int] = None
) -> list[dict[str, Any]]:
    return list(_call("symmetryDirections", key, _shared.options(convention=convention, setting=setting)))


# --- site symmetry ----------------------------------------------------------


def site_symmetry(
    operations: Sequence[Mapping[str, Any]], direction: ArrayLike, *, tolerance: Optional[float] = None
) -> SiteSymmetry:
    """The operations (indices into ``operations``) that leave a direction fixed, and its multiplicity."""
    return _shared.site(
        _call("siteSymmetry", list(operations), np.asarray(direction), _shared.options(tolerance=tolerance))
    )


# --- tensors -------------------------------------------------------------------------------------


def tensor_form(
    key: str,
    spec: TensorSpec | Mapping[str, Any] | TensorPropertyName,
    *,
    convention: Optional[Convention] = None,
    setting: Optional[int] = None,
) -> TensorForm:
    """The form of a property tensor under a magnetic point group (docs/conventions.md, "Tensors").

    ``spec``: ``{"rank": 3, "parity": "polar", "time_parity": "i", "intrinsic": "jk"}`` or the name
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
    """True if the magnetic point group allows the named property (``TENSOR_PROPERTIES``), e.g. ``"piezoelectric"``."""
    return bool(_call("allowsProperty", key, name))


def allowed_properties(key: str) -> list[str]:
    """The named properties the magnetic point group allows, in the order of ``TENSOR_PROPERTIES``."""
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
