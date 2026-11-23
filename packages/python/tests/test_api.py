"""The Python layer itself: names, conversions, errors. The values are the library's (pins and
print are checked in test_pins.py and test_references.py)."""

import re
import threading
from types import MappingProxyType

import numpy as np
import pytest

import symcrys
from symcrys import _engine, magnetic, plane
from symcrys._convert import camel, snake

SHG = {"rank": 3, "parity": "polar", "intrinsic": "jk"}
MAGNETIC_SHG = {**SHG, "time_parity": "i"}
TYPES = {"SymcrysError", "TensorForm", "TensorSpec"}


def test_every_export_of_the_library_has_its_python_name() -> None:
    exported = _engine.exports()
    assert all(name.startswith(("magnetic.", "plane.")) for name, _ in exported if "." in name)
    for module, prefix in ((symcrys, ""), (magnetic, "magnetic."), (plane, "plane.")):
        own = [(name[len(prefix) :], kind) for name, kind in exported if (name.startswith(prefix) if prefix else "." not in name)]
        expected = {name if kind == "value" else snake(name) for name, kind in own}
        assert len(expected) > (12 if module is plane else 20)
        extra = (
            TYPES | {"magnetic", "plane"}
            if module is symcrys
            else {"SymcrysError", "Operation"} if module is plane else TYPES
        )
        assert set(module.__all__) == expected | extra, module.__name__
        for name in expected:
            assert hasattr(module, name), name


def test_every_function_has_its_docstring_from_the_tsdoc() -> None:
    # Written from the TSDoc comments by scripts/python-docstrings.mjs (#29); whether they are
    # current is checked by `npm run docs:check` in the gate docs, which needs the TypeScript sources.
    for module in (symcrys, magnetic, plane):
        for name in module.__all__:
            obj = getattr(module, name)
            if callable(obj) and not isinstance(obj, type) and name not in TYPES:
                doc = obj.__doc__ or ""
                assert len(doc.strip()) > 20, f"{module.__name__}.{name} has no docstring"
                assert not re.search(r"``[^`]*\b[a-z]+[A-Z]\w*[^`]*``", doc), f"{module.__name__}.{name}: camelCase"


def test_the_two_modules_have_the_same_names() -> None:
    only_classes = {"magnetic", "plane", "CRYSTAL_FORM_TYPES", "crystal_forms", "wyckoff_position_of", "wyckoff_positions"}
    assert set(symcrys.__all__) - only_classes == set(magnetic.__all__)
    assert symcrys.magnetic is magnetic and magnetic.VERSION == symcrys.VERSION == symcrys.__version__


def test_crystal_classes_here_magnetic_point_groups_there() -> None:
    assert len(symcrys.POINT_GROUP_KEYS) == 32 and len(magnetic.POINT_GROUP_KEYS) == 122
    assert magnetic.POINT_GROUP_KEYS[:32] == symcrys.POINT_GROUP_KEYS
    assert [g["key"] for g in symcrys.point_groups()] == list(symcrys.POINT_GROUP_KEYS)
    assert [g["key"] for g in magnetic.point_groups()] == list(magnetic.POINT_GROUP_KEYS)
    fixed = {"centrosymmetric": False, "polar": False, "chiral": True, "laue_class": "-3m"}
    assert symcrys.point_group("32") == {"key": "32", "crystal_system": "trigonal", "order": 6, **fixed}
    assert magnetic.point_group("32") == {
        "key": "32", "type": "I", "crystal_class": "32", "crystal_system": "trigonal", "order": 6, **fixed
    }  # fmt: skip
    assert symcrys.is_point_group_key("321'") is False and magnetic.is_point_group_key("321'") is True
    assert symcrys.find_point_group("4'/mmm'") is None
    assert magnetic.find_point_group("4'/mmm'") == {"key": "4'/mmm'", "setting": 1}
    assert set(symcrys.operations("32")[1]) == {"matrix"}
    assert set(magnetic.operations("32")[1]) == {"matrix", "time_reversal"}
    assert "time_reversal" not in symcrys.describe_operations("32")[1]
    assert magnetic.describe_operations("321'")[-1]["time_reversal"] is True


