from datetime import datetime

import psycopg

from library.models import FdaProduct


def clinical_signature(record: FdaProduct) -> tuple:
    ingredients = sorted(zip(record.substance_name, record.strength_number))
    return (record.dosage_form_name, record.product_type_name, tuple(ingredients))


def log_clinical_conflicts(records: list[FdaProduct]) -> list[str]:
    by_ndc: dict[str, list[FdaProduct]] = {}
    for record in records:
        by_ndc.setdefault(record.product_ndc, []).append(record)

    conflicted = [
        ndc
        for ndc, group in by_ndc.items()
        if len({clinical_signature(record) for record in group}) > 1
    ]

    if not conflicted:
        print("No clinically conflicting ProductNdc groups found.")
        return conflicted

    print(
        f"\nWARNING: {len(conflicted)} ProductNdc groups disagree on clinical fields "
        f"and will be merged to the latest StartMarketingDate."
    )
    for ndc in conflicted[:5]:
        names = ", ".join(sorted({record.proprietary_name for record in by_ndc[ndc]}))
        print(f"  {ndc}: {names}")

    return conflicted


def load_fda_products(
    conn: psycopg.Connection, records: list[FdaProduct], run_ts: datetime
) -> int:
    print(f"\nLoading {len(records)} FDA products...\n")

    log_clinical_conflicts(records)

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
                copy.write_row(
                    (
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
                        run_ts,
                    )
                )
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
            SELECT DISTINCT ON ("ProductNdc")
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
            ORDER BY "ProductNdc", "StartMarketingDate" DESC NULLS LAST, "ProductId"
            ON CONFLICT ("ProductNdc") DO UPDATE SET
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
                "LoadedAt" = EXCLUDED."LoadedAt",
                "DelistedAt" = NULL
        """)
        upserted = cur.rowcount

    print(f"Successfully upserted {upserted} of {len(records)} FDA products.")
    return upserted
