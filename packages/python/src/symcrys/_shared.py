"""What the generated modules of the Python layer share: the checks of the arguments and the call
into the library (scripts/python-api.mjs, #99)."""

from __future__ import annotations

import dataclasses
from typing import Any, Mapping

import numpy as np
from numpy.typing import NDArray

from . import _engine
from ._convert import convert as _convert_schema, to_js


def options(**kwargs: Any) -> dict[str, Any]:
    """An options object: the keyword arguments that were given, keys in camelCase."""
    result: dict[str, Any] = to_js({k: v for k, v in kwargs.items() if v is not None})
    return result


def operation_list(operations: Any, keys: tuple[str, ...] = ("cartesian",), bare: str | None = None) -> list[Any]:
    """A list of operations as the library takes it, checked: the ``Operations`` of a module (#137 H1),
    a sequence of mappings with ``keys``, or, where ``bare`` names the field (``"cartesian"`` in
    ``symcrys``), an array of matrices of shape (n, 3, 3).

    Without the check, an array of matrices reached the library and failed there with "cannot read
    property '0' of undefined" (#92).
    """
    if dataclasses.is_dataclass(operations) and not isinstance(operations, type):
        return records(operations)
    shape = "{" + ", ".join(f'"{k}"' for k in keys) + "}"
    if isinstance(operations, (Mapping, str, bytes)) or not hasattr(operations, "__iter__"):
        raise _engine.SymcrysError(
            f"operations must be Operations, as operations() returns them, or a list of operations {shape}, "
            f"not {type(operations).__name__}",
            "RangeError",
        )
    ops = list(operations)
    if not all(isinstance(op, Mapping) for op in ops):
        # An array of matrices, or a list of them: Cartesian matrices where the module reads them so.
        matrices = None
        try:
            matrices = np.asarray(ops, dtype=np.float64) if ops else None
        except (TypeError, ValueError):
            pass
        if matrices is not None and matrices.ndim == 3 and matrices.shape[1:] == (3, 3):
            if bare is None:
                raise _engine.SymcrysError(
                    "an array of matrices does not say what the operations are here: pass Operations, as "
                    f"operations() returns them, or a list of operations {shape}"
                    + (" (each says whether it carries time reversal)" if "time_reversal" in keys else ""),
                    "RangeError",
                )
            return [{bare: m} for m in matrices]
        bad = next(i for i, op in enumerate(ops) if not isinstance(op, Mapping))
        raise _engine.SymcrysError(
            f"operation {bad} must be a mapping {shape}, as in a list of operations, not {type(ops[bad]).__name__}",
            "RangeError",
        )
    for i, op in enumerate(ops):
        missing = [k for k in keys if k not in op]
        if missing:
            hint = (
                "; its 'matrix' is the matrix W in the lattice basis since symcrys 0.11.0"
                if "cartesian" in missing and "matrix" in op
                else ""
            )
            raise _engine.SymcrysError(
                f"operation {i} has no key {', '.join(repr(k) for k in missing)}: it must be a mapping {shape}{hint}",
                "RangeError",
            )
    # Plain dicts, which the conversion to JSON takes (a Mapping such as MappingProxyType it does not).
    return [dict(op) for op in ops]


def records(operations: Any) -> list[dict[str, Any]]:
    """The ``Operations`` of a module as a list of records, one per operation."""
    fields = [f.name for f in dataclasses.fields(operations)]
    return [{name: getattr(operations, name)[i] for name in fields} for i in range(len(operations))]


def operations_of(operations: Any, cls: Any, keys: tuple[str, ...]) -> Any:
    """Operations of the class ``cls`` from Operations or a list of operations with every field."""
    if isinstance(operations, cls):
        return operations
    ops = operation_list(operations, keys)
    fields = [f.name for f in dataclasses.fields(cls)]
    for i, op in enumerate(ops):
        missing = [f for f in fields if f not in op]
        if missing:
            raise _engine.SymcrysError(
                f"operation {i} has no key {', '.join(repr(k) for k in missing)}: the result keeps the operations, "
                f"so each needs {', '.join(repr(f) for f in fields)}",
                "RangeError",
            )
    return cls(**{f: np.asarray([op[f] for op in ops]) for f in fields})


def select(operations: Any, kept: list[dict[str, Any]]) -> Any:
    """The operations at the indices the library kept (``index`` of each record it returned)."""
    return operation_at(operations, np.asarray([k["index"] for k in kept], dtype=np.int64))


def operation_at(operations: Any, index: Any) -> Any:
    """``ops[index]``: for an integer one operation as a dict (a bool for a field of one value per
    operation), otherwise the ``Operations`` of the rows that ``index`` selects (a slice, a list of
    indices, a boolean mask)."""
    fields = [f.name for f in dataclasses.fields(operations)]
    if isinstance(index, (int, np.integer)) and not isinstance(index, (bool, np.bool_)):
        n = len(operations)
        if not -n <= int(index) < n:
            raise IndexError(f"operation {int(index)} of {n}")
        row = {name: getattr(operations, name)[int(index)] for name in fields}
        return {name: (v.item() if v.ndim == 0 else v) for name, v in row.items()}
    try:
        return type(operations)(**{name: getattr(operations, name)[index] for name in fields})
    except IndexError as e:
        raise IndexError(f"Operations[{index!r}]: {e}") from None


def freeze(operations: Any, fields: Mapping[str, tuple[Any, tuple[int, ...]]]) -> None:
    """Checks and freezes the arrays of ``Operations``: dtype, shape (n, …) with one n for all, and no
    writes (#137 H1). An integer field takes only whole numbers."""
    n = None
    for name, (dtype, shape) in fields.items():
        value = getattr(operations, name)
        try:
            a = np.array(value, dtype=np.bool_ if dtype is np.bool_ else np.float64)
        except (TypeError, ValueError) as e:
            raise _engine.SymcrysError(f"Operations.{name} must be an array of numbers ({e})", "RangeError") from None
        if a.size == 0:
            a = a.reshape((0, *shape))
        if a.ndim != len(shape) + 1 or a.shape[1:] != shape:
            dims = ", ".join(["n", *map(str, shape)]) + ("," if not shape else "")
            raise _engine.SymcrysError(f"Operations.{name} must have the shape ({dims}), not {a.shape}", "RangeError")
        if dtype is np.int64 and not (np.all(np.isfinite(a)) and np.all(np.mod(a, 1) == 0)):
            raise _engine.SymcrysError(f"Operations.{name} must hold integers", "RangeError")
        a = a.astype(dtype)
        a.flags.writeable = False
        if n is not None and len(a) != n:
            raise _engine.SymcrysError(f"Operations: {name} has {len(a)} operations, the others {n}", "RangeError")
        n = len(a)
        object.__setattr__(operations, name, a)


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
