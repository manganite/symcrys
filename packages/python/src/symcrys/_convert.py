"""Fixed rules between the plain data of the TypeScript API and Python (#30).

- Names: camelCase in JavaScript, snake_case in Python (``timeReversal`` ↔ ``time_reversal``), for
  function names and for the keys of objects.
- Arrays of numbers (vectors, matrices, nested to any depth with equal lengths) become NumPy arrays:
  ``float64`` under the keys in ``FLOAT_KEYS`` (matrices, Cartesian vectors, tensor bases and
  relations), otherwise ``int64`` when every entry is an integer (index lists, Miller indices,
  lattice directions) and ``float64`` if not. Other values stay plain Python values.
- Arguments: NumPy arrays and scalars become lists and numbers, tuples lists, and the keys of
  dictionaries are turned into camelCase.
"""

from __future__ import annotations

import re
from typing import Any

import numpy as np

FLOAT_KEYS = frozenset({"matrix", "cartesian", "direction", "basis", "relations", "plane"})


def snake(name: str) -> str:
    return re.sub(r"(?<=[a-z0-9])([A-Z])", r"_\1", name).lower()


def camel(name: str) -> str:
    head, *rest = name.split("_")
    return head + "".join(p[:1].upper() + p[1:] for p in rest)


def _is_number(x: Any) -> bool:
    return isinstance(x, (int, float)) and not isinstance(x, bool)


def _shape(x: Any) -> tuple[int, ...] | None:
    """Shape of a rectangular nested list of numbers, or None."""
    if _is_number(x):
        return ()
    if not isinstance(x, list) or len(x) == 0:
        return None
    shapes = [_shape(e) for e in x]
    if shapes[0] is None or any(s != shapes[0] for s in shapes):
        return None
    return (len(x), *shapes[0])


def from_js(x: Any, key: str | None = None, *, floats: bool = False) -> Any:
    if isinstance(x, dict):
        return {snake(k): from_js(v, k) for k, v in x.items()}
    if isinstance(x, list):
        if _shape(x) is not None:
            a = np.array(x)
            if floats or key in FLOAT_KEYS or not np.all(np.equal(np.mod(a, 1), 0)):
                return a.astype(np.float64)
            return a.astype(np.int64)
        if len(x) == 0 and key is not None and (floats or key in FLOAT_KEYS):
            return np.zeros((0,), dtype=np.float64)
        return [from_js(e, key) for e in x]
    return x


def to_js(x: Any) -> Any:
    if isinstance(x, np.ndarray):
        return x.tolist()
    if isinstance(x, np.generic):
        return x.item()
    if isinstance(x, dict):
        return {camel(str(k)): to_js(v) for k, v in x.items()}
    if isinstance(x, (list, tuple)):
        return [to_js(e) for e in x]
    return x
