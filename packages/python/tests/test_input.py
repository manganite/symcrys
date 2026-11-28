"""The conversion of Python input must not change its meaning (#237).

Expected values are the contract of the layer (``GUIDE.md``, "The Python layer"): input whose
conversion would change its meaning is refused.
"""

from __future__ import annotations

from typing import Any

import numpy as np
import pytest

import symcrys
from symcrys import magnetic, plane

AXIAL = {"rank": 1, "kind": "axial", "intrinsic": "none"}


# --- keys that name the same field ----------------------------------------------------------------


@pytest.mark.parametrize(
    "spec",
    [
        {**AXIAL, "time_parity": "odd", "timeParity": "even"},
        {**AXIAL, "timeParity": "even", "time_parity": "odd"},
    ],
    ids=["snake first", "camel first"],
)
def test_two_keys_for_one_field_are_refused_in_either_order(spec: dict[str, Any]) -> None:
    # Both dicts hold the same contradiction; on 0.15.0 the later key wins: 3 components or none.
    with pytest.raises(symcrys.SymcrysError, match=r"time_parity.*timeParity|timeParity.*time_parity"):
        magnetic.tensor_form("11'", spec)


def test_two_keys_for_one_field_are_refused_in_the_crystallographic_module() -> None:
    spec = {"rank": 1, "kind": "polar", "intrinsic": "none", "time_parity": "even", "timeParity": "even"}
    with pytest.raises(symcrys.SymcrysError, match=r"time_parity.*timeParity|timeParity.*time_parity"):
        symcrys.tensor_form("4", spec)


def test_two_keys_for_one_field_are_refused_in_a_cell() -> None:
    with pytest.raises(symcrys.SymcrysError, match=r"cell_choice.*cellChoice|cellChoice.*cell_choice"):
        symcrys.cell_transformation("mP", {"cell_choice": 1, "cellChoice": 2}, {})


def test_two_keys_for_one_field_are_refused_in_an_operation() -> None:
    # On 0.15.0 the later key wins: the identity with time reversal, the group 11'.
    op = {"cartesian": np.eye(3), "time_reversal": False, "timeReversal": True}
    with pytest.raises(symcrys.SymcrysError, match=r"time_reversal.*timeReversal|timeReversal.*time_reversal"):
        magnetic.point_group_of([op])


# --- arrays ---------------------------------------------------------------------------------------


def test_a_masked_array_with_masked_values_is_refused() -> None:
    # On 0.15.0 the masked value 2 is used as if it were not masked.
    with pytest.raises(symcrys.SymcrysError, match="mask"):
        symcrys.rotate_tensor(np.ma.array([1.0, 2.0, 3.0], mask=[False, True, False]), np.eye(3), "pyroelectric")


def test_a_masked_point_is_refused_in_the_plane() -> None:
    with pytest.raises(symcrys.SymcrysError):
        plane.site_symmetry("p4", point=np.ma.array([0.1, 0.2], mask=[False, True]))


def test_a_masked_array_without_masked_values_is_taken() -> None:
    got = symcrys.rotate_tensor(np.ma.array([1.0, 2.0, 3.0], mask=[False, False, False]), np.eye(3), "pyroelectric")
    assert got.tolist() == [1.0, 2.0, 3.0]


def test_an_integer_that_a_double_would_round_is_refused_in_a_list_of_floats() -> None:
    # 2**53 + 1 has no double; on 0.15.0 it becomes 9007199254740992.0 without an error.
    with pytest.raises(symcrys.SymcrysError):
        symcrys.rotate_tensor([2**53 + 1, 1.0, 2.0], np.eye(3), "pyroelectric")


@pytest.mark.parametrize(
    "call",
    [
        lambda: symcrys.rotate_tensor(np.array([2**53 + 1, 1, 2]), np.eye(3), "pyroelectric"),
        lambda: plane.orbit("4mm", uv=np.array([2**53 + 1, 1])),
    ],
    ids=["symcrys int64 array", "plane int64 array"],
)
def test_an_integer_array_beyond_2_53_is_refused(call: Any) -> None:
    with pytest.raises(symcrys.SymcrysError):
        call()


def test_strings_are_refused_as_a_point_of_the_plane() -> None:
    with pytest.raises(symcrys.SymcrysError):
        plane.site_symmetry("p4", point=np.array(["0.1", "0.2"]))


