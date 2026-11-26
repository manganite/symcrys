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
  dictionaries are turned into camelCase.
"""

from __future__ import annotations

import re
from typing import Any

import numpy as np

def snake(name: str) -> str:
    return re.sub(r"(?<=[a-z0-9])([A-Z])", r"_\1", name).lower()


def camel(name: str) -> str:
    head, *rest = name.split("_")
    return head + "".join(p[:1].upper() + p[1:] for p in rest)


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
        # Each basis tensor in its shape (3, …, 3), rank times; the relations stay rows over
        # the components in C order, r @ t.reshape(-1) == 0.
        "basis": np.asarray(x["basis"], dtype=np.float64).reshape((n, *(3,) * rank)),
        "parameters": np.asarray(x["parameters"], dtype=np.int64).reshape(n, rank),
        "relations": np.asarray(x["relations"], dtype=np.float64).reshape(dim - n, dim),
    }


def _lattice_symmetry_directions(x: Any) -> Any:
    return {family: [np.asarray(d, dtype=np.int64).reshape(-1, 3) for d in positions] for family, positions in x.items()}


def _tensor(x: Any) -> Any:
    # A flat tensor of 3**rank components in its shape (3, …, 3), as the basis tensors of tensor_form.
    flat = np.asarray(x, dtype=np.float64)
    rank = round(np.log(flat.size) / np.log(3)) if flat.size > 1 else 0
    return flat.reshape((3,) * rank)


CUSTOM = {"tensor_form": _tensor_form, "lattice_symmetry_directions": _lattice_symmetry_directions, "tensor": _tensor}
