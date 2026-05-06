import sys
from library.db import get_connection


def update_drug_package():
    print("\nUpdating the drug package lookup table...\n")
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                INSERT INTO "DrugPackages" ("Ndc", "NdcDescription")
                SELECT DISTINCT "Ndc", "NdcDescription"
                FROM "NadacPrices"
                ON CONFLICT ("Ndc") DO NOTHING;
                            """)

                inserted = cur.rowcount
            conn.commit()
    except Exception as e:
        print(f"\nFailed to update lookup table: {e}\n")
        sys.exit()

    print(f"Successfully inserted {inserted} records.")
