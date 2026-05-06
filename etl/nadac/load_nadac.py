import sys
from library.db import get_connection
from library.models import NadacPrice

# TODO: Move SQL to their own files.

def load_nadac(records: list[NadacPrice]) -> int:
    print(f"\nLoading {len(records)} NADAC records...\n")
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    CREATE TEMP TABLE staging_nadac_prices 
                    (LIKE "NadacPrices" INCLUDING ALL EXCLUDING INDEXES)
                    ON COMMIT DROP
                """)
                with cur.copy("""
                    COPY staging_nadac_prices (
                        "NdcDescription",
                        "Ndc",
                        "NadacPerUnit",
                        "EffectiveDate",
                        "PricingUnit",
                        "PharmacyTypeIndicator",
                        "IsOtc",
                        "ExplanationCode",
                        "ClassificationForRateSetting",
                        "CorrespondingGenericNadacPerUnit",
                        "CorrespondingGenericEffectiveDate",
                        "AsOfDate",
                        "LoadedAt"
                    ) FROM STDIN
                """) as copy:
                    for record in records:
                        copy.write_row((
                            record.ndc_description,
                            record.ndc,
                            record.nadac_per_unit,
                            record.effective_date,
                            record.pricing_unit.value,
                            record.pharmacy_type_indicator,
                            record.is_otc,
                            [e.value for e in record.explanation_code],
                            record.classification_for_rate_setting.value,
                            record.corresponding_generic_nadac_per_unit,
                            record.corresponding_generic_effective_date,
                            record.as_of_date,
                            record.loaded_at
                        ))
                cur.execute("""
                    INSERT INTO "NadacPrices" (
                        "NdcDescription",
                        "Ndc",
                        "NadacPerUnit",
                        "EffectiveDate",
                        "PricingUnit",
                        "PharmacyTypeIndicator",
                        "IsOtc",
                        "ExplanationCode",
                        "ClassificationForRateSetting",
                        "CorrespondingGenericNadacPerUnit",
                        "CorrespondingGenericEffectiveDate",
                        "AsOfDate",
                        "LoadedAt"
                    )
                    SELECT
                        "NdcDescription",
                        "Ndc",
                        "NadacPerUnit",
                        "EffectiveDate",
                        "PricingUnit",
                        "PharmacyTypeIndicator",
                        "IsOtc",
                        "ExplanationCode",
                        "ClassificationForRateSetting",
                        "CorrespondingGenericNadacPerUnit",
                        "CorrespondingGenericEffectiveDate",
                        "AsOfDate",
                        "LoadedAt"
                    FROM staging_nadac_prices
                    ON CONFLICT ("Ndc", "EffectiveDate", "AsOfDate") DO NOTHING
                """)
                inserted = cur.rowcount
            conn.commit()
    except Exception as e:
        print(f"\nFailed to load NADAC records: {e}\n")
        sys.exit()
    print(f"Successfully inserted {inserted} of {len(records)} records.")
    return inserted