def test_the_magnetic_api_asks_every_operation_for_its_time_reversal() -> None:
    # Operations of the crystallographic API do not say; read as a group they would give wrong forms.
    for ops in (symcrys.generators("m-3m"), symcrys.operations("32"), [{"matrix": -np.eye(3)}]):
        with pytest.raises(symcrys.SymcrysError, match="timeReversal must be true or false, not undefined"):
            magnetic.allowed_properties_of(ops)
        with pytest.raises(symcrys.SymcrysError, match="timeReversal must be true or false"):
            magnetic.tensor_form_of(ops, "pyroelectric")
        for call in (magnetic.is_centrosymmetric_of, magnetic.is_chiral_of):
            with pytest.raises(symcrys.SymcrysError, match="timeReversal must be true or false, not undefined"):
                call(ops)
    with pytest.raises(symcrys.SymcrysError, match="not an orthogonal"):
        symcrys.is_chiral_of([{"matrix": np.diag([2.0, 1.0, 1.0])}])
    with pytest.raises(symcrys.SymcrysError, match="timeReversal must be true or false, not 1"):
        magnetic.tensor_form_of([{"matrix": np.eye(3), "time_reversal": 1}], "ferromagnetic")
    inversion = [{"matrix": -np.eye(3), "time_reversal": False}]
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
        symcrys.tensor_form("3", {"rank": 1, "parity": "axial", "time_parity": "c", "intrinsic": "none"})
    with pytest.raises(symcrys.SymcrysError, match="Operation 6 is combined with time reversal.*" + use_magnetic):
        symcrys.tensor_form_of(magnetic.operations("321'"), "piezoelectric")
    with pytest.raises(symcrys.SymcrysError, match="timeReversal must be false or absent"):
        symcrys.tensor_form_of([{"matrix": -np.eye(3), "time_reversal": 1}], "pyroelectric")
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
    assert op["matrix"].dtype == np.float64 and op["matrix"].shape == (3, 3)
    assert isinstance(magnetic.operations("4")[1]["time_reversal"], bool)
    site = symcrys.site_symmetry(symcrys.operations("4mm"), [0, 0, 1])
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


def test_lattice_operations_and_orbits() -> None:
    ops = symcrys.lattice_operations("3")
    assert ops[1]["matrix"].dtype == np.float64 and ops[1]["matrix"].tolist() == [[0, -1, 0], [1, -1, 0], [0, 0, 1]]
    assert [w["time_reversal"] for w in magnetic.lattice_operations("4'")] == [False, False, True, True]
    faces = symcrys.orbit("4mm", {"hkl": np.array([0, 0, 1])})
    assert len(faces) == 1 and faces[0]["hkl"].dtype == np.int64 and faces[0]["operations"].tolist() == list(range(8))
    poles = symcrys.orbit_of(symcrys.operations("4mm"), [1, 0, 0])
    assert [p["operations"].tolist() for p in poles] == [[0, 4], [1, 5], [2, 7], [3, 6]]
    assert poles[0]["direction"].dtype == np.float64
    with pytest.raises(symcrys.SymcrysError, match="either hkl"):
        symcrys.orbit("4mm", {})


def test_point_group_of_a_list_of_operations() -> None:
    assert symcrys.point_group_of(symcrys.operations("32", setting="312")) == {"key": "32", "setting": 2}
    assert magnetic.point_group_of(magnetic.operations("4'mm'")) == {"key": "4'mm'", "setting": 1}
    c, s = np.cos(0.4 * np.pi), np.sin(0.4 * np.pi)
    fivefold = np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]])
    assert symcrys.point_group_of([{"matrix": fivefold}]) is None
    described = symcrys.describe_operations_of(symcrys.operations("4"))
    assert described[2]["kind"] == "rotation" and described[2]["axis"]["cartesian"].dtype == np.float64
    assert "time_reversal" not in described[2]
    assert "time_reversal" in magnetic.describe_operations_of(magnetic.operations("4"))[2]


def test_tensor_form_arrays_have_fixed_shapes_also_when_empty() -> None:
    f = symcrys.tensor_form("mm2", SHG)
    assert f["basis"].shape == (5, 27) and f["relations"].shape == (22, 27) and f["parameters"].shape == (5, 3)
    zero = symcrys.tensor_form("m-3m", SHG)
    assert zero["basis"].shape == (0, 27) and zero["parameters"].shape == (0, 3) and zero["relations"].shape == (27, 27)
    scalar = symcrys.tensor_form("1", {"rank": 0, "parity": "polar", "intrinsic": "none"})
    assert scalar["basis"].shape == (1, 1) and scalar["parameters"].shape == (1, 0)


