"""symcrys.plane: the plane API, for the 17 plane groups and the 10 plane point groups.

Coordinates and operations are in the lattice basis (a, b), as ITA (6th ed., 2016) prints them in
Chapter 2.2. Keys are the symbols ITA prints: ``"p2mg"``, ``"c2mm"`` for the plane groups,
``"2mm"``, ``"3m"`` for the plane point groups. A matrix is a float64 array of shape (2, 2) with
integer entries, a translation, a point and a vertex float64 arrays of shape (2,); a direction of a
line is an int64 array of shape (2,) (docs/conventions.md, "Plane groups").
"""

from __future__ import annotations

from typing import Any, Mapping, Optional, Sequence, TypedDict

import numpy as np
from numpy.typing import ArrayLike, NDArray

from . import _shared
from ._engine import SymcrysError

PLANE = "plane."
"""Prefix of the names of the plane API at the boundary to the library (``plane.operations``)."""


class Operation(TypedDict):
    matrix: NDArray[np.float64]
    translation: NDArray[np.float64]


__all__ = [
    "PLANE_GROUP_KEYS",
    "POINT_GROUP_KEYS",
    "VERSION",
    "Operation",
    "SymcrysError",
    "asymmetric_unit",
    "describe_operations",
    "describe_operations_of",
    "generators",
    "operations",
    "orbit",
    "plane_group",
    "point_group",
    "settings",
    "site_symmetry",
    "symbol",
    "symmetry_elements",
    "wyckoff_position_of",
    "wyckoff_positions",
]

VERSION: str = _shared.value(PLANE + "VERSION")
"""The version of symcrys, the same for the TypeScript and the Python package."""
PLANE_GROUP_KEYS: tuple[str, ...] = tuple(_shared.value(PLANE + "PLANE_GROUP_KEYS"))
"""The short symbols of the 17 plane groups, in ITA's order (plane group n at index n − 1)."""
POINT_GROUP_KEYS: tuple[str, ...] = tuple(_shared.value(PLANE + "POINT_GROUP_KEYS"))
"""The keys of the 10 plane point groups, in the order of ITA Table 3.2.1.1."""


def _call(name: str, *args: Any) -> Any:
    return _shared.call(PLANE + name, *args)


def _floats(x: Any, *shape: int) -> NDArray[np.float64]:
    return np.asarray(x, dtype=np.float64).reshape(shape) if shape else np.asarray(x, dtype=np.float64)


def _ints(x: Any) -> NDArray[np.int64]:
    return np.asarray(x, dtype=np.int64)


def _operation(op: dict[str, Any]) -> Operation:
    return {"matrix": _floats(op["matrix"], 2, 2), "translation": _floats(op["translation"], 2)}


def _point(point: ArrayLike) -> list[float]:
    p = np.asarray(point, dtype=np.float64)
    if p.shape != (2,):
        raise SymcrysError(f"A point of the plane has two coordinates, not an array of shape {p.shape}", "RangeError")
    return [float(v) for v in p]


# --- groups -------------------------------------------------------------------------------------


def plane_group(key: str) -> dict[str, Any]:
    """The plane group with this key (short symbol). Raises SymcrysError for an unknown key.

    Returns
    -------
    dict
        ``centring`` is a float64 array of shape (n, 2), n = 0 or 1.
    """
    result = dict(_call("planeGroup", key))
    result["centring"] = _floats(result["centring"], -1, 2)
    return result


def point_group(key: str) -> dict[str, Any]:
    """The plane point group with this key. Raises SymcrysError for an unknown key."""
    return dict(_call("pointGroup", key))


def settings(key: str) -> list[dict[str, Any]]:
    """The settings of a plane point group: two for ``3m`` (``3m1``, the default, and ``31m``), one
    for the others. Raises SymcrysError for an unknown key.
    """
    return [dict(s) for s in _call("settings", key)]


def symbol(key: str, *, setting: Optional[int] = None) -> str:
    """The symbol of a plane point group in a setting: ``'3m1'`` or ``'31m'`` for ``3m``, otherwise
    the key.

    Parameters
    ----------
    setting : keyword-only, optional
        1-based setting: for the point group ``3m`` 1 is ``3m1`` (default) and 2 is ``31m``; the
        other point groups have one, and a plane group takes only 1.
    """
    return str(_call("symbol", key, _shared.options(setting=setting)))


