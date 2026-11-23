"""Print anchors through Python, read from references/ as the TypeScript tests read them: ITA
Tables 3.2.2.1, 3.2.1.3 and 3.2.3.2 (crystal forms), ITC Vol. D § 1.1.4.10.6, ITC Vol. D Table
1.5.2.3 (magnetic point groups), Tables 1.5.2.4, 1.5.7.1 and 1.5.8.1 (ferromagnetic,
piezomagnetic, magnetoelectric), and Yariv Table 16.1 with the use case of #30 (SHG at the (001),
(110) and (111) surfaces of an m-3m crystal)."""

import re

import numpy as np
import pytest

import symcrys
from symcrys import magnetic
from conftest import reference, section, table_rows

SHG = {"rank": 3, "parity": "polar", "intrinsic": "jk"}


def spec(rank: int, parity: str = "polar", intrinsic: str = "none") -> dict[str, object]:
    return {"rank": rank, "parity": parity, "intrinsic": intrinsic}


def count(cell: str) -> int:
    if cell == "-":
        return 0
    m = re.match(r"^\+ \((\d+)\)", cell)
    if not m:
        raise ValueError(f"Table 3.2.2.1: no count in {cell!r}")
    return int(m.group(1))


ROWS_3221 = table_rows(reference("itc/vol-a-table-3.2.2.1.md"))
ITA_3221 = [r for r in ROWS_3221[1:] if r[2] not in ("235 (532)", "2inf (inf inf)")]


def test_ita_3221_as_read() -> None:
    assert ROWS_3221[0] == [
        "System", "Laue class", "Group", "Rank-1 (pyroelectricity)", "Rank-3 (piezo/SHG)",
        "Enantiomorphism", "Axial rank-2 (optical activity)",
    ]
    keys = sorted(r[2].replace("-62m", "-6m2") for r in ITA_3221)
    assert keys == sorted(k for k in symcrys.POINT_GROUP_KEYS if not symcrys.point_group(k)["centrosymmetric"])


@pytest.mark.parametrize("row", ITA_3221, ids=[r[2] for r in ITA_3221])
def test_ita_3221_counts(row: list[str]) -> None:
    key = row[2].replace("-62m", "-6m2")
    assert len(symcrys.tensor_form(key, spec(1))["basis"]) == count(row[3])
    assert len(symcrys.tensor_form(key, SHG)["basis"]) == count(row[4])
    assert len(symcrys.tensor_form(key, spec(2, "axial", "ij"))["basis"]) == count(row[6])


def test_ita_3221_piezoelectric_classes() -> None:
    printed = sorted(r[2].replace("-62m", "-6m2") for r in ITA_3221 if count(r[4]) > 0)
    assert len(printed) == 20
    assert sorted(k for k in symcrys.POINT_GROUP_KEYS if symcrys.allows_property(k, "piezoelectric")) == printed


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
    groups = {g["key"]: g for g in magnetic.point_groups()}
    assert [k for k in keys if groups[k]["type"] == "I"] == list(symcrys.POINT_GROUP_KEYS)
    assert [k for k in keys if groups[k]["type"] == "III"] == [k for k, g in groups.items() if g["type"] == "III"]
    assert len([g for g in groups.values() if g["type"] == "II"]) == 32