def test_operations_go_back_into_the_library_unchanged() -> None:
    for key in ("3m", "-42m", "m-3m"):
        a = symcrys.tensor_form_of(symcrys.operations(key), SHG)
        b = symcrys.tensor_form(key, SHG)
        assert np.array_equal(a["basis"], b["basis"]) and np.array_equal(a["parameters"], b["parameters"])


def test_camel_case_keys_are_accepted_in_a_spec() -> None:
    spec = {"rank": 3, "parity": "polar", "timeParity": "i", "intrinsic": "jk"}
    assert np.array_equal(magnetic.tensor_form("4mm", spec)["basis"], magnetic.tensor_form("4mm", MAGNETIC_SHG)["basis"])
    assert np.array_equal(magnetic.tensor_form("4mm", spec)["basis"], symcrys.tensor_form("4mm", SHG)["basis"])


def test_named_tensor_properties() -> None:
    assert list(symcrys.TENSOR_PROPERTIES) == ["pyroelectric", "ferroaxial", "piezoelectric", "gyrotropic"]
    assert list(magnetic.TENSOR_PROPERTIES) == [
        "pyroelectric", "ferroaxial", "piezoelectric", "gyrotropic", "ferromagnetic", "magnetoelectric", "piezomagnetic"
    ]
    assert symcrys.allowed_properties("-3") == ["ferroaxial"]
    assert symcrys.tensor_form("-3", "ferroaxial")["parameters"].tolist() == [[2]]
    piezo = symcrys.TENSOR_PROPERTIES["piezoelectric"]
    assert piezo["spec"] == SHG and set(piezo) == {"spec", "description", "source"}
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
        "centrosymmetric": True, "polar": False, "chiral": False, "laue_class": "-3",
    }  # fmt: skip
    assert magnetic.point_group("-3'") == {
        "key": "-3'", "type": "III", "crystal_class": "-3", "crystal_system": "trigonal", "order": 6,
        "centrosymmetric": False, "polar": False, "chiral": False, "laue_class": "-3",
    }  # fmt: skip
    for module in (symcrys, magnetic):
        assert not any(hasattr(module, name) for name in ("is_centrosymmetric", "is_polar", "is_chiral", "laue_class"))
        assert module.holohedry("trigonal") == "-3m"
        assert module.holohedry(module.crystal_family("trigonal")) == "6/mmm"
        ops = module.generators("2/m")
        assert module.is_centrosymmetric_of(ops) is True and module.is_chiral_of(ops) is False
        assert module.is_chiral_of(module.operations("32")) is True
    assert magnetic.is_centrosymmetric_of(magnetic.operations("-1'")) is False
    with pytest.raises(symcrys.SymcrysError, match="symcrys/magnetic|magnetic"):
        symcrys.is_centrosymmetric_of(magnetic.operations("-1'"))


def test_rotate_tensor_takes_arrays_of_any_shape() -> None:
    t = np.arange(27, dtype=float).reshape(3, 3, 3)
    rz = np.array([[0.0, -1.0, 0.0], [1.0, 0.0, 0.0], [0.0, 0.0, 1.0]])
    rotated = symcrys.rotate_tensor(t, rz, SHG)
    assert rotated.shape == (27,)
    assert np.allclose(rotated.reshape(3, 3, 3), np.einsum("ia,jb,kc,abc->ijk", rz, rz, rz, t))


def test_library_errors_are_value_errors_with_the_message() -> None:
    with pytest.raises(symcrys.SymcrysError, match="Unknown point group key") as e:
        symcrys.operations("7")
    assert isinstance(e.value, ValueError) and e.value.js_name == "RangeError"
    with pytest.raises(ValueError, match="needs rank 4"):
        symcrys.tensor_form("2", {"rank": 3, "parity": "polar", "intrinsic": "voigt"})
    with pytest.raises(ValueError, match="not an orthogonal"):
        symcrys.rotate_tensor([1, 0, 0], np.diag([2.0, 1.0, 1.0]), {"rank": 1, "parity": "polar", "intrinsic": "none"})