def operations(key: str, *, setting: Optional[int] = None) -> list[Operation]:
    """The operations of a plane group or a plane point group, in ITA's order, identity first. A
    plane group: one per coset of the integer translations, translations in [0, 1), the general
    position as numbered, then for a centred group the same sequence with the centring added (the
    "(1/2,1/2)+ set"). A point group: the linear parts of its symmorphic plane group (pm for m, p3m1
    and p31m for the settings of 3m), translation zero. Raises SymcrysError for an unknown key or
    setting.

    Parameters
    ----------
    setting : keyword-only, optional
        1-based setting: for the point group ``3m`` 1 is ``3m1`` (default) and 2 is ``31m``; the
        other point groups have one, and a plane group takes only 1.

    Returns
    -------
    list of dict
        Dicts ``{"matrix", "translation"}``: float64 arrays of shape (2, 2) and (2,).
    """
    return [_operation(op) for op in _call("operations", key, _shared.options(setting=setting))]


def generators(key: str, *, setting: Optional[int] = None) -> list[Operation]:
    """ITA's selected generators, in printed order, without the identity and the integer
    translations: for a centred plane group the centring translation first. A point group: the
    linear parts of the generators of its symmorphic plane group. Raises SymcrysError for an unknown
    key or setting.

    Parameters
    ----------
    setting : keyword-only, optional
        1-based setting: for the point group ``3m`` 1 is ``3m1`` (default) and 2 is ``31m``; the
        other point groups have one, and a plane group takes only 1.

    Returns
    -------
    list of dict
        Dicts ``{"matrix", "translation"}``: float64 arrays of shape (2, 2) and (2,).
    """
    return [_operation(op) for op in _call("generators", key, _shared.options(setting=setting))]


def describe_operations(key: str, *, setting: Optional[int] = None) -> list[dict[str, Any]]:
    """Each operation of ``operations`` (same key and setting) described geometrically, index for
    index: what it is, its order and sense, where its symmetry element lies, its glide part. Raises
    SymcrysError for an unknown key or setting.

    Parameters
    ----------
    setting : keyword-only, optional
        1-based setting: for the point group ``3m`` 1 is ``3m1`` (default) and 2 is ``31m``; the
        other point groups have one, and a plane group takes only 1.

    Returns
    -------
    list of dict
        ``translation``, ``location`` and ``glide`` (where present) are float64 arrays of shape
        (2,), ``direction`` and ``normal`` int64 arrays of shape (2,).
    """
    return [_description(d) for d in _call("describeOperations", key, _shared.options(setting=setting))]


def describe_operations_of(operations: Sequence[Mapping[str, Any]]) -> list[dict[str, Any]]:
    """Any operations of the plane (lattice basis) described geometrically, index for index, as
    ``describe_operations`` describes those of a group: for instance a product of operations, an
    operation shifted by a lattice translation, or the operations of a site symmetry. Each operation
    is ``{ matrix, translation }`` as ``operations`` gives it. Each matrix must have integer entries
    (within 10⁻⁹) and be the linear part of a crystallographic plane point group (determinant ±1,
    order 1, 2, 3, 4 or 6); each translation must lie within 10⁻⁹ of a fraction with a denominator
    of at most 12 (1/3 as 0.333…), as the translations of ``operations`` and their products do.
    Raises SymcrysError otherwise.

    Returns
    -------
    list of dict
        As ``describe_operations``: ``translation``, ``location`` and ``glide`` (where present)
        float64 arrays of shape (2,), ``direction`` and ``normal`` int64 arrays of shape (2,).
    """
    return [_description(d) for d in _call("describeOperationsOf", list(operations))]


def _description(d: dict[str, Any]) -> dict[str, Any]:
    d = dict(d)
    for k in ("translation", "location", "glide"):
        if k in d:
            d[k] = _floats(d[k], 2)
    for k in ("direction", "normal"):
        if k in d:
            d[k] = _ints(d[k])
    return d


# --- points -------------------------------------------------------------------------------------


def wyckoff_positions(key: str) -> list[dict[str, Any]]:
    """The Wyckoff positions of a plane group as ITA prints them, general position first. Raises
    SymcrysError for an unknown key and for a plane point group, whose positions are not in symcrys
    yet.
    """
    return [dict(w) for w in _call("wyckoffPositions", key)]


