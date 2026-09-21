from datetime import date

import psycopg

# TODO: Move SQL to it's own file.


def get_loaded_as_of_dates(conn: psycopg.Connection) -> set[date]:
    with conn.cursor() as cur:
        cur.execute("""SELECT DISTINCT "AsOfDate" FROM "NadacPrices" """)
        return {row[0] for row in cur.fetchall()}