def test_nan_and_wrong_shapes_give_readable_errors() -> None:
    # #92: before, NaN reached the engine's JSON parser ("unexpected token: 'NaN'") and an array of
    # matrices failed inside the library ("cannot read property '0' of undefined").
    ops = symcrys.operations("4mm")
    for bad in ([np.nan, 0, 1], [np.inf, 0, 1]):
        with pytest.raises(symcrys.SymcrysError, match="must be finite") as e:
            symcrys.site_symmetry(ops, bad)
        assert e.value.js_name == "RangeError"
    with pytest.raises(symcrys.SymcrysError, match="must be finite"):
        plane.orbit("p4", [np.nan, 0.0])
    matrices = np.array([op["matrix"] for op in ops])
    for module in (symcrys, magnetic):
        with pytest.raises(symcrys.SymcrysError, match=r"list of operations \{\"matrix\"\}.*not ndarray"):
            module.point_group_of(matrices)
        with pytest.raises(symcrys.SymcrysError, match=r"operation 0 must be a mapping"):
            module.tensor_form_of(list(matrices), SHG if module is symcrys else MAGNETIC_SHG)
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
    basis = symcrys.lattice_from_parameters({"a": 3, "b": 3, "c": 5, "alpha": 90, "beta": 90, "gamma": 120})
    assert basis.dtype == np.float64 and basis.shape == (3, 3)
    assert symcrys.lattice_parameters(basis)["gamma"] == pytest.approx(120)
    assert all(type(v) is float for v in symcrys.lattice_parameters(np.eye(3)).values())
    assert symcrys.is_valid_cell({"alpha": 90, "beta": 90, "gamma": 90}) is True
    assert symcrys.is_valid_cell({"alpha": 60, "beta": 60, "gamma": 120}) is False
    assert symcrys.is_valid_cell({"alpha": 90, "beta": 90, "gamma": 30}, min_volume_ratio=0.6) is False
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
    change = symcrys.change_of_axes([[1, -1, 0], [1, 1, 0], [0, 0, 1]])
    assert change["direction"].dtype == np.float64 and change["plane"].dtype == np.float64
    with pytest.raises(ValueError):
        symcrys.reduce_indices([0, 0, 0])
    with pytest.raises(symcrys.SymcrysError, match="minVolumeRatio must be a number from 0 to 1"):
        symcrys.is_valid_cell({"alpha": 90, "beta": 90, "gamma": 90}, min_volume_ratio=-1)
    # a cell in metres: the reciprocal basis is that of the cell in ångström, divided by 10⁻¹⁰
    metres = symcrys.lattice_from_parameters({"a": 3e-10, "b": 3e-10, "c": 5e-10, "alpha": 90, "beta": 90, "gamma": 120})
    assert np.allclose(symcrys.reciprocal_basis(metres) * 1e-10, symcrys.reciprocal_basis(basis))


def test_site_symmetry_refuses_a_matrix_that_is_not_orthogonal() -> None:
    stretch = [[2, 0, 0], [0, 1, 0], [0, 0, 1]]
    with pytest.raises(symcrys.SymcrysError, match="not an orthogonal"):
        symcrys.site_symmetry([{"matrix": stretch}], [1, 0, 0])
    with pytest.raises(symcrys.SymcrysError, match="not an orthogonal"):
        magnetic.site_symmetry([{"matrix": stretch, "time_reversal": False}], [1, 0, 0])


def test_residual_operations_in_both_apis() -> None:
    ops = symcrys.lattice_operations("4/mmm")
    cell = symcrys.lattice_from_parameters({"a": 2, "b": 2.1, "c": 3, "alpha": 90, "beta": 90, "gamma": 90})
    assert len(symcrys.residual_operations(ops, cell)) == 8
    assert len(symcrys.residual_operations(ops, cell, tolerance=0.1)) == 16
    mops = magnetic.lattice_operations("4/mmm")
    assert len(magnetic.residual_operations(mops, cell)) == 8
    assert all("time_reversal" in op for op in magnetic.residual_operations(mops, cell))
    with pytest.raises(ValueError):
        symcrys.residual_operations([{"matrix": np.eye(3), "time_reversal": True}], cell)
    with pytest.raises(ValueError):
        magnetic.residual_operations([{"matrix": np.eye(3)}], cell)
