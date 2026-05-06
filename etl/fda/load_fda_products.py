import sys
from library.db import get_connection
from library.models import FdaProduct


def main():
    pass


def load_fda_products(records: list[FdaProduct]) -> int:
    print(f"\nLoading {len(records)} FDA products...\n")
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    CREATE TEMP TABLE staging_fda_products
                    (LIKE "FdaProducts" INCLUDING ALL EXCLUDING INDEXES)
                    ON COMMIT DROP
                """)
                with cur.copy("""
                    COPY staging_fda_products (
                        "ProductId",
                        "ProductNdc",
                        "ProductTypeName",
                        "ProprietaryName",
                        "ProprietaryNameSuffix",
                        "NonProprietaryName",
                        "DosageFormName",
                        "RouteName",
                        "StartMarketingDate",
                        "EndMarketingDate",
                        "MarketingCategoryName",
                        "ApplicationNumber",
                        "LabelerName",
                        "SubstanceName",
                        "StrengthNumber",
                        "StrengthUnit",
                        "PharmClasses",
                        "DeaSchedule",
                        "ListingRecordCertifiedThrough",
                        "LoadedAt"
                    ) FROM STDIN
                """) as copy:
                    for record in records:
                        copy.write_row((
                            record.product_id,
                            record.product_ndc,
                            record.product_type_name,
                            record.proprietary_name,
                            record.proprietary_name_suffix,
                            record.non_proprietary_name,
                            record.dosage_form_name,
                            record.route_name,
                            record.start_marketing_date,
                            record.end_marketing_date,
                            record.marketing_category_name,
                            record.application_number,
                            record.labeler_name,
                            record.substance_name,
                            record.strength_number,
                            record.strength_unit,
                            record.pharm_classes,
                            record.dea_schedule,
                            record.listing_record_certified_through,
                            record.loaded_at
                        ))
                cur.execute("""
                    INSERT INTO "FdaProducts" (
                        "ProductId",
                        "ProductNdc",
                        "ProductTypeName",
                        "ProprietaryName",
                        "ProprietaryNameSuffix",
                        "NonProprietaryName",
                        "DosageFormName",
                        "RouteName",
                        "StartMarketingDate",
                        "EndMarketingDate",
                        "MarketingCategoryName",
                        "ApplicationNumber",
                        "LabelerName",
                        "SubstanceName",
                        "StrengthNumber",
                        "StrengthUnit",
                        "PharmClasses",
                        "DeaSchedule",
                        "ListingRecordCertifiedThrough",
                        "LoadedAt"
                    )
                    SELECT
                        "ProductId",
                        "ProductNdc",
                        "ProductTypeName",
                        "ProprietaryName",
                        "ProprietaryNameSuffix",
                        "NonProprietaryName",
                        "DosageFormName",
                        "RouteName",
                        "StartMarketingDate",
                        "EndMarketingDate",
                        "MarketingCategoryName",
                        "ApplicationNumber",
                        "LabelerName",
                        "SubstanceName",
                        "StrengthNumber",
                        "StrengthUnit",
                        "PharmClasses",
                        "DeaSchedule",
                        "ListingRecordCertifiedThrough",
                        "LoadedAt"
                    FROM staging_fda_products
                    ON CONFLICT ("ProductId") DO UPDATE SET
                        "ProductId" = EXCLUDED."ProductId",
                        "ProductTypeName" = EXCLUDED."ProductTypeName",
                        "ProprietaryName" = EXCLUDED."ProprietaryName",
                        "ProprietaryNameSuffix" = EXCLUDED."ProprietaryNameSuffix",
                        "NonProprietaryName" = EXCLUDED."NonProprietaryName",
                        "DosageFormName" = EXCLUDED."DosageFormName",
                        "RouteName" = EXCLUDED."RouteName",
                        "StartMarketingDate" = EXCLUDED."StartMarketingDate",
                        "EndMarketingDate" = EXCLUDED."EndMarketingDate",
                        "MarketingCategoryName" = EXCLUDED."MarketingCategoryName",
                        "ApplicationNumber" = EXCLUDED."ApplicationNumber",
                        "LabelerName" = EXCLUDED."LabelerName",
                        "SubstanceName" = EXCLUDED."SubstanceName",
                        "StrengthNumber" = EXCLUDED."StrengthNumber",
                        "StrengthUnit" = EXCLUDED."StrengthUnit",
                        "PharmClasses" = EXCLUDED."PharmClasses",
                        "DeaSchedule" = EXCLUDED."DeaSchedule",
                        "ListingRecordCertifiedThrough" = EXCLUDED."ListingRecordCertifiedThrough",
                        "LoadedAt" = EXCLUDED."LoadedAt"
                """)
                upserted = cur.rowcount
            conn.commit()
    except Exception as e:
        print(f"\nFailed to load FDA products: {e}\n")
        sys.exit()
    print(f"Successfully upserted {upserted} of {len(records)} FDA products.")
    return upserted


if __name__ == "__main__":
    main()
