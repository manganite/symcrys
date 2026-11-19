"""The Python layer itself: names, conversions, errors. The values are the library's (pins and
print are checked in test_pins.py and test_references.py)."""

import re
import threading

import numpy as np
import pytest

import symcrys
from symcrys import _engine
from symcrys._convert import camel, snake

SHG = {"rank": 3, "parity": "polar", "time_parity": "i", "intrinsic": "jk"}


def test_every_export_of_the_library_has_its_python_name() -> None:
    exported = _engine.exports()
    expected = {name if kind == "value" else snake(name) for name, kind in exported}
    assert set(symcrys.__all__) == expected | {"SymcrysError", "TensorForm", "TensorSpec"}
    for name in expected:
        assert hasattr(symcrys, name), name


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
    assert isinstance(op["time_reversal"], bool)
    site = symcrys.site_symmetry(symcrys.operations("4mm"), [0, 0, 1])
    assert site["operations"].dtype == np.int64
    axis = symcrys.describe_operations("4")[1]["axis"]
    assert axis["lattice"].dtype == np.int64 and axis["cartesian"].dtype == np.float64


def test_tensor_form_arrays_have_fixed_shapes_also_when_empty() -> None:
    f = symcrys.tensor_form("mm2", SHG)
    assert f["basis"].shape == (5, 27) and f["relations"].shape == (22, 27) and f["parameters"].shape == (5, 3)
    zero = symcrys.tensor_form("m-3m", SHG)
    assert zero["basis"].shape == (0, 27) and zero["parameters"].shape == (0, 3) and zero["relations"].shape == (27, 27)
    scalar = symcrys.tensor_form("1", {"rank": 0, "parity": "polar", "time_parity": "i", "intrinsic": "none"})
    assert scalar["basis"].shape == (1, 1) and scalar["parameters"].shape == (1, 0)


def test_operations_go_back_into_the_library_unchanged() -> None:
    for key in ("3m", "-42m", "m-3m"):
        a = symcrys.tensor_form_of(symcrys.operations(key), SHG)
        b = symcrys.tensor_form(key, SHG)
        assert np.array_equal(a["basis"], b["basis"]) and np.array_equal(a["parameters"], b["parameters"])


def test_camel_case_keys_are_accepted_in_a_spec() -> None:
    spec = {"rank": 3, "parity": "polar", "timeParity": "i", "intrinsic": "jk"}
    assert np.array_equal(symcrys.tensor_form("4mm", spec)["basis"], symcrys.tensor_form("4mm", SHG)["basis"])


def test_named_tensor_properties() -> None:
    assert list(symcrys.TENSOR_PROPERTIES) == [
        "pyroelectric", "piezoelectric", "gyrotropic", "ferromagnetic", "magnetoelectric", "piezomagnetic"
    ]
    piezo = symcrys.TENSOR_PROPERTIES["piezoelectric"]
    assert piezo["spec"] == SHG and set(piezo) == {"spec", "description", "source"}
    assert symcrys.allowed_properties("432") == ["gyrotropic", "magnetoelectric"]
    assert symcrys.allows_property("432", "piezoelectric") is False
    ops = symcrys.operations("m'm'2")
    assert symcrys.allowed_properties_of(ops) == symcrys.allowed_properties("m'm'2") == list(symcrys.TENSOR_PROPERTIES)
    assert symcrys.allows_property_of(ops, "ferromagnetic") is True
    by_name = symcrys.tensor_form("32", "piezoelectric")
    assert np.array_equal(by_name["basis"], symcrys.tensor_form("32", SHG)["basis"])
    assert np.array_equal(symcrys.tensor_form_of(symcrys.operations("32"), "piezoelectric")["basis"], by_name["basis"])
    with pytest.raises(symcrys.SymcrysError, match="Unknown tensor property"):
        symcrys.allows_property("1", "piezo")  # type: ignore[arg-type]


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
        symcrys.tensor_form("2", {"rank": 3, "parity": "polar", "time_parity": "i", "intrinsic": "voigt"})
    with pytest.raises(ValueError, match="not an orthogonal"):
        symcrys.rotate_tensor([1, 0, 0], np.diag([2.0, 1.0, 1.0]), {"rank": 1, "parity": "polar", "time_parity": "i", "intrinsic": "none"})


def test_undefined_result_is_none() -> None:
    assert symcrys.find_point_group("not a symbol") is None
    assert symcrys.find_point_group("321") == {"key": "32", "setting": 2}


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
    answer = _engine.call("symbol", '["32", {"convention": "birss"}]')
    assert re.fullmatch(r'\{"result":"32"\}', answer)
