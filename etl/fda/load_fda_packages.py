from datetime import datetime

import psycopg

from library.models import FdaPackage


def load_fda_packages(
    conn: psycopg.Connection, records: list[FdaPackage], run_ts: datetime
) -> int:
    print(f"\nLoading {len(records)} FDA packages...\n")
    with conn.cursor() as cur:
        cur.execute("""
            CREATE TEMP TABLE staging_fda_packages
            (LIKE "FdaPackages" INCLUDING ALL EXCLUDING INDEXES)
            ON COMMIT DROP
        """)
        with cur.copy("""
            COPY staging_fda_packages (
                "ProductId",
                "ProductNdc",
                "NdcPackageCode",
                "PackageDescription",
                "StartMarketingDate",
                "EndMarketingDate",
                "NdcExcludeFlag",
                "SamplePackage",
                "NdcPackageCodeStripped",
                "LoadedAt"
            ) FROM STDIN
        """) as copy:
            for record in records:
                copy.write_row(
                    (
                        record.product_id,
                        record.product_ndc,
                        record.ndc_package_code,
                        record.package_description,
                        record.start_marketing_date,
                        record.end_marketing_date,
                        record.ndc_exclude_flag,
                        record.sample_package,
                        record.ndc_package_code_stripped,
                        run_ts,
                    )
                )
        cur.execute("""
            INSERT INTO "FdaPackages" (
                "ProductId",
                "ProductNdc",
                "NdcPackageCode",
                "PackageDescription",
                "StartMarketingDate",
                "EndMarketingDate",
                "NdcExcludeFlag",
                "SamplePackage",
                "NdcPackageCodeStripped",
                "LoadedAt"
            )
            SELECT DISTINCT ON ("NdcPackageCode")
                "ProductId",
                "ProductNdc",
                "NdcPackageCode",
                "PackageDescription",
                "StartMarketingDate",
                "EndMarketingDate",
                "NdcExcludeFlag",
                "SamplePackage",
                "NdcPackageCodeStripped",
                "LoadedAt"
            FROM staging_fda_packages
            ON CONFLICT ("NdcPackageCode") DO UPDATE SET
                "ProductId" = EXCLUDED."ProductId",
                "ProductNdc" = EXCLUDED."ProductNdc",
                "PackageDescription" = EXCLUDED."PackageDescription",
                "StartMarketingDate" = EXCLUDED."StartMarketingDate",
                "EndMarketingDate" = EXCLUDED."EndMarketingDate",
                "NdcExcludeFlag" = EXCLUDED."NdcExcludeFlag",
                "SamplePackage" = EXCLUDED."SamplePackage",
                "NdcPackageCodeStripped" = EXCLUDED."NdcPackageCodeStripped",
                "LoadedAt" = EXCLUDED."LoadedAt",
                "DelistedAt" = NULL
        """)
        upserted = cur.rowcount

    print(f"Successfully upserted {upserted} of {len(records)} FDA packages.")
    return upserted
