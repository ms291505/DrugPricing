from datetime import datetime

import psycopg


def tombstone_absent(conn: psycopg.Connection, run_ts: datetime) -> tuple[int, int]:
    print("\nTombstoning FDA records absent from this run...\n")
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE "FdaProducts" SET "DelistedAt" = %(run_ts)s
            WHERE "LoadedAt" < %(run_ts)s AND "DelistedAt" IS NULL
            """,
            {"run_ts": run_ts},
        )
        products = cur.rowcount

        cur.execute(
            """
            UPDATE "FdaPackages" SET "DelistedAt" = %(run_ts)s
            WHERE "LoadedAt" < %(run_ts)s AND "DelistedAt" IS NULL
            """,
            {"run_ts": run_ts},
        )
        packages = cur.rowcount

    print(f"Delisted {products} FDA products and {packages} FDA packages.")
    return products, packages
