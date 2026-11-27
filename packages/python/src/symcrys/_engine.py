"""The boundary to the JavaScript engine: one function, ``call(name, args_json) -> result_json``.

The TypeScript library of the same version, bundled into ``_bundle.js``, runs in quickjs-ng. Only
this module knows the engine, so another backend (e.g. Pyodide in JupyterLite) replaces this
module and nothing else.
"""

from __future__ import annotations

import json
import re
import threading
from importlib import resources
from typing import Any

import quickjs  # type: ignore[import-untyped]

__all__ = ["SymcrysError", "SymcrysInternalError", "call", "exports", "value"]


class SymcrysError(ValueError):
    """Wrong input to symcrys (e.g. an unknown key, setting or tensor specification, a vector of the
    wrong length, an unknown option): the ``RangeError`` of the TypeScript library, or a check of
    the Python layer. ``js_name`` is the name of the JavaScript error, ``RangeError``.
    """

    def __init__(self, message: str, js_name: str = "RangeError") -> None:
        super().__init__(message)
        self.js_name = js_name

    def __reduce__(self) -> tuple[Any, tuple[str, str]]:
        return (type(self), (str(self.args[0]), self.js_name))


class SymcrysInternalError(RuntimeError):
    """A fault of symcrys itself, not of its input: any error of the library other than a
    ``RangeError``. It is not a ``ValueError``, so that ``except ValueError`` does not hide it;
    please report it. ``js_name`` is the name of the JavaScript error (``TypeError``, ``Error``).
    """

    def __init__(self, message: str, js_name: str = "Error") -> None:
        super().__init__(message)
        self.js_name = js_name

    def __str__(self) -> str:
        return f"{super().__str__()} (an internal error of symcrys; please report it)"

    def __reduce__(self) -> tuple[Any, tuple[str, str]]:
        return (type(self), (str(self.args[0]), self.js_name))


_lock = threading.Lock()
_functions: dict[str, Any] = {}


def _get(name: str) -> Any:
    # A QuickJS context is not thread-safe; callers hold _lock.
    if not _functions:
        source = resources.files("symcrys").joinpath("_bundle.js").read_text(encoding="utf-8")
        context = quickjs.Context()
        context.eval(source)
        for f in ("call", "value", "exports"):
            _functions[f] = context.eval(f"__symcrys.{f}")
        _functions["context"] = context  # keep the context alive
    return _functions[name]


def call(name: str, args_json: str) -> str:
    """Calls the exported function ``name`` with arguments given as a JSON array; returns JSON.

    The result is ``{"result": ...}`` (no ``result`` key when the function returned undefined) or
    ``{"error": {"name": ..., "message": ...}}``.
    """
    with _lock:
        return str(_get("call")(name, args_json))


def invoke(name: str, *args: Any) -> Any:
    """Calls ``name`` with JSON-compatible arguments; returns the decoded result. Raises SymcrysError for
    a RangeError of the library (wrong input) and SymcrysInternalError for any other error.
    """
    try:
        args_json = json.dumps(args, allow_nan=False)
    except (TypeError, ValueError):
        # JSON has no NaN or infinity, and no other Python objects; without this check the engine's
        # parser would report "unexpected token". The message names the argument.
        for i, arg in enumerate(args):
            try:
                json.dumps(arg, allow_nan=False)
            except ValueError:
                raise SymcrysError(
                    python_terms(f"Argument {i + 1} of {name}: every number passed to symcrys must be finite, not NaN or infinite"),
                    "RangeError",
                ) from None
            except TypeError as e:
                raise SymcrysError(python_terms(f"Argument {i + 1} of {name} cannot be passed to symcrys: {e}"), "RangeError") from None
        raise
    answer = json.loads(call(name, args_json))
    if "error" in answer:
        error = answer["error"]
        if error["name"] == "RangeError":
            raise SymcrysError(python_terms(error["message"]), error["name"])
        raise SymcrysInternalError(error["message"], error["name"])
    return answer.get("result")


# Two lower-case letters at least before the first capital, so that a Bravais lattice (hR, mP) stays.
_CAMEL = re.compile(r"\b([a-z]{2,}(?:[A-Z][a-z0-9]*)+)\b")
_LITERALS = {"undefined": "None", "null": "None", "true": "True", "false": "False"}
_LITERAL = re.compile(r"\b(undefined|null|true|false)\b")
_OPTION = re.compile(r"\{ (\w+): ([^{}]*?) \}")


# A string in double quotes, as the library shows a value it was given; group 1 is set when it is the
# key of a JSON object (followed by a colon).
_STRING = re.compile(r'"(?:[^"\\]|\\.)*"(?=(:)?)')


def _terms(text: str) -> str:
    text = _OPTION.sub(lambda m: f"{m.group(1)}={m.group(2)}", text)
    text = _CAMEL.sub(lambda m: re.sub(r"([A-Z])", lambda c: "_" + c.group(1).lower(), m.group(1)), text)
    return _LITERAL.sub(lambda m: _LITERALS[m.group(1)], text)


def python_terms(message: str) -> str:
    """A message of the library in Python's terms: names in snake_case (``fromCell`` →
    ``from_cell``), the literals of JavaScript as Python writes them (``undefined`` → ``None``,
    ``true`` → ``True``), and an option object ``{ factors: [1, 2] }`` as the keyword argument
    ``factors=[1, 2]``. A string in double quotes is a value the caller passed and stays as it is,
    unless it is the key of an object (``{"cellChoice": 9}``), which the caller passed in snake_case.
    """
    out, last = [], 0
    for m in _STRING.finditer(message):
        out.append(_terms(message[last : m.start()]))
        out.append(_terms(m.group(0)) if m.group(1) else m.group(0))
        last = m.end()
    out.append(_terms(message[last:]))
    return "".join(out)


def value(name: str) -> Any:
    """The exported constant ``name``, decoded from JSON."""
    with _lock:
        return json.loads(str(_get("value")(name)))


def exports() -> list[tuple[str, str]]:
    """Names of the exports of the bundled library and their kinds (``function`` or ``value``)."""
    with _lock:
        return [(n, k) for n, k in json.loads(str(_get("exports")()))]