def site_symmetry(key: str, point: ArrayLike, *, tolerance: Optional[float] = None) -> dict[str, Any]:
    """The site symmetry of a point (lattice basis) under a plane group: the operations that map it
    onto itself modulo the lattice within the tolerance, closed into a group, and the point set onto
    their fixed space. Raises SymcrysError for an unknown key, a point that is not two finite
    numbers, or a tolerance outside (0, 1/2).

    Parameters
    ----------
    tolerance : keyword-only, optional
        Two points count as the same, modulo the lattice, if each coordinate (lattice basis) differs
        by less than this from an integer. Default 10⁻⁶; must be below 1/2.

    Returns
    -------
    dict
        ``operations`` int64 array of shape (n,), ``point`` float64 array of shape (2,),
        ``multiplicity``, ``general``.
    """
    result = dict(_call("siteSymmetry", key, _point(point), _shared.options(tolerance=tolerance)))
    result["operations"] = _ints(result["operations"])
    result["point"] = _floats(result["point"], 2)
    return result


def wyckoff_position_of(key: str, point: ArrayLike, *, tolerance: Optional[float] = None) -> dict[str, Any]:
    """The Wyckoff position of a point (lattice basis) under a plane group, as ``wyckoff_positions``
    gives it: the printed position of the point's multiplicity whose coordinates, with the centring,
    reach the point set onto its site symmetry. Raises SymcrysError as ``site_symmetry``.

    Parameters
    ----------
    tolerance : keyword-only, optional
        Two points count as the same, modulo the lattice, if each coordinate (lattice basis) differs
        by less than this from an integer. Default 10⁻⁶; must be below 1/2.
    """
    return dict(_call("wyckoffPositionOf", key, _point(point), _shared.options(tolerance=tolerance)))


def orbit(key: str, point: ArrayLike, *, tolerance: Optional[float] = None) -> NDArray[np.float64]:
    """The orbit of a point (lattice basis) under a plane group: its distinct images in the
    conventional cell, each in [0, 1), in the order of the operations that first give them; images
    that coincide within the tolerance are merged. Raises SymcrysError as ``site_symmetry``.

    Parameters
    ----------
    tolerance : keyword-only, optional
        Two points count as the same, modulo the lattice, if each coordinate (lattice basis) differs
        by less than this from an integer. Default 10⁻⁶; must be below 1/2.

    Returns
    -------
    numpy.ndarray
        A float64 array of shape (n, 2), the images as rows.
    """
    return _floats(_call("orbit", key, _point(point), _shared.options(tolerance=tolerance)), -1, 2)


# --- the cell -----------------------------------------------------------------------------------


def asymmetric_unit(key: str) -> dict[str, Any]:
    """The asymmetric unit of a plane group as ITA prints it: a convex polygon given by its vertices
    and, per edge, the printed inequality that holds it. Raises SymcrysError for an unknown key.

    Returns
    -------
    dict
        ``vertices`` a float64 array of shape (n, 2), ``inequalities`` an int64 array of shape (n,
        3).
    """
    result = dict(_call("asymmetricUnit", key))
    return {"vertices": _floats(result["vertices"], -1, 2), "inequalities": _ints(result["inequalities"])}


def symmetry_elements(key: str) -> dict[str, Any]:
    """The symmetry elements of a plane group in its conventional cell [0, 1]², boundary included:
    every rotation centre with the highest order of a rotation about it, and every mirror and glide
    line that crosses the cell, with the segment inside it. Raises SymcrysError for an unknown key.

    Returns
    -------
    dict
        ``rotations``: dicts ``{"order", "point"}``, point a float64 array of shape (2,); ``lines``:
        dicts ``{"kind", "direction", "normal", "glide", "segment"}``, direction and normal int64 of
        shape (2,), glide float64 of shape (2,), segment float64 of shape (2, 2), the two ends as
        rows.
    """
    result = dict(_call("symmetryElements", key))
    return {
        "rotations": [{"order": int(r["order"]), "point": _floats(r["point"], 2)} for r in result["rotations"]],
        "lines": [
            {
                "kind": line["kind"],
                "direction": _ints(line["direction"]),
                "normal": _ints(line["normal"]),
                "glide": _floats(line["glide"], 2),
                "segment": _floats(line["segment"], 2, 2),
            }
            for line in result["lines"]
        ],
    }

