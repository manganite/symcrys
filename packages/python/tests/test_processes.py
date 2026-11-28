"""The package in several processes: one engine per process, behind one lock (``_engine``). A child
made by ``spawn`` starts its own engine, a child made by ``fork`` inherits the parent's."""

import multiprocessing
import queue
import threading
from typing import Any

import pytest

import symcrys
from symcrys import _engine

FORK = "fork" in multiprocessing.get_all_start_methods()


def order(key: str) -> int:
    return len(symcrys.operations(key))


def order_into(results: Any, key: str) -> None:
    results.put(order(key))


def test_children_made_by_spawn_have_their_own_engine() -> None:
    with multiprocessing.get_context("spawn").Pool(2) as pool:
        assert pool.map(order, ["m-3m", "4mm", "6/mmm"]) == [48, 8, 24]


@pytest.mark.skipif(not FORK, reason="no fork on this platform")
def test_children_made_by_fork_use_the_engine_they_inherit() -> None:
    symcrys.operations("m-3m")  # the parent's engine runs before the fork
    with multiprocessing.get_context("fork").Pool(2) as pool:
        assert pool.map(order, ["m-3m", "4mm", "6/mmm"]) == [48, 8, 24]


@pytest.mark.skipif(not FORK, reason="no fork on this platform")
@pytest.mark.filterwarnings("ignore:This process .* is multi-threaded:DeprecationWarning")
@pytest.mark.xfail(
    strict=True,
    raises=AssertionError,
    reason="#240: a fork while another thread calls the engine leaves the child its lock held",
)
def test_a_fork_while_another_thread_calls_the_engine_gives_a_child_that_can_call_it() -> None:
    symcrys.operations("m-3m")
    held = threading.Event()

    def call_in_progress() -> None:
        # As a call does: the lock is held while the engine runs, here for a second.
        with _engine._lock:
            held.set()
            threading.Event().wait(1)

    thread = threading.Thread(target=call_in_progress)
    thread.start()
    try:
        assert held.wait(10), "the thread did not take the lock"
        context = multiprocessing.get_context("fork")
        results: Any = context.Queue()
        child = context.Process(target=order_into, args=(results, "4mm"))
        child.start()
        child.join(5)
        finished = not child.is_alive()
        if not finished:
            child.kill()
            child.join()
    finally:
        thread.join()
    assert finished, "the child did not finish: it inherited the lock as held"
    if child.exitcode != 0:
        pytest.fail(f"the child ended with {child.exitcode}")
    try:
        answer = results.get(timeout=5)
    except queue.Empty:
        pytest.fail("the child gave no result")
    assert answer == 8
