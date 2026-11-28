"""What the generated modules of the Python layer share: the checks of the arguments and the call
into the library (scripts/python-api.mjs)."""

from __future__ import annotations

import dataclasses
import operator
import functools
from typing import Any, Callable, Mapping, TypeVar, cast

import numpy as np
from numpy.typing import NDArray

from . import _engine
from ._convert import (
    MAX_SAFE as _MAX_SAFE,
    InvalidInput,
    check_array as _check_array,
    check_raw as _check_raw,
    convert as _convert_schema,
    to_js as _to_js,
)


def options(**kwargs: Any) -> dict[str, Any]:
    """An options object: the keyword arguments that were given, keys in camelCase."""
    result: dict[str, Any] = to_js({k: v for k, v in kwargs.items() if v is not None})
    return result


def to_js(x: Any) -> Any:
    """``_convert.to_js``, what the conversion would lose (``InvalidInput``) refused as wrong input."""
    try:
        return _to_js(x)
    except InvalidInput as e:
        raise _engine.SymcrysError(str(e), "RangeError") from None
    except RecursionError:
        raise _engine.SymcrysError("lists nested too deep (or containing themselves) cannot be passed to symcrys", "RangeError") from None


def check_raw(x: Any, what: str) -> None:
    """``_convert.check_raw``, naming the argument: what a conversion would lose is wrong input."""
    try:
        _check_raw(x)
    except InvalidInput as e:
        raise _engine.SymcrysError(f"{what}: {e}", "RangeError") from None


_F = TypeVar("_F", bound=Callable[..., Any])


def by_keyword(positional: int, fields: tuple[str, ...]) -> Callable[[_F], _F]:
    """A function whose input is one of the keyword arguments ``fields`` (``point=``, ``hkl=``):
    one passed by position is a SymcrysError that names them, not Python's bare TypeError."""

    def wrap(function: _F) -> _F:
        @functools.wraps(function)
        def checked(*args: Any, **kwargs: Any) -> Any:
            if len(args) > positional:
                names = ", ".join(f"{f}=" for f in fields[:-1]) + f" or {fields[-1]}=" if len(fields) > 1 else f"{fields[0]}="
                raise _engine.SymcrysError(
                    f"{function.__name__} takes its input by keyword, {names}, not as positional argument {positional + 1}",
                    "RangeError",
                )
            return function(*args, **kwargs)

        return cast(_F, checked)

    return wrap


def _is_operations(x: Any) -> bool:
    """True for an instance of the ``Operations`` of a module (they carry ``_symcrys_operations``)."""
    return not isinstance(x, type) and getattr(type(x), "_symcrys_operations", False) is True


