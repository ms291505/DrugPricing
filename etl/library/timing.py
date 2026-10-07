import time
from contextlib import contextmanager


@contextmanager
def timed(label: str):
    start = time.perf_counter()
    try:
        yield
    finally:
        print(f"[timing] {label}: {time.perf_counter() - start:.1f}s")
