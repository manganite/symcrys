"""The API pins (packages/ts/src/api.pins.json) replayed through the Python layer. Each pin is a call
of the public API written as data by the TypeScript capture (testUtils/apiCalls.ts): the Python
function of the same name is called by the fixed rules (GUIDE.md, "The Python layer": snake_case
names; an options object as keyword-only arguments; another object as its fields, or as one
mapping where the function takes one), and its answer, turned back into plain data, must equal the
pinned answer. On the way back the test checks the rules itself, independently of the layer's own
tables: every key of a record is snake_case, every array has the dtype the rule gives its field,
and every number is an int or a float as the rule says. Behavioural pins (fixture class (c)): they
show that the Python layer passes arguments and results as the TypeScript API does, over every
group and setting, not that the answers are right, which test_references.py checks against print."""

from __future__ import annotations

import inspect
import json
import re
from typing import Any, Callable

import numpy as np
import pytest

import symcrys
from symcrys import magnetic, plane
from conftest import TS

MODULES = {"symcrys": symcrys, "symcrys/magnetic": magnetic, "symcrys/plane": plane}
PINS: list[dict[str, Any]] = json.loads((TS / "src" / "api.pins.json").read_text(encoding="utf-8"))["pins"]
POSITIONAL = (inspect.Parameter.POSITIONAL_ONLY, inspect.Parameter.POSITIONAL_OR_KEYWORD)

# The options of the TypeScript API: keyword-only arguments in Python.
OPTIONS = {"setting", "axes", "unique_axis", "tolerance", "form", "box", "basis", "factors", "min_volume_ratio"}

# The rule for arrays (GUIDE.md, "The Python layer"), written out here rather than read from
# packages/python/api.json, so that a change there fails: int64 for indices, Miller indices,
# lattice directions and the matrices W, a bool array for time reversal, float64 for every other
# array. A field is the key of the record the array is in, or the function or constant it is the
# result of. In the plane a direction of a line is a lattice direction.
INT64_FIELDS = {
    "matrix",
    "operations",
    "site_symmetry_operations",
    "hkl",
    "uvw",
    "lattice",
    "parameters",
    "millerIndices",
    "reduceIndices",
    "zoneAxis",
    "directionToFourIndices",
    "directionFromFourIndices",
    "planeToFourIndices",
    "planeFromFourIndices",
    # LATTICE_SYMMETRY_DIRECTIONS, by family
    "monoclinic",
    "orthorhombic",
    "tetragonal",
    "hexagonal",
    "cubic",
}
# The plane: matrices W, indices, lattice directions (an axis `lattice`, a line's `direction`, `uv`) and
# Miller indices (`hk`).
INT64_FIELDS_PLANE = {
    "matrix",
    "operations",
    "site_symmetry_operations",
    "lattice",
    "direction",
    "uv",
    "hk",
    "edges",
    "inequalities",
}
BOOL_FIELDS = {"time_reversal"}

# The rule for numbers: counts, indices and numbers are int, everything else is float.
INT_FIELDS = {
    "index",
    "multiplicity",
    "n",
    "order",
    "position",
    "rank",
    "rotation",
    "rotoinversion",
    "setting",
    "faces",
    "edges",
    "number",
    "point_group_setting",
}

# Results that are tensors: shape (3, …, 3) per tensor in Python, flat components in TypeScript.
TENSOR_RESULTS = {"fromVoigt", "rotateTensor", "rotateTensors"}


def snake(name: str) -> str:
    return re.sub(r"(?<!^)(?=[A-Z])", "_", name).lower()


def camel(name: str) -> str:
    head, *rest = name.split("_")
    return head + "".join(part[:1].upper() + part[1:] for part in rest)


def to_python(value: Any) -> Any:
    """A value of a TypeScript call as Python takes it: the keys of a record in snake_case."""
    if isinstance(value, dict):
        return {snake(k): to_python(v) for k, v in value.items()}
    if isinstance(value, list):
        return [to_python(v) for v in value]
    return value


