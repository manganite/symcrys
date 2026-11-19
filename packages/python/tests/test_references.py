"""Print anchors through Python, read from references/ as the TypeScript tests read them: ITA
Table 3.2.2.1, ITC Vol. D § 1.1.4.10.6, ITC Vol. D Table 1.5.2.3 (magnetic point groups), and Yariv
Table 16.1 with the use case of #30 (SHG at the (001), (110) and (111) surfaces of an m-3m
crystal)."""

import re

import numpy as np
import pytest

import symcrys
from conftest import reference, table_rows

SHG = {"rank": 3, "parity": "polar", "time_parity": "i", "intrinsic": "jk"}


def spec(rank: int, parity: str = "polar", intrinsic: str = "none") -> dict[str, object]:
    return {"rank": rank, "parity": parity, "time_parity": "i", "intrinsic": intrinsic}


def count(cell: str) -> int:
    if cell == "-":
        return 0
    m = re.match(r"^\+ \((\d+)\)", cell)
    if not m:
        raise ValueError(f"Table 3.2.2.1: no count in {cell!r}")
    return int(m.group(1))


ROWS_3221 = table_rows(reference("itc/vol-a-table-3.2.2.1.md"))
ITA_3221 = [r for r in ROWS_3221[1:] if r[2] not in ("235 (532)", "2-inf (inf inf)")]


def test_ita_3221_as_read() -> None:
    assert ROWS_3221[0] == [
        "System", "Laue class", "Group", "Rank-1 (pyroelectricity)", "Rank-3 (piezo/SHG)",
        "Enantiomorphism", "Axial rank-2 (optical activity)",
    ]
    keys = sorted(r[2].replace("-62m", "-6m2") for r in ITA_3221)
    assert keys == sorted(k for k in symcrys.POINT_GROUP_KEYS if not symcrys.is_centrosymmetric(k))


@pytest.mark.parametrize("row", ITA_3221, ids=[r[2] for r in ITA_3221])
def test_ita_3221_counts(row: list[str]) -> None:
    key = row[2].replace("-62m", "-6m2")
    assert len(symcrys.tensor_form(key, spec(1))["basis"]) == count(row[3])
    assert len(symcrys.tensor_form(key, SHG)["basis"]) == count(row[4])
    assert len(symcrys.tensor_form(key, spec(2, "axial", "ij"))["basis"]) == count(row[6])


def test_ita_3221_piezoelectric_classes() -> None:
    printed = sorted(r[2].replace("-62m", "-6m2") for r in ITA_3221 if count(r[4]) > 0)
    assert len(printed) == 20
    assert sorted(k for k in symcrys.POINT_GROUP_KEYS if symcrys.is_piezoelectric(k)) == printed


ABBREVIATION = {"42": "422", "62": "622", "4m": "4mm", "6m": "6mm", "4/mm": "4/mmm", "6/mm": "6/mmm", "-62m": "-6m2", "2mm": "mm2"}
VOL_D = [r for r in table_rows(reference("itc/vol-d-table-1.1.4.10.6-rank-4-counts.md"))[1:] if r[0] != "1.1.4.10.6.8"]


@pytest.mark.parametrize("row", VOL_D, ids=[r[0] for r in VOL_D])
def test_itc_vol_d_rank_4_counts(row: list[str]) -> None:
    misprint = {"3m": "m-3"} if row[0].startswith("1.1.4.10.6.7") else {}
    for printed in (g.strip() for g in row[1].split(",")):
        key = misprint.get(printed, ABBREVIATION.get(printed, printed))
        assert len(symcrys.tensor_form(key, spec(4, intrinsic="ij_kl"))["basis"]) == int(row[2]), key
        assert len(symcrys.tensor_form(key, spec(4, intrinsic="voigt"))["basis"]) == int(row[3]), key


YARIV = {r[0]: r for r in table_rows(reference("yariv/table-16.1.md"))[1:]}
VOIGT = [(0, 0), (1, 1), (2, 2), (1, 2), (2, 0), (0, 1)]