def operation_list(operations: Any, keys: tuple[str, ...] = ("cartesian",), bare: str | None = None) -> list[Any]:
    """A list of operations as the library takes it, checked: the ``Operations`` of a module,
    a sequence of mappings with ``keys``, or, where ``bare`` names the field (``"cartesian"``), an
    array of matrices of shape (n, 3, 3).

    Without the check, an array of matrices would reach the library and fail there with "cannot read
    property '0' of undefined".
    """
    if _is_operations(operations):
        return records(operations)
    shape = "{" + ", ".join(f'"{k}"' for k in keys) + "}"
    wanted = f"Operations, as operations() returns them, or a list of operations {shape}"
    zero_dimensional = isinstance(operations, np.ndarray) and operations.ndim == 0
    if isinstance(operations, (Mapping, str, bytes, type)) or not hasattr(operations, "__iter__") or zero_dimensional:
        raise _engine.SymcrysError(f"operations must be {wanted}, not {type(operations).__name__}", "RangeError")
    ops = list(operations)
    if not all(isinstance(op, Mapping) for op in ops):
        # An array of matrices, or a list of them.
        matrices = None
        if not any(isinstance(op, Mapping) for op in ops):
            try:
                given = np.asarray(ops)
            except (TypeError, ValueError):
                given = None
            if given is not None and given.dtype.kind == "c":
                raise _engine.SymcrysError(f"the matrices of the operations must be real, not {given.dtype}")
            if given is not None and given.size and given.dtype.kind not in "biuf":
                # Strings of digits would be read as numbers by the conversion below.
                raise _engine.SymcrysError(
                    f"the matrices of the operations must hold real numbers, not {given.dtype}", "RangeError"
                )
            check_raw(ops, "the matrices of the operations")
            try:
                matrices = np.asarray(ops, dtype=np.float64)
            except (TypeError, ValueError):
                pass
        if matrices is not None and matrices.ndim >= 2:
            if bare is None:
                hint = " (each says whether it carries time reversal)" if "time_reversal" in keys else ""
                raise _engine.SymcrysError(
                    f"an array of matrices does not say what the operations are here: pass {wanted}{hint}", "RangeError"
                )
            if matrices.ndim != 3 or matrices.shape[1:] != (3, 3):
                raise _engine.SymcrysError(
                    f"an array of {bare} matrices must have the shape (n, 3, 3), not {matrices.shape}", "RangeError"
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


def present_fields(operations: Any) -> list[str]:
    """The fields of a record of arrays that it has: an optional field (default None) that is None,
    because no operation has it, is left out."""
    return [f.name for f in dataclasses.fields(operations) if getattr(operations, f.name) is not None]


def records(operations: Any) -> list[dict[str, Any]]:
    """The ``Operations`` of a module as a list of records, one per operation."""
    fields = present_fields(operations)
    return [{name: getattr(operations, name)[i] for name in fields} for i in range(len(operations))]


def operations_of(given: list[dict[str, Any]], cls: Any) -> Any:
    """The ``Operations`` of the class ``cls`` from checked records (``operation_list``) with every field."""
    fields = [f.name for f in dataclasses.fields(cls)]
    for i, op in enumerate(given):
        missing = [f for f in fields if f not in op]
        if missing:
            raise _engine.SymcrysError(
                f"operation {i} has no key {', '.join(repr(k) for k in missing)}: the result keeps the operations, "
                f"so each needs {', '.join(repr(f) for f in fields)}",
                "RangeError",
            )
    columns = {}
    for f in fields:
        try:
            columns[f] = np.asarray([op[f] for op in given])
        except (TypeError, ValueError) as e:
            raise _engine.SymcrysError(f"the operations' {f} are not arrays of one shape ({e})", "RangeError") from None
    return cls(**columns)


def select(operations: Any, kept: list[dict[str, Any]]) -> Any:
    """The operations at the indices the library kept (``index`` of each record it returned)."""
    return operation_at(operations, np.asarray([k["index"] for k in kept], dtype=np.int64))


def operation_at(operations: Any, index: Any) -> Any:
    """``ops[index]``: for an integer one operation as a dict (a bool for a field of one value per
    operation), otherwise the ``Operations`` of the rows that ``index`` selects (a slice, a sequence
    of integers, a boolean mask of length n)."""
    fields = present_fields(operations)
    n = len(operations)
    if index is None or isinstance(index, (bool, np.bool_)):
        raise TypeError(f"Operations cannot be indexed by {index!r}")
    if not isinstance(index, (slice, np.ndarray, list, tuple)) or (isinstance(index, np.ndarray) and index.ndim == 0):
        try:
            i = operator.index(index)
        except TypeError:
            raise TypeError(f"Operations cannot be indexed by {type(index).__name__}") from None
        if not -n <= i < n:
            raise IndexError(f"operation {i} of {n}")
        row = {name: getattr(operations, name)[i] for name in fields}
        return {name: (v.item() if v.ndim == 0 else v) for name, v in row.items()}
    if not isinstance(index, slice):
        selection = np.asarray(index)
        if selection.size == 0 and selection.dtype.kind != "b":
            # An empty list ([] is read as floats); an empty mask stays a mask, checked for its length.
            selection = selection.astype(np.int64)
        if selection.ndim != 1 or selection.dtype.kind not in "biu":
            raise IndexError(f"Operations are indexed by an integer, a slice, a list of integers or a mask, not {index!r}")
        if selection.dtype.kind == "b" and len(selection) != n:
            raise IndexError(f"a mask of {len(selection)} values for {n} operations")
        index = selection
    try:
        return type(operations)(**{name: getattr(operations, name)[index] for name in fields})
    except IndexError as e:
        raise IndexError(f"Operations[{index!r}]: {e}") from None


def _checked(owner: str, name: str, value: Any, dtype: Any, shape: tuple[int, ...]) -> NDArray[Any]:
    """One field of ``Operations`` (``owner``, the class): an array of shape (n, …) of the dtype, checked."""

    def error(what: str) -> _engine.SymcrysError:
        return _engine.SymcrysError(f"{owner}.{name} {what}", "RangeError")

    try:
        _check_raw(value)
        a = np.asarray(value)
        # An array-like converts itself: its result is checked as well.
        _check_array(a)
    except InvalidInput as e:
        raise _engine.SymcrysError(f"{owner}.{name}: {e}", "RangeError") from None
    except (TypeError, ValueError) as e:
        raise error(f"must be an array ({e})") from None
    if a.size == 0 and a.ndim == 1:
        # [], no operation; an empty array of another shape is checked below.
        a = np.zeros((0, *shape), dtype=dtype)
    kind = a.dtype.kind
    if dtype is np.bool_:
        if kind == "b":
            pass
        elif kind in "iuf" and np.all((a == 0) | (a == 1)):
            a = a.astype(np.bool_)
        else:
            raise error("must hold True or False")
    elif dtype is np.int64:
        if kind in "iu":
            if a.size and (int(a.max()) > np.iinfo(np.int64).max or int(a.min()) < np.iinfo(np.int64).min):
                raise error("must hold 64-bit integers")
        elif kind == "f":
            if not (np.all(np.isfinite(a)) and np.all(np.mod(a, 1) == 0) and np.all(np.abs(a) <= 2**53)):
                raise error("must hold integers")
        else:
            raise error(f"must hold integers, not {a.dtype}")
    elif kind not in "iuf":
        raise error(f"must hold real numbers, not {a.dtype}")
    elif kind in "iu" and a.size and (int(a.max()) > _MAX_SAFE or int(a.min()) < -_MAX_SAFE):
        # A field of floats: an integer beyond the safe integers would be rounded.
        raise error("must hold numbers a double holds exactly, not integers beyond 2**53 - 1 in magnitude")
    a = np.array(a, dtype=dtype)
    if a.ndim != len(shape) + 1 or a.shape[1:] != shape:
        dims = ", ".join(["n", *map(str, shape)]) + ("," if not shape else "")
        raise error(f"must have the shape ({dims}), not {a.shape}")
    return a


def freeze(operations: Any, fields: Mapping[str, tuple[Any, tuple[int, ...]]]) -> None:
    """Checks and freezes the arrays of ``Operations``: dtype, shape (n, …) with one n for all, and no
    writes: each is a read-only view of a read-only copy, which numpy does not let anyone
    make writable again."""
    n = None
    optional = {f.name for f in dataclasses.fields(operations) if f.default is None}
    for name, (dtype, shape) in fields.items():
        if name in optional and getattr(operations, name) is None:
            continue
        base = _checked(type(operations).__name__, name, getattr(operations, name), dtype, shape)
        if n is not None and len(base) != n:
            raise _engine.SymcrysError(f"{type(operations).__name__}: {name} has {len(base)} operations, the others {n}", "RangeError")
        n = len(base)
        base.flags.writeable = False
        view = base.view()
        view.flags.writeable = False
        object.__setattr__(operations, name, view)


def rotate_tensor(call: Any, value: Any, tensor: Any, rotation: Any, spec_or_name: Any, options: Any) -> NDArray[np.float64]:
    """``rotate_tensor`` of the generated modules: the tensor keeps its shape, (3, …, 3) or
    the flat (3**rank,), and leading axes of the tensor and of the rotation (…, 3, 3) are stacks,
    broadcast against each other as NumPy does. The library rotates one tensor by one rotation per
    call; this only loops."""
    t = array(tensor, "tensor", np.float64)
    r = array(rotation, "rotation")
    given = spec(spec_or_name)
    if isinstance(given, str):
        rank = value("TENSOR_PROPERTIES").get(given, {}).get("spec", {}).get("rank")
    else:
        rank = given.get("rank")
        # A rank the library takes: an integer of any type, also a whole float (JSON makes it one).
        if isinstance(rank, (np.integer, np.floating, float)) and not isinstance(rank, bool) and float(rank).is_integer():
            rank = int(rank)
    if not isinstance(rank, int) or isinstance(rank, bool) or not 0 <= rank <= 4:
        # An unknown name or a wrong specification: the library says what is wrong.
        return np.asarray(call("rotateTensor", t.reshape(-1), r, given, options), dtype=np.float64)
    full = (3,) * rank
    if t.ndim >= rank and t.shape[t.ndim - rank :] == full:
        core: tuple[int, ...] = full
    elif t.ndim >= 1 and t.shape[-1] == 3**rank:
        core = (3**rank,)
    else:
        shapes = f"{full} or ({3**rank},)" if rank != 1 else "(3,)"
        raise _engine.SymcrysError(
            f"a tensor of rank {rank} has the shape {shapes}, with stacks before it, not {t.shape}", "RangeError"
        )
    if r.ndim < 2 or r.shape[-2:] != (3, 3):
        raise _engine.SymcrysError(f"the rotation has the shape (3, 3), with stacks before it, not {r.shape}", "RangeError")
    try:
        lead = np.broadcast_shapes(t.shape[: t.ndim - len(core)], r.shape[:-2])
    except ValueError:
        raise _engine.SymcrysError(
            f"the stacks of the tensor {t.shape} and of the rotation {r.shape} do not broadcast", "RangeError"
        ) from None
    tensors = np.broadcast_to(t, lead + core).reshape(-1, 3**rank)
    rotations = np.broadcast_to(r, lead + (3, 3)).reshape(-1, 3, 3)
    if len(tensors) == 0:
        # An empty stack: one call with a zero tensor, so that a wrong rotation or specification is
        # still refused.
        given_rotations = r.reshape(-1, 3, 3)
        call("rotateTensor", np.zeros(3**rank), given_rotations[0] if len(given_rotations) else np.eye(3), given, options)
    out = [call("rotateTensor", tt, rr, given, options) for tt, rr in zip(tensors, rotations)]
    return np.asarray(out, dtype=np.float64).reshape(lead + core)


def value(name: str) -> Any:
    return _engine.value(name)


def spec(spec_or_name: Mapping[str, Any] | str) -> Any:
    return spec_or_name if isinstance(spec_or_name, str) else mapping(spec_or_name, "spec")





def array(value: Any, what: str, dtype: Any = None) -> NDArray[Any]:
    """An argument as a NumPy array of real numbers, or SymcrysError naming it (a ragged list, a
    string, complex numbers): the library checks the shape and the values."""
    check_raw(value, what)
    try:
        # Read first as it is, so that complex numbers are refused rather than cut to their real part.
        given = np.asarray(value)
    except (TypeError, ValueError) as e:
        raise _engine.SymcrysError(f"{what} must be an array of numbers ({e})") from None
    # An array-like converts itself: its result is checked as well.
    check_raw(given, what)
    if given.dtype.kind == "O" and given.size and all(isinstance(v, int) and not isinstance(v, bool) for v in given.flat):
        # Python integers too large for int64.
        given = np.asarray(given, dtype=object)
    elif given.dtype.kind not in "biuf":
        raise _engine.SymcrysError(f"{what} must be an array of real numbers, not of {given.dtype}")
    if given.dtype.kind in "iuO" and given.size and (given.max() > _MAX_SAFE or given.min() < -_MAX_SAFE):
        raise _engine.SymcrysError(
            f"{what}: integers beyond 2**53 - 1 in magnitude cannot be passed to symcrys exactly, not {given.tolist()}"
        )
    try:
        return np.asarray(given, dtype=dtype)
    except (TypeError, ValueError) as e:
        raise _engine.SymcrysError(f"{what} must be an array of numbers ({e})") from None


def tensor(value: Any, what: str) -> NDArray[np.float64]:
    """A tensor as the library takes it, flat: given flat (3**rank,) or in its shape (3, …, 3); the
    library checks the number of components against the rank."""
    t = array(value, what, np.float64)
    if t.ndim > 1 and set(t.shape) != {3}:
        raise _engine.SymcrysError(
            f"{what} has the shape (3, …, 3) or the flat (3**rank,), not {t.shape}", "RangeError"
        )
    return t.reshape(-1)


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
