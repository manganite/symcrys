"""Fixed rules between the plain data of the TypeScript API and Python.

- Names: camelCase in JavaScript, snake_case in Python (``timeReversal`` ↔ ``time_reversal``), for
  function names and for the keys of objects.
- Results are converted by a schema that scripts/python-api.mjs writes from their TypeScript type
  (``convert`` below): arrays of numbers become NumPy arrays, ``float64`` or ``int64`` by the name of
  their field (packages/python/api.json, "arrays"; ``symcrys.plane`` has its own list, since a
  ``direction`` is a lattice direction there and a Cartesian vector in the point groups), numbers
  ``int`` or ``float`` by their name ("numbers"), records dicts with snake_case keys, the TypedDicts
  of the module. Other values stay plain Python values.
- Arguments: NumPy arrays and scalars become lists and numbers, tuples lists, and the keys of
  dictionaries are turned into camelCase. Nothing is lost on the way (``to_js``): a key that is not a
  string, two keys that name one field, a masked value, a number a double would round and a NumPy
  scalar that is not exactly a double or an integer are refused.
"""

from __future__ import annotations

import re
from typing import Any

import numpy as np

# numpy.ma without its stubs: some versions of NumPy leave its functions untyped.
_ma: Any = np.ma

def snake(name: str) -> str:
    return re.sub(r"(?<=[a-z0-9])([A-Z])", r"_\1", name).lower()


def camel(name: str) -> str:
    head, *rest = name.split("_")
    return head + "".join(p[:1].upper() + p[1:] for p in rest)


# The largest integer a double holds exactly, the safe integers of JavaScript.
MAX_SAFE = 2**53 - 1


class InvalidInput(TypeError):
    """Input whose conversion would change its meaning; the layer raises it as a SymcrysError."""


class UnsafeInteger(InvalidInput):
    """An integer that a double would round."""


def _unsafe(x: Any) -> UnsafeInteger:
    return UnsafeInteger(f"integers beyond 2**53 - 1 in magnitude cannot be passed to symcrys exactly, not {x}")


# Deeper nesting than an array of numbers has (NumPy's limit on dimensions).
MAX_DEPTH = 64

# The types of a row whose entries need no search one by one: values a double or JSON holds exactly
# (Python and NumPy floats of at most 64 bits, small NumPy integers, strings, None), and the integer
# types whose values are compared with the safe integers at once.
_EXACT = frozenset({float, bool, str, type(None), np.float64, np.float32, np.float16, np.bool_,
                    np.int8, np.int16, np.int32, np.uint8, np.uint16, np.uint32})  # fmt: skip
_LARGE_INTEGERS = frozenset({int, np.int64, np.uint64})
_PLAIN = _EXACT | _LARGE_INTEGERS


def check_array(a: np.ndarray[Any, Any]) -> None:
    """Refuses an array of floats that a double would round (``np.longdouble``)."""
    if a.dtype.kind == "f" and a.dtype.itemsize > 8 and a.size and not np.array_equal(a.astype(np.float64), a):
        raise InvalidInput(f"floats of {a.dtype} that a double would round cannot be passed to symcrys, not {a}")


