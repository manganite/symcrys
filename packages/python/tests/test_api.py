"""The Python layer itself: names, conversions, errors. The values are the library's (print is
checked in test_references.py, the layer over every group and setting in test_pins.py)."""

import copy
import pickle
import re
import threading
from types import MappingProxyType

import typing
from typing import Any

import numpy as np
import pytest

import symcrys
from symcrys import _engine, magnetic, plane
from symcrys._convert import camel, snake

SHG = {"rank": 3, "kind": "polar", "intrinsic": "symmetric-last-pair"}
MAGNETIC_SHG = {**SHG, "time_parity": "even"}
TYPES = {"SymcrysError", "SymcrysInternalError", "TensorForm", "TensorSpec"}


def test_every_export_of_the_library_has_its_python_name() -> None:
    exported = _engine.exports()
    assert all(name.startswith(("magnetic.", "plane.")) for name, _ in exported if "." in name)
    for module, prefix in ((symcrys, ""), (magnetic, "magnetic."), (plane, "plane.")):
        own = [(name[len(prefix) :], kind) for name, kind in exported if (name.startswith(prefix) if prefix else "." not in name)]
        expected = {name if kind == "value" else snake(name) for name, kind in own}
        assert len(expected) > (12 if module is plane else 20)
        # Besides the exports of the library: the errors, the TypedDicts and Literal types of the
        # generated module (scripts/python-api.mjs, #99), and the submodules of symcrys.
        types = {n for n in module.__all__ if n[0].isupper() and not n.isupper()} - {"SymcrysError", "SymcrysInternalError"}
        for name in types:
            obj = getattr(module, name)
            # A TypedDict of the generated module, one of its Literal types, or a record of arrays
            # (Operations, TransformedOperations).
            ok = typing.is_typeddict(obj) or typing.get_origin(obj) is typing.Literal
            ok = ok or name in ("Operations", "TransformedOperations")
            assert ok, f"{module.__name__}.{name}"
        assert TYPES - {"SymcrysError", "SymcrysInternalError"} <= types or module is plane, module.__name__
        extra = {"SymcrysError", "SymcrysInternalError"} | types | ({"magnetic", "plane"} if module is symcrys else set())
        assert set(module.__all__) == expected | extra, module.__name__
        for name in expected:
            assert hasattr(module, name), name


def test_every_function_has_its_docstring_from_the_tsdoc() -> None:
    # Written from the TSDoc comments by scripts/python-api.mjs (#29, #99); whether they are
    # current is checked by `npm run docs:check` in the gate docs, which needs the TypeScript sources.
    for module in (symcrys, magnetic, plane):
        for name in module.__all__:
            obj = getattr(module, name)
            if callable(obj) and not isinstance(obj, type) and not (name[0].isupper() and not name.isupper()):
                doc = obj.__doc__ or ""
                assert len(doc.strip()) > 20, f"{module.__name__}.{name} has no docstring"
                # A name in camelCase inside a code span; text between two spans is not code (mP, hR).
                spans = re.findall(r"``([^`]+)``", doc)
                left = [x for x in spans if re.search(r"\b[a-z]+[A-Z]\w*", x)]
                assert not left, f"{module.__name__}.{name}: camelCase in {left}"


KEY_FIELDS = {"key", "point_group", "laue_class", "crystal_class", "holohedry"}


def test_every_key_of_a_group_is_a_str() -> None:
    # The fixed reading of api.json, "types": a key is `str` in every module, in the fields of the
    # TypedDicts and in the parameters, never a Literal of the keys (which a TypeScript type derived
    # from a list would give, since the declarations expand it).
    # The annotations as written (the modules use `from __future__ import annotations`, and
    # NotRequired exists at run time only from Python 3.11), so they are read as text.
    def written(a: object) -> str:
        return a.__forward_arg__ if isinstance(a, typing.ForwardRef) else str(a)

    checked = 0
    for module in (symcrys, magnetic, plane):
        for name in module.__all__:
            obj = getattr(module, name)
            if typing.is_typeddict(obj):
                fields = {f: a for f, a in obj.__annotations__.items() if f in KEY_FIELDS}
            elif callable(obj) and not isinstance(obj, type) and not (name[0].isupper() and not name.isupper()):
                fields = {f: a for f, a in getattr(obj, "__annotations__", {}).items() if f == "key"}
            else:
                continue
            for field, hint in fields.items():
                checked += 1
                assert written(hint) in ("str", "NotRequired[str]"), f"{module.__name__}.{name}.{field}: {written(hint)}"
    assert checked > 50


def test_the_two_modules_have_the_same_names() -> None:
    only_classes = {"magnetic", "plane", "CRYSTAL_FORM_TYPES", "crystal_forms", "wyckoff_position", "wyckoff_positions"}
    only_classes |= {"CrystalForm", "CrystalFormType", "CrystalFormTypeKey", "WyckoffPosition"}
    only_magnetic = {"PointGroupType", "TimeParity", "CRYSTAL_CLASS_KEYS", "GREY_POINT_GROUP_KEYS"}
    only_magnetic |= {"BLACK_WHITE_POINT_GROUP_KEYS"}
    assert set(symcrys.__all__) - only_classes == set(magnetic.__all__) - only_magnetic
    assert symcrys.magnetic is magnetic and magnetic.VERSION == symcrys.VERSION == symcrys.__version__


def test_crystal_classes_here_magnetic_point_groups_there() -> None:
    assert len(symcrys.POINT_GROUP_KEYS) == 32 and len(magnetic.POINT_GROUP_KEYS) == 122
    assert magnetic.POINT_GROUP_KEYS[:32] == symcrys.POINT_GROUP_KEYS
    assert [g["key"] for g in symcrys.point_groups()] == list(symcrys.POINT_GROUP_KEYS)
    assert [g["key"] for g in magnetic.point_groups()] == list(magnetic.POINT_GROUP_KEYS)
    fixed = {"centrosymmetric": False, "polar": False, "enantiomorphic": True, "laue_class": "-3m"}
    assert symcrys.point_group("32") == {"key": "32", "crystal_system": "trigonal", "order": 6, **fixed}
    assert magnetic.point_group("32") == {
        "key": "32", "type": "I", "crystal_class": "32", "crystal_system": "trigonal", "order": 6, **fixed
    }  # fmt: skip
    assert symcrys.is_point_group_key("321'") is False and magnetic.is_point_group_key("321'") is True
    assert symcrys.find_point_group("4'/mmm'") is None
    assert magnetic.find_point_group("4'/mmm'") == {"key": "4'/mmm'", "setting": 1}
    assert set(symcrys.operations("32")[1]) == {"matrix", "cartesian"}
    assert set(magnetic.operations("32")[1]) == {"matrix", "cartesian", "time_reversal"}
    assert "time_reversal" not in symcrys.describe_operations("32")[1]
    assert magnetic.describe_operations("321'")[-1]["time_reversal"] is True


def test_the_magnetic_api_asks_every_operation_for_its_time_reversal() -> None:
    # Operations of the crystallographic API do not say; read as a group they would give wrong forms.
    # A list of dicts without time_reversal is refused by the Python layer, Operations of symcrys by
    # the library (they convert to operations without timeReversal).
    for bad in ([{"cartesian": -np.eye(3)}], [{"cartesian": -np.eye(3), "matrix": -np.eye(3)}]):
        with pytest.raises(symcrys.SymcrysError, match="operation 0 has no key 'time_reversal'"):
            magnetic.allowed_properties_of(bad)
    for ops in (symcrys.generators("m-3m"), symcrys.operations("32")):
        with pytest.raises(symcrys.SymcrysError, match="time_reversal must be True or False, not None"):
            magnetic.allowed_properties_of(ops)
        with pytest.raises(symcrys.SymcrysError, match="time_reversal must be True or False"):
            magnetic.tensor_form_of(ops, "pyroelectric")
        for call in (magnetic.is_centrosymmetric_of, magnetic.is_enantiomorphic_of):
            with pytest.raises(symcrys.SymcrysError, match="time_reversal must be True or False, not None"):
                call(ops)
    with pytest.raises(symcrys.SymcrysError, match="not an orthogonal"):
        symcrys.is_enantiomorphic_of([{"cartesian": np.diag([2.0, 1.0, 1.0])}])
    with pytest.raises(symcrys.SymcrysError, match="time_reversal must be True or False, not 1"):
        magnetic.tensor_form_of([{"cartesian": np.eye(3), "time_reversal": 1}], "ferromagnetic")
    inversion = [{"cartesian": -np.eye(3), "time_reversal": False}]
    assert magnetic.tensor_form_of(inversion, "pyroelectric")["basis"].shape == (0, 3)
    assert magnetic.allowed_properties_of(magnetic.generators("m-3m")) == magnetic.allowed_properties("m-3m") == []