def arguments(fn: Callable[..., Any], args: list[Any]) -> tuple[list[Any], dict[str, Any]]:
    """The positional and keyword arguments of the Python call for the arguments of a TypeScript call."""
    params = inspect.signature(fn).parameters
    required = [p for p in params.values() if p.kind in POSITIONAL and p.default is inspect.Parameter.empty]
    positional: list[Any] = []
    keywords: dict[str, Any] = {}
    for arg in args:
        if isinstance(arg, dict):
            fields = to_python(arg)
            if fields and all(k in params and k not in keywords for k in fields):
                for k in fields:
                    if k in OPTIONS:
                        assert params[k].kind is inspect.Parameter.KEYWORD_ONLY, f"{fn.__name__}: option {k}"
                keywords.update(fields)  # an options object, or an object parameter given by its fields
                continue
            if not fields and len(positional) >= len(required):
                continue  # an empty options object
            positional.append(fields)  # a mapping: a tensor specification, a cell
        else:
            positional.append(to_python(arg))
    return positional, keywords


class Rules:
    """The rule violations met while turning one answer back into plain data."""

    def __init__(self, entry: str) -> None:
        self.int64 = INT64_FIELDS_PLANE if entry == "symcrys/plane" else INT64_FIELDS
        self.found: list[str] = []

    def array(self, value: np.ndarray, field: str, where: str) -> None:
        expected = "bool" if field in BOOL_FIELDS else "int64" if field in self.int64 else "float64"
        if str(value.dtype) != expected:
            self.found.append(f"{where}: dtype {value.dtype} of {field}, the rule gives {expected}")

    def number(self, value: Any, field: str, where: str) -> None:
        expected = int if field in INT_FIELDS else float
        if type(value) is not expected:
            self.found.append(f"{where}: {type(value).__name__} for {field}, the rule gives {expected.__name__}")

    def key(self, key: str, where: str) -> None:
        if key != snake(key):
            self.found.append(f"{where}: the key {key} is not snake_case")


def plain(value: Any, field: str, rules: Rules, where: str = "") -> Any:
    """A Python answer as plain data in the shape of the TypeScript answer, its rules checked."""
    if isinstance(
        value,
        (symcrys.Operations, magnetic.Operations, plane.Operations, symcrys.TransformedOperations, magnetic.TransformedOperations, plane.TransformedOperations),
    ):
        for name in value.__dataclass_fields__:
            rules.array(getattr(value, name), name, f"{where}.{name}")
        return [plain(dict(op), field, Rules("none"), where) for op in value]
    if isinstance(value, np.ndarray):
        rules.array(value, field, where)
        return value.tolist()
    if isinstance(value, dict):
        out = {}
        for k, v in value.items():
            rules.key(k, where)
            out[camel(k)] = plain(v, k, rules, f"{where}.{k}")
        return out
    if isinstance(value, (list, tuple)):
        return [plain(v, field, rules, f"{where}[{i}]") for i, v in enumerate(value)]
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        rules.number(value, field, where)
    return value


def differences(got: Any, pinned: Any, where: str = "", tensor: bool = False) -> list[str]:
    """Where two plain values differ; numbers equal within 10⁻⁹ (the engines' Math may differ in the
    last bit). Where `tensor`, a tensor of shape (3, …, 3) is compared with its flat components."""
    if tensor and isinstance(got, list) and isinstance(pinned, list):
        g, p = np.asarray(got, dtype=float), np.asarray(pinned, dtype=float)
        if g.ndim > p.ndim and g.size == p.size and set(g.shape[p.ndim - 1 :]) == {3}:
            got = g.reshape(p.shape).tolist()
    if isinstance(pinned, bool) or isinstance(got, bool):
        return [] if got is pinned else [f"{where}: {got!r} != {pinned!r}"]
    if isinstance(pinned, (int, float)) and isinstance(got, (int, float)):
        return [] if abs(got - pinned) <= 1e-9 else [f"{where}: {got!r} != {pinned!r}"]
    if isinstance(pinned, dict) and isinstance(got, dict):
        if set(got) != set(pinned):
            return [f"{where}: keys {sorted(got)} != {sorted(pinned)}"]
        return [d for k in pinned for d in differences(got[k], pinned[k], f"{where}.{k}", k in ("basis", "relations"))]
    if isinstance(pinned, list) and isinstance(got, list):
        if len(got) != len(pinned):
            return [f"{where}: length {len(got)} != {len(pinned)}"]
        return [d for i, (g, p) in enumerate(zip(got, pinned)) for d in differences(g, p, f"{where}[{i}]", tensor)]
    return [] if got == pinned else [f"{where}: {got!r} != {pinned!r}"]