def check_raw(x: Any) -> None:
    """Refuses what a conversion to a NumPy array or to JSON would lose, on the raw input: a masked
    value, an integer beyond 2**53 - 1 in magnitude in a list (``np.asarray`` would round it to a
    float), a NumPy scalar or array of floats that a double would round, and nesting deeper than an
    array has. Lists and tuples are searched without recursion; the contents of an array are checked
    by their dtype."""
    stack: list[tuple[Any, int]] = [(x, 0)]
    while stack:
        e, depth = stack.pop()
        t = type(e)
        if t is float or t is str or t is bool or e is None:
            continue
        if t is int:
            if abs(e) > MAX_SAFE:
                raise _unsafe(e)
        elif t is list or t is tuple or isinstance(e, (list, tuple)):
            if depth >= MAX_DEPTH:
                raise InvalidInput(f"lists nested more than {MAX_DEPTH} deep cannot be passed to symcrys")
            # A row of plain numbers is checked at once; only other entries are searched one by one.
            kinds = set(map(type, e))
            if kinds <= _PLAIN:
                if not kinds.isdisjoint(_LARGE_INTEGERS):
                    for v in e:
                        if type(v) in _LARGE_INTEGERS and abs(int(v)) > MAX_SAFE:
                            raise _unsafe(int(v))
                continue
            stack.extend((v, depth + 1) for v in e)
        elif _ma.isMaskedArray(e):
            if _ma.getmaskarray(e).any():
                raise InvalidInput(f"a masked array with masked values cannot be passed to symcrys, not {e}")
            stack.append((_ma.getdata(e), depth))
        elif isinstance(e, np.ndarray):
            check_array(e)
            if e.dtype.kind == "O":
                if depth >= MAX_DEPTH:
                    raise InvalidInput(f"arrays nested more than {MAX_DEPTH} deep cannot be passed to symcrys")
                stack.extend((v, depth + 1) for v in e.flat)
        elif isinstance(e, np.generic):
            scalar(e)
        elif isinstance(e, int) and abs(e) > MAX_SAFE:
            raise _unsafe(e)


def scalar(x: np.generic) -> Any:
    """A NumPy scalar as the Python value it is exactly (bool, int, float, str), or InvalidInput: a
    complex number, a float that a double would round (``np.longdouble``), an integer beyond the safe
    integers. Not by ``.item()``, which for some types returns a NumPy scalar again."""
    if isinstance(x, np.bool_):
        return bool(x)
    if isinstance(x, (np.timedelta64, np.datetime64)):
        # np.timedelta64 is an np.integer, but a duration, not a number.
        raise InvalidInput(f"a NumPy {type(x).__name__} is not a number and cannot be passed to symcrys, not {x!r}")
    if isinstance(x, np.integer):
        i = int(x)
        if abs(i) > MAX_SAFE:
            raise _unsafe(i)
        return i
    if isinstance(x, np.floating):
        f = float(x)
        if not (f == x or (np.isnan(f) and np.isnan(x))):
            raise InvalidInput(f"the {type(x).__name__} {x!r} is not exactly a double and cannot be passed to symcrys exactly")
        return f
    if isinstance(x, (np.str_, np.bytes_)):
        return x.item()
    raise InvalidInput(f"a NumPy scalar of type {type(x).__name__} cannot be passed to symcrys, not {x!r}")


def to_js(x: Any) -> Any:
    """A Python value as JSON-compatible data for the library: arrays as lists, keys in camelCase.
    Raises InvalidInput (UnsafeInteger for an integer beyond 2**53 - 1 in magnitude) for what the
    conversion would lose: see ``check_raw``, and keys that are not strings or that name one field
    twice (``time_parity`` and ``timeParity``)."""
    if _ma.isMaskedArray(x):
        check_raw(x)
        return to_js(_ma.getdata(x))
    if isinstance(x, np.ndarray):
        check_raw(x)
        if x.dtype.kind in "mM":
            raise InvalidInput(f"an array of {x.dtype} is not of numbers and cannot be passed to symcrys")
        if x.dtype.kind in "iu" and x.size and (x.max() > MAX_SAFE or x.min() < -MAX_SAFE):
            raise _unsafe(x.tolist())
        if x.dtype.kind == "f" and x.dtype.itemsize > 8:
            x = x.astype(np.float64)
        return to_js(x.tolist()) if x.dtype.kind == "O" else x.tolist()
    if isinstance(x, np.generic):
        return scalar(x)
    if isinstance(x, int) and not isinstance(x, bool) and abs(x) > MAX_SAFE:
        raise _unsafe(x)
    if isinstance(x, dict):
        out: dict[str, Any] = {}
        given: dict[str, str] = {}
        for k, v in x.items():
            if not isinstance(k, str):
                raise InvalidInput(f"the keys of a mapping are strings, not {k!r}")
            name = camel(k)
            if name in given:
                raise InvalidInput(
                    f"the keys {given[name]!r} and {k!r} name one field, {snake(name)!r}: pass one of them"
                )
            given[name] = k
            out[name] = to_js(v)
        return out
    if isinstance(x, (list, tuple)):
        return [to_js(e) for e in x]
    return x