def test_quartz_is_the_class_32_and_the_grey_group() -> None:
    assert symcrys.allowed_properties("32") == ["piezoelectric", "gyrotropic"]
    assert magnetic.allowed_properties("321'") == ["piezoelectric", "gyrotropic"]
    assert magnetic.allowed_properties("32") == ["piezoelectric", "gyrotropic", "magnetoelectric", "piezomagnetic"]


def test_the_crystallographic_api_refuses_time_reversal() -> None:
    use_magnetic = r"use the magnetic API \('symcrys/magnetic', in Python symcrys\.magnetic\)"
    with pytest.raises(symcrys.SymcrysError, match="magnetic point group, not a crystal class.*" + use_magnetic):
        symcrys.operations("321'")
    with pytest.raises(symcrys.SymcrysError, match="time-odd tensor.*" + use_magnetic):
        symcrys.allows_property("3", "ferromagnetic")  # type: ignore[arg-type]
    with pytest.raises(symcrys.SymcrysError, match="time-odd tensor.*" + use_magnetic):
        symcrys.tensor_form("3", {"rank": 1, "kind": "axial", "time_parity": "odd", "intrinsic": "none"})
    with pytest.raises(symcrys.SymcrysError, match="Operation 6 is combined with time reversal.*" + use_magnetic):
        symcrys.tensor_form_of(magnetic.operations("321'"), "piezoelectric")
    with pytest.raises(symcrys.SymcrysError, match="time_reversal must be False or absent"):
        symcrys.tensor_form_of([{"cartesian": -np.eye(3), "time_reversal": 1}], "pyroelectric")
    white = symcrys.tensor_form_of(magnetic.operations("32"), "piezoelectric")
    assert np.array_equal(white["basis"], symcrys.tensor_form("32", "piezoelectric", setting=1)["basis"])
    assert np.array_equal(symcrys.tensor_form("32", MAGNETIC_SHG)["basis"], symcrys.tensor_form("32", SHG)["basis"])


@pytest.mark.parametrize(
    ("js", "py"),
    [("timeReversal", "time_reversal"), ("allowsPropertyOf", "allows_property_of"), ("siteSymmetryOperations", "site_symmetry_operations"), ("rank", "rank")],
)
def test_name_rule_both_ways(js: str, py: str) -> None:
    assert snake(js) == py
    assert camel(py) == js


def test_matrices_are_float_arrays_and_indices_int_arrays() -> None:
    op = symcrys.operations("4")[1]
    # The matrix W is integer in Operations.
    assert op["matrix"].dtype == np.int64 and op["matrix"].shape == (3, 3)
    assert op["cartesian"].dtype == np.float64 and op["cartesian"].shape == (3, 3)
    assert isinstance(magnetic.operations("4")[1]["time_reversal"], bool)
    site = symcrys.site_symmetry_of(symcrys.operations("4mm"), [0, 0, 1])
    assert site["operations"].dtype == np.int64
    axis = symcrys.describe_operations("4")[1]["axis"]
    assert axis["lattice"].dtype == np.int64 and axis["cartesian"].dtype == np.float64


def test_crystal_forms_and_the_removed_convention() -> None:
    with pytest.raises(TypeError):
        symcrys.crystal_forms("mmm", convention="birss")  # type: ignore[call-arg]
    assert symcrys.crystal_forms("2")[-1]["miller_indices"] == "0,1,0"
    assert symcrys.crystal_forms("2", setting=2)[-1]["miller_indices"] == "0,0,1"
    assert symcrys.crystal_forms("2", setting="1 1 2")[-1]["miller_indices"] == "0,0,1"
    assert "condition" not in symcrys.crystal_forms("4mm")[0]


def test_operations_in_the_lattice_basis_and_orbits() -> None:
    ops = symcrys.operations("3")
    assert ops[1]["matrix"].dtype == np.int64 and ops[1]["matrix"].tolist() == [[0, -1, 0], [1, -1, 0], [0, 0, 1]]
    assert not hasattr(symcrys, "lattice_operations") and not hasattr(magnetic, "lattice_operations")
    with pytest.raises(symcrys.SymcrysError, match="operation 0 has no key 'cartesian'.*its 'matrix' is the matrix W"):
        symcrys.point_group_of([{"matrix": op["matrix"]} for op in ops])
    faces = symcrys.orbit("4mm", hkl=np.array([0, 0, 1]))
    assert len(faces) == 1 and faces[0]["hkl"].dtype == np.int64 and faces[0]["operations"].tolist() == list(range(8))
    poles = symcrys.orbit_of(symcrys.operations("4mm"), [1, 0, 0])
    assert [p["operations"].tolist() for p in poles] == [[0, 4], [1, 5], [2, 7], [3, 6]]
    assert poles[0]["direction"].dtype == np.float64
    with pytest.raises(symcrys.SymcrysError, match="exactly one of the fields hkl, uvw"):
        symcrys.orbit("4mm")


def test_point_group_of_a_list_of_operations() -> None:
    assert symcrys.point_group_of(symcrys.operations("32", setting="312")) == {"key": "32", "setting": 2}
    assert magnetic.point_group_of(magnetic.operations("4'mm'")) == {"key": "4'mm'", "setting": 1}
    c, s = np.cos(0.4 * np.pi), np.sin(0.4 * np.pi)
    fivefold = np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]])
    assert symcrys.point_group_of([{"cartesian": fivefold}]) is None
    described = symcrys.describe_operations_of(symcrys.operations("4"))
    assert described[2]["kind"] == "rotation" and described[2]["axis"]["cartesian"].dtype == np.float64
    assert "time_reversal" not in described[2]
    assert "time_reversal" in magnetic.describe_operations_of(magnetic.operations("4"))[2]


def test_tensor_form_arrays_have_fixed_shapes_also_when_empty() -> None:
    f = symcrys.tensor_form("mm2", SHG)
    # Each basis tensor and each constraint in the shape (3, 3, 3).
    assert f["basis"].shape == (5, 3, 3, 3) and f["relations"].shape == (22, 3, 3, 3) and f["parameters"].shape == (5, 3)
    assert np.allclose(np.einsum("rijk,bijk->rb", f["relations"], f["basis"]), 0)
    zero = symcrys.tensor_form("m-3m", SHG)
    assert zero["basis"].shape == (0, 3, 3, 3) and zero["parameters"].shape == (0, 3)
    assert zero["relations"].shape == (27, 3, 3, 3)
    scalar = symcrys.tensor_form("1", {"rank": 0, "kind": "polar", "intrinsic": "none"})
    assert scalar["basis"].shape == (1,) and scalar["parameters"].shape == (1, 0)


def test_operations_go_back_into_the_library_unchanged() -> None:
    for key in ("3m", "-42m", "m-3m"):
        a = symcrys.tensor_form_of(symcrys.operations(key), SHG)
        b = symcrys.tensor_form(key, SHG)
        assert np.array_equal(a["basis"], b["basis"]) and np.array_equal(a["parameters"], b["parameters"])


