"""The API pins (packages/ts/src/api.pins.json) replayed through the Python layer. Each pin is a call
of the public API written as data by the TypeScript capture (testUtils/apiCalls.ts): the Python
function of the same name is called by the fixed rules (snake_case names; an object argument as
its fields, as keyword arguments, or as one mapping where the function takes one), and its answer,
turned back into plain data (camelCase keys, arrays as lists, Operations as a list of records),
must equal the pinned answer. Behavioural pins (fixture class (c)): they show that the Python layer
passes arguments and results as the TypeScript API does, over every group and setting, not that
the answers are right, which test_references.py checks against print."""

from __future__ import annotations

import inspect
import json
from typing import Any, Callable

import numpy as np
import pytest

import symcrys
from symcrys import _convert, magnetic, plane
from conftest import TS

MODULES = {"symcrys": symcrys, "symcrys/magnetic": magnetic, "symcrys/plane": plane}
PINS: list[dict[str, Any]] = json.loads((TS / "src" / "api.pins.json").read_text(encoding="utf-8"))["pins"]
POSITIONAL = (inspect.Parameter.POSITIONAL_ONLY, inspect.Parameter.POSITIONAL_OR_KEYWORD)


def to_python(value: Any) -> Any:
    """A value of a TypeScript call as Python takes it: the keys of a record in snake_case."""
    if isinstance(value, dict):
        return {_convert.snake(k): to_python(v) for k, v in value.items()}
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
                keywords.update(fields)  # an options object, or an object parameter given by its fields
                continue
            if not fields and len(positional) >= len(required):
                continue  # an empty options object
            positional.append(fields)  # a mapping: a tensor specification, a cell
        else:
            positional.append(to_python(arg))
    return positional, keywords


def plain(value: Any) -> Any:
    """A Python answer as plain data in the shape of the TypeScript answer."""
    if isinstance(value, (symcrys.Operations, magnetic.Operations, plane.Operations)):
        return [plain(dict(op)) for op in value]
    if isinstance(value, np.ndarray):
        return plain(value.tolist())
    if isinstance(value, np.generic):
        return value.item()
    if isinstance(value, dict):
        return {_convert.camel(k): plain(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [plain(v) for v in value]
    return value


def tensor_shaped(got: Any, pinned: Any) -> bool:
    """A tensor of the Python layer, shape (3, …, 3) per tensor, against its flat components in
    TypeScript (the fixed rule for tensors): equal sizes, the extra axes of length 3."""
    try:
        g, p = np.asarray(got, dtype=float), np.asarray(pinned, dtype=float)
    except (ValueError, TypeError):
        return False
    return g.ndim > p.ndim and g.size == p.size and set(g.shape[p.ndim - 1 :]) == {3}


def differences(got: Any, pinned: Any, where: str = "") -> list[str]:
    """Where two plain values differ; numbers equal within 10⁻⁹ (the engines' Math may differ in the last bit)."""
    if isinstance(pinned, list) and isinstance(got, list) and tensor_shaped(got, pinned):
        got = np.asarray(got, dtype=float).reshape(np.asarray(pinned, dtype=float).shape).tolist()
    if isinstance(pinned, bool) or isinstance(got, bool):
        return [] if got is pinned else [f"{where}: {got!r} != {pinned!r}"]
    if isinstance(pinned, (int, float)) and isinstance(got, (int, float)):
        return [] if abs(got - pinned) <= 1e-9 else [f"{where}: {got!r} != {pinned!r}"]
    if isinstance(pinned, dict) and isinstance(got, dict):
        if set(got) != set(pinned):
            return [f"{where}: keys {sorted(got)} != {sorted(pinned)}"]
        return [d for k in pinned for d in differences(got[k], pinned[k], f"{where}.{k}")]
    if isinstance(pinned, list) and isinstance(got, list):
        if len(got) != len(pinned):
            return [f"{where}: length {len(got)} != {len(pinned)}"]
        return [d for i, (g, p) in enumerate(zip(got, pinned)) for d in differences(g, p, f"{where}[{i}]")]
    return [] if got == pinned else [f"{where}: {got!r} != {pinned!r}"]


def replay(pin: dict[str, Any]) -> list[str]:
    module = MODULES[pin["entry"]]
    name = pin["name"]
    label = f'{pin["entry"]} {name}{json.dumps(pin.get("args"))[:120] if "args" in pin else ""}'
    if "args" not in pin:
        return [f"{label}{d}" for d in differences(plain(getattr(module, name)), pin["value"])]
    fn = getattr(module, _convert.snake(name))
    positional, keywords = arguments(fn, pin["args"])
    try:
        got = fn(*positional, **keywords)
    except Exception as e:  # noqa: BLE001 - reported as a difference, with the call
        return [f"{label}: raised {type(e).__name__}: {e}"]
    return [f"{label}{d}" for d in differences(plain(got), pin["value"])]


@pytest.mark.parametrize("entry", list(MODULES))
def test_the_python_layer_gives_the_pinned_answer_to_every_call(entry: str) -> None:
    pins = [p for p in PINS if p["entry"] == entry]
    assert pins
    found = [d for p in pins for d in replay(p)]
    assert found == [], f"{len(found)} differences, the first: " + "\n".join(found[:10])


def test_every_function_of_the_python_modules_is_pinned() -> None:
    for entry, module in MODULES.items():
        pinned = {_convert.snake(p["name"]) if "args" in p else p["name"] for p in PINS if p["entry"] == entry}
        functions = [n for n in module.__all__ if inspect.isfunction(getattr(module, n))]
        missing = [n for n in functions if n not in pinned]
        assert missing == [], entry
