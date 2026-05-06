import pytest
from unittest.mock import patch, Mock
import pandas as pd
from nadac.parse_nadac import parse_nadac
from nadac.fetch_nadac import fetch_nadac
from library.models import NadacClassification, NadacPricingUnit

def test_parse_single_row():
    df = pd.DataFrame([{
        "NDC Description": "12HR NASAL DECONGEST ER 120 MG",
        "NDC": "24385005452",
        "NADAC Per Unit": 0.28683,
        "Effective Date": "12/18/2024",
        "Pricing Unit": "EA",
        "Pharmacy Type Indicator": "C/I",
        "OTC": "Y",
        "Explanation Code": "1",
        "Classification for Rate Setting": "G",
        "Corresponding Generic Drug NADAC Per Unit": None,
        "Corresponding Generic Drug Effective Date": None,
        "As of Date": "01/01/2025"
    }])

    records = parse_nadac(df)

    assert len(records) == 1
    assert records[0].ndc == "24385005452"
    assert records[0].is_otc == True
    assert records[0].pricing_unit == NadacPricingUnit.EA
    assert records[0].classification_for_rate_setting == NadacClassification.G

def test_parse_multiple_explanation_codes():
    df = pd.DataFrame([{
        "NDC Description": "24H NASAL ALLERGY 55 MCG SPRAY",
        "NDC": "46122038576",
        "NADAC Per Unit": 0.72316,
        "Effective Date": "12/18/2024",
        "Pricing Unit": "ML",
        "Pharmacy Type Indicator": "C/I",
        "OTC": "Y",
        "Explanation Code": "1, 5",
        "Classification for Rate Setting": "G",
        "Corresponding Generic Drug NADAC Per Unit": None,
        "Corresponding Generic Drug Effective Date": None,
        "As of Date": "01/01/2025"
    }])

    records = parse_nadac(df)

    assert len(records[0].explanation_code) == 2

def test_fetch_fails_on_bad_status_code():
    with patch("nadac.fetch_nadac.requests.get") as mock_get:
        mock_get.return_value = Mock(status_code=404)
        with pytest.raises(SystemExit):
            fetch_nadac("http://fake-url.com")

def test_fetch_fails_on_empty_response():
    with patch("nadac.fetch_nadac.requests.get") as mock_get:
        mock_get.return_value = Mock(status_code=200, text="")
        with pytest.raises(SystemExit):
            fetch_nadac("http://fake-url.com")
