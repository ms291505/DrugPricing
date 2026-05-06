from library.db import get_connection
from datetime import date

# TODO: Move SQL to it's own file.


def get_loaded_as_of_dates() -> set[date]:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""SELECT DISTINCT "AsOfDate" FROM "NadacPrices" """)
            return {row[0] for row in cur.fetchall()}
