"""Sphinx configuration of the symcrys site (#29): MyST for Markdown, MyST-NB for the notebooks and
the pages with Python code cells (executed at every build), autodoc with napoleon for the Python
reference (docstrings written from the TSDoc comments, scripts/python-api.mjs), and the
TypeDoc reference copied in as ts/ (html_extra_path). Build: README.md, "Documentation"."""

from __future__ import annotations

import sys
from pathlib import Path

DOCS = Path(__file__).resolve().parent
ROOT = DOCS.parent
sys.path.insert(0, str(DOCS / "_ext"))

import symcrys  # noqa: E402  (the installed package of this checkout)

project = "symcrys"
author = "Thomas Lottermoser"
copyright = "2026 Thomas Lottermoser"
version = release = symcrys.VERSION

extensions = [
    "myst_nb",
    "sphinx.ext.autodoc",
    "sphinx.ext.napoleon",
    "sphinx_copybutton",
    "symcrys_docs",
]

exclude_patterns = ["_build", "**/.ipynb_checkpoints", "requirements.txt"]
templates_path = ["_templates"]
root_doc = "index"

# MyST: Markdown with anchors for the headings, so that a link can name a section of a page
# (conventions.md is written for GitHub, which makes the same anchors).
myst_heading_anchors = 3
myst_enable_extensions = ["colon_fence", "dollarmath"]

# MyST-NB: every notebook and every page with code cells is executed at each build; an error fails it.
nb_execution_mode = "force"
nb_execution_raise_on_error = True
nb_execution_timeout = 300
nb_merge_streams = True

# The Python reference.
autodoc_member_order = "bysource"
# Constants by their type, without their (long) values.
autodoc_default_options = {"no-value": True}
autodoc_typehints = "signature"
autodoc_preserve_defaults = True
napoleon_google_docstring = False
napoleon_numpy_docstring = True
napoleon_use_rtype = False

# Every reference must resolve (nitpicky); these are typing names of the Python layer, not pages.
nitpicky = True
nitpick_ignore_regex = [
    (r"py:.*", r"(numpy|np|NDArray|ArrayLike|Any|Optional|Literal|Mapping|Sequence|TypedDict).*"),
    (r"py:.*", r"(str|int|float|bool|dict|list|tuple)"),
    # The type column of the generated Parameters sections (scripts/python-api.mjs).
    (r"py:.*", r"(keyword-only|optional)"),
]



def setup(app):  # noqa: ANN001, ANN201
    # napoleon reads "text: more" in the docstring of a constant or a field as "type: description".
    # Those docstrings (from TSDoc) are text, with no sections, so napoleon is skipped for them.
    from sphinx.ext.napoleon import _process_docstring

    listeners = app.events.listeners["autodoc-process-docstring"]
    for listener in [li for li in listeners if li.handler is _process_docstring]:
        app.disconnect(listener.id)

    def process(app, what, name, obj, options, lines):  # noqa: ANN001, ANN202
        if what not in ("data", "attribute"):
            _process_docstring(app, what, name, obj, options, lines)

    app.connect("autodoc-process-docstring", process)


html_theme = "furo"
# The site's address: canonical links, Open Graph and sitemap.xml (docs/_ext/symcrys_docs.py, #72).
html_baseurl = "https://manganite.github.io/symcrys/"
# One description per page (meta description and og:description, at most about 160 characters);
# the build warns about a page without one.
symcrys_page_descriptions = {
    "index": "Crystallographic point and plane groups in TypeScript and Python: 32 crystal classes, "
    "122 magnetic point groups, 17 plane groups, Wyckoff positions, crystal forms and tensor forms.",
    "getting-started": "Install symcrys from npm or PyPI and take the first steps: point groups, settings, "
    "symbols, operations and the form of a property tensor.",
    "readings": "One key, two readings: 32 is a crystal class in symcrys and a white magnetic point "
    "group in symcrys/magnetic. Which entry point to use, and why.",
    "conventions": "The conventions of symcrys for point and plane groups after ITC, axis frames, "
    "settings, symbols, Wyckoff positions, crystal forms and tensors, with print sources.",
    "plane-groups": "The 17 plane groups and 10 plane point groups in symcrys/plane: operations in ITA's "
    "order, Wyckoff positions, site symmetry, asymmetric unit, symmetry elements and 2D cells.",
    "browser": "symcrys in a web page without a bundler: an ES module import of the package's dist/, "
    "with a complete example that shows the form of a property tensor for a chosen group and setting.",
    "tensors": "Tensor forms allowed by a point group, rank 0 to 4, and named properties such as "
    "piezoelectric, pyroelectric, gyrotropic, ferroaxial and magnetoelectric.",
    "cells": "Cells in symcrys: lattice from cell parameters, reciprocal basis, angles between planes, "
    "residual symmetry, Miller and Bravais–Miller indices, zone axes.",
    "forms": "Crystal forms of the 32 point groups after ITA, orbits of faces, and the point group and "
    "symmetry elements of the operations of a distorted crystal.",
    "examples": "Example notebooks of the symcrys Python package, executed when the site is built; "
    "currently the allowed SHG tensor at the surfaces of a crystal.",
    "examples/notebooks/surface-shg": "Notebook: which components of the second-harmonic generation (SHG) "
    "tensor the surfaces of a crystal allow, computed with the symcrys Python package.",
    "reference/index": "API reference of symcrys: the TypeScript reference (TypeDoc) and the Python "
    "reference, generated from one description of every export.",
    "reference/python": "Python reference of symcrys: every function and constant of the modules symcrys, "
    "symcrys.magnetic and symcrys.plane, with NumPy shapes and types.",
}
html_title = f"symcrys {release}"
html_static_path = ["_static"]
html_css_files = ["symcrys.css"]
# The browser example (browser.md, #65) as a page of the site: its files and a copy of the build of
# this checkout, the package's dist/, under browser/; the page loads symcrys from there unbundled.
BROWSER = ROOT / "build" / "docs" / "browser-extra"


def _browser_example() -> None:
    import shutil

    target = BROWSER / "browser"
    shutil.rmtree(BROWSER, ignore_errors=True)
    shutil.copytree(DOCS / "examples" / "browser", target, ignore=shutil.ignore_patterns("tsconfig.json"))
    dist = ROOT / "packages" / "ts" / "dist"
    if not (dist / "index.js").exists():
        raise RuntimeError("packages/ts/dist is missing: run npm run build before the site")
    # The declarations are not needed in a page; the source maps are, for the browser's tools.
    shutil.copytree(dist, target / "symcrys", ignore=shutil.ignore_patterns("*.d.ts", "*.d.ts.map"))
    for needed in ("index.html", "main.js", "form.js", "symcrys/index.js"):
        if not (target / needed).exists():
            raise RuntimeError(f"the browser example lacks {needed}")


_browser_example()
html_extra_path = [str(ROOT / "build" / "docs" / "ts-extra"), str(BROWSER)]
html_theme_options = {
    "source_repository": "https://github.com/manganite/symcrys/",
    "source_branch": "main",
    "source_directory": "docs/",
}
html_show_sourcelink = False

# The site itself goes online with the release that builds it; its pages are checked as documents.
linkcheck_ignore = [r"https://github\.com/manganite/symcrys/(issues|pull)/.*", r"https://manganite\.github\.io/symcrys/.*"]
