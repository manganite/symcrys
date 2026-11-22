"""The boundary to the JavaScript engine: one function, ``call(name, args_json) -> result_json``.

The TypeScript library of the same version, bundled into ``_bundle.js``, runs in quickjs-ng. Only
this module knows the engine, so another backend (e.g. Pyodide in JupyterLite, #30) replaces this
module and nothing else.
"""

from __future__ import annotations

import json
import threading
from importlib import resources
from typing import Any

import quickjs  # type: ignore[import-untyped]

__all__ = ["SymcrysError", "call", "exports", "value"]


class SymcrysError(ValueError):
    """An error raised by symcrys (e.g. an unknown key, setting or tensor specification).

    ``js_name`` is the name of the JavaScript error (``RangeError``, ``TypeError``, ``Error``).
    """

    def __init__(self, message: str, js_name: str = "Error") -> None:
        super().__init__(message)
        self.js_name = js_name


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
    """Calls ``name`` with JSON-compatible arguments; returns the decoded result or raises SymcrysError."""
    try:
        args_json = json.dumps(args, allow_nan=False)
    except ValueError:
        # JSON has no NaN or infinity; without this check the engine's parser reported "unexpected token" (#92).
        raise SymcrysError("Every number passed to symcrys must be finite, not NaN or infinite", "RangeError") from None
    answer = json.loads(call(name, args_json))
    if "error" in answer:
        error = answer["error"]
        raise SymcrysError(error["message"], error["name"])
    return answer.get("result")


def value(name: str) -> Any:
    """The exported constant ``name``, decoded from JSON."""
    with _lock:
        return json.loads(str(_get("value")(name)))


def exports() -> list[tuple[str, str]]:
    """Names of the exports of the bundled library and their kinds (``function`` or ``value``)."""
    with _lock:
        return [(n, k) for n, k in json.loads(str(_get("exports")()))]
