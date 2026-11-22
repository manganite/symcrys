"""The plane API through Python: the layer (names, NumPy types, errors) and the Wyckoff positions,
the printed vertices and points of the 17 plane groups read from references/ as the TypeScript
tests read them (ITA 6th ed., 2016, Chapter 2.2)."""

import re

import numpy as np
import pytest

import symcrys
from symcrys import plane
from conftest import reference


def sections() -> list[str]:
    return reference("itc/vol-a-2016-plane-groups.md").split("\n## ")[1:]


def frac(text: str) -> float:
    n, _, d = text.partition("/")
    return int(n) / int(d or 1)


def test_keys_and_module() -> None:
    assert symcrys.plane is plane and plane.VERSION == symcrys.VERSION
    assert len(plane.PLANE_GROUP_KEYS) == 17 and len(plane.POINT_GROUP_KEYS) == 10
    assert plane.plane_group("p31m")["point_group_setting"] == 2
    assert plane.symbol("3m", setting=2) == "31m"


def test_numpy_types() -> None:
    op = plane.operations("c2mm")[5]
    assert op["matrix"].dtype == np.float64 and op["matrix"].shape == (2, 2)
    assert op["translation"].dtype == np.float64 and op["translation"].tolist() == [0.5, 0.5]
    assert plane.operations("p2")[0]["translation"].dtype == np.float64
    assert plane.plane_group("p2")["centring"].shape == (0, 2)
    glide = plane.describe_operations("p4gm")[4]
    assert glide["direction"].dtype == np.int64 and glide["glide"].dtype == np.float64
    unit = plane.asymmetric_unit("p6mm")
    assert unit["vertices"].shape == (3, 2) and unit["inequalities"].dtype == np.int64
    elements = plane.symmetry_elements("p4mm")
    assert elements["lines"][0]["segment"].shape == (2, 2)
    assert elements["rotations"][0]["point"].dtype == np.float64
    site = plane.site_symmetry("p2mm", np.array([0.5, 0.2]))
    assert site["operations"].dtype == np.int64 and site["multiplicity"] == 2
    assert plane.orbit("p2", (0.1, 0.2)).shape == (2, 2)


def test_errors() -> None:
    with pytest.raises(symcrys.SymcrysError, match="Unknown plane group"):
        plane.operations("p7")
    with pytest.raises(symcrys.SymcrysError, match="key of a plane group"):
        plane.site_symmetry("4mm", [0, 0])
    with pytest.raises(symcrys.SymcrysError):
        plane.orbit("p2", [0.1, 0.2], tolerance=0.5)


@pytest.mark.parametrize("text", sections(), ids=lambda t: t.split(",")[0])
def test_print(text: str) -> None:
    symbol = re.match(r"^\d+ — (\S+),", text).group(1)  # type: ignore[union-attr]
    rows = [[c.strip() for c in line.split("|")[1:-1]] for line in text.split("\n") if re.match(r"^\| \d", line)]
    positions = plane.wyckoff_positions(symbol)
    assert [(p["multiplicity"], p["letter"], p["site_symmetry"], p["coordinates"]) for p in positions] == [
        (int(m), letter, site, coords.split("; ")) for m, letter, site, coords in rows
    ]
    for m, letter, site, coords in rows:
        first = coords.split("; ")[0]
        if "x" in first or "y" in first:
            continue
        point = [frac(c) for c in first.split(",")]
        assert plane.wyckoff_position_of(symbol, point) == {"letter": letter, "multiplicity": int(m), "site_symmetry": site}
    vertices = re.search(r"^Vertices: (.+?)\s*$", text, re.M)
    if vertices:
        printed = [[frac(c) for c in v.split(",")] for v in vertices.group(1).split("; ")]
        np.testing.assert_allclose(plane.asymmetric_unit(symbol)["vertices"], printed, atol=1e-15)
