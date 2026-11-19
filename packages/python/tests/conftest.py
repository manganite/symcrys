"""Shared paths: the Python tests read the same print transcriptions (references/) and captured
pins (packages/ts/src/**/*.pins.json) as the TypeScript tests, and have no expected values of
their own (#30)."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

REPO = Path(__file__).resolve().parents[3]
REFERENCES = REPO / "references"
TS = REPO / "packages" / "ts"


def table_rows(text: str) -> list[list[str]]:
    """Rows of the first Markdown table, header first, separator dropped, cells trimmed."""
    lines = text.splitlines()
    start = next(i for i, line in enumerate(lines) if line.strip().startswith("|"))
    rows: list[list[str]] = []
    for line in lines[start:]:
        if not line.strip().startswith("|"):
            break
        cells = [c.strip() for c in line.strip().split("|")[1:-1]]
        if all(set(c) <= set(":-") and c for c in cells):
            continue
        rows.append(cells)
    return rows


def reference(path: str) -> str:
    return (REFERENCES / path).read_text(encoding="utf-8")


def pins(path: str) -> Any:
    return json.loads((TS / "src" / path).read_text(encoding="utf-8"))