# --- results by schema -------------------------------------------------------------------------
#
# The generated modules convert each result by a schema written from its TypeScript type
# (scripts/python-api.mjs): what is an array, of which dtype and shape, what a record with which
# fields, what a list. A schema is a tuple whose first entry names its kind:
#
#   ("v",)                       a plain value (string, boolean, None) as it is
#   ("i",) / ("f",)              a number as int / float
#   ("a", dtype, shape)          an array of numbers; shape None keeps the shape of the nested lists
#   ("l", schema)                a list; ("t", schema) a tuple
#   ("o", schema)                None, or a value of the schema
#   ("d", {jsKey: schema})       a record: keys turned into snake_case, each field by its schema
#   ("m", schema)                a mapping with keys kept as they are (names, families)
#   ("x", name)                  a converter of its own (CUSTOM below)
#   ("ops", cls, fields)         a list of operation records as one record of arrays, the class
#                                ``Operations`` of the module; fields {jsKey: (dtype, shape)}


def convert(x: Any, schema: tuple[Any, ...]) -> Any:
    kind = schema[0]
    if kind == "v":
        return x
    if kind == "i":
        return int(x)
    if kind == "f":
        return float(x)
    if kind == "a":
        a = np.asarray(x, dtype=schema[1])
        return a if schema[2] is None else a.reshape(schema[2])
    if kind == "l":
        return [convert(e, schema[1]) for e in x]
    if kind == "t":
        return tuple(convert(e, schema[1]) for e in x)
    if kind == "o":
        return None if x is None else convert(x, schema[1])
    if kind == "d":
        fields: dict[str, tuple[Any, ...]] = schema[1]
        out = {}
        for k, v in x.items():
            if k not in fields:
                raise KeyError(f"unexpected field {k!r} in a result")
            out[snake(k)] = convert(v, fields[k])
        return out
    if kind == "m":
        return {k: convert(v, schema[1]) for k, v in x.items()}
    if kind == "x":
        return CUSTOM[schema[1]](x)
    if kind == "ops":
        cls, spec = schema[1], schema[2]
        return cls(**{snake(k): np.asarray([e[k] for e in x], dtype=dtype).reshape((len(x), *shape)) for k, (dtype, shape) in spec.items()})
    raise ValueError(f"unknown schema {schema!r}")


def _tensor_form(x: Any) -> Any:
    rank = int(x["rank"])
    dim = 3**rank
    n = len(x["basis"])
    return {
        "rank": rank,
        # Each basis tensor and each constraint in the shape (3, …, 3), rank times, so that
        # (r * t).sum() == 0 for a constraint r and an allowed tensor t.
        "basis": np.asarray(x["basis"], dtype=np.float64).reshape((n, *(3,) * rank)),
        "parameters": np.asarray(x["parameters"], dtype=np.int64).reshape(n, rank),
        "relations": np.asarray(x["relations"], dtype=np.float64).reshape((dim - n, *(3,) * rank)),
        "largest_coefficient": float(x["largestCoefficient"]),
    }


def _lattice_symmetry_directions(x: Any) -> Any:
    return {family: [np.asarray(d, dtype=np.int64).reshape(-1, 3) for d in positions] for family, positions in x.items()}


def _tensor(x: Any) -> Any:
    # A flat tensor of 3**rank components in its shape (3, …, 3), as the basis tensors of tensor_form.
    flat = np.asarray(x, dtype=np.float64)
    rank = round(np.log(flat.size) / np.log(3)) if flat.size > 1 else 0
    return flat.reshape((3,) * rank)


CUSTOM = {"tensor_form": _tensor_form, "lattice_symmetry_directions": _lattice_symmetry_directions, "tensor": _tensor}
