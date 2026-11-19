"""The Birss convention against birss-app, through Python: the same behavioural pins as
packages/ts/src/pointGroups/birssApp.pins.test.ts and packages/ts/src/tensors/birssApp.pins.test.ts."""

from typing import Any

import numpy as np
import pytest

import symcrys
from conftest import pins

POINT_GROUPS = pins("pointGroups/birssApp.pins.json")["classes"]
TENSORS = pins("tensors/birssApp.pins.json")["classes"]


@pytest.mark.parametrize("pin", POINT_GROUPS, ids=[c["key"] for c in POINT_GROUPS])
def test_point_groups(pin: dict[str, Any]) -> None:
    key = pin["key"]
    birss = [s for s in symcrys.settings(key, "birss")]
    assert next(s["index"] for s in birss if s["is_default"]) == pin["defaultSetting"]
    assert [symcrys.is_centrosymmetric(key), symcrys.is_polar(key), symcrys.is_chiral(key), symcrys.laue_class(key)] == [
        pin["centrosymmetric"], pin["polar"], pin["chiral"], pin["laueClass"]
    ]
    for s in pin["settings"]:
        ops = symcrys.operations(key, convention="birss", setting=s["setting"])
        assert np.allclose([o["matrix"] for o in ops], s["operations"], atol=1e-9)
        gens = symcrys.generators(key, convention="birss", setting=s["setting"])
        assert np.allclose([g["matrix"] for g in gens], s["generators"], atol=1e-9)
        assert symcrys.symbol(key, convention="birss", setting=s["setting"]) == s["symbol"]


@pytest.mark.parametrize("pin", TENSORS, ids=[c["key"] for c in TENSORS])
def test_tensor_forms(pin: dict[str, Any]) -> None:
    for s in pin["settings"]:
        for f in s["forms"]:
            spec = {"rank": f["rank"], "parity": f["parity"], "time_parity": "i", "intrinsic": f["intrinsic"]}
            form = symcrys.tensor_form(pin["key"], spec, convention="birss", setting=s["setting"])
            rank = f["rank"]
            want_parameters = [[(p // 3 ** (rank - 1 - k)) % 3 for k in range(rank)] for p in f["parameters"]]
            assert form["parameters"].tolist() == want_parameters
            want = np.zeros((len(f["basis"]), 3**rank))
            for k, row in enumerate(f["basis"]):
                for i, v in row:
                    want[k, i] = v
            assert np.allclose(form["basis"], want, atol=1e-9)
