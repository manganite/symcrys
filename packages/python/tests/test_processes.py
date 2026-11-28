"""The package in several processes: one engine per process, behind one lock (``_engine``). A child
made by ``spawn`` starts its own engine, a child made by ``fork`` inherits the parent's."""

import multiprocessing
import queue
import subprocess
import sys
import textwrap
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
def test_a_fork_while_another_thread_calls_the_engine_gives_a_child_that_can_call_it() -> None:
    symcrys.operations("m-3m")
    held = threading.Event()

    def call_in_progress() -> None:
        # As a call does: the lock is held while the engine runs, here for a second.
        with _engine._held():
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


def run_alone(code: str) -> subprocess.CompletedProcess[str]:
    """A script in a fresh interpreter, ended after 30 s: a hang of the fork cannot block the tests."""
    return subprocess.run(
        [sys.executable, "-c", textwrap.dedent(code)], capture_output=True, text=True, timeout=30, check=False
    )


@pytest.mark.skipif(not FORK, reason="no fork on this platform")
def test_a_fork_interrupted_while_it_waits_leaves_the_parent_its_lock() -> None:
    # Ctrl-C while the fork waits for the call of another thread: the hook that waits raises, Python
    # forks without it, and the parent must keep the lock of the thread that calls (not release it
    # under that thread), and the child gets an engine of its own.
    result = run_alone("""
        import os, signal, threading, time
        import symcrys
        from symcrys import _engine
        symcrys.operations("m-3m")
        held, release = threading.Event(), threading.Event()
        errors = []
        def call_in_progress():
            try:
                with _engine._held():
                    held.set()
                    release.wait(5)
            except Exception as e:
                errors.append(repr(e))
        thread = threading.Thread(target=call_in_progress)
        thread.start()
        held.wait(5)
        def interrupt(signum, frame):
            raise KeyboardInterrupt
        signal.signal(signal.SIGALRM, interrupt)
        signal.setitimer(signal.ITIMER_REAL, 0.3)
        pid = os.fork()
        if pid == 0:
            os._exit(0 if len(symcrys.operations("4mm")) == 8 else 3)
        still_held = _engine._lock.locked()
        release.set()
        thread.join()
        _, status = os.waitpid(pid, 0)
        print(still_held, errors, os.waitstatus_to_exitcode(status))
    """)
    assert result.returncode == 0, result.stderr
    assert result.stdout.split("\n")[-2] == "True [] 0"


@pytest.mark.skipif(not FORK, reason="no fork on this platform")
def test_a_fork_from_a_signal_handler_during_a_call_of_the_same_thread_does_not_hang() -> None:
    # A handler that forks runs between two steps of the thread that holds the lock: the fork must not
    # wait for that thread (itself), and the child gets an engine of its own.
    result = run_alone("""
        import os, signal
        import symcrys
        from symcrys import _engine
        symcrys.operations("m-3m")
        children = []
        def fork_now(signum, frame):
            pid = os.fork()
            if pid == 0:
                os._exit(0 if len(symcrys.operations("4mm")) == 8 else 3)
            children.append(pid)
        signal.signal(signal.SIGUSR1, fork_now)
        with _engine._held():
            signal.raise_signal(signal.SIGUSR1)
        _, status = os.waitpid(children[0], 0)
        print(os.waitstatus_to_exitcode(status), len(symcrys.operations("6/mmm")))
    """)
    assert result.returncode == 0, result.stderr
    assert result.stdout.split("\n")[-2] == "0 24"
