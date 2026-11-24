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
    assert plane.point_group("3m") == {"key": "3m", "crystal_system": "hexagonal", "order": 6}
    assert [s["symbol"] for s in plane.settings("3m")] == ["3m1", "31m"]
    assert plane.plane_group("c2mm")["crystal_system"] == "rectangular"


def test_numpy_types() -> None:
    op = plane.operations("c2mm")[5]
    assert op["matrix"].dtype == np.int64 and op["matrix"].shape == (2, 2)
    assert op["translation"].dtype == np.float64 and op["translation"].tolist() == [0.5, 0.5]
    assert plane.operations("p2")[0]["translation"].dtype == np.float64
    assert plane.plane_group("p2")["centring"].shape == (0, 2)
    glide = plane.describe_operations("p4gm")[4]
    assert glide["direction"].dtype == np.int64 and glide["glide"].dtype == np.float64
    assert glide["axis"].dtype == np.int64 and glide["axis"].tolist() == [1, 0]
    described = plane.describe_operations_of(plane.operations("p6mm"))
    assert [d["kind"] for d in described] == [d["kind"] for d in plane.describe_operations("p6mm")]
    assert all(
        np.array_equal(a.get("axis", []), b.get("axis", []))
        for a, b in zip(described, plane.describe_operations("p6mm"))
    )
    mirror = plane.describe_operations_of([{"matrix": np.array([[1, -1], [0, -1]]), "translation": (0, 0)}])[0]
    assert mirror["kind"] == "reflection" and mirror["axis"].tolist() == [1, 2] and mirror["direction"].tolist() == [1, 0]
    unit = plane.asymmetric_unit("p6mm")
    assert unit["vertices"].shape == (3, 2) and unit["inequalities"].dtype == np.int64
    assert unit["edges"].dtype == np.int64 and unit["edges"].shape == (3,)
    assert plane.asymmetric_unit("p3")["inequalities"].shape == (7, 3)  # also x <= 2/3, y <= 2/3
    elements = plane.symmetry_elements("p4mm")
    assert elements["lines"][0]["point"].shape == (2,)
    assert len(plane.symmetry_elements("p2")["rotation_points"]) == 4
    assert len(plane.symmetry_elements("p2", box=np.array([[0, 0], [1, 1]]))["rotation_points"]) == 9
    assert elements["rotation_points"][0]["point"].dtype == np.float64
    assert elements["lines"][0]["axis"].dtype == np.int64
    site = plane.site_symmetry("p2mm", np.array([0.5, 0.2]))
    assert site["operations"].dtype == np.int64 and site["multiplicity"] == 2
    orbit = plane.orbit("p2", (0.1, 0.2))
    assert len(orbit) == 2 and orbit[0]["point"].dtype == np.float64 and orbit[0]["point"].shape == (2,)
    assert orbit[1]["operations"].dtype == np.int64 and orbit[1]["operations"].tolist() == [1]
    assert plane.settings("3m")[0]["is_default"] is True
    assert plane.symbol("pm", form="full") == "p 1 m 1" and plane.symbol("pm") == "pm"
    assert "full_symbol" not in plane.plane_group("pm")
    distances = plane.wyckoff_distances("p6mm", np.array([0.34, 0.66]))
    b = next(d for d in distances if d["letter"] == "b")
    assert b["site_symmetry"] == "3m." and abs(b["distance"] - (0.34 - 1 / 3)) < 1e-12
    assert b["point"].dtype == np.float64 and np.allclose(b["point"], [1 / 3, 2 / 3])
    a = next(d for d in plane.wyckoff_distances("pm", [0.1, 0.3], basis=np.diag([2.0, 1.0])) if d["letter"] == "a")
    assert abs(a["distance"] - 0.2) < 1e-12
    assert plane.wyckoff_position("pm", [0.012, 0.3], tolerance=0.02)["letter"] == "a"


def test_errors() -> None:
    with pytest.raises(symcrys.SymcrysError, match="Unknown plane group"):
        plane.operations("p7")
    with pytest.raises(symcrys.SymcrysError, match="key of a plane group"):
        plane.site_symmetry("4mm", [0, 0])
    with pytest.raises(symcrys.SymcrysError):
        plane.orbit("p2", [0.1, 0.2], tolerance=0.5)
    with pytest.raises(symcrys.SymcrysError, match="two coordinates"):
        plane.site_symmetry("p2", [[0.1, 0.2]])
    with pytest.raises(symcrys.SymcrysError):
        plane.wyckoff_distances("p2", [0.1, 0.2], basis=[[1, 2], [2, 4]])
    with pytest.raises(symcrys.SymcrysError, match="denominator"):
        plane.describe_operations_of([{"matrix": np.eye(2), "translation": [0.1234, 0]}])
    with pytest.raises(symcrys.SymcrysError):
        plane.describe_operations_of([{"matrix": np.eye(2)}])


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
        assert plane.wyckoff_position(symbol, point) == {
            "letter": letter, "multiplicity": int(m), "site_symmetry": site, "coordinates": coords.split("; ")
        }  # fmt: skip
    vertices = re.search(r"^Vertices: (.+?)\s*$", text, re.M)
    if vertices:
        printed = [[frac(c) for c in v.split(",")] for v in vertices.group(1).split("; ")]
        np.testing.assert_allclose(plane.asymmetric_unit(symbol)["vertices"], printed, atol=1e-15)