def test_camel_case_keys_are_accepted_in_a_spec() -> None:
    spec = {"rank": 3, "kind": "polar", "timeParity": "even", "intrinsic": "symmetric-last-pair"}
    assert np.array_equal(magnetic.tensor_form("4mm", spec)["basis"], magnetic.tensor_form("4mm", MAGNETIC_SHG)["basis"])
    assert np.array_equal(magnetic.tensor_form("4mm", spec)["basis"], symcrys.tensor_form("4mm", SHG)["basis"])


def test_named_tensor_properties() -> None:
    assert list(symcrys.TENSOR_PROPERTIES) == ["pyroelectric", "ferroaxial", "piezoelectric", "gyrotropic"]
    assert list(magnetic.TENSOR_PROPERTIES) == [
        "pyroelectric", "ferroaxial", "piezoelectric", "gyrotropic", "ferromagnetic", "ferrotoroidic", "magnetoelectric", "piezomagnetic"
    ]
    assert symcrys.allowed_properties("-3") == ["ferroaxial"]
    assert symcrys.tensor_form("-3", "ferroaxial")["parameters"].tolist() == [[2]]
    piezo = symcrys.TENSOR_PROPERTIES["piezoelectric"]
    assert piezo["spec"] == SHG and set(piezo) == {"spec", "description"}
    assert magnetic.TENSOR_PROPERTIES["piezoelectric"]["spec"] == MAGNETIC_SHG
    assert symcrys.allowed_properties("432") == ["gyrotropic"]
    assert magnetic.allowed_properties("432") == ["gyrotropic", "magnetoelectric"]
    assert symcrys.allows_property("432", "piezoelectric") is False
    ops = magnetic.operations("2'")
    assert magnetic.allowed_properties_of(ops) == magnetic.allowed_properties("2'") == list(magnetic.TENSOR_PROPERTIES)
    assert magnetic.allows_property_of(ops, "ferromagnetic") is True
    assert symcrys.allowed_properties_of(symcrys.operations("mm2")) == symcrys.allowed_properties("mm2")
    assert symcrys.allows_property_of(symcrys.operations("mm2"), "pyroelectric") is True
    by_name = symcrys.tensor_form("32", "piezoelectric")
    assert np.array_equal(by_name["basis"], symcrys.tensor_form("32", SHG)["basis"])
    assert np.array_equal(symcrys.tensor_form_of(symcrys.operations("32"), "piezoelectric")["basis"], by_name["basis"])
    with pytest.raises(symcrys.SymcrysError, match="Unknown tensor property"):
        symcrys.allows_property("1", "piezo")  # type: ignore[arg-type]
    rz = np.array([[0.0, -1.0, 0.0], [1.0, 0.0, 0.0], [0.0, 0.0, 1.0]])
    assert np.array_equal(
        symcrys.rotate_tensor(by_name["basis"][0], rz, "piezoelectric"), symcrys.rotate_tensor(by_name["basis"][0], rz, SHG)
    )


def test_fixed_properties_are_fields_of_the_point_group() -> None:
    assert symcrys.point_group("-3") == {
        "key": "-3", "crystal_system": "trigonal", "order": 6,
        "centrosymmetric": True, "polar": False, "enantiomorphic": False, "laue_class": "-3",
    }  # fmt: skip
    assert magnetic.point_group("-3'") == {
        "key": "-3'", "type": "III", "crystal_class": "-3", "crystal_system": "trigonal", "order": 6,
        "centrosymmetric": False, "polar": False, "enantiomorphic": False, "laue_class": "-3",
    }  # fmt: skip
    for module in (symcrys, magnetic):
        assert not any(hasattr(module, name) for name in ("is_centrosymmetric", "is_polar", "is_chiral", "is_chiral_of", "laue_class"))
        assert module.holohedry("rhombohedral") == "-3m" and module.holohedry("hexagonal") == "6/mmm"
        assert module.lattice_systems("32") == ["hexagonal", "rhombohedral"]
        assert module.lattice_systems("6/mmm") == ["hexagonal"]
        with pytest.raises(symcrys.SymcrysError, match="hexagonal' or 'rhombohedral"):
            module.holohedry("trigonal")
        ops = module.generators("2/m")
        assert module.is_centrosymmetric_of(ops) is True and module.is_enantiomorphic_of(ops) is False
        assert module.is_enantiomorphic_of(module.operations("32")) is True
    assert magnetic.is_centrosymmetric_of(magnetic.operations("-1'")) is False
    with pytest.raises(symcrys.SymcrysError, match="symcrys/magnetic|magnetic"):
        symcrys.is_centrosymmetric_of(magnetic.operations("-1'"))


def test_rotate_tensor_takes_arrays_of_any_shape() -> None:
    t = np.arange(27, dtype=float).reshape(3, 3, 3)
    rz = np.array([[0.0, -1.0, 0.0], [1.0, 0.0, 0.0], [0.0, 0.0, 1.0]])
    rotated = symcrys.rotate_tensor(t, rz, SHG)
    # The shape is kept: (3, 3, 3) in, (3, 3, 3) out; flat in, flat out.
    assert rotated.shape == (3, 3, 3)
    assert np.allclose(rotated, np.einsum("ia,jb,kc,abc->ijk", rz, rz, rz, t))
    assert symcrys.rotate_tensor(t.reshape(-1), rz, SHG).shape == (27,)
    # Stacks: leading axes of the tensor and of the rotation broadcast as in NumPy, each pair as
    # one call would rotate it.
    rotations = symcrys.operations("4").cartesian
    stacked = symcrys.rotate_tensor(t, rotations, SHG)
    assert stacked.shape == (4, 3, 3, 3)
    assert all(np.allclose(stacked[i], symcrys.rotate_tensor(t, rotations[i], SHG)) for i in range(4))
    tensors = np.stack([t, 2 * t])
    assert symcrys.rotate_tensor(tensors[:, None], rotations, SHG).shape == (2, 4, 3, 3, 3)
    assert np.allclose(symcrys.rotate_tensor(tensors, rotations[:2], SHG)[1], symcrys.rotate_tensor(2 * t, rotations[1], SHG))
    assert symcrys.rotate_tensor(np.zeros((0, 3)), rz, "pyroelectric").shape == (0, 3)
    with pytest.raises(symcrys.SymcrysError, match="do not broadcast"):
        symcrys.rotate_tensor(np.stack([t, t, t]), rotations, SHG)
    with pytest.raises(symcrys.SymcrysError, match="rank 1 has the shape"):
        symcrys.rotate_tensor([1, 2], rz, "pyroelectric")
    assert magnetic.rotate_tensor([1.0, 0, 0], rotations, "ferromagnetic").shape == (4, 3)
    # Review of #121 step 12c: a rank of any integer type keeps the shape; an empty stack still
    # checks the rotation.
    for rank in (np.int64(2), 2.0):
        spec = {"rank": rank, "kind": "polar", "intrinsic": "none"}
        assert symcrys.rotate_tensor(np.eye(3), rotations, spec).shape == (4, 3, 3)  # type: ignore[arg-type]
    with pytest.raises(symcrys.SymcrysError, match="orthogonal"):
        symcrys.rotate_tensor(np.zeros((0, 3, 3, 3)), 2 * np.eye(3), SHG)


