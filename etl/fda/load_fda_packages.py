import sys
from library.db import get_connection
from library.models import FdaPackage


def main():
    pass


def load_fda_packages(records: list[FdaPackage]) -> int:
    print(f"\nLoading {len(records)} FDA packages...\n")
    try:
        with get_connection() as conn:
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
                                record.loaded_at,
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
                        "NdcPackageCode" = EXCLUDED."NdcPackageCode",
                        "PackageDescription" = EXCLUDED."PackageDescription",
                        "StartMarketingDate" = EXCLUDED."StartMarketingDate",
                        "EndMarketingDate" = EXCLUDED."EndMarketingDate",
                        "NdcExcludeFlag" = EXCLUDED."NdcExcludeFlag",
                        "SamplePackage" = EXCLUDED."SamplePackage",
                        "NdcPackageCodeStripped" = EXCLUDED."NdcPackageCodeStripped",
                        "LoadedAt" = EXCLUDED."LoadedAt"
                """)
                upserted = cur.rowcount
            conn.commit()
    except Exception as e:
        print(f"\nFailed to load FDA packages: {e}\n")
        sys.exit()
    print(f"Successfully upserted {upserted} of {len(records)} FDA packages.")
    return upserted


if __name__ == "__main__":
    main()
