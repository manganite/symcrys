"""symcrys: crystallographic symmetry calculations, from Python.

A thin layer over the TypeScript library symcrys of the same version, which runs in an embedded
JavaScript engine (quickjs-ng). Every function here calls the function of the same name in the
library (camelCase there, snake_case here) and returns its result as plain Python data, matrices
and vectors as NumPy arrays (rules in ``symcrys._convert``). The conventions, frames and print
sources are documented once, for both languages: https://github.com/manganite/symcrys/blob/main/docs/conventions.md

Each call costs about a millisecond or more (the forms of rank-4 tensors up to a few tenths of a
second); fetch operations or forms once and compute with NumPy, rather than calling in a loop.
"""

from __future__ import annotations

from typing import Any, Literal, Mapping, Optional, Sequence, TypedDict

import numpy as np
from numpy.typing import ArrayLike, NDArray

from . import _engine
from ._convert import from_js, to_js
from ._engine import SymcrysError

Convention = Literal["itc", "birss"]
TensorParity = Literal["polar", "axial"]
TimeParity = Literal["i", "c"]
IntrinsicSymmetry = Literal["none", "ij", "jk", "ij_kl", "voigt"]


class TensorSpec(TypedDict):
    """The kind of tensor (keys also accepted in camelCase, e.g. ``timeParity``)."""

    rank: int
    parity: TensorParity
    time_parity: TimeParity
    intrinsic: IntrinsicSymmetry


class Operation(TypedDict):
    matrix: NDArray[np.float64]
    time_reversal: bool


class TensorForm(TypedDict):
    rank: int
    basis: NDArray[np.float64]
    """Shape (number of parameters, 3**rank): reduced row echelon form, flat index in C order."""
    parameters: NDArray[np.int64]
    """Shape (number of parameters, rank): the components that are the free parameters."""
    relations: NDArray[np.float64]
    """Shape (3**rank - number of parameters, 3**rank): rows r with r @ t = 0 for every allowed t."""


class SiteSymmetry(TypedDict):
    operations: NDArray[np.int64]
    direction: NDArray[np.float64]
    multiplicity: int
    general: bool


__all__ = [
    "LATTICE_SYMMETRY_DIRECTIONS",
    "POINT_GROUP_KEYS",
    "VERSION",
    "SymcrysError",
    "crystal_family",
    "describe_operations",
    "find_point_group",
    "generators",
    "is_centrosymmetric",
    "is_chiral",
    "is_piezoelectric",
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
    "wyckoff_position_of",
    "wyckoff_positions",
]

VERSION: str = _engine.value("VERSION")
__version__ = VERSION
POINT_GROUP_KEYS: tuple[str, ...] = tuple(_engine.value("POINT_GROUP_KEYS"))
LATTICE_SYMMETRY_DIRECTIONS: dict[str, Any] = from_js(_engine.value("LATTICE_SYMMETRY_DIRECTIONS"))


def _options(**kwargs: Any) -> dict[str, Any]:
    """An options object: the keyword arguments that were given, keys in camelCase."""
    options: dict[str, Any] = to_js({k: v for k, v in kwargs.items() if v is not None})
    return options


def _call(name: str, *args: Any, floats: bool = False) -> Any:
    return from_js(_engine.invoke(name, *(to_js(a) for a in args)), floats=floats)


# --- point groups -------------------------------------------------------------------------------


def point_groups() -> list[dict[str, Any]]:
    """The 32 crystal classes: key, type, crystal system, order."""
    return list(_call("pointGroups"))


def point_group(key: str) -> dict[str, Any]:
    """One crystal class by its key (ITC short symbol, e.g. ``'-3m'``)."""
    return dict(_call("pointGroup", key))


def is_point_group_key(key: str) -> bool:
    return bool(_call("isPointGroupKey", key))


def find_point_group(hm: str, convention: Optional[Convention] = None) -> Optional[dict[str, Any]]:
    """Key and setting for a Hermann–Mauguin symbol, or None."""
    args = [hm] if convention is None else [hm, convention]
    result = _call("findPointGroup", *args)
    return None if result is None else dict(result)


def settings(key: str, convention: Optional[Convention] = None) -> list[dict[str, Any]]:
    """The settings of a class: index, symbols, unique axis, whether default in the convention."""
    args = [key] if convention is None else [key, convention]
    return list(_call("settings", *args))


