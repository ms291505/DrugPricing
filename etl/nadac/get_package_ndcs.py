from library.db import get_connection


def get_package_ndcs():
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """SELECT DISTINCT "NdcPackageCodeStripped" FROM "FdaPackages" """
            )
            return {row[0] for row in cur.fetchall()}
