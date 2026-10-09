import math
from collections.abc import Iterator
from datetime import date, datetime

import pandas as pd

# Source date formats. Parsing with an explicit format is ~30x faster than
# pd.to_datetime on a scalar, which re-guesses the format on every call.
# strptime's %m and %d also accept unpadded values, e.g. "1/12/2022".
FDA_DATE_FORMAT = "%Y%m%d"
NADAC_DATE_FORMAT = "%m/%d/%Y"


# Only a real blank (None or NaN) counts as missing. Any other unexpected value
# is passed through so strptime, str.split, or Pydantic raises on it.
def is_missing(value) -> bool:
    return value is None or (isinstance(value, float) and math.isnan(value))


def parse_date(value, fmt: str) -> date | None:
    return None if is_missing(value) else datetime.strptime(value, fmt).date()


def split_values(value) -> list[str]:
    return [] if is_missing(value) else [part.strip() for part in value.split(";")]


def str_or_none(value) -> str | None:
    return None if is_missing(value) else value


def str_or_empty(value) -> str:
    return "" if is_missing(value) else value


# Yields one row dict at a time; to_dict("records") would build them all up front.
def iter_records(df: pd.DataFrame) -> Iterator[dict]:
    columns = list(df.columns)
    for values in df.itertuples(index=False, name=None):
        yield dict(zip(columns, values))