def test_a_key_that_is_not_a_string_is_refused() -> None:
    with pytest.raises(symcrys.SymcrysError):
        symcrys.tensor_form("4", {1: "x", "rank": 1, "kind": "polar", "intrinsic": "none"})  # type: ignore[dict-item]


def test_an_empty_record_of_the_wrong_shape_is_refused() -> None:
    a = np.empty((3, 0, 4))
    with pytest.raises(symcrys.SymcrysError, match="shape"):
        symcrys.point_group_of(symcrys.Operations(a, a))  # type: ignore[arg-type]


def test_an_empty_record_of_the_right_shape_is_the_group_1() -> None:
    empty = np.empty((0, 3, 3))
    assert symcrys.point_group_of(symcrys.Operations(empty.astype(np.int64), empty)) == {"key": "1", "setting": 1}


def test_strings_are_refused_as_a_stack_of_matrices() -> None:
    # The same data in the field cartesian is refused already.
    digits = np.array([[["1", "0", "0"], ["0", "1", "0"], ["0", "0", "1"]]])
    with pytest.raises(symcrys.SymcrysError):
        symcrys.point_group_of(digits)


def test_an_empty_mask_is_refused_as_any_mask_of_the_wrong_length() -> None:
    ops = symcrys.operations("4mm")
    with pytest.raises(IndexError, match="a mask of 0 values for 8 operations"):
        ops[np.zeros(0, dtype=bool)]


@pytest.mark.parametrize("shape", [(1, 9), (1, 3, 3)])
def test_to_voigt_refuses_a_rank_2_tensor_in_another_shape(shape: tuple[int, ...]) -> None:
    # The docstring names (9,) and (3, 3); (2, 9) is refused, (1, 9) and (1, 3, 3) are flattened on 0.15.0.
    spec = {"rank": 2, "kind": "polar", "intrinsic": "symmetric-first-pair"}
    with pytest.raises(symcrys.SymcrysError):
        symcrys.to_voigt(np.diag([1.0, 2.0, 3.0]).reshape(shape), spec, factors=[1])


@pytest.mark.parametrize("shape", [(9,), (3, 3)])
def test_to_voigt_takes_a_rank_2_tensor_in_its_shapes(shape: tuple[int, ...]) -> None:
    spec = {"rank": 2, "kind": "polar", "intrinsic": "symmetric-first-pair"}
    got = symcrys.to_voigt(np.diag([1.0, 2.0, 3.0]).reshape(shape), spec, factors=[1])
    assert got.tolist() == [1.0, 2.0, 3.0, 0.0, 0.0, 0.0]


# --- NumPy scalars --------------------------------------------------------------------------------


def test_a_numpy_scalar_that_is_exactly_a_double_is_taken() -> None:
    # np.longdouble(1) is exactly 1.0; on 0.15.0 it raises a RecursionError.
    want = symcrys.lattice_from_parameters(1.0, 1, 1, 90, 90, 90)
    got = symcrys.lattice_from_parameters(np.longdouble(1), 1, 1, 90, 90, 90)  # type: ignore[arg-type]
    assert got.tolist() == want.tolist()


@pytest.mark.skipif(np.finfo(np.longdouble).eps == np.finfo(np.float64).eps, reason="long double is a double here")
def test_a_numpy_scalar_that_a_double_would_round_is_refused() -> None:
    with pytest.raises(symcrys.SymcrysError):
        symcrys.lattice_from_parameters(np.longdouble(1) + np.longdouble(2) ** -60, 1, 1, 90, 90, 90)  # type: ignore[arg-type]


# --- the same contract in every module and for every kind of input -------------------------------


def test_two_keys_for_one_field_are_refused_in_the_plane() -> None:
    # camel("translation_") is "translation": the same collision without a snake_case name.
    op = {"matrix": np.eye(2, dtype=np.int64), "translation": [0, 0], "translation_": [0.5, 0]}
    with pytest.raises(symcrys.SymcrysError, match=r"'translation'.*'translation_'"):
        plane.describe_operations_of([op])


def test_a_key_that_is_not_a_string_is_named() -> None:
    with pytest.raises(symcrys.SymcrysError, match="keys of a mapping are strings, not 1"):
        symcrys.tensor_form("4", {1: "x", "rank": 1, "kind": "polar", "intrinsic": "none"})  # type: ignore[dict-item]


