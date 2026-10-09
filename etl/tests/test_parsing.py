from datetime import date

import pandas as pd
import pytest

from library.parsing import (
    NADAC_DATE_FORMAT,
    is_missing,
    iter_records,
    parse_date,
    split_values,
    str_or_none,
)
from library.timing import timed


def test_is_missing_only_for_real_blanks():
    assert is_missing(None)
    assert is_missing(float("nan"))
    assert not is_missing("")
    assert not is_missing(0)
    assert not is_missing(pd.Timestamp("2024-01-01"))


def test_unexpected_types_raise_instead_of_blanking():
    with pytest.raises(TypeError):
        parse_date(pd.Timestamp("2024-01-01"), NADAC_DATE_FORMAT)
    with pytest.raises(AttributeError):
        split_values(12345)
    assert str_or_none(12345) == 12345


def test_nadac_date_accepts_unpadded_month():
    # The 12-28-2022 NADAC file has "1/12/2022" in As of Date.
    assert parse_date("1/12/2022", NADAC_DATE_FORMAT) == date(2022, 1, 12)


def test_iter_records_yields_row_dicts_with_blanks_as_missing():
    frame = pd.DataFrame({"a": ["x", None], "b": ["1", "2"]}, dtype=str)
    rows = list(iter_records(frame))

    assert rows[0] == {"a": "x", "b": "1"}
    assert rows[1]["b"] == "2"
    assert is_missing(rows[1]["a"])


def test_timed_reports_status(capsys):
    with timed("works"):
        pass
    with pytest.raises(RuntimeError):
        with timed("breaks"):
            raise RuntimeError("boom")

    out = capsys.readouterr().out
    assert "[timing] works:" in out and "(ok)" in out
    assert "[timing] breaks:" in out and "(failed)" in out