def test_rotate_tensors_takes_a_stack_and_one_rotation_or_one_per_tensor() -> None:
    rz = np.array([[0.0, -1.0, 0.0], [1.0, 0.0, 0.0], [0.0, 0.0, 1.0]])
    tensors = np.arange(54, dtype=float).reshape(2, 3, 3, 3)
    expected = np.einsum("ia,jb,kc,nabc->nijk", rz, rz, rz, tensors)
    got = symcrys.rotate_tensors(tensors, rz, SHG)
    assert got.shape == (2, 3, 3, 3) and got.dtype == np.float64
    assert np.allclose(got, expected)
    assert symcrys.rotate_tensors(tensors.reshape(2, 27), rz, SHG).shape == (2, 27)
    rotations = symcrys.operations("4").cartesian[:2]
    each = symcrys.rotate_tensors(tensors, rotations, SHG)
    assert all(np.array_equal(each[i], symcrys.rotate_tensor(tensors[i], rotations[i], SHG)) for i in range(2))
    # Rank 1: (n, 3) is n vectors; an axial vector changes sign under an improper rotation.
    assert np.allclose(magnetic.rotate_tensors(np.eye(3), -np.eye(3), "ferromagnetic"), np.eye(3))
    assert np.allclose(symcrys.rotate_tensors(np.eye(3), -np.eye(3), "pyroelectric"), -np.eye(3))
    assert symcrys.rotate_tensors(np.zeros((0, 3)), rz, "pyroelectric").shape == (0, 3)
    with pytest.raises(symcrys.SymcrysError, match="2 tensors and 4 rotations"):
        symcrys.rotate_tensors(tensors, symcrys.operations("4").cartesian, SHG)
    with pytest.raises(symcrys.SymcrysError, match=r"a stack of tensors of rank 3 has the shape \(n, 3, 3, 3\) or \(n, 27\)"):
        symcrys.rotate_tensors(tensors[0], rz, SHG)
    with pytest.raises(symcrys.SymcrysError, match=r"the rotation has the shape \(3, 3\), or \(n, 3, 3\)"):
        symcrys.rotate_tensors(tensors, rz[:2], SHG)
    with pytest.raises(symcrys.SymcrysError, match="orthogonal"):
        symcrys.rotate_tensors(np.zeros((0, 3)), 2 * np.eye(3), "pyroelectric")


def test_rotate_tensor_names_itself_and_the_rotation_as_given() -> None:
    # Review of #249: rotate_tensor calls rotateTensors, but its messages name rotate_tensor, and a
    # rotation is counted as given (flattened), not as repeated by broadcasting.
    with pytest.raises(symcrys.SymcrysError, match=r"^rotate_tensor: every number"):
        symcrys.rotate_tensor(np.array([np.nan, 0, 0]), np.eye(3), "pyroelectric")
    with pytest.raises(symcrys.SymcrysError, match=r"^magnetic\.rotate_tensor: every number"):
        magnetic.rotate_tensor(np.array([np.nan, 0, 0]), np.eye(3), "ferromagnetic")
    with pytest.raises(symcrys.SymcrysError, match=r"^Rotation 1 is not an orthogonal"):
        symcrys.rotate_tensor(np.zeros((3, 3)), np.stack([np.eye(3), 2 * np.eye(3)])[:, None], "pyroelectric")


def test_rotate_tensor_sends_one_rotation_once(monkeypatch: pytest.MonkeyPatch) -> None:
    # Review of #249: a stack of one rotation, (1, 3, 3), goes to the library as one rotation.
    sent: list[Any] = []
    call = symcrys._shared.call

    def recorded(name: str, *args: Any) -> Any:
        sent.append(np.asarray(args[1]).shape)
        return call(name, *args)

    monkeypatch.setattr(symcrys._shared, "call", recorded)
    vectors = np.arange(30, dtype=float).reshape(10, 3)
    got = symcrys.rotate_tensor(vectors, np.eye(3)[None], "pyroelectric")
    assert sent == [(3, 3)] and got.shape == (10, 3)


def test_rotate_tensor_rotates_a_stack_in_one_call(monkeypatch: pytest.MonkeyPatch) -> None:
    names: list[str] = []
    call = symcrys._shared.call

    def counted(name: str, *args: Any) -> Any:
        names.append(name)
        return call(name, *args)

    rotations = symcrys.operations("m-3m").cartesian
    monkeypatch.setattr(symcrys._shared, "call", counted)
    vectors = np.arange(3 * 48, dtype=float).reshape(48, 3)
    got = symcrys.rotate_tensor(vectors, rotations, "pyroelectric")
    assert names == ["rotateTensors"]
    assert np.allclose(got, np.einsum("nia,na->ni", rotations, vectors))


def test_library_errors_are_value_errors_with_the_message() -> None:
    with pytest.raises(symcrys.SymcrysError, match="Unknown point group key") as e:
        symcrys.operations("7")
    assert isinstance(e.value, ValueError) and e.value.js_name == "RangeError"
    with pytest.raises(ValueError, match="needs rank 4"):
        symcrys.tensor_form("2", {"rank": 3, "kind": "polar", "intrinsic": "symmetric-pairs-exchangeable"})
    with pytest.raises(ValueError, match="not an orthogonal"):
        symcrys.rotate_tensor([1, 0, 0], np.diag([2.0, 1.0, 1.0]), {"rank": 1, "kind": "polar", "intrinsic": "none"})


def test_nan_and_wrong_shapes_give_readable_errors() -> None:
    # #92: before, NaN reached the engine's JSON parser ("unexpected token: 'NaN'") and an array of
    # matrices failed inside the library ("cannot read property '0' of undefined").
    ops = symcrys.operations("4mm")
    for bad in ([np.nan, 0, 1], [np.inf, 0, 1]):
        with pytest.raises(symcrys.SymcrysError, match="must be finite") as e:
            symcrys.site_symmetry_of(ops, bad)
        assert e.value.js_name == "RangeError"
    with pytest.raises(symcrys.SymcrysError, match="must be finite"):
        plane.orbit("p4", point=[np.nan, 0.0])
    # An array of Cartesian matrices is read as operations in symcrys; symcrys.magnetic
    # refuses it, since it does not say which operations carry time reversal.
    matrices = ops.cartesian
    assert symcrys.point_group_of(matrices) == symcrys.point_group_of(ops) == {"key": "4mm", "setting": 1}
    assert symcrys.tensor_form_of(list(matrices), SHG)["parameters"].tolist() == symcrys.tensor_form("4mm", SHG)["parameters"].tolist()
    with pytest.raises(symcrys.SymcrysError, match=r"does not say what the operations are.*time reversal"):
        magnetic.point_group_of(matrices)
    with pytest.raises(symcrys.SymcrysError, match=r"does not say what the operations are"):
        plane.describe_operations_of(np.zeros((2, 3, 3)))
    with pytest.raises(symcrys.SymcrysError, match=r"operation 0 must be a mapping"):
        symcrys.tensor_form_of([matrices[0], {"cartesian": matrices[1]}], SHG)
    with pytest.raises(symcrys.SymcrysError, match=r"must be Operations.*not dict"):
        symcrys.point_group_of({"cartesian": matrices[0]})
    with pytest.raises(symcrys.SymcrysError, match=r"\{\"matrix\", \"translation\"\}"):
        plane.describe_operations_of([{"matrix": np.eye(2)}])
    # Any iterable of mappings is taken: a generator, an object array, read-only mappings.
    assert symcrys.point_group_of(op for op in ops) == {"key": "4mm", "setting": 1}
    assert symcrys.point_group_of(np.array(ops, dtype=object)) == {"key": "4mm", "setting": 1}
    assert symcrys.point_group_of([MappingProxyType(op) for op in ops]) == {"key": "4mm", "setting": 1}


def test_undefined_result_is_none() -> None:
    assert symcrys.find_point_group("not a symbol") is None
    assert symcrys.find_point_group("321") == {"key": "32", "setting": 1}