def test_a_masked_field_of_operations_is_refused() -> None:
    ops = symcrys.operations("4mm")
    masked = np.ma.array(ops.cartesian, mask=np.zeros(ops.cartesian.shape, dtype=bool))
    masked[1, 0, 0] = np.ma.masked
    with pytest.raises(symcrys.SymcrysError, match="mask"):
        symcrys.Operations(ops.matrix, masked)


def test_an_array_of_long_doubles_that_a_double_would_round_is_refused() -> None:
    if np.finfo(np.longdouble).eps == np.finfo(np.float64).eps:
        pytest.skip("long double is a double here")
    t = np.array([1, 2, 3], dtype=np.longdouble) + np.longdouble(2) ** -60
    with pytest.raises(symcrys.SymcrysError, match="double"):
        symcrys.rotate_tensor(t, np.eye(3), "pyroelectric")


@pytest.mark.parametrize(
    "x", [np.float32(0.5), np.float16(2), np.int8(3), np.uint64(7), np.longdouble(1.5)], ids=lambda x: type(x).__name__
)
def test_numpy_scalars_that_are_exact_are_taken(x: Any) -> None:
    want = symcrys.lattice_from_parameters(float(x), 1, 1, 90, 90, 90)
    got = symcrys.lattice_from_parameters(x, 1, 1, 90, 90, 90)
    assert got.tolist() == want.tolist()


def test_a_complex_numpy_scalar_is_refused() -> None:
    with pytest.raises(symcrys.SymcrysError, match="complex"):
        symcrys.lattice_from_parameters(np.complex128(1), 1, 1, 90, 90, 90)  # type: ignore[arg-type]


# --- what the review of #246 found ------------------------------------------------------------------


def _masked_cartesian() -> Any:
    ops = symcrys.operations("4mm")
    mk = np.ma.array(ops.cartesian, mask=np.zeros(ops.cartesian.shape, dtype=bool))
    mk[0, 0, 1] = np.ma.masked
    return mk


@pytest.mark.parametrize("wrap", [lambda m: (x for x in m), lambda m: __import__("collections").deque(m)], ids=["generator", "deque"])
def test_a_masked_stack_is_refused_through_any_iterable(wrap: Any) -> None:
    # On the first commit of #246 the check ran on the iterable, not on its entries: 4mm was answered.
    with pytest.raises(symcrys.SymcrysError, match="mask"):
        symcrys.point_group_of(wrap(_masked_cartesian()))


class _ArrayLike:
    def __init__(self, a: Any) -> None:
        self.a = a

    def __array__(self, dtype: Any = None, copy: Any = None) -> Any:
        return self.a


def test_an_array_like_of_long_doubles_that_a_double_would_round_is_refused() -> None:
    if np.finfo(np.longdouble).eps == np.finfo(np.float64).eps:
        pytest.skip("long double is a double here")
    t = np.array([1, 2, 3], dtype=np.longdouble) * (1 + np.longdouble(2) ** -60)
    with pytest.raises(symcrys.SymcrysError, match="double"):
        symcrys.rotate_tensor(_ArrayLike(t), np.eye(3), "pyroelectric")


@pytest.mark.parametrize("x", [np.timedelta64(5, "ns"), np.datetime64("2026-01-01")], ids=["timedelta64", "datetime64"])
def test_a_time_is_not_a_number(x: Any) -> None:
    with pytest.raises(symcrys.SymcrysError, match="not a number"):
        symcrys.lattice_from_parameters(x, 1, 1, 90, 90, 90)


def test_a_list_nested_too_deep_or_containing_itself_is_refused() -> None:
    deep: Any = 1.0
    for _ in range(3000):
        deep = [deep]
    looped: list[Any] = [1.0]
    looped.append(looped)
    for x in (deep, looped):
        with pytest.raises(symcrys.SymcrysError):
            symcrys.rotate_tensor(x, np.eye(3), "pyroelectric")


def test_an_integer_beyond_2_53_in_a_field_of_floats_is_refused() -> None:
    eye = np.eye(2, dtype=np.int64)[None]
    with pytest.raises(symcrys.SymcrysError, match="translation"):
        plane.Operations(eye, np.array([[2**53 + 1, 0]]))


def test_the_collision_names_the_field_in_python_terms() -> None:
    spec = {**AXIAL, "time_parity": "odd", "timeParity": "even"}
    with pytest.raises(symcrys.SymcrysError, match="name one field, 'time_parity'"):
        magnetic.tensor_form("11'", spec)
