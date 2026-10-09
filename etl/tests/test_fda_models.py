from datetime import date
from io import StringIO

import pandas as pd
import pytest
from pydantic import ValidationError

from fda.parse_fda_packages import parse_fda_packages
from fda.parse_fda_products import parse_fda_products
from library.models import FdaProduct, NdcExcludeFlag

PRODUCT_COLUMNS = [
    "PRODUCTID", "PRODUCTNDC", "PRODUCTTYPENAME", "PROPRIETARYNAME",
    "PROPRIETARYNAMESUFFIX", "NONPROPRIETARYNAME", "DOSAGEFORMNAME", "ROUTENAME",
    "STARTMARKETINGDATE", "ENDMARKETINGDATE", "MARKETINGCATEGORYNAME",
    "APPLICATIONNUMBER", "LABELERNAME", "SUBSTANCENAME", "ACTIVE_NUMERATOR_STRENGTH",
    "ACTIVE_INGRED_UNIT", "PHARM_CLASSES", "DEASCHEDULE", "NDC_EXCLUDE_FLAG",
    "LISTING_RECORD_CERTIFIED_THROUGH",
]

PACKAGE_COLUMNS = [
    "PRODUCTID", "PRODUCTNDC", "NDCPACKAGECODE", "PACKAGEDESCRIPTION",
    "STARTMARKETINGDATE", "ENDMARKETINGDATE", "NDC_EXCLUDE_FLAG", "SAMPLE_PACKAGE",
]


# Mirrors fetch_fda: tab-separated, every column read as str, blanks become NaN.
def to_frame(columns: list[str], *rows: dict) -> pd.DataFrame:
    lines = ["\t".join(columns)]
    lines += ["\t".join(row.get(column, "") for column in columns) for row in rows]
    return pd.read_csv(StringIO("\n".join(lines)), sep="\t", dtype=str)


FULL_PRODUCT = {
    "PRODUCTID": "0002-0213_abc",
    "PRODUCTNDC": "0002-0213",
    "PRODUCTTYPENAME": "HUMAN PRESCRIPTION DRUG",
    "PROPRIETARYNAME": "Humulin",
    "PROPRIETARYNAMESUFFIX": "R",
    "NONPROPRIETARYNAME": "insulin human; insulin",
    "DOSAGEFORMNAME": "INJECTION, SOLUTION",
    "ROUTENAME": "PARENTERAL; SUBCUTANEOUS",
    "STARTMARKETINGDATE": "19830627",
    "ENDMARKETINGDATE": "20261215",
    "MARKETINGCATEGORYNAME": "BLA",
    "APPLICATIONNUMBER": "BLA018780",
    "LABELERNAME": "Eli Lilly and Company",
    "SUBSTANCENAME": "INSULIN HUMAN",
    "ACTIVE_NUMERATOR_STRENGTH": "100",
    "ACTIVE_INGRED_UNIT": "[iU]/mL",
    "PHARM_CLASSES": "Insulin [CS], Insulin [EPC]",
    "DEASCHEDULE": "CII",
    "NDC_EXCLUDE_FLAG": "N",
    "LISTING_RECORD_CERTIFIED_THROUGH": "20271231",
}

REQUIRED_PRODUCT_ONLY = {
    key: FULL_PRODUCT[key]
    for key in [
        "PRODUCTID", "PRODUCTNDC", "PRODUCTTYPENAME", "DOSAGEFORMNAME",
        "STARTMARKETINGDATE", "MARKETINGCATEGORYNAME", "LABELERNAME",
        "NDC_EXCLUDE_FLAG",
    ]
}


def test_product_fully_populated():
    products = parse_fda_products(to_frame(PRODUCT_COLUMNS, FULL_PRODUCT)).fda_products
    product = products[0]

    assert product.proprietary_name == "Humulin"
    assert product.proprietary_name_suffix == "R"
    assert product.non_proprietary_name == ["insulin human", "insulin"]
    assert product.route_name == ["PARENTERAL", "SUBCUTANEOUS"]
    assert product.start_marketing_date == date(1983, 6, 27)
    assert product.end_marketing_date == date(2026, 12, 15)
    assert product.application_number == "BLA018780"
    assert product.substance_name == ["INSULIN HUMAN"]
    assert product.strength_number == ["100"]
    assert product.strength_unit == ["[iU]/mL"]
    assert product.dea_schedule == "CII"
    assert product.ndc_exclude_flag == NdcExcludeFlag.N
    assert product.listing_record_certified_through == date(2027, 12, 31)


def test_product_blank_optional_fields():
    frame = to_frame(PRODUCT_COLUMNS, REQUIRED_PRODUCT_ONLY)
    product = parse_fda_products(frame).fda_products[0]

    assert product.proprietary_name == ""
    assert product.proprietary_name_suffix is None
    assert product.non_proprietary_name == []
    assert product.route_name == []
    assert product.end_marketing_date is None
    assert product.application_number is None
    assert product.substance_name == []
    assert product.strength_number == []
    assert product.strength_unit == []
    assert product.pharm_classes == []
    assert product.dea_schedule is None
    assert product.listing_record_certified_through is None


def test_product_wrong_date_format_raises():
    row = {**FULL_PRODUCT, "STARTMARKETINGDATE": "1983-06-27"}
    with pytest.raises(ValueError):
        parse_fda_products(to_frame(PRODUCT_COLUMNS, row))


def test_product_unexpected_type_raises_instead_of_blanking():
    row = {column: FULL_PRODUCT.get(column) for column in PRODUCT_COLUMNS}
    row["APPLICATIONNUMBER"] = 12345
    with pytest.raises(ValidationError):
        FdaProduct.from_fda_row(row)


def test_package_parsing():
    frame = to_frame(
        PACKAGE_COLUMNS,
        {
            "PRODUCTID": "0002-0213_abc",
            "PRODUCTNDC": "0002-0213",
            "NDCPACKAGECODE": "0002-0213-01",
            "PACKAGEDESCRIPTION": "1 VIAL in 1 CARTON",
            "STARTMARKETINGDATE": "19830627",
            "NDC_EXCLUDE_FLAG": "N",
            "SAMPLE_PACKAGE": "N",
        },
    )
    package = parse_fda_packages(frame).fda_packages[0]

    assert package.start_marketing_date == date(1983, 6, 27)
    assert package.end_marketing_date is None
    assert package.sample_package is False
    assert package.ndc_package_code_stripped == "2021301"
