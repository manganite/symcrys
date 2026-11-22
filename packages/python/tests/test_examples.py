"""The example notebooks run: their code cells are executed in order, in one namespace. The version a
notebook shows as a stored output is that of the package."""

import json
import re
from pathlib import Path

import pytest

import symcrys

EXAMPLES = sorted((Path(__file__).resolve().parents[1] / "examples").glob("*.ipynb"))


@pytest.mark.parametrize("path", EXAMPLES, ids=[p.name for p in EXAMPLES])
def test_notebook_runs(path: Path) -> None:
    namespace: dict[str, object] = {}
    for cell in json.loads(path.read_text(encoding="utf-8"))["cells"]:
        if cell["cell_type"] == "code":
            exec(compile("".join(cell["source"]), f"{path.name}", "exec"), namespace)  # noqa: S102


@pytest.mark.parametrize("path", EXAMPLES, ids=[p.name for p in EXAMPLES])
def test_stored_version_is_that_of_the_package(path: Path) -> None:
    # A release bumps the version; the stored output of `symcrys.VERSION` has to follow.
    shown = []
    asks = False
    for cell in json.loads(path.read_text(encoding="utf-8"))["cells"]:
        if cell["cell_type"] != "code" or "VERSION" not in "".join(cell["source"]):
            continue
        asks = True
        for output in cell.get("outputs", []):
            text = "".join(output.get("data", {}).get("text/plain", []))
            if re.fullmatch(r"'\d+\.\d+\.\d+'", text):
                shown.append(text)
    # A notebook that asks for the version must show it, or the check below would pass on nothing (#129).
    assert shown or not asks, f"{path.name}: a cell asks for VERSION but no version is stored as its output"
    for text in shown:
        assert text == repr(symcrys.VERSION)
