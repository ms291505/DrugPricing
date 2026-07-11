from nadac.fetch_nadac import fetch_nadac
from nadac.load_nadac import load_nadac
from nadac.parse_nadac import parse_nadac
from nadac.get_loaded_as_of_dates import get_loaded_as_of_dates
import pandas as pd
from nadac.update_drug_package import update_drug_package
from dotenv import load_dotenv
import os
import sys


def main(report_mm_dd_yyyy: str, filter_before_insert: bool = True):
    load_dotenv()

    if not report_mm_dd_yyyy:
        print("No report date provided.")
        return

    if os.environ.get("FILTER_NADAC_FIRST", "1") == "0":
        filter_before_insert = False

    URL = (
        "https://download.medicaid.gov/data/nadac-national-average-drug-acquisition-cost-"
        + report_mm_dd_yyyy
        + ".csv"
    )

    (nadac_data, _) = fetch_nadac(url=URL)

    COLUMN_MAP = {
        "NADAC_Per_Unit": "NADAC Per Unit",
        "Effective_Date": "Effective Date",
        "Pricing_Unit": "Pricing Unit",
        "Pharmacy_Type_Indicator": "Pharmacy Type Indicator",
        "Explanation_Code": "Explanation Code",
        "Classification_for_Rate_Setting": "Classification for Rate Setting",
        "Corresponding_Generic_Drug_NADAC_Per_Unit": "Corresponding Generic Drug NADAC Per Unit",
        "Corresponding_Generic_Drug_Effective_Date": "Corresponding Generic Drug Effective Date",
    }

    nadac_data = nadac_data.rename(columns=COLUMN_MAP)

    if not filter_before_insert:
        nadac_prices = parse_nadac(nadac_data)

    else:
        loaded_dates = set(get_loaded_as_of_dates())

        as_of_dates = pd.to_datetime(nadac_data["As of Date"]).dt.date

        fresh_nadac_data = pd.DataFrame(
            nadac_data[as_of_dates.isin(loaded_dates) == False]
        )

        if fresh_nadac_data.empty:
            print("No new records to load.")
            update_drug_package()
            return

        nadac_prices = parse_nadac(fresh_nadac_data)

    load_nadac(nadac_prices)
    update_drug_package()


if __name__ == "__main__":
    load_dotenv()
    file_dates = os.getenv("FILE_DATES", "").split(",")
    if not file_dates:
        print("No dates provided in .env file, now exiting...")
        sys.exit()
    print(file_dates)
    for date in file_dates:
        print(date)
        main(report_mm_dd_yyyy=date)
