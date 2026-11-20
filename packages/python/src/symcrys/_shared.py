"""What the two entry points of the Python layer share: types and the call into the library."""

from __future__ import annotations

from typing import Any, Literal, Mapping, TypedDict

import numpy as np
from numpy.typing import NDArray

from . import _engine
from ._convert import from_js, to_js

Convention = Literal["itc", "birss"]
TensorParity = Literal["polar", "axial"]
IntrinsicSymmetry = Literal["none", "ij", "jk", "ij_kl", "voigt"]

MAGNETIC = "magnetic."
"""Prefix of the names of the magnetic API at the boundary to the library (``magnetic.tensorForm``)."""


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


def options(**kwargs: Any) -> dict[str, Any]:
    """An options object: the keyword arguments that were given, keys in camelCase."""
    result: dict[str, Any] = to_js({k: v for k, v in kwargs.items() if v is not None})
    return result


def call(name: str, *args: Any, floats: bool = False) -> Any:
    """Calls the function ``name`` of the library (``magnetic.…`` for the magnetic API)."""
    return from_js(_engine.invoke(name, *(to_js(a) for a in args)), floats=floats)


def value(name: str) -> Any:
    return _engine.value(name)


def lattice_symmetry_directions(name: str) -> dict[str, list[NDArray[np.int64]]]:
    return {
        family: [np.asarray(d, dtype=np.int64).reshape(-1, 3) for d in positions]
        for family, positions in _engine.value(name).items()
    }


def form(result: dict[str, Any]) -> TensorForm:
    rank = int(result["rank"])
    dim = 3**rank
    n = len(result["basis"])
    return {
        "rank": rank,
        "basis": np.asarray(result["basis"], dtype=np.float64).reshape(n, dim),
        "parameters": np.asarray(result["parameters"], dtype=np.int64).reshape(n, rank),
        "relations": np.asarray(result["relations"], dtype=np.float64).reshape(dim - n, dim),
    }


def spec(spec_or_name: Mapping[str, Any] | str) -> Any:
    return spec_or_name if isinstance(spec_or_name, str) else dict(spec_or_name)


def site(result: Any) -> SiteSymmetry:
    typed: SiteSymmetry = result
    typed["operations"] = np.asarray(typed["operations"], dtype=np.int64)
    return typed
