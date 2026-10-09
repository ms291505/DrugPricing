from datetime import date, datetime, timezone
from decimal import Decimal
from enum import Enum

from pydantic import BaseModel, SecretStr

from library.parsing import (
    FDA_DATE_FORMAT,
    NADAC_DATE_FORMAT,
    is_missing,
    parse_date,
    split_values,
    str_or_empty,
    str_or_none,
)


class Environment(BaseModel):
    mode: str
    nadac_file_dates: list[str]
    nadac_filter_before_insert: bool
    database_url: SecretStr


class NadacPricingUnit(str, Enum):
    EA = "EA"
    ML = "ML"
    GM = "GM"


class NadacExplanationCode(int, Enum):
    CALCULATED_FROM_SURVEY = 1
    CARRIED_FORWARD_WITHIN_TWO_PERCENT = 2
    ADJUSTED_FROM_PUBLISHED_PRICING = 3
    CARRIED_FORWARD = 4
    CALCULATED_BY_PACKAGE_SIZE = 5
    SIN_DESIGNATION_NOT_APPLIED = 6


class NadacClassification(str, Enum):
    G = "G"
    B = "B"
    B_ANDA = "B-ANDA"
    B_BIO = "B-BIO"


class NadacPrice(BaseModel):
    ndc_description: str
    ndc: str
    nadac_per_unit: Decimal
    effective_date: date
    pricing_unit: NadacPricingUnit
    pharmacy_type_indicator: str
    is_otc: bool
    explanation_code: list[NadacExplanationCode] = []
    classification_for_rate_setting: NadacClassification
    corresponding_generic_nadac_per_unit: Decimal | None = None
    corresponding_generic_effective_date: date | None = None
    as_of_date: date
    loaded_at: datetime = datetime.now(timezone.utc)

    @classmethod
    def from_cms_row(cls, row) -> "NadacPrice":
        return cls(
            ndc_description=row["NDC Description"],
            ndc=str(row["NDC"]),
            nadac_per_unit=row["NADAC Per Unit"],
            effective_date=parse_date(row["Effective Date"], NADAC_DATE_FORMAT),
            pricing_unit=row["Pricing Unit"].strip(),
            pharmacy_type_indicator=str_or_empty(row["Pharmacy Type Indicator"]),
            is_otc=row["OTC"] == "Y",
            explanation_code=[
                NadacExplanationCode(int(code.strip()))
                for code in str(row["Explanation Code"]).split(",")
            ],
            classification_for_rate_setting=row[
                "Classification for Rate Setting"
            ].strip(),
            corresponding_generic_nadac_per_unit=None
            if is_missing(row["Corresponding Generic Drug NADAC Per Unit"])
            else row["Corresponding Generic Drug NADAC Per Unit"],
            corresponding_generic_effective_date=parse_date(
                row["Corresponding Generic Drug Effective Date"], NADAC_DATE_FORMAT
            ),
            as_of_date=parse_date(row["As of Date"], NADAC_DATE_FORMAT),
        )


class NadacImport(BaseModel):
    as_of_date: date
    source_url: str
    record_count: int
    loaded_at: datetime


class NdcExcludeFlag(str, Enum):
    E = "E"
    U = "U"
    I = "I"
    D = "D"
    N = "N"
    Y = "Y"


class FdaPackage(BaseModel):
    product_id: str
    product_ndc: str
    ndc_package_code: str
    package_description: str
    start_marketing_date: date
    end_marketing_date: date | None
    ndc_exclude_flag: NdcExcludeFlag
    sample_package: bool
    ndc_package_code_stripped: str

    @classmethod
    def from_fda_row(cls, row) -> "FdaPackage":
        return cls(
            product_id=row["PRODUCTID"],
            product_ndc=row["PRODUCTNDC"],
            ndc_package_code=row["NDCPACKAGECODE"],
            package_description=row["PACKAGEDESCRIPTION"],
            start_marketing_date=parse_date(
                row["STARTMARKETINGDATE"], FDA_DATE_FORMAT
            ),
            end_marketing_date=parse_date(row["ENDMARKETINGDATE"], FDA_DATE_FORMAT),
            ndc_exclude_flag=row["NDC_EXCLUDE_FLAG"].strip(),
            sample_package=row["SAMPLE_PACKAGE"] == "Y",
            ndc_package_code_stripped=cls.normalize_to_match_nadac(
                row["NDCPACKAGECODE"]
            ),
        )

    @staticmethod
    def normalize_to_match_nadac(ndc_package_code: str) -> str:
        labeler, product, package = ndc_package_code.split("-")
        padded = labeler.zfill(5) + product.zfill(4) + package.zfill(2)
        return padded.lstrip("0")


class FdaProduct(BaseModel):
    product_id: str
    product_ndc: str
    product_type_name: str
    proprietary_name: str
    proprietary_name_suffix: str | None
    non_proprietary_name: list[str] = []
    dosage_form_name: str
    route_name: list[str] = []
    start_marketing_date: date
    end_marketing_date: date | None
    marketing_category_name: str
    application_number: str | None
    labeler_name: str
    substance_name: list[str] = []
    strength_number: list[str] = []
    strength_unit: list[str] = []
    pharm_classes: list[str] = []
    dea_schedule: str | None
    ndc_exclude_flag: NdcExcludeFlag | None
    listing_record_certified_through: date | None

    @classmethod
    def from_fda_row(cls, row) -> "FdaProduct":
        return cls(
            product_id=row["PRODUCTID"],
            product_ndc=row["PRODUCTNDC"],
            product_type_name=row["PRODUCTTYPENAME"],
            proprietary_name=str_or_empty(row["PROPRIETARYNAME"]),
            proprietary_name_suffix=str_or_none(row["PROPRIETARYNAMESUFFIX"]),
            non_proprietary_name=split_values(row["NONPROPRIETARYNAME"]),
            dosage_form_name=row["DOSAGEFORMNAME"],
            route_name=split_values(row["ROUTENAME"]),
            start_marketing_date=parse_date(
                row["STARTMARKETINGDATE"], FDA_DATE_FORMAT
            ),
            end_marketing_date=parse_date(row["ENDMARKETINGDATE"], FDA_DATE_FORMAT),
            marketing_category_name=row["MARKETINGCATEGORYNAME"],
            application_number=str_or_none(row["APPLICATIONNUMBER"]),
            labeler_name=row["LABELERNAME"],
            substance_name=split_values(row["SUBSTANCENAME"]),
            strength_number=split_values(row["ACTIVE_NUMERATOR_STRENGTH"]),
            strength_unit=split_values(row["ACTIVE_INGRED_UNIT"]),
            pharm_classes=split_values(row["ACTIVE_INGRED_UNIT"]),
            dea_schedule=str_or_none(row["DEASCHEDULE"]),
            ndc_exclude_flag=row["NDC_EXCLUDE_FLAG"].strip(),
            listing_record_certified_through=parse_date(
                row["LISTING_RECORD_CERTIFIED_THROUGH"], FDA_DATE_FORMAT
            ),
        )
