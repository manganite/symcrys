"""Sphinx configuration of the symcrys site (#29): MyST for Markdown, MyST-NB for the notebooks and
the pages with Python code cells (executed at every build), autodoc with napoleon for the Python
reference (docstrings written from the TSDoc comments, scripts/python-docstrings.mjs), and the
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
    (r"py:.*", r"(symcrys\.)?(magnetic\.)?(_shared\.)?(Convention|TensorParity|IntrinsicSymmetry|TimeParity|TensorPropertyName|SiteSymmetry|TensorForm|TensorSpec|Operation)"),
    (r"py:.*", r"(str|int|float|bool|dict|list|tuple)"),
    # The type column of the generated Parameters sections (scripts/python-docstrings.mjs).
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
html_title = f"symcrys {release}"
html_static_path = ["_static"]
html_css_files = ["symcrys.css"]
html_extra_path = [str(ROOT / "build" / "docs" / "ts-extra")]
html_theme_options = {
    "source_repository": "https://github.com/manganite/symcrys/",
    "source_branch": "main",
    "source_directory": "docs/",
}
html_show_sourcelink = False

linkcheck_ignore = [r"https://github\.com/manganite/symcrys/(issues|pull)/.*"]