def label(pin: dict[str, Any]) -> str:
    return f'{pin["entry"]} {pin["name"]}{json.dumps(pin.get("args"))[:120] if "args" in pin else ""}'


def replay(pin: dict[str, Any], first: Any = None) -> list[str]:
    """The differences of one pin; `first` replaces the first argument (another input form)."""
    module = MODULES[pin["entry"]]
    name = pin["name"]
    rules = Rules(pin["entry"])
    if "args" not in pin:
        got = plain(getattr(module, name), name, rules)
    else:
        fn = getattr(module, snake(name))
        positional, keywords = arguments(fn, pin["args"])
        if first is not None:
            positional[0] = first
        try:
            got = plain(fn(*positional, **keywords), name, rules)
        except Exception as e:  # noqa: BLE001 - reported as a difference, with the call
            return [f"{label(pin)}: raised {type(e).__name__}: {e}"]
    found = differences(got, pin["value"], tensor=name in TENSOR_RESULTS)
    return [f"{label(pin)}{d}" for d in rules.found + found]


@pytest.mark.parametrize("entry", list(MODULES))
def test_the_python_layer_gives_the_pinned_answer_to_every_call(entry: str) -> None:
    pins = [p for p in PINS if p["entry"] == entry]
    assert pins
    found = [d for p in pins for d in replay(p)]
    assert found == [], f"{len(found)} differences, the first: " + "\n".join(found[:10])


# The functions of a list that read the Cartesian matrices, and so take a bare array of them in symcrys.
TAKES_BARE = {
    "pointGroupOf",
    "describeOperationsOf",
    "isCentrosymmetricOf",
    "isEnantiomorphicOf",
    "allowedPropertiesOf",
    "allowsPropertyOf",
    "siteSymmetryOf",
    "orbitOf",
    "tensorFormOf",
}


def test_the_other_forms_of_a_list_of_operations_give_the_same_answer() -> None:
    """A list of operations given as Operations, and in symcrys as a bare (n, 3, 3) array of
    Cartesian matrices, gives the answer of the list of records."""
    found: list[str] = []
    count = 0
    for pin in PINS:
        args = pin.get("args")
        if pin["entry"] == "symcrys/plane" or not args or not isinstance(args[0], list) or not args[0]:
            continue
        if not isinstance(args[0][0], dict) or "cartesian" not in args[0][0]:
            continue
        records = to_python(args[0])
        module = MODULES[pin["entry"]]
        forms: list[Any] = [module.Operations(**{k: np.array([r[k] for r in records]) for k in records[0]})]
        if pin["entry"] == "symcrys" and pin["name"] in TAKES_BARE:
            forms.append(np.array([r["cartesian"] for r in records], dtype=float))
        for form in forms:
            count += 1
            found += replay(pin, form)
    assert count > 0
    assert found == [], f"{len(found)} differences, the first: " + "\n".join(found[:10])


def test_every_function_of_the_python_modules_is_pinned() -> None:
    for entry, module in MODULES.items():
        pinned = {snake(p["name"]) if "args" in p else p["name"] for p in PINS if p["entry"] == entry}
        functions = [n for n in module.__all__ if inspect.isfunction(getattr(module, n))]
        assert [n for n in functions if n not in pinned] == [], entry