def test_calls_from_several_threads() -> None:
    results: list[int] = []

    def work() -> None:
        results.append(len(symcrys.operations("m-3m")))

    threads = [threading.Thread(target=work) for _ in range(8)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    assert results == [48] * 8


def test_boundary_is_one_function() -> None:
    answer = _engine.call("symbol", '["32", {"setting": 2}]')
    assert re.fullmatch(r'\{"result":"312"\}', answer)
    assert "option convention was removed" in _engine.call("symbol", '["32", {"convention": "birss"}]')
    answer = _engine.call("magnetic.symbol", '["4\'/mmm\'", {"form": "schoenflies"}]')
    assert re.fullmatch(r'\{"result":"D4h\(D2h\)"\}', answer)
    assert '"error"' in _engine.call("other.symbol", '["32"]') and '"error"' in _engine.call("magnetic.wyckoffPositions", '["32"]')


def test_cell_metric_and_indices() -> None:
    # No expected values of their own beyond the layer: types, shapes, names (the values are tested in TypeScript).
    basis = symcrys.lattice_from_parameters(a=3, b=3, c=5, alpha=90, beta=90, gamma=120)
    assert basis.dtype == np.float64 and basis.shape == (3, 3)
    assert symcrys.lattice_parameters(basis)["gamma"] == pytest.approx(120)
    assert all(type(v) is float for v in symcrys.lattice_parameters(np.eye(3)).values())
    assert symcrys.is_valid_cell(alpha=90, beta=90, gamma=90) is True
    assert symcrys.is_valid_cell(alpha=60, beta=60, gamma=120) is False
    assert symcrys.is_valid_cell(alpha=90, beta=90, gamma=30, min_volume_ratio=0.6) is False
    assert symcrys.metric_tensor(basis).dtype == np.float64
    assert symcrys.reciprocal_basis(basis).shape == (3, 3)
    assert symcrys.angle_between_directions(basis, [1, 0, 0], [0, 1, 0]) == pytest.approx(120)
    assert symcrys.angle_between_planes(basis, [1, 0, 0], [0, 1, 0]) == pytest.approx(60)
    reduced = symcrys.reduce_indices([2, -4, 6])
    assert reduced.dtype == np.int64 and reduced.tolist() == [1, -2, 3]
    assert symcrys.direction_to_four_indices([1, 0, 0]).tolist() == [2, -1, -1, 0]
    assert symcrys.direction_from_four_indices([2, -1, -1, 0]).tolist() == [1, 0, 0]
    assert symcrys.plane_to_four_indices([1, 1, 2]).tolist() == [1, 1, -2, 2]
    assert symcrys.plane_from_four_indices([1, 1, -2, 2]).tolist() == [1, 1, 2]
    zone = symcrys.zone_axis([1, 0, 0], [0, 1, 0])
    assert zone is not None and zone.tolist() == [0, 0, 1]
    assert symcrys.zone_axis([1, 1, 0], [2, 2, 0]) is None
    change = symcrys.change_of_coordinates(
        [[1, -1, 0], [1, 1, 0], [0, 0, 1]], directions=[[1, 0, 0]], planes=[[1, 0, 0]], operations=symcrys.operations("4")
    )
    assert change["inverse"]["linear_part"].dtype == np.float64 and change["directions"].shape == (1, 3)
    assert change["planes"].dtype == np.float64 and change["operations"][1]["matrix"].dtype == np.int64
    # cells as mappings, keys in snake_case; P a float64 (3, 3) array that change_of_coordinates takes
    t = symcrys.cell_transformation("mS", {"cell_choice": 2}, {"unique_axis": "c", "cell_choice": 3})
    back = magnetic.cell_transformation("mS", {"unique_axis": "c", "cell_choice": 3}, {"cell_choice": 2})
    assert t["linear_part"].dtype == np.float64 and t["linear_part"].shape == (3, 3)
    assert np.allclose(t["linear_part"] @ back["linear_part"], np.eye(3))
    with pytest.raises(symcrys.SymcrysError, match="names no cell"):
        symcrys.cell_transformation("hP", {}, {"centring": "H"})
    with pytest.raises(ValueError):
        symcrys.reduce_indices([0, 0, 0])
    with pytest.raises(symcrys.SymcrysError, match="min_volume_ratio must be a number from 0 to 1"):
        symcrys.is_valid_cell(alpha=90, beta=90, gamma=90, min_volume_ratio=-1)
    # a cell in metres: the reciprocal basis is that of the cell in ångström, divided by 10⁻¹⁰
    metres = symcrys.lattice_from_parameters(a=3e-10, b=3e-10, c=5e-10, alpha=90, beta=90, gamma=120)
    assert np.allclose(symcrys.reciprocal_basis(metres) * 1e-10, symcrys.reciprocal_basis(basis))


def test_site_symmetry_refuses_a_matrix_that_is_not_orthogonal() -> None:
    stretch = [[2, 0, 0], [0, 1, 0], [0, 0, 1]]
    with pytest.raises(symcrys.SymcrysError, match="not an orthogonal"):
        symcrys.site_symmetry_of([{"cartesian": stretch}], [1, 0, 0])
    with pytest.raises(symcrys.SymcrysError, match="not an orthogonal"):
        magnetic.site_symmetry_of([{"cartesian": stretch, "time_reversal": False}], [1, 0, 0])


def test_residual_operations_in_both_apis() -> None:
    ops = symcrys.operations("4/mmm")
    cell = symcrys.lattice_from_parameters(a=2, b=2.1, c=3, alpha=90, beta=90, gamma=90)
    assert len(symcrys.residual_operations(ops, cell)) == 8
    assert len(symcrys.residual_operations(ops, cell, tolerance=0.1)) == 16
    mops = magnetic.operations("4/mmm")
    assert len(magnetic.residual_operations(mops, cell)) == 8
    assert all("time_reversal" in op for op in magnetic.residual_operations(mops, cell))
    with pytest.raises(ValueError):
        symcrys.residual_operations([{"matrix": np.eye(3), "time_reversal": True}], cell)
    with pytest.raises(ValueError):
        magnetic.residual_operations([{"matrix": np.eye(3)}], cell)


def test_residual_operations_of_the_plane() -> None:
    # The kept rows of the caller's Operations, as Operations of symcrys.plane (#119).
    ops = plane.operations("p4mm")
    cell = plane.lattice_from_parameters(3, 3.1, 90)
    kept = plane.residual_operations(ops, cell)
    assert isinstance(kept, plane.Operations)
    assert kept.matrix.shape == (4, 2, 2) and kept.translation.shape == (4, 2)
    rows = [i for i in range(len(ops)) if any((ops.matrix[i] == m).all() for m in kept.matrix)]
    assert kept.matrix.tolist() == ops.matrix[rows].tolist()
    assert len(plane.residual_operations(list(ops), cell)) == 4
    assert len(plane.residual_operations(ops, cell, tolerance=0.5)) == 8
    with pytest.raises(ValueError):
        plane.residual_operations(ops, cell, tolerance=1.5)
    with pytest.raises(ValueError):
        plane.residual_operations([{"matrix": [[0.5, -0.866], [0.866, 0.5]], "translation": [0, 0]}], cell)


def test_find_point_group_reads_symbols_tolerantly() -> None:
    # #96: the spellings of print and pasted text, Schoenflies symbols and Birss's cubic symbols.
    for hm in ("m3̄m", "m−3m", "mbar3m", "Oh", "Oₕ", "m3m"):
        assert symcrys.find_point_group(hm) == {"key": "m-3m", "setting": 1}
    assert magnetic.find_point_group("4′/mmm′") == {"key": "4'/mmm'", "setting": 1}
    assert magnetic.find_point_group("D₃d(S₆)") == {"key": "-3m'", "setting": 1}
    # Spaces carry no meaning; the axes choose the rhombohedral setting (#96).
    assert symcrys.find_point_group("3 2") == {"key": "32", "setting": 1}
    assert symcrys.find_point_group("32", axes="rhombohedral") == {"key": "32", "setting": 3}
    assert magnetic.find_point_group("2'", unique_axis="c") == {"key": "2'", "setting": 2}
    assert len(symcrys.operations("32", axes="rhombohedral")) == 6
    assert symcrys.symbol("2", unique_axis="a", form="full") == "2 1 1"
    with pytest.raises(symcrys.SymcrysError, match="unique_axis applies to the monoclinic groups"):
        symcrys.operations("mm2", unique_axis="c")
    assert symcrys.find_point_group("D4R") is None


def test_site_symmetry_of_a_key_and_of_a_list() -> None:
    # site_symmetry takes a key, site_symmetry_of a list of operations.
    by_key = symcrys.site_symmetry("4mm", cartesian=[1, 1, 0], setting=1)
    by_list = symcrys.site_symmetry_of(symcrys.operations("4mm"), [1, 1, 0])
    assert by_key["operations"].tolist() == by_list["operations"].tolist() and by_key["multiplicity"] == 4
    # [100] lies on the twofold axis of unique axis a only.
    assert magnetic.site_symmetry("2'", uvw=[1, 0, 0])["multiplicity"] == 2
    assert magnetic.site_symmetry("2'", uvw=[1, 0, 0], unique_axis="a")["multiplicity"] == 1
    assert symcrys.wyckoff_position("4mm", hkl=[0, 0, 1])["letter"] == "a"
    # A lattice direction is read as one, not as a Cartesian vector: [210] of 6/mmm is on a twofold axis.
    assert symcrys.site_symmetry("6/mmm", uvw=[2, 1, 0])["multiplicity"] == 6
    assert symcrys.site_symmetry("6/mmm", cartesian=[2, 1, 0])["multiplicity"] == 12
    with pytest.raises(symcrys.SymcrysError, match="exactly one"):
        symcrys.site_symmetry("6/mmm", hkl=[2, 1, 0], uvw=[2, 1, 0])
    # The coordinates of a Wyckoff position are the printed triplets, a list of strings.
    assert symcrys.wyckoff_positions("mm2")[1]["coordinates"] == ["0,y,z", "0,-y,z"]
    assert plane.symmetry_elements("p4")["rotation_points"][0]["n"] == 4
    assert [d["n"] for d in plane.describe_operations("p4")] == [1, 2, 4, 4]


def test_one_tolerance_contract() -> None:
    # EPSILON in every module, and a tolerance for every function that compares numbers of a caller (#93).
    assert symcrys.EPSILON == magnetic.EPSILON == plane.EPSILON == 1e-5
    rounded = [{"cartesian": np.round(op["cartesian"], 4)} for op in symcrys.operations("6/mmm")]
    assert symcrys.is_centrosymmetric_of(rounded, tolerance=1e-3)
    assert not symcrys.is_enantiomorphic_of(rounded, tolerance=1e-3)
    assert symcrys.allowed_properties_of(rounded, tolerance=1e-3) == symcrys.allowed_properties("6/mmm")
    assert not symcrys.allows_property_of(rounded, "pyroelectric", tolerance=1e-3)
    # Rounded operations give the form of the exact group (#89).
    exact = symcrys.tensor_form("6/mmm", {"rank": 4, "kind": "polar", "intrinsic": "none"})
    form = symcrys.tensor_form_of(rounded, {"rank": 4, "kind": "polar", "intrinsic": "none"}, tolerance=1e-3)
    assert form["parameters"].tolist() == exact["parameters"].tolist()
    r = np.round(symcrys.operations("6/mmm")[1]["cartesian"], 4)
    assert symcrys.rotate_tensor([1.0, 0, 0], r, "pyroelectric", tolerance=1e-3).shape == (3,)
    with pytest.raises(symcrys.SymcrysError, match="tolerance must be a number above 0 and below 0.1"):
        symcrys.tensor_form_of(rounded, "piezoelectric", tolerance=0.5)
    with pytest.raises(symcrys.SymcrysError):
        symcrys.rotate_tensor([1.0, 0, 0], r, "pyroelectric")
    m = [{"cartesian": op["cartesian"], "time_reversal": op["time_reversal"]} for op in magnetic.operations("4/mm'm'")]
    assert magnetic.allows_property_of(m, "ferromagnetic", tolerance=1e-3)
    assert magnetic.is_centrosymmetric_of(m, tolerance=1e-3)
    shifted = [{"matrix": op["matrix"], "translation": op["translation"] + 1e-4} for op in plane.operations("p4gm")]
    with pytest.raises(symcrys.SymcrysError):
        plane.describe_operations_of(shifted)
    assert len(plane.describe_operations_of(shifted, tolerance=1e-3)) == 8


def test_wrong_input_is_a_symcrys_error_and_a_fault_of_symcrys_is_not_a_value_error() -> None:
    # #92: only a RangeError of the library is SymcrysError (a ValueError); anything else is
    # SymcrysInternalError (a RuntimeError), so that ``except ValueError`` does not hide a bug.
    with pytest.raises(symcrys.SymcrysError, match="takes the options setting, axes, unique_axis") as e:
        _engine.invoke("operations", "32", {"uniqueaxis": "a"})
    assert e.value.js_name == "RangeError"
    with pytest.raises(symcrys.SymcrysError, match="A direction must be 3 finite numbers"):
        symcrys.site_symmetry_of(symcrys.operations("4mm"), [0, 1])
    assert issubclass(symcrys.SymcrysInternalError, RuntimeError)
    assert not issubclass(symcrys.SymcrysInternalError, ValueError)
    assert symcrys.SymcrysInternalError is magnetic.SymcrysInternalError is plane.SymcrysInternalError


def test_an_error_of_the_library_other_than_a_range_error_is_internal(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(_engine, "call", lambda name, args: '{"error": {"name": "TypeError", "message": "x is undefined"}}')
    with pytest.raises(symcrys.SymcrysInternalError, match="x is undefined.*internal error of symcrys") as e:
        symcrys.point_group("32")
    assert e.value.js_name == "TypeError"
    monkeypatch.setattr(_engine, "call", lambda name, args: '{"error": {"name": "RangeError", "message": "bad"}}')
    with pytest.raises(symcrys.SymcrysError, match="bad"):
        symcrys.point_group("32")


def test_input_of_the_wrong_type_is_a_symcrys_error_that_names_the_function() -> None:
    # The review of #121 step 8b: these raised NumPy's ValueError or Python's TypeError before.
    ops = symcrys.operations("4mm")
    cases = [
        (lambda: symcrys.rotate_tensor([1, 2, 3], [[1, 0, 0], [0, 1], [0, 0, 1]], "pyroelectric"), "rotation"),
        # The fields of an object as arguments: the library names the wrong one.
        (lambda: symcrys.orbit("32", hkl=[1, 0]), "hkl must be three"),
        (lambda: symcrys.is_valid_cell("90", 90, 90), "angle alpha must be a finite number"),  # type: ignore[arg-type]
        (lambda: symcrys.lattice_from_parameters(1, 2, "3", 90, 90, 90), "edge c must be a positive number"),  # type: ignore[arg-type]
        (lambda: symcrys.miller_indices("h,k,l", h=1.5, k=1, l=1), "h must be an integer"),  # type: ignore[arg-type]
        (lambda: symcrys.tensor_form("32", 3), "spec must be a mapping"),  # type: ignore[arg-type]
        (lambda: symcrys.site_symmetry_of(ops, [1, 0, 1j]), "direction must be an array of real numbers"),
        (lambda: symcrys.site_symmetry_of(ops, "z"), "direction must be an array of real numbers"),
        (lambda: symcrys.operations("32", setting=object()), "operations: an argument cannot be passed"),  # type: ignore[arg-type]
        (lambda: symcrys.site_symmetry_of(ops, [0, np.nan, 1]), "site_symmetry_of: every number"),
        (lambda: plane.orbit("p4", point=[[0.1], [0.2, 0.3]]), "two finite coordinates"),
    ]
    for call, message in cases:
        with pytest.raises(symcrys.SymcrysError, match=message):
            call()


def test_errors_survive_pickling() -> None:
    import pickle

    internal = pickle.loads(pickle.dumps(symcrys.SymcrysInternalError("x is undefined", "TypeError")))
    assert str(internal) == "x is undefined (an internal error of symcrys; please report it)"
    assert internal.js_name == "TypeError"
    error = pickle.loads(pickle.dumps(symcrys.SymcrysError("bad")))
    assert str(error) == "bad" and error.js_name == "RangeError"


def test_miller_indices_and_face_normal() -> None:
    for module in (symcrys, magnetic):
        hkl = module.miller_indices("h,h,-2h,l", h=3, l=1)
        assert hkl.dtype == np.int64 and hkl.tolist() == [3, 3, 1]
        n = module.face_normal(module.lattice_basis("m-3m"), [1, 1, 1])
        assert n.dtype == np.float64 and np.allclose(n, np.ones(3) / np.sqrt(3))
        with pytest.raises(symcrys.SymcrysError, match="value of l"):
            module.miller_indices("h,k,l", h=1, k=2)
    form = symcrys.crystal_forms("-43m")[2]
    assert "representative" not in form


def test_operations_are_a_record_of_arrays() -> None:
    # operations() and generators() give one record of arrays, frozen, one row per operation.
    ops = symcrys.operations("4mm")
    assert isinstance(ops, symcrys.Operations) and len(ops) == 8
    assert ops.matrix.dtype == np.int64 and ops.matrix.shape == (8, 3, 3)
    assert ops.cartesian.dtype == np.float64 and ops.cartesian.shape == (8, 3, 3)
    with pytest.raises(ValueError, match="read-only"):
        ops.cartesian[0, 0, 0] = 2.0
    with pytest.raises(Exception, match="cannot assign"):
        ops.matrix = ops.matrix  # type: ignore[misc]
    mops = magnetic.operations("4'mm'")
    assert mops.time_reversal.dtype == np.bool_ and mops.time_reversal.tolist() == [False, False, True, True, False, False, True, True]
    pops = plane.operations("c2mm")
    assert pops.matrix.shape == (8, 2, 2) and pops.translation.shape == (8, 2) and pops.translation[5].tolist() == [0.5, 0.5]
    # Empty: shapes kept.
    assert symcrys.generators("1").matrix.shape == (0, 3, 3) and magnetic.generators("1").time_reversal.shape == (0,)
    # Per operation: ops[i] and iteration give a dict, other indices an Operations of those rows.
    assert set(ops[1]) == {"matrix", "cartesian"} and ops[-1]["cartesian"].tolist() == ops.cartesian[7].tolist()
    assert [op["time_reversal"] for op in mops] == mops.time_reversal.tolist() and isinstance(mops[2]["time_reversal"], bool)
    assert len(ops[[0, 2]]) == 2 and len(ops[1:3]) == 2 and len(ops[ops.matrix[:, 2, 2] == 1]) == 8
    with pytest.raises(IndexError):
        ops[8]
    # Built by a caller, checked: shapes, one n for all fields, integers for W.
    own = symcrys.Operations(matrix=ops.matrix[:2], cartesian=ops.cartesian[:2])
    assert symcrys.point_group_of(own) == symcrys.point_group_of(ops[:2])
    with pytest.raises(symcrys.SymcrysError, match="cartesian has 3 operations, the others 2"):
        symcrys.Operations(matrix=np.zeros((2, 3, 3)), cartesian=np.zeros((3, 3, 3)))
    with pytest.raises(symcrys.SymcrysError, match="shape"):
        symcrys.Operations(matrix=np.zeros((2, 2, 2)), cartesian=np.zeros((2, 2, 2)))
    with pytest.raises(symcrys.SymcrysError, match="integers"):
        symcrys.Operations(matrix=np.full((1, 3, 3), 0.5), cartesian=np.zeros((1, 3, 3)))
    # Every function that takes operations takes the three forms alike.
    for form in (ops, ops.cartesian, [{"cartesian": c} for c in ops.cartesian]):
        assert symcrys.allowed_properties_of(form) == symcrys.allowed_properties("4mm")
    # residual_operations keeps the caller's operations as Operations; it needs every field.
    basis = symcrys.lattice_from_parameters(a=3, b=3.2, c=5, alpha=90, beta=90, gamma=120)
    kept = symcrys.residual_operations(symcrys.operations("6/mmm"), basis)
    # a ≠ b at γ = 120°: the lattice keeps 2/m of 6/mmm, 4 operations.
    assert isinstance(kept, symcrys.Operations) and len(kept) == 4
    hexagonal = symcrys.operations("6/mmm")
    assert symcrys.residual_operations(list(hexagonal), basis).cartesian.tolist() == kept.cartesian.tolist()
    with pytest.raises(symcrys.SymcrysError, match="each needs 'matrix', 'cartesian'"):
        symcrys.residual_operations([{"matrix": m} for m in hexagonal.matrix], basis)
    mkept = magnetic.residual_operations(magnetic.operations("6/mmm1'"), basis)
    assert len(mkept) == 8 and mkept.time_reversal.sum() == 4


def test_operations_review_of_step_12b() -> None:
    # Cases from the review of #121 step 12b, each a fault before it was fixed.
    eye = np.eye(3)
    # residual_operations passes the caller's operations to the library as they are, so the
    # crystallographic API still refuses time reversal.
    with pytest.raises(symcrys.SymcrysError, match="combined with time reversal"):
        symcrys.residual_operations(magnetic.operations("4/m1'"), eye)
    with pytest.raises(symcrys.SymcrysError, match="not an integer matrix"):
        symcrys.residual_operations([{"matrix": eye * 0.5, "cartesian": eye}], eye)
    # The site symmetry and the orbit of a direction do not depend on time reversal: the magnetic
    # API takes operations without it there, also as an array (docs/conventions.md).
    cartesian = symcrys.operations("4mm").cartesian
    assert magnetic.site_symmetry_of([{"cartesian": c} for c in cartesian], [0, 0, 1])["multiplicity"] == 1
    assert len(magnetic.orbit_of(cartesian, [1, 0, 0])) == 4
    # time_reversal takes booleans only (0 and 1 too); W integers only, as int64.
    for bad in (["False"], [0.5], [None]):
        with pytest.raises(symcrys.SymcrysError, match="True or False"):
            magnetic.Operations(matrix=[eye], cartesian=[eye], time_reversal=bad)
    for bad_matrix in (np.full((1, 3, 3), 1e30), [1j * eye], [eye.astype(bool)]):
        with pytest.raises(symcrys.SymcrysError, match="integers"):
            symcrys.Operations(matrix=bad_matrix, cartesian=[eye])
    # Indices: an IndexError or TypeError for what is no index, numpy integers as integers.
    ops = symcrys.operations("4/m")
    for bad_index in (True, None):
        with pytest.raises(TypeError):
            ops[bad_index]  # type: ignore[call-overload]
    with pytest.raises(IndexError):
        ops[[[0, 1]]]  # type: ignore[index]
    assert ops[np.int64(3)]["matrix"].tolist() == ops.matrix[3].tolist() and len(ops[(0, 1)]) == 2
    # Identity, not array equality; a hash; read-only also after setflags, a copy or a pickle.
    assert ops != symcrys.operations("4/m") and ops == ops and isinstance(hash(ops), int)
    with pytest.raises(ValueError):
        ops.cartesian.setflags(write=True)
    for copied in (copy.deepcopy(ops), pickle.loads(pickle.dumps(ops))):
        assert copied.matrix.tolist() == ops.matrix.tolist()
        with pytest.raises(ValueError, match="read-only"):
            copied.cartesian[0, 0, 0] = 2.0
    # Neither a foreign dataclass nor the class itself is taken as operations.
    with pytest.raises(symcrys.SymcrysError, match="must be Operations"):
        symcrys.point_group_of(symcrys.Operations)  # type: ignore[arg-type]


def test_voigt_takes_and_gives_tensors_in_their_shape() -> None:
    d = symcrys.tensor_form("3m", "piezoelectric")["basis"][0]
    assert d.shape == (3, 3, 3)
    v = symcrys.to_voigt(d, "piezoelectric", factors=[2])
    assert v.shape == (3, 6) and v.dtype == np.float64
    assert np.allclose(symcrys.to_voigt(d.reshape(-1), "piezoelectric", factors=[2]), v)
    back = symcrys.from_voigt(v, "piezoelectric", factors=[2])
    assert back.shape == (3, 3, 3) and np.allclose(back, d)
    s = {"rank": 4, "kind": "polar", "intrinsic": "symmetric-pairs"}
    t = symcrys.tensor_form("6/mmm", s)["basis"][0]
    assert symcrys.to_voigt(t, s, factors=[2, 2]).shape == (6, 6)
    assert symcrys.from_voigt(symcrys.to_voigt(t, s, factors=[1, 2]), s, factors=[1, 2]).shape == (3, 3, 3, 3)
    with pytest.raises(symcrys.SymcrysError, match="give the factors"):
        symcrys.to_voigt(t, s)


def test_messages_are_in_python_terms() -> None:
    # Names in snake_case, the literals of Python, an option as a keyword argument; a Bravais
    # lattice keeps its symbol.
    with pytest.raises(symcrys.SymcrysError, match=r"cell_transformation: the cell from_cell: .* lattice hR"):
        symcrys.cell_transformation("hR", {"cell": 9}, {})
    with pytest.raises(symcrys.SymcrysError, match=r"to_voigt: .*\(factors=\[1 or 2\]\)"):
        symcrys.to_voigt(np.zeros(27), "piezoelectric")
    assert _engine.python_terms("timeReversal must be true or false, not undefined") == (
        "time_reversal must be True or False, not None"
    )


def test_complex_numbers_and_integers_beyond_2_53_are_refused() -> None:
    cartesian = symcrys.operations("4").cartesian
    with pytest.raises(symcrys.SymcrysError, match="real"):
        symcrys.tensor_form_of(cartesian + 0j, "pyroelectric")
    with pytest.raises(symcrys.SymcrysError, match="real"):
        symcrys.orbit_of(cartesian, np.array([1, 0, 0]) + 0j)
    with pytest.raises(symcrys.SymcrysError, match="2\\*\\*53"):
        symcrys.reduce_indices([2**60, 2**59, 0])


def test_dir_shows_the_public_names() -> None:
    for module in (symcrys, magnetic, plane):
        names = dir(module)
        assert not {"np", "sys", "Any", "dataclass"} & set(names), module.__name__
        assert set(module.__all__) <= set(names)


def test_change_of_coordinates_gives_its_operations_as_arrays_that_can_be_passed_back() -> None:
    ops = symcrys.operations("m-3m")
    there = symcrys.change_of_coordinates([[0, 1, 1], [1, 0, 1], [1, 1, 0]], operations=ops)
    transformed = there["operations"]
    assert isinstance(transformed, symcrys.TransformedOperations)
    assert transformed.matrix.shape == (48, 3, 3) and transformed.translation.shape == (48, 3)
    back = symcrys.change_of_coordinates(there["inverse"]["linear_part"], operations=transformed)
    assert (back["operations"].matrix == ops.matrix).all()
    planar = plane.change_of_coordinates([[1, 1], [-1, 1]], operations=plane.operations("p4mm"))
    assert isinstance(planar["operations"], plane.TransformedOperations)
    assert planar["operations"].matrix.shape == (8, 2, 2)


def test_magnetic_change_of_coordinates_carries_the_time_reversal_through() -> None:
    # -3'm on rhombohedral axes, to hexagonal axes and back (ITA 2016 Table 1.5.1.1, R to R1, obverse, p. 78).
    p = [[1, 0, 1], [-1, 1, 1], [0, -1, 1]]
    ops = magnetic.operations("-3'm", axes="rhombohedral")
    there = magnetic.change_of_coordinates(p, operations=ops)["operations"]
    assert isinstance(there, magnetic.TransformedOperations)
    assert there.time_reversal is not None and there.time_reversal.dtype == np.bool_
    assert (there.time_reversal == ops.time_reversal).all() and there.time_reversal.any()
    assert there[1]["time_reversal"] is bool(ops.time_reversal[1])
    assert set(there[0]) == {"matrix", "translation", "time_reversal"}
    assert (there[[0, 1]].time_reversal == ops.time_reversal[:2]).all()
    with pytest.raises(ValueError):
        there.time_reversal[0] = True
    back = magnetic.change_of_coordinates(np.linalg.inv(p), operations=there)["operations"]
    assert (back.matrix == ops.matrix).all() and (back.time_reversal == ops.time_reversal).all()
    assert copy.deepcopy(there).time_reversal is not None and pickle.loads(pickle.dumps(there)).time_reversal is not None
    # Without time reversal in the list: no field, as before.
    spatial = magnetic.change_of_coordinates(p, operations=[{"matrix": m} for m in ops.matrix])["operations"]
    assert spatial.time_reversal is None and set(spatial[0]) == {"matrix", "translation"}
    assert (spatial.matrix == there.matrix).all()
    assert magnetic.change_of_coordinates(p, operations=[])["operations"].time_reversal is None
    with pytest.raises(symcrys.SymcrysError, match="give time_reversal for every operation or for none"):
        magnetic.change_of_coordinates(np.eye(3), operations=[{"matrix": np.eye(3), "time_reversal": True}, {"matrix": np.eye(3)}])
    # The result goes on to residual_operations, which keeps it as TransformedOperations (review of #250).
    kept = magnetic.residual_operations(there, magnetic.lattice_basis("-3'm"))
    assert isinstance(kept, magnetic.TransformedOperations) and len(kept) == 12
    assert (kept.time_reversal == ops.time_reversal).all()
    with pytest.raises(symcrys.SymcrysError, match="time_reversal"):
        magnetic.residual_operations(spatial, magnetic.lattice_basis("-3'm"))
    hexagonal = symcrys.change_of_coordinates(p, operations=symcrys.operations("-3m", axes="rhombohedral"))["operations"]
    assert isinstance(symcrys.residual_operations(hexagonal, symcrys.lattice_basis("-3m")), symcrys.TransformedOperations)
    square = plane.change_of_coordinates(np.eye(2), operations=plane.operations("p4mm"))["operations"]
    assert isinstance(plane.residual_operations(square, np.eye(2)), plane.TransformedOperations)
    # symcrys stays spatial.
    assert symcrys.change_of_coordinates(p, operations=symcrys.operations("-3m", axes="rhombohedral"))["operations"][0].keys() == {"matrix", "translation"}


def test_messages_keep_the_values_the_caller_passed() -> None:
    with pytest.raises(symcrys.SymcrysError, match=r'"4/mmmFoo"'):
        symcrys.point_group("4/mmmFoo")
    with pytest.raises(symcrys.SymcrysError, match=r'"true"'):
        symcrys.point_group("true")
    assert _engine.python_terms('the cell {"cellChoice":9} of "xyZ"') == 'the cell {"cell_choice":9} of "xyZ"'


def test_integers_beyond_2_53_are_refused_on_every_path() -> None:
    with pytest.raises(symcrys.SymcrysError, match="2\\*\\*53"):
        symcrys.cell_transformation("mP", {"cell_choice": 2**60}, {})
    with pytest.raises(symcrys.SymcrysError, match="2\\*\\*53"):
        symcrys.change_of_coordinates(np.eye(3), operations=[{"matrix": [[2**53 + 1, 0, 0], [0, 1, 0], [0, 0, 1]], "translation": [0, 0, 0]}])
    with pytest.raises(symcrys.SymcrysError, match="2\\*\\*53"):
        symcrys.reduce_indices([2**70, 1, 0])


def test_a_field_of_transformed_operations_is_named_by_its_class() -> None:
    with pytest.raises(symcrys.SymcrysError, match="TransformedOperations.matrix"):
        symcrys.TransformedOperations(matrix=np.full((1, 3, 3), 0.5), translation=np.zeros((1, 3)))


def test_an_input_passed_by_position_names_its_keywords() -> None:
    with pytest.raises(symcrys.SymcrysError, match=r"point=, uv= or hk=, not as positional argument 2"):
        plane.site_symmetry("p4mm", [0.5, 0.5])  # type: ignore[misc]
    with pytest.raises(symcrys.SymcrysError, match=r"hkl=, uvw= or cartesian="):
        symcrys.wyckoff_position("6/mmm", [2, 1, 0])  # type: ignore[misc]
    with pytest.raises(symcrys.SymcrysError, match=r"a point point= .*an edge hk=, by one field"):
        plane.site_symmetry("p4mm")
    with pytest.raises(symcrys.SymcrysError, match="not ndarray"):
        symcrys.point_group_of(np.array(1))