def operations(key: str, *, convention: Optional[Convention] = None, setting: Optional[int] = None) -> list[Operation]:
    """All operations of a class in a setting: Cartesian 3×3 matrices and time reversal."""
    return list(_call("operations", key, _options(convention=convention, setting=setting)))


def generators(key: str, *, convention: Optional[Convention] = None, setting: Optional[int] = None) -> list[Operation]:
    return list(_call("generators", key, _options(convention=convention, setting=setting)))


def symbol(
    key: str,
    *,
    convention: Optional[Convention] = None,
    setting: Optional[int] = None,
    form: Optional[Literal["short", "full", "schoenflies"]] = None,
) -> str:
    return str(_call("symbol", key, _options(convention=convention, setting=setting, form=form)))


def is_centrosymmetric(key: str) -> bool:
    return bool(_call("isCentrosymmetric", key))


def is_polar(key: str) -> bool:
    return bool(_call("isPolar", key))


def is_chiral(key: str) -> bool:
    return bool(_call("isChiral", key))


def is_piezoelectric(key: str) -> bool:
    return bool(_call("isPiezoelectric", key))


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
    return list(_call("describeOperations", key, _options(convention=convention, setting=setting)))


def symmetry_directions(
    key: str, *, convention: Optional[Convention] = None, setting: Optional[int] = None
) -> list[dict[str, Any]]:
    return list(_call("symmetryDirections", key, _options(convention=convention, setting=setting)))


# --- site symmetry and Wyckoff positions ----------------------------------------------------------


def site_symmetry(
    operations: Sequence[Mapping[str, Any]], direction: ArrayLike, *, tolerance: Optional[float] = None
) -> SiteSymmetry:
    """The operations (indices into ``operations``) that leave a direction fixed, and its multiplicity."""
    result: SiteSymmetry = _call("siteSymmetry", list(operations), np.asarray(direction), _options(tolerance=tolerance))
    result["operations"] = np.asarray(result["operations"], dtype=np.int64)
    return result


def wyckoff_positions(
    key: str, *, convention: Optional[Convention] = None, setting: Optional[int] = None
) -> list[dict[str, Any]]:
    """ITA's Wyckoff positions of a class for directions (ITC convention)."""
    return list(_call("wyckoffPositions", key, _options(convention=convention, setting=setting)))


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
            _options(convention=convention, setting=setting, tolerance=tolerance),
        )
    )


# --- tensors -------------------------------------------------------------------------------------


def _form(result: dict[str, Any]) -> TensorForm:
    rank = int(result["rank"])
    dim = 3**rank
    n = len(result["basis"])
    return {
        "rank": rank,
        "basis": np.asarray(result["basis"], dtype=np.float64).reshape(n, dim),
        "parameters": np.asarray(result["parameters"], dtype=np.int64).reshape(n, rank),
        "relations": np.asarray(result["relations"], dtype=np.float64).reshape(dim - n, dim),
    }


def tensor_form(
    key: str, spec: Mapping[str, Any], *, convention: Optional[Convention] = None, setting: Optional[int] = None
) -> TensorForm:
    """The form of a property tensor under a point group (docs/conventions.md, "Tensors").

    ``spec``: ``{"rank": 3, "parity": "polar", "time_parity": "i", "intrinsic": "jk"}``.
    """
    return _form(_call("tensorForm", key, dict(spec), _options(convention=convention, setting=setting)))


def tensor_form_of(operations: Sequence[Mapping[str, Any]], spec: Mapping[str, Any]) -> TensorForm:
    """The form under the group generated by any Cartesian operations, e.g. a site symmetry."""
    return _form(_call("tensorFormOf", list(operations), dict(spec)))


def rotate_tensor(tensor: ArrayLike, rotation: ArrayLike, spec: Mapping[str, Any]) -> NDArray[np.float64]:
    """The components (flat, length 3**rank) in a frame rotated by the orthogonal matrix ``rotation``."""
    flat = np.asarray(tensor, dtype=np.float64).reshape(-1)
    return np.asarray(_call("rotateTensor", flat, np.asarray(rotation), dict(spec), floats=True), dtype=np.float64)
