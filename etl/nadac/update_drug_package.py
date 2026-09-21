import psycopg


def update_drug_package(conn: psycopg.Connection) -> int:
    print("\nUpdating the drug package lookup table...\n")
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO "DrugPackages" ("Ndc", "NdcDescription")
            SELECT DISTINCT "Ndc", "NdcDescription"
            FROM "NadacPrices"
            ON CONFLICT ("Ndc") DO NOTHING;
        """)
        inserted = cur.rowcount

    print(f"Successfully inserted {inserted} records.")
    return inserted
