from datetime import date, datetime, timezone
from enum import Enum
from decimal import Decimal
from pydantic import BaseModel
import pandas as pd


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
            effective_date=pd.to_datetime(row["Effective Date"]).date(),
            pricing_unit=row["Pricing Unit"].strip(),
            pharmacy_type_indicator=""
            if pd.isna(row["Pharmacy Type Indicator"])
            else row["Pharmacy Type Indicator"],
            is_otc=row["OTC"] == "Y",
            explanation_code=[
                NadacExplanationCode(int(code.strip()))
                for code in str(row["Explanation Code"]).split(",")
            ],
            classification_for_rate_setting=row[
                "Classification for Rate Setting"
            ].strip(),
            corresponding_generic_nadac_per_unit=None
            if pd.isna(row["Corresponding Generic Drug NADAC Per Unit"])
            else row["Corresponding Generic Drug NADAC Per Unit"],
            corresponding_generic_effective_date=None
            if pd.isna(row["Corresponding Generic Drug Effective Date"])
            else pd.to_datetime(
                row["Corresponding Generic Drug Effective Date"]
            ).date(),
            as_of_date=pd.to_datetime(row["As of Date"]).date(),
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
    loaded_at: datetime = datetime.now(timezone.utc)

    @classmethod
    def from_fda_row(cls, row) -> "FdaPackage":
        return cls(
            product_id=row["PRODUCTID"],
            product_ndc=row["PRODUCTNDC"],
            ndc_package_code=row["NDCPACKAGECODE"],
            package_description=row["PACKAGEDESCRIPTION"],
            start_marketing_date=pd.to_datetime(row["STARTMARKETINGDATE"]).date(),
            end_marketing_date=None
            if pd.isna(row["ENDMARKETINGDATE"])
            else pd.to_datetime(row["ENDMARKETINGDATE"]).date(),
            ndc_exclude_flag=row["NDC_EXCLUDE_FLAG"].strip(),
            sample_package=row["SAMPLE_PACKAGE"] == "Y",
            ndc_package_code_stripped=row["NDCPACKAGECODE"]
            .replace("-", "")
            .lstrip("0"),
        )


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
    loaded_at: datetime = datetime.now(timezone.utc)

    @classmethod
    def from_fda_row(cls, row) -> "FdaProduct":
        return cls(
            product_id=row["PRODUCTID"],
            product_ndc=row["PRODUCTNDC"],
            product_type_name=row["PRODUCTTYPENAME"],
            proprietary_name=""
            if pd.isna(row["PROPRIETARYNAME"])
            else row["PROPRIETARYNAME"],
            proprietary_name_suffix=None
            if pd.isna(row["PROPRIETARYNAMESUFFIX"])
            else row["PROPRIETARYNAMESUFFIX"],
            non_proprietary_name=[]
            if pd.isna(row["NONPROPRIETARYNAME"])
            else [name.strip() for name in row["NONPROPRIETARYNAME"].split(";")],
            dosage_form_name=row["DOSAGEFORMNAME"],
            route_name=[]
            if pd.isna(row["ROUTENAME"])
            else [name.strip() for name in row["ROUTENAME"].split(";")],
            start_marketing_date=pd.to_datetime(row["STARTMARKETINGDATE"]).date(),
            end_marketing_date=None
            if pd.isna(row["ENDMARKETINGDATE"])
            else pd.to_datetime(row["ENDMARKETINGDATE"]).date(),
            marketing_category_name=row["MARKETINGCATEGORYNAME"],
            application_number=None
            if pd.isna(row["APPLICATIONNUMBER"])
            else row["APPLICATIONNUMBER"],
            labeler_name=row["LABELERNAME"],
            substance_name=[]
            if pd.isna(row["SUBSTANCENAME"])
            else [name.strip() for name in row["SUBSTANCENAME"].split(";")],
            strength_number=[]
            if pd.isna(row["ACTIVE_NUMERATOR_STRENGTH"])
            else [
                number.strip() for number in row["ACTIVE_NUMERATOR_STRENGTH"].split(";")
            ],
            strength_unit=[]
            if pd.isna(row["ACTIVE_INGRED_UNIT"])
            else [unit.strip() for unit in row["ACTIVE_INGRED_UNIT"].split(";")],
            pharm_classes=[]
            if pd.isna(row["ACTIVE_INGRED_UNIT"])
            else [
                pharm_class.strip()
                for pharm_class in row["ACTIVE_INGRED_UNIT"].split(";")
            ],
            dea_schedule=None if pd.isna(row["DEASCHEDULE"]) else row["DEASCHEDULE"],
            ndc_exclude_flag=row["NDC_EXCLUDE_FLAG"].strip(),
            listing_record_certified_through=None
            if pd.isna(row["LISTING_RECORD_CERTIFIED_THROUGH"])
            else pd.to_datetime(row["LISTING_RECORD_CERTIFIED_THROUGH"]).date(),
        )
