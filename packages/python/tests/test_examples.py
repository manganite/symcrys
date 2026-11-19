"""The example notebooks run: their code cells are executed in order, in one namespace."""

import json
from pathlib import Path

import pytest

EXAMPLES = sorted((Path(__file__).resolve().parents[1] / "examples").glob("*.ipynb"))


@pytest.mark.parametrize("path", EXAMPLES, ids=[p.name for p in EXAMPLES])
def test_notebook_runs(path: Path) -> None:
    namespace: dict[str, object] = {}
    for cell in json.loads(path.read_text(encoding="utf-8"))["cells"]:
        if cell["cell_type"] == "code":
            exec(compile("".join(cell["source"]), f"{path.name}", "exec"), namespace)  # noqa: S102
