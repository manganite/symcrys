"""What the generated modules of the Python layer share: the checks of the arguments and the call
into the library (scripts/python-api.mjs, #99)."""

from __future__ import annotations

from typing import Any, Mapping

import numpy as np
from numpy.typing import NDArray

from . import _engine
from ._convert import convert as _convert_schema, to_js


def options(**kwargs: Any) -> dict[str, Any]:
    """An options object: the keyword arguments that were given, keys in camelCase."""
    result: dict[str, Any] = to_js({k: v for k, v in kwargs.items() if v is not None})
    return result


def operation_list(operations: Any, keys: tuple[str, ...] = ("cartesian",)) -> list[Any]:
    """A list of operations as the library takes it, checked: a sequence of mappings with ``keys``.

    Without the check, an array of matrices reached the library and failed there with "cannot read
    property '0' of undefined" (#92).
    """
    shape = "{" + ", ".join(f'"{k}"' for k in keys) + "}"
    numeric_array = isinstance(operations, np.ndarray) and operations.dtype != object
    if numeric_array or isinstance(operations, (Mapping, str, bytes)) or not hasattr(operations, "__iter__"):
        raise _engine.SymcrysError(
            f"operations must be a list of operations {shape}, as operations() returns them, "
            f"not {type(operations).__name__}",
            "RangeError",
        )
    ops = list(operations)
    for i, op in enumerate(ops):
        if not isinstance(op, Mapping):
            raise _engine.SymcrysError(
                f"operation {i} must be a mapping {shape}, as operations() returns it, not {type(op).__name__}",
                "RangeError",
            )
        missing = [k for k in keys if k not in op]
        if missing:
            hint = (
                "; its 'matrix' is the matrix W in the lattice basis since symcrys 0.11.0"
                if "cartesian" in missing and "matrix" in op
                else ""
            )
            raise _engine.SymcrysError(
                f"operation {i} has no key {', '.join(repr(k) for k in missing)}: it must be a mapping {shape}, "
                f"as operations() returns it{hint}",
                "RangeError",
            )
    # Plain dicts, which the conversion to JSON takes (a Mapping such as MappingProxyType it does not).
    return [dict(op) for op in ops]


def value(name: str) -> Any:
    return _engine.value(name)


def spec(spec_or_name: Mapping[str, Any] | str) -> Any:
    return spec_or_name if isinstance(spec_or_name, str) else mapping(spec_or_name, "spec")


def array(value: Any, what: str, dtype: Any = None) -> NDArray[Any]:
    """An argument as a NumPy array of real numbers, or SymcrysError naming it (a ragged list, a
    string, complex numbers): the library checks the shape and the values (#92)."""
    try:
        result = np.asarray(value, dtype=dtype)
    except (TypeError, ValueError) as e:
        raise _engine.SymcrysError(f"{what} must be an array of numbers ({e})") from None
    if result.dtype.kind not in "biuf":
        raise _engine.SymcrysError(f"{what} must be an array of real numbers, not of {result.dtype}")
    return result


def mapping(value: Any, what: str) -> dict[str, Any]:
    """An argument as a dict, or SymcrysError naming it."""
    if not isinstance(value, Mapping):
        raise _engine.SymcrysError(f"{what} must be a mapping, not {type(value).__name__}")
    return dict(value)


def call(name: str, *args: Any) -> Any:
    """Calls the function ``name`` of the library (``magnetic.…``, ``plane.…`` for the other entry
    points) and returns its result as JSON gives it; the generated modules convert it (``convert``)."""
    return _engine.invoke(name, *(to_js(a) for a in args))


def convert(value: Any, schema: tuple[Any, ...]) -> Any:
    """A result converted by its schema (``_convert.convert``)."""
    return _convert_schema(value, schema)


def plane_point(point: Any) -> list[float]:
    """A point of the plane: two coordinates, or SymcrysError."""
    p = array(point, "point", np.float64)
    if p.shape != (2,):
        raise _engine.SymcrysError(f"A point of the plane has two coordinates, not an array of shape {p.shape}", "RangeError")
    return [float(v) for v in p]
