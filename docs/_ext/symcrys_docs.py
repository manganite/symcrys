"""Sphinx extension of the symcrys site (#29).

- ``ts-example``: shows a TypeScript example from ``docs/examples`` and the output of running it with
  Node against the build of this checkout, so that every example on the site runs; a failing example
  fails the build.
- ``tensor-properties``: the table of named properties, made from ``TENSOR_PROPERTIES`` of the
  library (through the Python package), not written by hand.
- The example notebooks of the Python package are copied into the source tree at build time
  (``examples/notebooks/``, ignored by git), so that MyST-NB executes and renders them where they live.
- Findability (#72): every page gets its description (``symcrys_page_descriptions`` in ``conf.py``;
  a page without one is a warning, so the gate ``docs`` fails) and Open Graph tags for link
  previews; the canonical link of the landing page is the site's address, not ``index.html``; the
  build writes ``sitemap.xml`` with every page.
"""

from __future__ import annotations

import html
import posixpath
import re
import shutil
import subprocess
from pathlib import Path
from typing import Any

from docutils import nodes
from docutils.parsers.rst import directives
from sphinx.application import Sphinx
from sphinx.util import logging
from sphinx.util.docutils import SphinxDirective

logger = logging.getLogger(__name__)

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

        header = ["Name", "Tensor", "In ``symcrys``", "Description"]
        rows = []
        for name, prop in magnetic.TENSOR_PROPERTIES.items():
            spec = prop["spec"]
            kind = (
                f"rank {spec['rank']}, {spec['kind']}, time-{spec['time_parity']}, "
                f"intrinsic {spec['intrinsic']}"
            )
            here = "yes" if name in symcrys.TENSOR_PROPERTIES else "no (magnetic API only)"
            rows.append([f"``'{name}'``", kind, here, prop["description"]])
        return self._table(header, rows)

    def _table(self, header: list[str], rows: list[list[str]]) -> list[nodes.Node]:
        table = nodes.table(classes=["tensor-properties"])
        group = nodes.tgroup(cols=len(header))
        table += group
        for width in (16, 24, 14, 46):
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


# Pages copied in at build time (the notebooks): a description is used if there is one, but a missing
# one is not a warning, because a new notebook needs no change to the site.
UNCHECKED = ("examples/notebooks/",)


def page_url(app: Sphinx, pagename: str) -> str:
    """The address of a page, as Sphinx builds the canonical link; the landing page is the site's address."""
    target = "" if pagename == app.config.root_doc else app.builder.get_target_uri(pagename)
    return posixpath.join(app.config.html_baseurl, target)


def page_meta(app: Sphinx, pagename: str, templatename: str, context: dict[str, Any], doctree: Any) -> None:
    """Description, canonical address and Open Graph tags of a page made from a source file."""
    if doctree is None:  # genindex, search: generated, not sources
        return
    description = app.config.symcrys_page_descriptions.get(pagename)
    if not description and not pagename.startswith(UNCHECKED):
        logger.warning(
            "no description for %s in symcrys_page_descriptions (docs/conf.py)", pagename, location=pagename
        )
    url = page_url(app, pagename)
    context["pageurl"] = url  # the canonical link of the theme
    title = html.unescape(re.sub(r"<[^>]+>", "", context.get("title", "")))
    tags = [
        ("property", "og:type", "website"),
        ("property", "og:site_name", "symcrys"),
        ("property", "og:title", title),
        ("property", "og:url", url),
        ("property", "og:locale", "en_GB"),  # British spelling, as the site
    ]
    if description:
        tags = [("name", "description", description), *tags, ("property", "og:description", description)]
    meta = "".join(f'<meta {kind}="{key}" content="{html.escape(value)}" />\n' for kind, key, value in tags)
    context["metatags"] = context.get("metatags", "") + meta


def write_sitemap(app: Sphinx, exception: Exception | None) -> None:
    """``sitemap.xml`` with every page of the site and the start of the TypeScript reference (``ts/``)."""
    if exception is not None or app.builder.format != "html":
        return
    urls = [page_url(app, name) for name in sorted(app.env.found_docs)]
    urls.append(f"{app.config.html_baseurl}ts/index.html")
    entries = "".join(f"  <url><loc>{html.escape(u)}</loc></url>\n" for u in sorted(set(urls)))
    text = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        f"{entries}</urlset>\n"
    )
    (Path(app.outdir) / "sitemap.xml").write_text(text, encoding="utf-8")


def setup(app: Sphinx) -> dict[str, Any]:
    app.add_directive("ts-example", TsExample)
    app.add_directive("tensor-properties", TensorProperties)
    app.connect("builder-inited", copy_notebooks)
    app.add_config_value("symcrys_page_descriptions", {}, "html", dict)
    app.connect("html-page-context", page_meta)
    app.connect("build-finished", write_sitemap)
    return {"parallel_read_safe": True, "parallel_write_safe": True}
