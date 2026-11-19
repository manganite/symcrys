import json
import re

import symcrys
from conftest import REPO, TS


def test_one_version_for_both_packages() -> None:
    ts_version = json.loads((TS / "package.json").read_text())["version"]
    pyproject = (REPO / "packages" / "python" / "pyproject.toml").read_text()
    match = re.search(r'^version = "([^"]+)"$', pyproject, re.M)
    assert match is not None
    assert match.group(1) == ts_version
    assert symcrys.VERSION == ts_version == symcrys.__version__
