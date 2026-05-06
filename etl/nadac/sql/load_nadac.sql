-- TODO: Update or delete.

COPY "NadacPrices" (
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