def cells(basis: np.ndarray) -> list[str]:
    """Nonzero cells d_iμ of a jk-symmetric rank-3 basis, as Yariv names them."""
    out = []
    for i in range(3):
        for mu, (j, k) in enumerate(VOIGT):
            if np.any(np.abs(basis[:, i * 9 + j * 3 + k]) > 1e-9):
                out.append(f"{i + 1}{mu + 1}")
    return out


def printed_cells(row: list[str]) -> list[str]:
    return sorted(m[:2] for m in re.findall(r"[1-3][1-6][fo]", row[4]))


@pytest.mark.parametrize(
    ("normal", "x", "panel"),
    [([0, 0, 1], [1, 0, 0], "class-4mm"), ([1, 1, 0], [0, 0, 1], "class-mm2"), ([1, 1, 1], [1, -1, 0], "class-3m-perpx1")],
    ids=["(001)", "(110)", "(111)"],
)
def test_shg_at_m3m_surfaces_is_yarivs_form(normal: list[int], x: list[int], panel: str) -> None:
    assert symcrys.tensor_form("m-3m", SHG)["basis"].shape[0] == 0
    ops = symcrys.operations("m-3m")
    site = symcrys.site_symmetry(ops, normal)
    form = symcrys.tensor_form_of([ops[i] for i in site["operations"]], SHG)
    z = np.array(normal, float) / np.linalg.norm(normal)
    xa = np.array(x, float) / np.linalg.norm(x)
    frame = np.array([xa, np.cross(z, xa), z])
    basis = np.array([symcrys.rotate_tensor(b, frame, SHG) for b in form["basis"]])
    row = YARIV[panel]
    assert len(basis) == int(row[3])
    assert cells(basis) == printed_cells(row)


# --- ITC Vol. D Table 1.5.2.3: the magnetic point groups -----------------------------------------

ROWS_1523 = table_rows(reference("itc/vol-d-table-1.5.2.3.md"))


def printed_count(operators: str) -> int:
    """Number of operations in a printed list such as ``1, 2_z, ±4'_z, 3(2_⊥), 4(±3)``."""
    total = 0
    for term in (t.strip() for t in operators.split(",")):
        m = re.match(r"^(\d)\((.+)\)$", term)
        n, inner = (int(m.group(1)), m.group(2)) if m else (1, term)
        total += n * (2 if inner.startswith("±") else 1)
    return total


def test_itc_vol_d_1523_as_read() -> None:
    assert ROWS_1523[0] == ["System", "Schoenflies", "Shubnikov", "Short", "Full", "Symmetry operators"]
    keys = [r[3] for r in ROWS_1523[1:]]
    assert len(keys) == 90
    groups = {g["key"]: g for g in symcrys.magnetic_point_groups()}
    assert [k for k in keys if groups[k]["type"] == "I"] == list(symcrys.POINT_GROUP_KEYS)
    assert [k for k in keys if groups[k]["type"] == "III"] == [k for k, g in groups.items() if g["type"] == "III"]
    assert len([g for g in groups.values() if g["type"] == "II"]) == 32


@pytest.mark.parametrize("row", ROWS_1523[1:], ids=[r[3] for r in ROWS_1523[1:]])
def test_itc_vol_d_1523_symbols_and_order(row: list[str]) -> None:
    system, schoenflies, _, key, full, operators = row
    group = symcrys.point_group(key)
    assert group["crystal_system"] == system.lower()
    assert group["order"] == printed_count(operators)
    assert symcrys.symbol(key, form="full") == full
    assert symcrys.symbol(key, form="schoenflies") == schoenflies.replace("S6", "C3i")
    ops = symcrys.operations(key)
    primed = sum(1 for o in ops if o["time_reversal"])
    assert primed == (len(ops) // 2 if "(" in schoenflies else 0)
