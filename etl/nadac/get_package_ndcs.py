import psycopg


def get_package_ndcs(conn: psycopg.Connection) -> set[str]:
    with conn.cursor() as cur:
        cur.execute("""SELECT DISTINCT "NdcPackageCodeStripped" FROM "FdaPackages" """)
        return {row[0] for row in cur.fetchall()}
