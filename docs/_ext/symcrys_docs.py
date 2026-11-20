"""Sphinx extension of the symcrys site (#29).

- ``ts-example``: shows a TypeScript example from ``docs/examples`` and the output of running it with
  Node against the build of this checkout, so that every example on the site runs; a failing example
  fails the build.
- ``tensor-properties``: the table of named properties, made from ``TENSOR_PROPERTIES`` of the
  library (through the Python package), not written by hand.
- The example notebooks of the Python package are copied into the source tree at build time
  (``examples/notebooks/``, ignored by git), so that MyST-NB executes and renders them where they live.
"""

from __future__ import annotations

import shutil
import subprocess
from pathlib import Path
from typing import Any

from docutils import nodes
from docutils.parsers.rst import directives
from sphinx.application import Sphinx
from sphinx.util.docutils import SphinxDirective

DOCS = Path(__file__).resolve().parents[1]
ROOT = DOCS.parent
NOTEBOOKS = ROOT / "packages" / "python" / "examples"


class TsExample(SphinxDirective):
    """``.. ts-example:: file.ts``: the code, then what it prints."""

    required_arguments = 1
    option_spec = {"caption": directives.unchanged}

    def run(self) -> list[nodes.Node]:
        path = (DOCS / "examples" / self.arguments[0]).resolve()
        self.env.note_dependency(str(path))
        code = path.read_text(encoding="utf-8")
        run = subprocess.run(
            ["node", "--experimental-strip-types", "--disable-warning=ExperimentalWarning", str(path)],
            cwd=ROOT,
            capture_output=True,
            text=True,
            timeout=120,
        )
        if run.returncode != 0:
            raise self.error(f"{path.name} failed:\n{run.stderr}")
        source = nodes.literal_block(code, code, language="ts")
        output = nodes.literal_block(run.stdout, run.stdout, language="text", classes=["ts-output"])
        caption = self.options.get("caption")
        result: list[nodes.Node] = []
        if caption:
            result.append(nodes.paragraph(text=caption))
        result += [source, nodes.paragraph(text="Output:", classes=["ts-output-label"]), output]
        return result


class TensorProperties(SphinxDirective):
    """``.. tensor-properties::``: one row per entry of ``TENSOR_PROPERTIES`` (magnetic API)."""

    def run(self) -> list[nodes.Node]:
        import symcrys
        from symcrys import magnetic

        header = ["Name", "Tensor", "In ``symcrys``", "Description", "Source"]
        rows = []
        for name, prop in magnetic.TENSOR_PROPERTIES.items():
            spec = prop["spec"]
            kind = (
                f"rank {spec['rank']}, {spec['parity']}, "
                f"time-{'even' if spec['time_parity'] == 'i' else 'odd'} ({spec['time_parity']}), "
                f"intrinsic {spec['intrinsic']}"
            )
            here = "yes" if name in symcrys.TENSOR_PROPERTIES else "no (magnetic API only)"
            rows.append([f"``'{name}'``", kind, here, prop["description"], prop["source"]])
        return self._table(header, rows)

    def _table(self, header: list[str], rows: list[list[str]]) -> list[nodes.Node]:
        table = nodes.table(classes=["tensor-properties"])
        group = nodes.tgroup(cols=len(header))
        table += group
        for width in (14, 18, 12, 30, 26):
            group += nodes.colspec(colwidth=width)
        head = nodes.thead()
        group += head
        head += self._row(header)
        body = nodes.tbody()
        group += body
        for row in rows:
            body += self._row(row)
        return [table]

    def _row(self, cells: list[str]) -> nodes.row:
        row = nodes.row()
        for text in cells:
            entry = nodes.entry()
            paragraph = nodes.paragraph()
            if text.startswith("``") and text.endswith("``"):
                paragraph += nodes.literal(text=text[2:-2])
            else:
                parts = text.split("``")
                for i, part in enumerate(parts):
                    paragraph += nodes.literal(text=part) if i % 2 else nodes.Text(part)
            entry += paragraph
            row += entry
        return row


def copy_notebooks(app: Sphinx) -> None:
    target = DOCS / "examples" / "notebooks"
    target.mkdir(parents=True, exist_ok=True)
    for notebook in sorted(NOTEBOOKS.glob("*.ipynb")):
        shutil.copyfile(notebook, target / notebook.name)


def setup(app: Sphinx) -> dict[str, Any]:
    app.add_directive("ts-example", TsExample)
    app.add_directive("tensor-properties", TensorProperties)
    app.connect("builder-inited", copy_notebooks)
    return {"parallel_read_safe": True, "parallel_write_safe": True}
