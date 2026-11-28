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
@pytest.mark.filterwarnings("ignore:This process .* is multi-threaded:DeprecationWarning")
def test_children_made_by_fork_use_the_engine_they_inherit() -> None:
    symcrys.operations("m-3m")  # the parent's engine runs before the fork
    with multiprocessing.get_context("fork").Pool(2) as pool:
        assert pool.map(order, ["m-3m", "4mm", "6/mmm"]) == [48, 8, 24]


@pytest.mark.skipif(not FORK, reason="no fork on this platform")
@pytest.mark.filterwarnings("ignore:This process .* is multi-threaded:DeprecationWarning")
@pytest.mark.xfail(strict=True, reason="#240: a fork while another thread calls the engine leaves the child its lock held")
def test_a_fork_while_another_thread_calls_the_engine_gives_a_child_that_can_call_it() -> None:
    symcrys.operations("m-3m")
    held, release = threading.Event(), threading.Event()

    def call_in_progress() -> None:
        # As a call does: the lock is held while the engine runs.
        with _engine._lock:
            held.set()
            release.wait(10)

    thread = threading.Thread(target=call_in_progress)
    thread.start()
    held.wait(10)
    context = multiprocessing.get_context("fork")
    results: Any = context.Queue()
    child = context.Process(target=order_into, args=(results, "4mm"))
    child.start()
    release.set()
    thread.join()
    child.join(10)
    finished = not child.is_alive()
    if not finished:
        child.kill()
        child.join()
    assert finished, "the child did not finish: it inherited the lock as held"
    try:
        assert results.get(timeout=5) == 8
    except queue.Empty:
        pytest.fail("the child gave no result")
