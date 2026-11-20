"""The Birss convention against birss-app, through Python: the same behavioural pins as
packages/ts/src/pointGroups/birssApp.pins.test.ts and packages/ts/src/tensors/birssApp.pins.test.ts."""

from typing import Any

import numpy as np
import pytest

import symcrys
from conftest import pins

POINT_GROUPS = pins("pointGroups/birssApp.pins.json")["groups"]
# birss-app's keys are Birss symbols; for two groups the key of symcrys, the ITC short symbol, differs.
SYMCRYS_KEY = {"m'm'm": "mm'm'", "6'/mm'm": "6'/mmm'"}
TENSORS = [(c, "i") for c in pins("tensors/birssApp.pins.json")["classes"]] + [
    (c, "c") for c in pins("tensors/birssApp.pins.json")["magnetic"]
]


@pytest.mark.parametrize("pin", POINT_GROUPS, ids=[c["key"] for c in POINT_GROUPS])
def test_point_groups(pin: dict[str, Any]) -> None:
    key = SYMCRYS_KEY.get(pin["key"], pin["key"])
    assert symcrys.point_group(key)["type"] == pin["type"]
    assert symcrys.symbol(key, convention="birss") == pin["key"]
    birss = [s for s in symcrys.settings(key, "birss")]
    assert next(s["index"] for s in birss if s["is_default"]) == pin["defaultSetting"]
    assert next(s["index"] for s in symcrys.settings(key) if s["is_default"]) == pin["itcDefaultSetting"]
    assert [symcrys.is_centrosymmetric(key), symcrys.is_polar(key), symcrys.is_chiral(key), symcrys.laue_class(key)] == [
        pin["centrosymmetric"], pin["polar"], pin["chiral"], pin["laueClass"]
    ]
    for s in pin["settings"]:
        ops = symcrys.operations(key, convention="birss", setting=s["setting"])
        assert np.allclose([o["matrix"] for o in ops], s["operations"], atol=1e-9)
        assert [o["time_reversal"] for o in ops] == s["operationTimeReversal"]
        gens = symcrys.generators(key, convention="birss", setting=s["setting"])
        assert np.allclose([g["matrix"] for g in gens], s["generators"], atol=1e-9)
        assert [g["time_reversal"] for g in gens] == s["generatorTimeReversal"]
        assert symcrys.symbol(key, convention="birss", setting=s["setting"]) == s["symbol"]


@pytest.mark.parametrize(("pin", "time_parity"), TENSORS, ids=[f"{c['key']} {t}" for c, t in TENSORS])
def test_tensor_forms(pin: dict[str, Any], time_parity: str) -> None:
    """Time-even forms of the 32 classes, time-odd forms of the 58 black-and-white groups."""
    key = SYMCRYS_KEY.get(pin["key"], pin["key"])
    for s in pin["settings"]:
        for f in s["forms"]:
            spec = {"rank": f["rank"], "parity": f["parity"], "time_parity": time_parity, "intrinsic": f["intrinsic"]}
            form = symcrys.tensor_form(key, spec, convention="birss", setting=s["setting"])
            rank = f["rank"]
            want_parameters = [[(p // 3 ** (rank - 1 - k)) % 3 for k in range(rank)] for p in f["parameters"]]
            assert form["parameters"].tolist() == want_parameters
            want = np.zeros((len(f["basis"]), 3**rank))
            for k, row in enumerate(f["basis"]):
                for i, v in row:
                    want[k, i] = v
            assert np.allclose(form["basis"], want, atol=1e-9)