@pytest.mark.parametrize("row", ROWS_1523[1:], ids=[r[3] for r in ROWS_1523[1:]])
def test_itc_vol_d_1523_symbols_and_order(row: list[str]) -> None:
    system, schoenflies, _, key, full, operators = row
    group = magnetic.point_group(key)
    assert group["crystal_system"] == system.lower()
    assert group["order"] == printed_count(operators)
    assert magnetic.symbol(key, form="full") == full
    assert magnetic.symbol(key, form="schoenflies") == schoenflies.replace("S6", "C3i")
    ops = magnetic.operations(key)
    primed = sum(1 for o in ops if o["time_reversal"])
    assert primed == (len(ops) // 2 if "(" in schoenflies else 0)


# --- ITC Vol. D Tables 1.5.2.4, 1.5.7.1, 1.5.8.1: the magnetic tensor properties -------------------


def orientations(cell: str) -> list[str]:
    """The orientations a Hermann–Mauguin cell names: ``2 (= 121)`` → 121; ``mm2 [2mm, m2m]`` → three."""
    m = re.match(r"^([^(\[]+?)(?: \(= ([^)]+)\))?(?: \[([^\]]+)\])?$", cell)
    assert m, cell
    return [m.group(2) or m.group(1)] + (m.group(3).split(", ") if m.group(3) else [])


def printed_space(matrix: list[str], shape: tuple[int, ...]) -> np.ndarray:
    """Spanning vectors of a printed matrix (rows of cells such as ``0``, ``L14``, ``-2L22``), one per symbol."""
    vectors: dict[str, np.ndarray] = {}
    for i, row in enumerate(matrix):
        for a, cell in enumerate(row.split(" ")):
            if cell == "0":
                continue
            m = re.match(r"^(-?)(\d?)([a-zL]\d\d)$", cell)
            assert m, cell
            value = (-1 if m.group(1) else 1) * int(m.group(2) or 1)
            v = vectors.setdefault(m.group(3), np.zeros(shape))
            if len(shape) == 2:
                v[i, a] += value
            else:  # Voigt column of ITC Vol. D eq. (1.5.7.4): Λ_iα = 2 Λ_ijk for α = 4, 5, 6
                j, k = VOIGT[a]
                v[i, j, k] += value if a < 3 else value / 2
                if a >= 3:
                    v[i, k, j] += value / 2
    return np.array([v.reshape(-1) for v in vectors.values()])


def same_space(a: np.ndarray, b: np.ndarray) -> bool:
    rank = np.linalg.matrix_rank
    return bool(len(a) == len(b) == 0 or (len(a) and len(b) and rank(a) == rank(b) == rank(np.vstack([a, b]))))


FORM_TABLES = [
    ("itc/vol-d-table-1.5.7.1.md", "piezomagnetic", 66, (3, 3, 3)),
    ("itc/vol-d-table-1.5.8.1.md", "magnetoelectric", 58, (3, 3)),
]
NOT_GREY = [g["key"] for g in magnetic.point_groups() if g["type"] != "II"]


@pytest.mark.parametrize(("file", "name", "count", "shape"), FORM_TABLES, ids=[t[1] for t in FORM_TABLES])
def test_itc_vol_d_magnetic_forms(file: str, name: str, count: int, shape: tuple[int, ...]) -> None:
    text = reference(file)
    groups = table_rows(section(text, "## Groups"))[1:]
    matrices = {r[0]: r[1:] for r in table_rows(section(text, "## Matrices"))[1:]}
    keys = []
    for block, _, cell in groups:
        printed = printed_space(matrices[block], shape)
        found = [magnetic.find_point_group(s) for s in orientations(cell)]
        assert any(found), cell
        for where in filter(None, found):
            form = magnetic.tensor_form(where["key"], name, setting=where["setting"])
            assert same_space(form["basis"], printed), cell
        keys.append(next(filter(None, found))["key"])
    assert len(keys) == count
    assert sorted(keys) == sorted(k for k in NOT_GREY if magnetic.allows_property(k, name))


def test_itc_vol_d_1524_ferromagnetic_groups() -> None:
    rows = table_rows(reference("itc/vol-d-table-1.5.2.4.md"))[1:]
    dimension = {"Any": 3, "∥ m'": 2, "⊥ 2'": 2}
    keys = []
    for _, _, hm, direction in rows:
        where = magnetic.find_point_group(hm)
        assert where, hm
        form = magnetic.tensor_form(where["key"], "ferromagnetic", setting=where["setting"])
        assert len(form["basis"]) == dimension.get(direction, 1), hm
        keys.append(where["key"])
    assert len(keys) == 31
    assert sorted(keys) == sorted(k for k in magnetic.POINT_GROUP_KEYS if magnetic.allows_property(k, "ferromagnetic"))


# --- ITA Tables 3.2.1.3 and 3.2.3.2: crystal forms -------------------------------------------------

FORMS_3213 = reference("itc/vol-a-table-3.2.1.3-crystal-forms.md")
FORM_TYPES = table_rows(section(FORMS_3213, "## Forms"))
FACE_FORMS = table_rows(reference("itc/vol-a-table-3.2.3.2-face-forms.md"))
# The names Table 3.2.3.2 prints for a form that Table 3.2.1.3 names otherwise (as in the TypeScript test).
NAME_VARIANTS = {
    "Sphenoid or dihedron": 3,
    "Dome or dihedron": 3,
    "Pentagon-trioctahedron or gyroid or pentagon-icositetrahedron": 44,
}


def form_number(name: str) -> int:
    found = [int(r[0]) for r in FORM_TYPES[1:] if r[1] == name]
    return found[0] if found else NAME_VARIANTS[name]


def test_ita_3213_the_47_forms() -> None:
    assert FORM_TYPES[0] == ["No.", "Crystal form", "Faces", "Eigensymmetry"]
    assert [[str(t["number"]), t["name"], str(t["faces"]), t["eigensymmetry"]] for t in symcrys.CRYSTAL_FORM_TYPES] == (
        FORM_TYPES[1:]
    )


def _setting(short: str, axes: str) -> tuple[str, int]:
    axis = axes[-1] if axes.startswith("unique axis") else None
    rhombohedral = axes == "rhombohedral axes"
    found = [
        (key, s["index"])
        for key in symcrys.POINT_GROUP_KEYS
        for s in symcrys.settings(key)
        if s["symbol"] == short
        and (axis is None or s.get("unique_axis") == axis)
        and (s.get("axes") == "rhombohedral") == rhombohedral
    ]
    assert len(found) == 1, (short, axes)
    return found[0]


FORM_ENTRIES = sorted({(r[0], r[1]) for r in FACE_FORMS[1:]})


@pytest.mark.parametrize("entry", FORM_ENTRIES, ids=[f"{s} {a}".strip() for s, a in FORM_ENTRIES])
def test_ita_3232_face_forms(entry: tuple[str, str]) -> None:
    assert FACE_FORMS[0] == ["Short", "Axes", "Page", "Letter", "Form", "Name", "Miller indices", "Condition"]
    key, setting = _setting(*entry)
    printed = [
        [r[3], r[4] == "basic", form_number(r[5]), r[6], re.sub(r"abs\((\w)\)", r"|\1|", r[7])]
        for r in FACE_FORMS[1:]
        if (r[0], r[1]) == entry
    ]
    forms = symcrys.crystal_forms(key, setting=setting)
    assert [[f["letter"], f["basic"], f["form_type"], f["miller_indices"], f.get("condition", "")] for f in forms] == (
        printed
    )
    for f in forms:
        assert f["representative"]["hkl"].dtype == np.int64 and f["representative"]["hkl"].shape == (3,)
        assert f["representative"]["cartesian"].dtype == np.float64
        faces = symcrys.CRYSTAL_FORM_TYPES[f["form_type"] - 1]["faces"]
        assert f["multiplicity"] == faces


# --- ITA Table 3.2.3.2: operations in the lattice basis and orbits --------------------------------

GENERAL = table_rows(reference("itc/vol-a-table-3.2.3.2-general-positions.md"))
GENERAL_FACES = table_rows(reference("itc/vol-a-table-3.2.3.2-general-faces.md"))


def _coefficients(expr: str) -> list[int]:
    row = [0, 0, 0]
    terms = re.findall(r"[+-]?\d*[xyz]", expr)
    assert "".join(terms).lstrip("+") == expr, expr
    for t in terms:
        m = re.fullmatch(r"([+-]?)(\d*)([xyz])", t)
        assert m
        row["xyz".index(m.group(3))] += (-1 if m.group(1) == "-" else 1) * (int(m.group(2)) if m.group(2) else 1)
    return row


@pytest.mark.parametrize("row", GENERAL[1:], ids=[f"{r[0]} {r[1]}".strip() for r in GENERAL[1:]])
def test_ita_3232_lattice_operations_and_orbit(row: list[str]) -> None:
    assert GENERAL[0] == ["Short", "Axes", "Page", "Multiplicity", "General position"]
    key, setting = _setting(row[0], row[1])
    printed = [[_coefficients(c) for c in t.split(",")] for t in row[4].split()]
    ops = symcrys.lattice_operations(key, setting=setting)
    assert [op["matrix"].tolist() for op in ops] == printed
    uvw = [e["uvw"].tolist() for e in symcrys.orbit(key, {"uvw": [3, 2, 1]}, setting=setting)]
    assert uvw == [(np.array(w) @ [3, 2, 1]).tolist() for w in printed]


@pytest.mark.parametrize("row", GENERAL_FACES[1:], ids=[f"{r[0]} {r[1]}".strip() for r in GENERAL_FACES[1:]])
def test_ita_3232_general_faces(row: list[str]) -> None:
    assert GENERAL_FACES[0] == ["Short", "Axes", "Page", "Faces"]
    value = {"h": 3, "k": 2, "i": -5, "l": 1}
    expected = []
    for face in row[3].split():
        v = [(-1 if c.startswith("-") else 1) * value[c.lstrip("-")] for c in face.split(",")]
        expected.append(v if len(v) == 3 else [v[0], v[1], v[3]])
    key, setting = _setting(row[0], row[1])
    computed = [e["hkl"].tolist() for e in symcrys.orbit(key, {"hkl": [3, 2, 1]}, setting=setting)]
    # The printed order (see the transcription, "Order"): 6/m and 6mm print two rows the other way
    # round; 32, 3m and -3m with rhombohedral axes the row of the second coset shifted by one.
    if row[0] in ("6/m", "6mm"):
        computed = computed[:6] + computed[9:] + computed[6:9]
    elif row[1] == "rhombohedral axes" and row[0] in ("32", "3m", "-3m"):
        def shift(r: int) -> list[list[int]]:
            return [computed[r + 1], computed[r + 2], computed[r]]

        reordered = computed[:3] + shift(3)
        if row[0] == "-3m":
            reordered += computed[6:9] + shift(9)
        computed = reordered
    assert computed == expected
